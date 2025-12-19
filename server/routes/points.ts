import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { pointLedgerService } from "../services/point-ledger";
import { flutterwaveBillsService } from "../services/flutterwave-bills";

const router = Router();

// Flutterwave configuration
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY as string;
const FLW_BASE_URL = "https://api.flutterwave.com/v3";

type UserType = typeof schema.users.$inferSelect;

interface AuthRequest extends Request {
  user?: UserType;
}

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
};

const POINT_PACKAGES = [
  { points: 200000, naira: 150000, exchangeRate: 1.33 },
  { points: 500000, naira: 350000, exchangeRate: 1.43 },
  { points: 1000000, naira: 650000, exchangeRate: 1.54 },
];

// Custom purchase configuration
const CUSTOM_EXCHANGE_RATE = parseFloat(process.env.CUSTOM_POINTS_EXCHANGE_RATE || "1.0");
const MIN_CUSTOM_POINTS = 10000;
const MAX_CUSTOM_POINTS = 2000000;

const purchaseSchema = z.object({
  mode: z.enum(["preset", "custom"]).default("preset"),
  pointsAmount: z.number().int().positive(),
  nairaAmount: z.number().positive(),
  callbackUrl: z.string().url().optional(),
});

const verifyPurchaseSchema = z.object({
  reference: z.string(),
});

const transferSchema = z.object({
  toMemberId: z.string(),
  points: z.number().int().positive(),
  reason: z.string().min(1),
});

router.get("/balance/:memberId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    
    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    if (userMember.id !== memberId && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const balance = await pointLedgerService.getBalance(memberId);

    res.json({ success: true, balance });
  } catch (error: any) {
    console.error("Get balance error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get balance" });
  }
});

router.get("/transactions/:memberId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const { page, pageSize, transactionType, source, startDate, endDate } = req.query;

    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    if (userMember.id !== memberId && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const filters = {
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      transactionType: transactionType as string | undefined,
      source: source as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const result = await pointLedgerService.getTransactionHistory(memberId, filters);

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Get transactions error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get transactions" });
  }
});

router.post("/purchase", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validation = purchaseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const { mode, pointsAmount, nairaAmount, callbackUrl } = validation.data;

    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    let exchangeRate: number;
    let packageType: string;

    if (mode === "preset") {
      // Validate against preset packages
      const matchingPackage = POINT_PACKAGES.find(
        pkg => pkg.points === pointsAmount && pkg.naira === nairaAmount
      );

      if (!matchingPackage) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid package. Available packages: " + JSON.stringify(POINT_PACKAGES) 
        });
      }

      exchangeRate = matchingPackage.exchangeRate;
      packageType = `${pointsAmount}pts`;
    } else {
      // Custom purchase validation
      if (pointsAmount < MIN_CUSTOM_POINTS || pointsAmount > MAX_CUSTOM_POINTS) {
        return res.status(400).json({ 
          success: false, 
          error: `Custom purchase must be between ${MIN_CUSTOM_POINTS.toLocaleString()} and ${MAX_CUSTOM_POINTS.toLocaleString()} points` 
        });
      }

      exchangeRate = CUSTOM_EXCHANGE_RATE;
      const expectedNaira = Math.round(pointsAmount / exchangeRate);
      
      // Allow ₦1 tolerance for rounding
      if (Math.abs(nairaAmount - expectedNaira) > 1) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid naira amount for ${pointsAmount} points. Expected: ₦${expectedNaira}` 
        });
      }

      packageType = "custom";
    }

    const tx_ref = `pt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Initialize Flutterwave payment
    const flwPayload = {
      tx_ref,
      amount: nairaAmount,
      currency: "NGN",
      redirect_url: callbackUrl || `${process.env.VITE_APP_URL || 'http://localhost:5000'}/purchase-points`,
      payment_options: "card,banktransfer,ussd,account",
      customer: {
        email: req.user!.email,
        name: req.user!.email.split('@')[0],
      },
      customizations: {
        title: "APC Connect - Point Purchase",
        description: `Purchase ${pointsAmount.toLocaleString()} points`,
        logo: `${process.env.VITE_APP_URL || 'http://localhost:5000'}/logo.png`,
      },
      meta: {
        memberId: userMember.id,
        pointsAmount,
        exchangeRate,
        mode,
      },
    };

    const flwResponse = await fetch(`${FLW_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flwPayload),
    });

    const flwData = await flwResponse.json();

    if (flwData.status !== 'success') {
      throw new Error(flwData.message || "Failed to initialize payment");
    }

    const [purchase] = await db.insert(schema.pointPurchases).values({
      memberId: userMember.id,
      pointsAmount,
      nairaAmount: nairaAmount.toString(),
      exchangeRate: exchangeRate.toString(),
      paystackReference: tx_ref,
      paystackAccessCode: flwData.data.link,
      status: "pending",
      metadata: { packageType, mode, ip: req.ip, provider: 'flutterwave' },
    }).returning();

    res.json({
      success: true,
      purchase,
      authorizationUrl: flwData.data.link,
      accessCode: flwData.data.link,
      reference: tx_ref,
    });
  } catch (error: any) {
    console.error("Purchase initiation error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to initiate purchase" });
  }
});

router.post("/purchase/verify", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validation = verifyPurchaseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const { reference } = validation.data;

    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const existingPurchase = await db.query.pointPurchases.findFirst({
      where: eq(schema.pointPurchases.paystackReference, reference),
    });

    if (!existingPurchase) {
      return res.status(404).json({ success: false, error: "Purchase not found" });
    }

    if (existingPurchase.memberId !== userMember.id && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Unauthorized to verify this purchase" });
    }

    if (existingPurchase.status === "success") {
      return res.json({ 
        success: true, 
        message: "Payment already verified",
        purchase: existingPurchase,
        alreadyProcessed: true,
      });
    }

    if (existingPurchase.status === "failed") {
      return res.status(400).json({ 
        success: false, 
        error: "This payment has already failed verification",
      });
    }

    console.log(`Verifying payment for reference: ${reference}`);

    // Verify with Flutterwave
    const flwVerifyResponse = await fetch(
      `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        },
      }
    );

    const flwVerification = await flwVerifyResponse.json();

    if (flwVerification.status !== 'success' || !flwVerification.data) {
      throw new Error(flwVerification.message || "Failed to verify payment with Flutterwave");
    }

    const paymentData = flwVerification.data;
    
    console.log(`Payment verification result - Reference: ${reference}, Status: ${paymentData.status}`);

    if (paymentData.status !== "successful") {
      await db.update(schema.pointPurchases)
        .set({ 
          status: "failed",
          metadata: { ...(existingPurchase.metadata as any || {}), flutterwaveStatus: paymentData.status },
        })
        .where(eq(schema.pointPurchases.id, existingPurchase.id));

      return res.status(400).json({ 
        success: false, 
        error: "Payment was not successful",
        status: paymentData.status,
      });
    }

    const amountPaidNaira = paymentData.amount;
    const expectedAmountNaira = parseFloat(existingPurchase.nairaAmount);

    // Validate based on mode (stored in metadata)
    const purchaseMetadata = existingPurchase.metadata as any || {};
    const purchaseMode = purchaseMetadata.mode || "preset";

    if (purchaseMode === "preset") {
      const matchingPackage = POINT_PACKAGES.find(
        pkg => pkg.points === existingPurchase.pointsAmount && 
               pkg.naira === parseFloat(existingPurchase.nairaAmount)
      );

      if (!matchingPackage) {
        console.error(`Invalid package configuration for purchase ${existingPurchase.id}`);
        return res.status(400).json({ 
          success: false, 
          error: "Invalid package configuration",
        });
      }
    } else {
      // Custom purchase - verify exchange rate calculation
      const expectedPoints = Math.round(parseFloat(existingPurchase.nairaAmount) * CUSTOM_EXCHANGE_RATE);
      if (Math.abs(existingPurchase.pointsAmount - expectedPoints) > 1) {
        console.error(`Custom purchase rate mismatch for purchase ${existingPurchase.id}`);
        return res.status(400).json({ 
          success: false, 
          error: "Invalid custom purchase configuration",
        });
      }
    }

    if (Math.abs(amountPaidNaira - expectedAmountNaira) > 0.01) {
      console.error(`Amount mismatch - Reference: ${reference}, Expected: ${expectedAmountNaira}, Received: ${amountPaidNaira}`);
      await db.update(schema.pointPurchases)
        .set({ 
          status: "failed",
          metadata: { 
            ...(existingPurchase.metadata as any || {}), 
            error: "Amount mismatch",
            expected: expectedAmountNaira,
            received: amountPaidNaira,
          },
        })
        .where(eq(schema.pointPurchases.id, existingPurchase.id));

      return res.status(400).json({ 
        success: false, 
        error: "Payment amount mismatch",
      });
    }

    await db.transaction(async (tx) => {
      // Use conditional update with status check to prevent race conditions
      const updateResult = await tx.update(schema.pointPurchases)
        .set({ 
          status: "success",
          completedAt: new Date(),
          paymentMethod: paymentData.payment_type,
          metadata: {
            ...(existingPurchase.metadata as any || {}),
            flutterwaveStatus: paymentData.status,
            transactionId: paymentData.id,
            flwRef: paymentData.flw_ref,
            paidAt: paymentData.created_at,
            channel: paymentData.payment_type,
          },
        })
        .where(and(
          eq(schema.pointPurchases.id, existingPurchase.id),
          eq(schema.pointPurchases.status, "pending")
        ))
        .returning();

      // If no rows were updated, another request already processed this
      if (!updateResult || updateResult.length === 0) {
        throw new Error("Purchase has already been processed by another request");
      }

      const currentBalance = await pointLedgerService.getBalance(existingPurchase.memberId);
      const newBalance = currentBalance + existingPurchase.pointsAmount;

      await tx.insert(schema.userPoints).values({
        memberId: existingPurchase.memberId,
        transactionType: "purchase",
        source: "flutterwave",
        amount: existingPurchase.pointsAmount,
        balanceAfter: newBalance,
        referenceType: "point_purchase",
        referenceId: existingPurchase.id,
        metadata: {
          flutterwaveReference: reference,
          nairaAmount: existingPurchase.nairaAmount,
          exchangeRate: existingPurchase.exchangeRate,
        },
      });
    });

    const updatedPurchase = await db.query.pointPurchases.findFirst({
      where: eq(schema.pointPurchases.id, existingPurchase.id),
    });

    res.json({
      success: true,
      message: "Payment verified and points credited",
      purchase: updatedPurchase,
    });
  } catch (error: any) {
    console.error("Purchase verification error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to verify purchase" });
  }
});

router.get("/purchases/:memberId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    if (userMember.id !== memberId && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const offset = (Number(page) - 1) * Number(pageSize);

    const purchases = await db.query.pointPurchases.findMany({
      where: eq(schema.pointPurchases.memberId, memberId),
      orderBy: desc(schema.pointPurchases.createdAt),
      limit: Number(pageSize),
      offset,
    });

    res.json({ success: true, purchases });
  } catch (error: any) {
    console.error("Get purchases error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get purchases" });
  }
});

router.post("/transfer", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validation = transferSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const { toMemberId, points, reason } = validation.data;

    const fromMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!fromMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const result = await pointLedgerService.transferPoints(
      fromMember.id,
      toMemberId,
      points,
      reason
    );

    res.json({
      success: true,
      message: "Points transferred successfully",
      transfer: result,
    });
  } catch (error: any) {
    console.error("Transfer error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to transfer points" });
  }
});

router.get("/packages", (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    packages: POINT_PACKAGES,
    customRate: {
      exchangeRate: CUSTOM_EXCHANGE_RATE,
      minPoints: MIN_CUSTOM_POINTS,
      maxPoints: MAX_CUSTOM_POINTS,
    }
  });
});

// Point to Airtime/Data Redemption Endpoints

const redeemAirtimeSchema = z.object({
  phoneNumber: z.string().regex(/^\+?234[0-9]{10}$|^0[0-9]{10}$/, "Invalid Nigerian phone number"),
  pointsAmount: z.number().int().positive(),
  idempotencyKey: z.string().min(1), // Client-supplied unique key for duplicate detection
});

const redeemDataSchema = z.object({
  phoneNumber: z.string().regex(/^\+?234[0-9]{10}$|^0[0-9]{10}$/, "Invalid Nigerian phone number"),
  pointsAmount: z.number().int().positive(),
  billerCode: z.string(),
  itemCode: z.string().optional(),
  idempotencyKey: z.string().min(1), // Client-supplied unique key for duplicate detection
});

// Get conversion settings
router.get("/conversion/settings", async (req: Request, res: Response) => {
  try {
    const settings = await db.query.pointConversionSettings.findMany({
      where: eq(schema.pointConversionSettings.isActive, true),
    });

    // Default settings if none exist
    if (settings.length === 0) {
      return res.json({
        success: true,
        settings: [
          {
            productType: "airtime",
            baseRate: "1.0", // 1 point = 1 NGN
            minPoints: 100,
            maxPoints: 10000,
            isActive: true,
          },
          {
            productType: "data",
            baseRate: "1.0",
            minPoints: 100,
            maxPoints: 10000,
            isActive: true,
          },
        ],
      });
    }

    res.json({ success: true, settings });
  } catch (error: any) {
    console.error("Get conversion settings error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get conversion settings" });
  }
});

// Admin: Create/Update conversion settings
router.post("/conversion/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const { productType, baseRate, minPoints, maxPoints, carrierOverrides } = req.body;

    const [setting] = await db.insert(schema.pointConversionSettings).values({
      productType,
      baseRate,
      minPoints,
      maxPoints,
      carrierOverrides,
      isActive: true,
    }).returning();

    res.json({ success: true, setting });
  } catch (error: any) {
    console.error("Create conversion settings error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to create conversion settings" });
  }
});

// Get available networks (for UI dropdowns)
router.get("/conversion/networks", async (req: Request, res: Response) => {
  try {
    const networks = [
      { code: 'MTN', name: 'MTN Nigeria', airtimeSupported: true, dataSupported: true },
      { code: 'AIRTEL', name: 'Airtel Nigeria', airtimeSupported: true, dataSupported: true },
      { code: 'GLO', name: 'Glo Mobile', airtimeSupported: true, dataSupported: true },
      { code: '9MOBILE', name: '9mobile', airtimeSupported: true, dataSupported: true },
    ];

    res.json({ success: true, networks });
  } catch (error: any) {
    console.error("Get networks error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get networks" });
  }
});

// Calculate conversion (points to naira)
router.post("/conversion/calculate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { points, productType } = req.body;

    const setting = await db.query.pointConversionSettings.findFirst({
      where: and(
        eq(schema.pointConversionSettings.productType, productType),
        eq(schema.pointConversionSettings.isActive, true)
      ),
    });

    const baseRate = setting ? parseFloat(setting.baseRate) : 1.0;
    const minPoints = setting?.minPoints || 100;
    const maxPoints = setting?.maxPoints || 10000;

    if (points < minPoints || points > maxPoints) {
      return res.status(400).json({
        success: false,
        error: `Points must be between ${minPoints} and ${maxPoints}`,
      });
    }

    const nairaValue = points * baseRate;

    res.json({
      success: true,
      calculation: {
        points,
        nairaValue,
        rate: baseRate,
        productType,
      },
    });
  } catch (error: any) {
    console.error("Calculate conversion error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to calculate conversion" });
  }
});

// Redeem points for airtime
router.post("/redeem/airtime", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validation = redeemAirtimeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const { phoneNumber, pointsAmount, idempotencyKey } = validation.data;

    // SECURITY: Always resolve member from authenticated user - never from request body
    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    // Format phone number early for carrier detection
    const formattedPhone = phoneNumber.startsWith('+234') ? phoneNumber : 
                          phoneNumber.startsWith('0') ? `+234${phoneNumber.substring(1)}` :
                          `+234${phoneNumber}`;

    // Detect carrier
    const carrier = flutterwaveBillsService.detectCarrierFromPhone(formattedPhone) || 'UNKNOWN';

    // Generate Flutterwave reference
    const reference = `air_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    // PHASE 1: Validation and create durable redemption record
    let redemption;
    let nairaValue;
    
    const validationResult = await db.transaction(async (tx) => {
      // IDEMPOTENCY: Check for duplicate
      const duplicateResult = await tx.execute(sql`
        SELECT COUNT(*) as count 
        FROM ${schema.pointRedemptions} 
        WHERE ${schema.pointRedemptions.metadata}->>'idempotencyKey' = ${idempotencyKey}
      `);

      const duplicateRows = duplicateResult.rows as Array<{count: string}>;
      const duplicateCount = duplicateRows?.[0]?.count || 0;
      if (Number(duplicateCount) > 0) {
        throw new Error("Duplicate redemption request detected.");
      }

      // STATE VALIDATION: Check member status
      const currentMember = await tx.query.members.findFirst({
        where: eq(schema.members.id, userMember.id),
      });

      if (!currentMember || currentMember.status !== "active") {
        throw new Error("Account is not active");
      }

      // STATE VALIDATION: Get conversion settings
      const setting = await tx.query.pointConversionSettings.findFirst({
        where: and(
          eq(schema.pointConversionSettings.productType, "airtime"),
          eq(schema.pointConversionSettings.isActive, true)
        ),
      });

      const baseRate = setting ? parseFloat(setting.baseRate) : 1.0;
      const minPoints = setting?.minPoints || 100;
      const maxPoints = setting?.maxPoints || 10000;

      if (pointsAmount < minPoints || pointsAmount > maxPoints) {
        throw new Error(`Points must be between ${minPoints} and ${maxPoints}`);
      }

      const calculatedNairaValue = pointsAmount * baseRate;

      // BALANCE CHECK: Verify sufficient points
      const currentBalanceInTx = await pointLedgerService.getBalance(userMember.id, tx);
      if (currentBalanceInTx < pointsAmount) {
        throw new Error(`Insufficient points. You have ${currentBalanceInTx} points but need ${pointsAmount}`);
      }

      // DURABLE RECORD: Create redemption before external call (auto-commits when tx ends)
      const [record] = await tx.insert(schema.pointRedemptions).values({
        memberId: userMember.id,
        phoneNumber: formattedPhone,
        carrier,
        productType: "airtime",
        nairaValue: calculatedNairaValue.toString(),
        pointsDebited: pointsAmount,
        status: "pending",
        metadata: { initiatedBy: req.user!.email, reference, idempotencyKey },
      }).returning();

      return { redemption: record, nairaValue: calculatedNairaValue };
    });

    redemption = validationResult.redemption;
    nairaValue = validationResult.nairaValue;

    // PHASE 2: External Flutterwave call (outside transaction - if this succeeds, we have redemption.flw_ref for reconciliation)
    let flwResponse;
    try {
      flwResponse = await flutterwaveBillsService.purchaseAirtime({
        customer: formattedPhone,
        amount: nairaValue,
        reference,
      });

      // VERIFICATION: Validate Flutterwave response
      if (!flwResponse.data || !flwResponse.data.flw_ref) {
        throw new Error("Invalid Flutterwave response - missing reference");
      }
    } catch (flwError: any) {
      // Mark redemption as failed (separate transaction for durability)
      await db.update(schema.pointRedemptions)
        .set({
          status: "failed",
          errorMessage: flwError.message,
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));
      
      throw flwError;
    }

    // PHASE 3A: Persist Flutterwave success (separate transaction for durability)
    await db.update(schema.pointRedemptions)
      .set({
        flutterwaveReference: flwResponse.data.flw_ref,
        metadata: {
          ...(redemption.metadata as any || {}),
          flutterwaveResponse: flwResponse.data,
        },
      })
      .where(eq(schema.pointRedemptions.id, redemption.id));

    // PHASE 3B: Deduct points and mark completed (if this fails, redemption has flw_ref for reconciliation)
    let result;
    try {
      result = await db.transaction(async (tx) => {
        // Final balance check before deduction
        const finalBalance = await pointLedgerService.getBalance(userMember.id, tx);
        if (finalBalance < pointsAmount) {
          throw new Error("Insufficient points at final check");
        }

        // Deduct points
        const newBalance = finalBalance - pointsAmount;
        await tx.insert(schema.userPoints).values({
          memberId: userMember.id,
          transactionType: "spend",
          source: "airtime_redemption",
          amount: -pointsAmount,
          balanceAfter: newBalance,
          referenceType: "airtime_redemption",
          referenceId: redemption.id,
          metadata: {
            phoneNumber: formattedPhone,
            carrier,
            nairaValue,
            flwRef: flwResponse.data.flw_ref,
          },
        });

        return {
          redemption,
          flwResponse,
        };
      });

      // PHASE 3C: Mark completed (separate transaction for maximum durability)
      await db.update(schema.pointRedemptions)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));

    } catch (phase3Error: any) {
      // Phase 3 failed - persist error for reconciliation
      await db.update(schema.pointRedemptions)
        .set({
          errorMessage: `Phase 3 failed: ${phase3Error.message}`,
          metadata: {
            ...(redemption.metadata as any || {}),
            phase3Error: phase3Error.message,
            phase3FailedAt: new Date().toISOString(),
          },
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));
      
      throw new Error(`Flutterwave succeeded but point deduction failed. Redemption ID: ${redemption.id}. Please contact support for manual reconciliation.`);
    }

    res.json({
      success: true,
      message: `₦${nairaValue} airtime sent to ${formattedPhone}`,
      redemption: {
        ...result.redemption,
        status: "completed",
        flutterwaveReference: result.flwResponse.data.flw_ref,
      },
    });
  } catch (error: any) {
    console.error("Redeem airtime error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to redeem airtime" });
  }
});

// Redeem points for data
router.post("/redeem/data", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validation = redeemDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const { phoneNumber, pointsAmount, billerCode, itemCode, idempotencyKey } = validation.data;

    // SECURITY: Always resolve member from authenticated user - never from request body
    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    // Format phone number early for carrier detection
    const formattedPhone = phoneNumber.startsWith('+234') ? phoneNumber : 
                          phoneNumber.startsWith('0') ? `+234${phoneNumber.substring(1)}` :
                          `+234${phoneNumber}`;

    // Detect carrier
    const carrier = flutterwaveBillsService.detectCarrierFromPhone(formattedPhone) || 'UNKNOWN';

    // Generate Flutterwave reference
    const reference = `data_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    // PHASE 1: Validation and create durable redemption record
    let redemption;
    let nairaValue;
    
    const validationResult = await db.transaction(async (tx) => {
      // IDEMPOTENCY: Check for duplicate
      const duplicateResult = await tx.execute(sql`
        SELECT COUNT(*) as count 
        FROM ${schema.pointRedemptions} 
        WHERE ${schema.pointRedemptions.metadata}->>'idempotencyKey' = ${idempotencyKey}
      `);

      const duplicateRows = duplicateResult.rows as Array<{count: string}>;
      const duplicateCount = duplicateRows?.[0]?.count || 0;
      if (Number(duplicateCount) > 0) {
        throw new Error("Duplicate redemption request detected.");
      }

      // STATE VALIDATION: Check member status
      const currentMember = await tx.query.members.findFirst({
        where: eq(schema.members.id, userMember.id),
      });

      if (!currentMember || currentMember.status !== "active") {
        throw new Error("Account is not active");
      }

      // STATE VALIDATION: Get conversion settings
      const setting = await tx.query.pointConversionSettings.findFirst({
        where: and(
          eq(schema.pointConversionSettings.productType, "data"),
          eq(schema.pointConversionSettings.isActive, true)
        ),
      });

      const baseRate = setting ? parseFloat(setting.baseRate) : 1.0;
      const minPoints = setting?.minPoints || 100;
      const maxPoints = setting?.maxPoints || 10000;

      if (pointsAmount < minPoints || pointsAmount > maxPoints) {
        throw new Error(`Points must be between ${minPoints} and ${maxPoints}`);
      }

      const calculatedNairaValue = pointsAmount * baseRate;

      // BALANCE CHECK: Verify sufficient points
      const currentBalanceInTx = await pointLedgerService.getBalance(userMember.id, tx);
      if (currentBalanceInTx < pointsAmount) {
        throw new Error(`Insufficient points. You have ${currentBalanceInTx} points but need ${pointsAmount}`);
      }

      // DURABLE RECORD: Create redemption before external call
      const [record] = await tx.insert(schema.pointRedemptions).values({
        memberId: userMember.id,
        phoneNumber: formattedPhone,
        carrier,
        productType: "data",
        nairaValue: calculatedNairaValue.toString(),
        pointsDebited: pointsAmount,
        status: "pending",
        metadata: { 
          initiatedBy: req.user!.email,
          billerCode,
          itemCode,
          reference,
          idempotencyKey,
        },
      }).returning();

      return { redemption: record, nairaValue: calculatedNairaValue };
    });

    redemption = validationResult.redemption;
    nairaValue = validationResult.nairaValue;

    // PHASE 2: External Flutterwave call (outside transaction)
    let flwResponse;
    try {
      flwResponse = await flutterwaveBillsService.purchaseData({
        customer: formattedPhone,
        amount: nairaValue,
        reference,
        biller_code: billerCode,
        item_code: itemCode,
      });

      // VERIFICATION: Validate Flutterwave response
      if (!flwResponse.data || !flwResponse.data.flw_ref) {
        throw new Error("Invalid Flutterwave response - missing reference");
      }
    } catch (flwError: any) {
      // Mark redemption as failed (separate transaction for durability)
      await db.update(schema.pointRedemptions)
        .set({
          status: "failed",
          errorMessage: flwError.message,
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));
      
      throw flwError;
    }

    // PHASE 3A: Persist Flutterwave success (separate transaction for durability)
    await db.update(schema.pointRedemptions)
      .set({
        flutterwaveReference: flwResponse.data.flw_ref,
        metadata: {
          ...(redemption.metadata as any || {}),
          flutterwaveResponse: flwResponse.data,
        },
      })
      .where(eq(schema.pointRedemptions.id, redemption.id));

    // PHASE 3B: Deduct points and mark completed (if this fails, redemption has flw_ref for reconciliation)
    let result;
    try {
      result = await db.transaction(async (tx) => {
        // Final balance check before deduction
        const finalBalance = await pointLedgerService.getBalance(userMember.id, tx);
        if (finalBalance < pointsAmount) {
          throw new Error("Insufficient points at final check");
        }

        // Deduct points
        const newBalance = finalBalance - pointsAmount;
        await tx.insert(schema.userPoints).values({
          memberId: userMember.id,
          transactionType: "spend",
          source: "data_redemption",
          amount: -pointsAmount,
          balanceAfter: newBalance,
          referenceType: "data_redemption",
          referenceId: redemption.id,
          metadata: {
            phoneNumber: formattedPhone,
            carrier,
            nairaValue,
            billerCode,
            itemCode,
            flwRef: flwResponse.data.flw_ref,
          },
        });

        return {
          redemption,
          flwResponse,
        };
      });

      // PHASE 3C: Mark completed (separate transaction for maximum durability)
      await db.update(schema.pointRedemptions)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));

    } catch (phase3Error: any) {
      // Phase 3 failed - persist error for reconciliation
      await db.update(schema.pointRedemptions)
        .set({
          errorMessage: `Phase 3 failed: ${phase3Error.message}`,
          metadata: {
            ...(redemption.metadata as any || {}),
            phase3Error: phase3Error.message,
            phase3FailedAt: new Date().toISOString(),
          },
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));
      
      throw new Error(`Flutterwave succeeded but point deduction failed. Redemption ID: ${redemption.id}. Please contact support for manual reconciliation.`);
    }

    res.json({
      success: true,
      message: `Data bundle sent to ${formattedPhone}`,
      redemption: {
        ...result.redemption,
        status: "completed",
        flutterwaveReference: result.flwResponse.data.flw_ref,
      },
    });
  } catch (error: any) {
    console.error("Redeem data error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to redeem data" });
  }
});

// Get Nigerian banks list for cash withdrawal
router.get("/banks", requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const banks = await flutterwaveBillsService.getNigerianBanks();
    res.json({ success: true, banks });
  } catch (error: any) {
    console.error("Get banks error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get banks" });
  }
});

// Verify bank account
router.post("/verify-bank", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { accountNumber, bankCode } = req.body;
    
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ success: false, error: "Account number and bank code required" });
    }

    const account = await flutterwaveBillsService.verifyBankAccount(accountNumber, bankCode);
    res.json({ success: true, account });
  } catch (error: any) {
    console.error("Verify bank error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to verify bank account" });
  }
});

// Redeem points as cash (bank transfer)
router.post("/redeem/cash", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { pointsAmount, accountNumber, bankCode } = req.body;

    // Validate input - accountName is NOT trusted from client, we verify server-side
    if (!pointsAmount || !accountNumber || !bankCode) {
      return res.status(400).json({ 
        success: false, 
        error: "Points amount, account number, and bank code are required" 
      });
    }

    // Validate account number format
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ success: false, error: "Invalid account number format" });
    }

    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    // Cash redemption settings (hardcoded, matching airtime/data pattern)
    const minPoints = 500;
    const maxPoints = 50000;
    const baseRate = 1.0; // 1 point = ₦1

    // Validate points range
    const points = Number(pointsAmount);
    if (isNaN(points) || points < minPoints || points > maxPoints) {
      return res.status(400).json({
        success: false,
        error: `Points must be between ${minPoints} and ${maxPoints}`,
      });
    }

    // Calculate Naira amount
    const nairaAmount = Math.floor(points * baseRate);

    // Apply minimum transfer threshold (banks often have minimums)
    const MIN_TRANSFER_AMOUNT = 100;
    if (nairaAmount < MIN_TRANSFER_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal is ₦${MIN_TRANSFER_AMOUNT}`,
      });
    }

    // CRITICAL: Server-side bank account verification - never trust client-supplied accountName
    let verifiedAccountName: string;
    try {
      const verificationResult = await flutterwaveBillsService.verifyBankAccount(accountNumber, bankCode);
      verifiedAccountName = verificationResult.account_name;
    } catch (verifyError: any) {
      return res.status(400).json({ 
        success: false, 
        error: `Bank account verification failed: ${verifyError.message}` 
      });
    }

    // Generate reference and idempotency key
    const reference = `cash_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const idempotencyKey = `cash:${userMember.id}:${accountNumber}:${bankCode}:${points}:${Math.floor(Date.now() / 60000)}`;

    let redemption: any;

    // PHASE 1: Validation and create durable redemption record (Transaction 1)
    const validationResult = await db.transaction(async (tx) => {
      // IDEMPOTENCY: Check for duplicate
      const duplicateResult = await tx.execute(sql`
        SELECT COUNT(*) as count 
        FROM ${schema.pointRedemptions} 
        WHERE ${schema.pointRedemptions.metadata}->>'idempotencyKey' = ${idempotencyKey}
      `);

      const duplicateRows = duplicateResult.rows as Array<{count: string}>;
      const duplicateCount = duplicateRows?.[0]?.count || 0;
      if (Number(duplicateCount) > 0) {
        throw new Error("Duplicate redemption request detected. Please wait before retrying.");
      }

      // STATE VALIDATION: Check member status
      const currentMember = await tx.query.members.findFirst({
        where: eq(schema.members.id, userMember.id),
      });

      if (!currentMember || currentMember.status !== "active") {
        throw new Error("Account is not active");
      }

      // BALANCE CHECK: Verify sufficient points
      const currentBalanceInTx = await pointLedgerService.getBalance(userMember.id, tx);
      if (currentBalanceInTx < points) {
        throw new Error(`Insufficient points. You have ${currentBalanceInTx} points but need ${points}`);
      }

      // DURABLE RECORD: Create redemption before external call
      const [record] = await tx.insert(schema.pointRedemptions).values({
        memberId: userMember.id,
        phoneNumber: "BANK_TRANSFER",
        carrier: bankCode,
        productType: "cash",
        nairaValue: nairaAmount.toString(),
        pointsDebited: points,
        status: "pending",
        metadata: {
          accountNumber,
          bankCode,
          accountName: verifiedAccountName,
          reference,
          idempotencyKey,
          initiatedBy: req.user!.email,
        },
      }).returning();

      return { redemption: record };
    });

    redemption = validationResult.redemption;

    // PHASE 2: External Flutterwave call (OUTSIDE transaction - if this succeeds, we have reference for reconciliation)
    let flwResponse;
    try {
      flwResponse = await flutterwaveBillsService.initiateBankTransfer({
        account_bank: bankCode,
        account_number: accountNumber,
        amount: nairaAmount,
        currency: "NGN",
        reference,
        narration: `APC Connect Point Withdrawal - ${points} pts`,
        beneficiary_name: verifiedAccountName,
      });

      // VERIFICATION: Validate Flutterwave response
      if (!flwResponse.data || !flwResponse.data.id) {
        throw new Error("Invalid Flutterwave response - missing transfer ID");
      }
    } catch (flwError: any) {
      // Mark redemption as failed (separate transaction for durability)
      await db.update(schema.pointRedemptions)
        .set({
          status: "failed",
          errorMessage: flwError.message,
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));
      
      throw flwError;
    }

    // PHASE 3A: Persist Flutterwave success (separate update for durability)
    await db.update(schema.pointRedemptions)
      .set({
        flutterwaveReference: reference,
        metadata: {
          ...(redemption.metadata as any || {}),
          flwTransferId: flwResponse.data.id,
          flwRef: flwResponse.data.reference,
          transferStatus: flwResponse.data.status,
        },
      })
      .where(eq(schema.pointRedemptions.id, redemption.id));

    // PHASE 3B: Deduct points (Transaction 2)
    try {
      await db.transaction(async (tx) => {
        // Final balance check before deduction
        const finalBalance = await pointLedgerService.getBalance(userMember.id, tx);
        if (finalBalance < points) {
          throw new Error("Insufficient points at final check");
        }

        // Deduct points
        const newBalance = finalBalance - points;
        await tx.insert(schema.userPoints).values({
          memberId: userMember.id,
          transactionType: "spend",
          source: "cash_redemption",
          amount: -points,
          balanceAfter: newBalance,
          referenceType: "cash_redemption",
          referenceId: redemption.id,
          metadata: {
            accountNumber,
            bankCode,
            accountName: verifiedAccountName,
            nairaValue: nairaAmount,
            flwRef: flwResponse.data.reference,
          },
        });
      });

      // PHASE 3C: Mark completed (separate update for maximum durability)
      await db.update(schema.pointRedemptions)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));

    } catch (phase3Error: any) {
      // Phase 3 failed - mark as FAILED for proper reconciliation (Flutterwave succeeded but point deduction failed)
      await db.update(schema.pointRedemptions)
        .set({
          status: "failed",
          errorMessage: `Phase 3 failed: ${phase3Error.message}`,
          metadata: {
            ...(redemption.metadata as any || {}),
            phase3Error: phase3Error.message,
            phase3FailedAt: new Date().toISOString(),
            flutterwaveSucceeded: true,
          },
        })
        .where(eq(schema.pointRedemptions.id, redemption.id));
      
      throw new Error(`Flutterwave succeeded but point deduction failed. Redemption ID: ${redemption.id}. Please contact support for manual reconciliation.`);
    }

    res.json({
      success: true,
      message: `₦${nairaAmount.toLocaleString()} transfer initiated to ${accountNumber} (${verifiedAccountName})`,
      redemption: {
        id: redemption.id,
        status: "completed",
        flutterwaveReference: reference,
        accountName: verifiedAccountName,
        pointsUsed: points,
        nairaValue: nairaAmount,
      },
    });
  } catch (error: any) {
    console.error("Cash redemption error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to process cash withdrawal" });
  }
});

// Get redemption history
router.get("/redemptions/:memberId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    if (userMember.id !== memberId && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const offset = (Number(page) - 1) * Number(pageSize);

    const redemptions = await db.query.pointRedemptions.findMany({
      where: eq(schema.pointRedemptions.memberId, memberId),
      orderBy: desc(schema.pointRedemptions.createdAt),
      limit: Number(pageSize),
      offset,
    });

    res.json({ success: true, redemptions });
  } catch (error: any) {
    console.error("Get redemptions error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get redemptions" });
  }
});

export default router;
