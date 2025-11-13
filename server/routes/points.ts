import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
// @ts-ignore - No types available for paystack-api
import Paystack from "paystack-api";
import crypto from "crypto";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { pointLedgerService } from "../services/point-ledger";

const router = Router();
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY as string);

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
  { points: 500, naira: 500, exchangeRate: 1.0 },
  { points: 1000, naira: 900, exchangeRate: 1.11 },
  { points: 2500, naira: 2000, exchangeRate: 1.25 },
  { points: 5000, naira: 3500, exchangeRate: 1.43 },
];

const purchaseSchema = z.object({
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

    const { pointsAmount, nairaAmount, callbackUrl } = validation.data;

    const userMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!userMember) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const matchingPackage = POINT_PACKAGES.find(
      pkg => pkg.points === pointsAmount && pkg.naira === nairaAmount
    );

    if (!matchingPackage) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid package. Available packages: " + JSON.stringify(POINT_PACKAGES) 
      });
    }

    const reference = `pt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const paystackResponse = await paystack.transaction.initialize({
      amount: nairaAmount * 100,
      email: req.user!.email,
      reference,
      callback_url: callbackUrl || `${process.env.VITE_APP_URL || 'http://localhost:5000'}/rewards`,
      metadata: {
        memberId: userMember.id,
        pointsAmount,
        exchangeRate: matchingPackage.exchangeRate,
      },
    });

    if (!paystackResponse.status) {
      throw new Error("Failed to initialize payment");
    }

    const [purchase] = await db.insert(schema.pointPurchases).values({
      memberId: userMember.id,
      pointsAmount,
      nairaAmount: nairaAmount.toString(),
      exchangeRate: matchingPackage.exchangeRate.toString(),
      paystackReference: reference,
      paystackAccessCode: paystackResponse.data.access_code,
      status: "pending",
      metadata: { packageType: `${pointsAmount}pts`, ip: req.ip },
    }).returning();

    res.json({
      success: true,
      purchase,
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      reference,
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

    console.log(`Verifying payment for reference: ${reference}`);

    const paystackVerification = await paystack.transaction.verify(reference);

    if (!paystackVerification.status || !paystackVerification.data) {
      throw new Error("Failed to verify payment with Paystack");
    }

    const paymentData = paystackVerification.data;
    
    console.log(`Payment verification result - Reference: ${reference}, Status: ${paymentData.status}`);

    if (paymentData.status !== "success") {
      await db.update(schema.pointPurchases)
        .set({ 
          status: "failed",
          metadata: { ...(existingPurchase.metadata as any || {}), paystackStatus: paymentData.status },
        })
        .where(eq(schema.pointPurchases.id, existingPurchase.id));

      return res.status(400).json({ 
        success: false, 
        error: "Payment was not successful",
        status: paymentData.status,
      });
    }

    const amountPaidKobo = paymentData.amount;
    const expectedAmountKobo = parseFloat(existingPurchase.nairaAmount) * 100;

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

    if (amountPaidKobo !== expectedAmountKobo) {
      console.error(`Amount mismatch - Reference: ${reference}, Expected: ${expectedAmountKobo}, Received: ${amountPaidKobo}`);
      await db.update(schema.pointPurchases)
        .set({ 
          status: "failed",
          metadata: { 
            ...(existingPurchase.metadata as any || {}), 
            error: "Amount mismatch",
            expected: expectedAmountKobo,
            received: amountPaidKobo,
          },
        })
        .where(eq(schema.pointPurchases.id, existingPurchase.id));

      return res.status(400).json({ 
        success: false, 
        error: "Payment amount mismatch",
      });
    }

    await db.transaction(async (tx) => {
      await tx.update(schema.pointPurchases)
        .set({ 
          status: "success",
          completedAt: new Date(),
          paymentMethod: paymentData.channel,
          metadata: {
            ...(existingPurchase.metadata as any || {}),
            paystackStatus: paymentData.status,
            paidAt: paymentData.paid_at,
            channel: paymentData.channel,
          },
        })
        .where(eq(schema.pointPurchases.id, existingPurchase.id));

      const currentBalance = await pointLedgerService.getBalance(existingPurchase.memberId);
      const newBalance = currentBalance + existingPurchase.pointsAmount;

      await tx.insert(schema.userPoints).values({
        memberId: existingPurchase.memberId,
        transactionType: "purchase",
        source: "paystack",
        amount: existingPurchase.pointsAmount,
        balanceAfter: newBalance,
        referenceType: "point_purchase",
        referenceId: existingPurchase.id,
        metadata: {
          paystackReference: reference,
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
  res.json({ success: true, packages: POINT_PACKAGES });
});

export default router;
