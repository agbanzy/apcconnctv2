import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { pointLedgerService } from "../services/point-ledger";

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

export default router;
