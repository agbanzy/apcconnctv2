import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { Server as SocketIOServer } from "socket.io";
import Stripe from "stripe";
import Paystack from "paystack-api";
import multer from "multer";
import QRCode from "qrcode";
import OpenAI from "openai";
import crypto from "crypto";
import { db } from "./db";
import { pool } from "./db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";
import { z } from "zod";

const PgSession = ConnectPgSimple(session);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-11-20.acacia" });
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY as string);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

interface AuthRequest extends Request {
  user?: typeof schema.users.$inferSelect;
}

declare global {
  namespace Express {
    interface User extends typeof schema.users.$inferSelect {}
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" }
  });

  app.use(
    session({
      store: new PgSession({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "apc-connect-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
      }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.email, email)
        });

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, id)
      });
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    next();
  };

  const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role || "member")) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }
      next();
    };
  };

  app.post("/api/auth/register", async (req: AuthRequest, res: Response) => {
    try {
      const userData = schema.insertUserSchema.parse(req.body);
      const { wardId, ...memberData } = req.body;

      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, userData.email)
      });

      if (existingUser) {
        return res.status(400).json({ success: false, error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [user] = await db.insert(schema.users).values({
        ...userData,
        password: hashedPassword
      }).returning();

      const year = new Date().getFullYear();
      const random = Math.floor(10000 + Math.random() * 90000);
      const memberId = `APC-${year}-NG-${random}`;

      const [member] = await db.insert(schema.members).values({
        userId: user.id,
        memberId,
        wardId: wardId || "",
        status: "pending"
      }).returning();

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ success: false, error: "Login failed after registration" });
        }
        return res.json({ success: true, data: { user, member } });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req: AuthRequest, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ success: false, error: info?.message || "Invalid credentials" });
      }
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ success: false, error: "Login failed" });
        }

        const member = await db.query.members.findFirst({
          where: eq(schema.members.userId, user.id)
        });

        return res.json({ success: true, data: { user, member } });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: AuthRequest, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Logout failed" });
      }
      res.json({ success: true, data: { message: "Logged out successfully" } });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
        with: {
          ward: {
            with: {
              lga: {
                with: { state: true }
              }
            }
          }
        }
      });

      res.json({ success: true, data: { user: req.user, member } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch user data" });
    }
  });

  app.get("/api/locations/states", async (req: Request, res: Response) => {
    try {
      const states = await db.query.states.findMany({
        orderBy: asc(schema.states.name)
      });
      res.json({ success: true, data: states });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch states" });
    }
  });

  app.get("/api/locations/states/:id/lgas", async (req: Request, res: Response) => {
    try {
      const lgas = await db.query.lgas.findMany({
        where: eq(schema.lgas.stateId, req.params.id),
        orderBy: asc(schema.lgas.name)
      });
      res.json({ success: true, data: lgas });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch LGAs" });
    }
  });

  app.get("/api/locations/lgas/:id/wards", async (req: Request, res: Response) => {
    try {
      const wards = await db.query.wards.findMany({
        where: eq(schema.wards.lgaId, req.params.id),
        orderBy: asc(schema.wards.wardNumber)
      });
      res.json({ success: true, data: wards });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch wards" });
    }
  });

  app.get("/api/members", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { wardId, lgaId, stateId } = req.query;
      let members;

      if (wardId) {
        members = await db.query.members.findMany({
          where: eq(schema.members.wardId, wardId as string),
          with: { user: true, ward: true }
        });
      } else {
        members = await db.query.members.findMany({
          with: { user: true, ward: { with: { lga: { with: { state: true } } } } }
        });
      }

      res.json({ success: true, data: members });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch members" });
    }
  });

  app.get("/api/members/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id),
        with: {
          user: true,
          ward: {
            with: {
              lga: { with: { state: true } }
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      res.json({ success: true, data: member });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch member" });
    }
  });

  app.patch("/api/members/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      if (member.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      const [updated] = await db.update(schema.members)
        .set(req.body)
        .where(eq(schema.members.id, req.params.id))
        .returning();

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update member" });
    }
  });

  app.post("/api/members/:id/verify-nin", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { nin } = req.body;

      if (!nin || nin.length !== 11) {
        return res.status(400).json({ success: false, error: "Invalid NIN format" });
      }

      const [updated] = await db.update(schema.members)
        .set({ nin, status: "active" })
        .where(eq(schema.members.id, req.params.id))
        .returning();

      res.json({ success: true, data: { verified: true, member: updated } });
    } catch (error) {
      res.status(500).json({ success: false, error: "NIN verification failed" });
    }
  });

  app.get("/api/members/:id/qr-code", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const qrData = {
        memberId: member.memberId,
        name: `${member.user.firstName} ${member.user.lastName}`,
        wardId: member.wardId
      };

      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      res.json({ success: true, data: { qrCode } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to generate QR code" });
    }
  });

  app.get("/api/dues", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const dues = await db.query.membershipDues.findMany({
        where: eq(schema.membershipDues.memberId, member.id),
        orderBy: desc(schema.membershipDues.dueDate)
      });

      res.json({ success: true, data: dues });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch dues" });
    }
  });

  app.post("/api/dues", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const duesData = schema.insertDuesSchema.parse({
        ...req.body,
        memberId: member.id
      });

      const [dues] = await db.insert(schema.membershipDues)
        .values(duesData)
        .returning();

      res.json({ success: true, data: dues });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create dues record" });
    }
  });

  app.post("/api/dues/checkout", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { amount } = req.body;
      const member_id = req.user!.id;

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, member_id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [payment] = await db.insert(schema.membershipDues).values({
        id: crypto.randomUUID(),
        memberId: member.id,
        amount: String(amount * 100),
        paymentStatus: "pending",
        paymentMethod: "paystack",
        dueDate: new Date(),
      }).returning();

      const paystackResponse = await paystack.transaction.initialize({
        email: member.user.email,
        amount: amount * 100,
        reference: payment.id,
        callback_url: `${process.env.VITE_BASE_URL || "http://localhost:5000"}/dues/verify`,
        metadata: {
          payment_id: payment.id,
          member_id: member.id,
          type: "membership_dues",
        }
      });

      res.json({
        success: true,
        data: {
          authorization_url: paystackResponse.data.authorization_url,
          access_code: paystackResponse.data.access_code,
          reference: paystackResponse.data.reference,
        }
      });
    } catch (error) {
      console.error("Dues checkout error:", error);
      res.status(500).json({ success: false, error: "Failed to create checkout session" });
    }
  });

  app.post("/api/dues/verify", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;

      const verification = await paystack.transaction.verify(reference);

      if (verification.data.status === "success") {
        await db.update(schema.membershipDues)
          .set({
            paymentStatus: "completed",
            paystackReference: reference,
            paidAt: new Date(),
          })
          .where(eq(schema.membershipDues.id, reference));

        const payment = await db.query.membershipDues.findFirst({
          where: eq(schema.membershipDues.id, reference)
        });

        if (payment) {
          await db.update(schema.members)
            .set({ status: "active" })
            .where(eq(schema.members.id, payment.memberId));
        }

        res.json({ success: true, data: { payment } });
      } else {
        await db.update(schema.membershipDues)
          .set({ paymentStatus: "failed" })
          .where(eq(schema.membershipDues.id, reference));

        res.status(400).json({ success: false, error: "Payment verification failed" });
      }
    } catch (error: any) {
      console.error("Dues verification error:", error);
      res.status(500).json({ success: false, error: "Failed to verify payment" });
    }
  });

  app.post("/api/dues/stripe-webhook", async (req: Request, res: Response) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const { duesId, memberId } = session.metadata;

        await db.update(schema.membershipDues)
          .set({
            paymentStatus: "completed",
            stripePaymentId: session.payment_intent,
            paidAt: new Date()
          })
          .where(eq(schema.membershipDues.id, duesId));

        await db.insert(schema.notifications).values({
          memberId,
          title: "Payment Successful",
          message: "Your membership dues payment has been confirmed!",
          type: "dues_reminder"
        });
      }

      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ success: false, error: "Webhook error" });
    }
  });

  app.post("/api/paystack/webhook", async (req: Request, res: Response) => {
    try {
      const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY as string)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const event = req.body;

      if (event.event === "charge.success") {
        const reference = event.data.reference;
        const metadata = event.data.metadata;

        if (metadata.type === "membership_dues") {
          await db.update(schema.membershipDues)
            .set({ paymentStatus: "completed", paidAt: new Date() })
            .where(eq(schema.membershipDues.id, reference));
        } else if (metadata.donation_id) {
          await db.update(schema.donations)
            .set({ paymentStatus: "completed" })
            .where(eq(schema.donations.id, reference));
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  app.get("/api/dues/history", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const history = await db.query.membershipDues.findMany({
        where: eq(schema.membershipDues.memberId, member.id),
        orderBy: desc(schema.membershipDues.createdAt)
      });

      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch payment history" });
    }
  });

  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const events = await db.query.events.findMany({
        orderBy: desc(schema.events.date)
      });
      res.json({ success: true, data: events });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const event = await db.query.events.findFirst({
        where: eq(schema.events.id, req.params.id)
      });

      if (!event) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      const rsvpCount = await db.select({ count: sql<number>`count(*)` })
        .from(schema.eventRsvps)
        .where(and(
          eq(schema.eventRsvps.eventId, req.params.id),
          eq(schema.eventRsvps.status, "confirmed")
        ));

      res.json({ success: true, data: { ...event, rsvpCount: rsvpCount[0]?.count || 0 } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch event" });
    }
  });

  app.post("/api/events", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const eventData = schema.insertEventSchema.parse(req.body);
      const [event] = await db.insert(schema.events).values(eventData).returning();
      res.json({ success: true, data: event });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const [event] = await db.update(schema.events)
        .set(req.body)
        .where(eq(schema.events.id, req.params.id))
        .returning();

      if (!event) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      res.json({ success: true, data: event });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.events).where(eq(schema.events.id, req.params.id));
      res.json({ success: true, data: { message: "Event deleted" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete event" });
    }
  });

  app.post("/api/events/:id/rsvp", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.eventRsvps.findFirst({
        where: and(
          eq(schema.eventRsvps.eventId, req.params.id),
          eq(schema.eventRsvps.memberId, member.id)
        )
      });

      if (existing) {
        const [updated] = await db.update(schema.eventRsvps)
          .set({ status: "confirmed" })
          .where(eq(schema.eventRsvps.id, existing.id))
          .returning();
        return res.json({ success: true, data: updated });
      }

      const [rsvp] = await db.insert(schema.eventRsvps)
        .values({
          eventId: req.params.id,
          memberId: member.id,
          status: "confirmed"
        })
        .returning();

      res.json({ success: true, data: rsvp });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to RSVP" });
    }
  });

  app.delete("/api/events/:id/rsvp", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.update(schema.eventRsvps)
        .set({ status: "cancelled" })
        .where(and(
          eq(schema.eventRsvps.eventId, req.params.id),
          eq(schema.eventRsvps.memberId, member.id)
        ));

      res.json({ success: true, data: { message: "RSVP cancelled" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to cancel RSVP" });
    }
  });

  app.get("/api/events/:id/attendees", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const attendees = await db.query.eventRsvps.findMany({
        where: and(
          eq(schema.eventRsvps.eventId, req.params.id),
          eq(schema.eventRsvps.status, "confirmed")
        ),
        with: {
          member: {
            with: { user: true }
          }
        }
      });

      res.json({ success: true, data: attendees });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch attendees" });
    }
  });

  app.get("/api/elections", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      let elections;

      if (status) {
        elections = await db.query.elections.findMany({
          where: eq(schema.elections.status, status as any),
          orderBy: desc(schema.elections.startDate)
        });
      } else {
        elections = await db.query.elections.findMany({
          orderBy: desc(schema.elections.startDate)
        });
      }

      res.json({ success: true, data: elections });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch elections" });
    }
  });

  app.get("/api/elections/:id", async (req: Request, res: Response) => {
    try {
      const election = await db.query.elections.findFirst({
        where: eq(schema.elections.id, req.params.id),
        with: { candidates: true }
      });

      if (!election) {
        return res.status(404).json({ success: false, error: "Election not found" });
      }

      res.json({ success: true, data: election });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch election" });
    }
  });

  app.post("/api/elections", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const electionData = schema.insertElectionSchema.parse(req.body);
      const [election] = await db.insert(schema.elections).values(electionData).returning();
      res.json({ success: true, data: election });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create election" });
    }
  });

  app.patch("/api/elections/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [election] = await db.update(schema.elections)
        .set(req.body)
        .where(eq(schema.elections.id, req.params.id))
        .returning();

      res.json({ success: true, data: election });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update election" });
    }
  });

  app.post("/api/elections/:id/candidates", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const candidateData = schema.insertCandidateSchema.parse({
        ...req.body,
        electionId: req.params.id
      });

      const [candidate] = await db.insert(schema.candidates).values(candidateData).returning();
      res.json({ success: true, data: candidate });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to add candidate" });
    }
  });

  app.post("/api/elections/:id/vote", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { candidateId } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existingVote = await db.query.votes.findFirst({
        where: and(
          eq(schema.votes.electionId, req.params.id),
          eq(schema.votes.voterId, member.id)
        )
      });

      if (existingVote) {
        return res.status(400).json({ success: false, error: "You have already voted in this election" });
      }

      const [vote] = await db.insert(schema.votes).values({
        electionId: req.params.id,
        candidateId,
        voterId: member.id,
        blockchainHash: `hash-${Date.now()}`
      }).returning();

      await db.update(schema.candidates)
        .set({ votes: sql`${schema.candidates.votes} + 1` })
        .where(eq(schema.candidates.id, candidateId));

      await db.update(schema.elections)
        .set({ totalVotes: sql`${schema.elections.totalVotes} + 1` })
        .where(eq(schema.elections.id, req.params.id));

      res.json({ success: true, data: vote });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to cast vote" });
    }
  });

  app.get("/api/elections/:id/results", async (req: Request, res: Response) => {
    try {
      const election = await db.query.elections.findFirst({
        where: eq(schema.elections.id, req.params.id),
        with: { candidates: true }
      });

      if (!election) {
        return res.status(404).json({ success: false, error: "Election not found" });
      }

      const sortedCandidates = [...election.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));

      res.json({
        success: true,
        data: {
          election,
          candidates: sortedCandidates,
          totalVotes: election.totalVotes
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch results" });
    }
  });

  app.get("/api/quizzes", async (req: Request, res: Response) => {
    try {
      const quizzes = await db.query.quizzes.findMany({
        orderBy: desc(schema.quizzes.createdAt)
      });
      res.json({ success: true, data: quizzes });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch quizzes" });
    }
  });

  app.get("/api/quizzes/:id", async (req: Request, res: Response) => {
    try {
      const quiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, req.params.id)
      });

      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found" });
      }

      res.json({ success: true, data: quiz });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch quiz" });
    }
  });

  app.post("/api/quizzes", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const quizData = schema.insertQuizSchema.parse(req.body);
      const [quiz] = await db.insert(schema.quizzes).values(quizData).returning();
      res.json({ success: true, data: quiz });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create quiz" });
    }
  });

  app.post("/api/quizzes/:id/attempt", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { selectedAnswer } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const quiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, req.params.id)
      });

      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found" });
      }

      const isCorrect = selectedAnswer === quiz.correctAnswer;
      const pointsEarned = isCorrect ? quiz.points : 0;

      const [attempt] = await db.insert(schema.quizAttempts).values({
        quizId: req.params.id,
        memberId: member.id,
        selectedAnswer,
        isCorrect,
        pointsEarned
      }).returning();

      if (isCorrect) {
        await db.insert(schema.userPoints).values({
          memberId: member.id,
          source: "quiz",
          amount: pointsEarned,
          points: pointsEarned
        });
      }

      res.json({ success: true, data: { attempt, isCorrect, pointsEarned } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to submit quiz attempt" });
    }
  });

  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const { difficulty, status } = req.query;
      let tasks;

      if (difficulty) {
        tasks = await db.query.volunteerTasks.findMany({
          where: eq(schema.volunteerTasks.difficulty, difficulty as any),
          orderBy: desc(schema.volunteerTasks.createdAt)
        });
      } else {
        tasks = await db.query.volunteerTasks.findMany({
          orderBy: desc(schema.volunteerTasks.createdAt)
        });
      }

      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const task = await db.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const taskData = schema.insertVolunteerTaskSchema.parse(req.body);
      const [task] = await db.insert(schema.volunteerTasks).values(taskData).returning();
      res.json({ success: true, data: task });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create task" });
    }
  });

  app.post("/api/tasks/:id/apply", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.taskApplications.findFirst({
        where: and(
          eq(schema.taskApplications.taskId, req.params.id),
          eq(schema.taskApplications.memberId, member.id)
        )
      });

      if (existing) {
        return res.status(400).json({ success: false, error: "You have already applied for this task" });
      }

      const [application] = await db.insert(schema.taskApplications).values({
        taskId: req.params.id,
        memberId: member.id,
        status: "pending"
      }).returning();

      res.json({ success: true, data: application });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to apply for task" });
    }
  });

  app.post("/api/tasks/:id/complete", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [application] = await db.update(schema.taskApplications)
        .set({ status: "completed" })
        .where(and(
          eq(schema.taskApplications.taskId, req.params.id),
          eq(schema.taskApplications.memberId, member.id)
        ))
        .returning();

      res.json({ success: true, data: application });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to complete task" });
    }
  });

  app.patch("/api/tasks/:id/approve", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { memberId } = req.body;

      const task = await db.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      await db.update(schema.taskApplications)
        .set({ status: "accepted" })
        .where(and(
          eq(schema.taskApplications.taskId, req.params.id),
          eq(schema.taskApplications.memberId, memberId)
        ));

      await db.insert(schema.userPoints).values({
        memberId,
        source: "task",
        amount: task.points,
        points: task.points
      });

      res.json({ success: true, data: { message: "Task approved and points awarded" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to approve task" });
    }
  });

  app.get("/api/campaigns", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      let campaigns;

      if (status) {
        campaigns = await db.query.issueCampaigns.findMany({
          where: eq(schema.issueCampaigns.status, status as any),
          orderBy: desc(schema.issueCampaigns.createdAt),
          with: { author: { with: { user: true } } }
        });
      } else {
        campaigns = await db.query.issueCampaigns.findMany({
          orderBy: desc(schema.issueCampaigns.createdAt),
          with: { author: { with: { user: true } } }
        });
      }

      res.json({ success: true, data: campaigns });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaign = await db.query.issueCampaigns.findFirst({
        where: eq(schema.issueCampaigns.id, req.params.id),
        with: {
          author: { with: { user: true } }
        }
      });

      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      const comments = await db.query.campaignComments.findMany({
        where: eq(schema.campaignComments.campaignId, req.params.id),
        with: { member: { with: { user: true } } },
        orderBy: desc(schema.campaignComments.createdAt)
      });

      res.json({ success: true, data: { ...campaign, comments } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/campaigns", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const campaignData = schema.insertCampaignSchema.parse({
        ...req.body,
        authorId: member.id
      });

      const [campaign] = await db.insert(schema.issueCampaigns).values(campaignData).returning();
      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const [campaign] = await db.update(schema.issueCampaigns)
        .set(req.body)
        .where(eq(schema.issueCampaigns.id, req.params.id))
        .returning();

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update campaign" });
    }
  });

  app.post("/api/campaigns/:id/vote", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.campaignVotes.findFirst({
        where: and(
          eq(schema.campaignVotes.campaignId, req.params.id),
          eq(schema.campaignVotes.memberId, member.id)
        )
      });

      if (existing) {
        return res.status(400).json({ success: false, error: "You have already voted on this campaign" });
      }

      const [vote] = await db.insert(schema.campaignVotes).values({
        campaignId: req.params.id,
        memberId: member.id
      }).returning();

      await db.update(schema.issueCampaigns)
        .set({ currentVotes: sql`${schema.issueCampaigns.currentVotes} + 1` })
        .where(eq(schema.issueCampaigns.id, req.params.id));

      res.json({ success: true, data: vote });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to vote on campaign" });
    }
  });

  app.post("/api/campaigns/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [comment] = await db.insert(schema.campaignComments).values({
        campaignId: req.params.id,
        memberId: member.id,
        content
      }).returning();

      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to add comment" });
    }
  });

  app.patch("/api/campaigns/:id/approve", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [campaign] = await db.update(schema.issueCampaigns)
        .set({ status: "approved" })
        .where(eq(schema.issueCampaigns.id, req.params.id))
        .returning();

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to approve campaign" });
    }
  });

  app.get("/api/gamification/badges", async (req: Request, res: Response) => {
    try {
      const badges = await db.query.badges.findMany();
      res.json({ success: true, data: badges });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch badges" });
    }
  });

  app.get("/api/gamification/leaderboard", async (req: Request, res: Response) => {
    try {
      const leaderboard = await db
        .select({
          memberId: schema.userPoints.memberId,
          totalPoints: sql<number>`SUM(${schema.userPoints.amount})`,
          member: schema.members,
          user: schema.users
        })
        .from(schema.userPoints)
        .leftJoin(schema.members, eq(schema.userPoints.memberId, schema.members.id))
        .leftJoin(schema.users, eq(schema.members.userId, schema.users.id))
        .groupBy(schema.userPoints.memberId, schema.members.id, schema.users.id)
        .orderBy(desc(sql`SUM(${schema.userPoints.amount})`))
        .limit(100);

      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/gamification/my-stats", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const points = await db
        .select({ total: sql<number>`SUM(${schema.userPoints.amount})` })
        .from(schema.userPoints)
        .where(eq(schema.userPoints.memberId, member.id));

      const badges = await db.query.userBadges.findMany({
        where: eq(schema.userBadges.memberId, member.id),
        with: { badge: true }
      });

      res.json({
        success: true,
        data: {
          totalPoints: points[0]?.total || 0,
          badges: badges.map(b => b.badge)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  });

  app.get("/api/micro-tasks", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const tasks = await db.query.microTasks.findMany({
        orderBy: desc(schema.microTasks.createdAt)
      });
      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch micro-tasks" });
    }
  });

  app.post("/api/micro-tasks/:id/complete", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { proofUrl } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [completion] = await db.insert(schema.taskCompletions).values({
        taskId: req.params.id,
        memberId: member.id,
        proofUrl,
        status: "pending"
      }).returning();

      res.json({ success: true, data: completion });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to complete micro-task" });
    }
  });

  app.patch("/api/micro-tasks/:id/verify", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { completionId } = req.body;

      const completion = await db.query.taskCompletions.findFirst({
        where: eq(schema.taskCompletions.id, completionId),
        with: { task: true }
      });

      if (!completion) {
        return res.status(404).json({ success: false, error: "Completion not found" });
      }

      await db.update(schema.taskCompletions)
        .set({ status: "approved" })
        .where(eq(schema.taskCompletions.id, completionId));

      await db.insert(schema.userPoints).values({
        memberId: completion.memberId,
        source: "micro-task",
        amount: completion.task.points,
        points: completion.task.points
      });

      res.json({ success: true, data: { message: "Micro-task verified and points awarded" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to verify micro-task" });
    }
  });

  app.get("/api/incidents", async (req: Request, res: Response) => {
    try {
      const { severity } = req.query;
      let incidents;

      if (severity) {
        incidents = await db.query.incidents.findMany({
          where: eq(schema.incidents.severity, severity as any),
          orderBy: desc(schema.incidents.createdAt),
          with: { pollingUnit: true, reporter: { with: { user: true } } }
        });
      } else {
        incidents = await db.query.incidents.findMany({
          orderBy: desc(schema.incidents.createdAt),
          with: { pollingUnit: true, reporter: { with: { user: true } } }
        });
      }

      res.json({ success: true, data: incidents });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch incidents" });
    }
  });

  app.get("/api/incidents/:id", async (req: Request, res: Response) => {
    try {
      const incident = await db.query.incidents.findFirst({
        where: eq(schema.incidents.id, req.params.id),
        with: {
          pollingUnit: true,
          reporter: { with: { user: true } }
        }
      });

      if (!incident) {
        return res.status(404).json({ success: false, error: "Incident not found" });
      }

      const media = await db.query.incidentMedia.findMany({
        where: eq(schema.incidentMedia.incidentId, req.params.id)
      });

      res.json({ success: true, data: { ...incident, media } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch incident" });
    }
  });

  app.post("/api/incidents", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const incidentData = schema.insertIncidentSchema.parse({
        ...req.body,
        reporterId: member.id
      });

      const [incident] = await db.insert(schema.incidents).values(incidentData).returning();

      io.emit("incident:new", incident);

      res.json({ success: true, data: incident });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to report incident" });
    }
  });

  app.patch("/api/incidents/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const [incident] = await db.update(schema.incidents)
        .set(req.body)
        .where(eq(schema.incidents.id, req.params.id))
        .returning();

      io.emit("incident:updated", incident);

      res.json({ success: true, data: incident });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update incident" });
    }
  });

  app.post("/api/incidents/:id/media", requireAuth, upload.single("media"), async (req: AuthRequest, res: Response) => {
    try {
      const mediaUrl = `/uploads/${Date.now()}-${req.file?.originalname || "media"}`;
      const mediaType = req.file?.mimetype.startsWith("video") ? "video" : "image";

      const [media] = await db.insert(schema.incidentMedia).values({
        incidentId: req.params.id,
        mediaUrl,
        mediaType
      }).returning();

      res.json({ success: true, data: media });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to upload media" });
    }
  });

  app.get("/api/situation-room/polling-units", async (req: Request, res: Response) => {
    try {
      const units = await db.query.pollingUnits.findMany({
        with: { ward: { with: { lga: { with: { state: true } } } } },
        orderBy: desc(schema.pollingUnits.lastUpdate)
      });
      res.json({ success: true, data: units });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch polling units" });
    }
  });

  app.get("/api/situation-room/dashboard", async (req: Request, res: Response) => {
    try {
      const totalUnits = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pollingUnits);

      const activeUnits = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pollingUnits)
        .where(eq(schema.pollingUnits.status, "active"));

      const completedUnits = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pollingUnits)
        .where(eq(schema.pollingUnits.status, "completed"));

      const incidentUnits = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pollingUnits)
        .where(eq(schema.pollingUnits.status, "incident"));

      const totalVotes = await db.select({ total: sql<number>`SUM(${schema.pollingUnits.votes})` })
        .from(schema.pollingUnits);

      const recentIncidents = await db.query.incidents.findMany({
        orderBy: desc(schema.incidents.createdAt),
        limit: 10,
        with: { pollingUnit: true }
      });

      res.json({
        success: true,
        data: {
          totalUnits: totalUnits[0]?.count || 0,
          activeUnits: activeUnits[0]?.count || 0,
          completedUnits: completedUnits[0]?.count || 0,
          incidentUnits: incidentUnits[0]?.count || 0,
          totalVotes: totalVotes[0]?.total || 0,
          recentIncidents
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
    }
  });

  app.patch("/api/situation-room/polling-units/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const [unit] = await db.update(schema.pollingUnits)
        .set({ ...req.body, lastUpdate: new Date() })
        .where(eq(schema.pollingUnits.id, req.params.id))
        .returning();

      io.emit("polling-unit:updated", unit);

      res.json({ success: true, data: unit });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update polling unit" });
    }
  });

  app.get("/api/news", async (req: Request, res: Response) => {
    try {
      const posts = await db.query.newsPosts.findMany({
        orderBy: desc(schema.newsPosts.publishedAt),
        with: { author: true }
      });
      res.json({ success: true, data: posts });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req: Request, res: Response) => {
    try {
      const post = await db.query.newsPosts.findFirst({
        where: eq(schema.newsPosts.id, req.params.id),
        with: { author: true }
      });

      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      const engagement = await db.query.postEngagement.findMany({
        where: eq(schema.postEngagement.postId, req.params.id),
        with: { member: { with: { user: true } } }
      });

      res.json({ success: true, data: { ...post, engagement } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch post" });
    }
  });

  app.post("/api/news", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const postData = schema.insertNewsPostSchema.parse({
        ...req.body,
        authorId: req.user!.id
      });

      const [post] = await db.insert(schema.newsPosts).values(postData).returning();
      res.json({ success: true, data: post });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create post" });
    }
  });

  app.post("/api/news/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.postEngagement.findFirst({
        where: and(
          eq(schema.postEngagement.postId, req.params.id),
          eq(schema.postEngagement.memberId, member.id),
          eq(schema.postEngagement.type, "like")
        )
      });

      if (existing) {
        await db.delete(schema.postEngagement).where(eq(schema.postEngagement.id, existing.id));
        await db.update(schema.newsPosts)
          .set({ likes: sql`${schema.newsPosts.likes} - 1` })
          .where(eq(schema.newsPosts.id, req.params.id));
        return res.json({ success: true, data: { liked: false } });
      }

      await db.insert(schema.postEngagement).values({
        postId: req.params.id,
        memberId: member.id,
        type: "like"
      });

      await db.update(schema.newsPosts)
        .set({ likes: sql`${schema.newsPosts.likes} + 1` })
        .where(eq(schema.newsPosts.id, req.params.id));

      res.json({ success: true, data: { liked: true } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to like post" });
    }
  });

  app.post("/api/news/:id/comment", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [comment] = await db.insert(schema.postEngagement).values({
        postId: req.params.id,
        memberId: member.id,
        type: "comment",
        content
      }).returning();

      await db.update(schema.newsPosts)
        .set({ comments: sql`${schema.newsPosts.comments} + 1` })
        .where(eq(schema.newsPosts.id, req.params.id));

      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to add comment" });
    }
  });

  app.get("/api/analytics/overview", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const totalMembers = await db.select({ count: sql<number>`count(*)` })
        .from(schema.members);

      const activeMembers = await db.select({ count: sql<number>`count(*)` })
        .from(schema.members)
        .where(eq(schema.members.status, "active"));

      const totalEvents = await db.select({ count: sql<number>`count(*)` })
        .from(schema.events);

      const totalElections = await db.select({ count: sql<number>`count(*)` })
        .from(schema.elections);

      const totalVotes = await db.select({ count: sql<number>`count(*)` })
        .from(schema.votes);

      res.json({
        success: true,
        data: {
          totalMembers: totalMembers[0]?.count || 0,
          activeMembers: activeMembers[0]?.count || 0,
          totalEvents: totalEvents[0]?.count || 0,
          totalElections: totalElections[0]?.count || 0,
          totalVotes: totalVotes[0]?.count || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/membership-stats", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const statsByWard = await db
        .select({
          wardId: schema.members.wardId,
          count: sql<number>`count(*)`,
          ward: schema.wards
        })
        .from(schema.members)
        .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
        .groupBy(schema.members.wardId, schema.wards.id);

      res.json({ success: true, data: statsByWard });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch membership stats" });
    }
  });

  app.get("/api/analytics/engagement-metrics", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const totalRsvps = await db.select({ count: sql<number>`count(*)` })
        .from(schema.eventRsvps);

      const totalQuizAttempts = await db.select({ count: sql<number>`count(*)` })
        .from(schema.quizAttempts);

      const totalTaskApplications = await db.select({ count: sql<number>`count(*)` })
        .from(schema.taskApplications);

      const totalCampaignVotes = await db.select({ count: sql<number>`count(*)` })
        .from(schema.campaignVotes);

      res.json({
        success: true,
        data: {
          totalRsvps: totalRsvps[0]?.count || 0,
          totalQuizAttempts: totalQuizAttempts[0]?.count || 0,
          totalTaskApplications: totalTaskApplications[0]?.count || 0,
          totalCampaignVotes: totalCampaignVotes[0]?.count || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch engagement metrics" });
    }
  });

  app.get("/api/analytics/dues-summary", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const totalDues = await db.select({ total: sql<number>`SUM(CAST(${schema.membershipDues.amount} AS NUMERIC))` })
        .from(schema.membershipDues);

      const paidDues = await db.select({ total: sql<number>`SUM(CAST(${schema.membershipDues.amount} AS NUMERIC))` })
        .from(schema.membershipDues)
        .where(eq(schema.membershipDues.status, "paid"));

      const pendingDues = await db.select({ total: sql<number>`SUM(CAST(${schema.membershipDues.amount} AS NUMERIC))` })
        .from(schema.membershipDues)
        .where(eq(schema.membershipDues.status, "pending"));

      res.json({
        success: true,
        data: {
          totalDues: totalDues[0]?.total || 0,
          paidDues: paidDues[0]?.total || 0,
          pendingDues: pendingDues[0]?.total || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch dues summary" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const notifications = await db.query.notifications.findMany({
        where: eq(schema.notifications.memberId, member.id),
        orderBy: desc(schema.notifications.createdAt)
      });

      res.json({ success: true, data: notifications });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const [notification] = await db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, req.params.id))
        .returning();

      res.json({ success: true, data: notification });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.memberId, member.id));

      res.json({ success: true, data: { message: "All notifications marked as read" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to mark all notifications as read" });
    }
  });

  app.get("/api/analytics/public-overview", async (req: Request, res: Response) => {
    try {
      const totalMembers = await db.select({ count: sql<number>`count(*)` })
        .from(schema.members);

      const activeMembers = await db.select({ count: sql<number>`count(*)` })
        .from(schema.members)
        .where(eq(schema.members.status, "active"));

      const totalEvents = await db.select({ count: sql<number>`count(*)` })
        .from(schema.events);

      const totalElections = await db.select({ count: sql<number>`count(*)` })
        .from(schema.elections);

      const totalVotes = await db.select({ count: sql<number>`count(*)` })
        .from(schema.votes);

      res.json({
        success: true,
        data: {
          totalMembers: totalMembers[0]?.count || 0,
          activeMembers: activeMembers[0]?.count || 0,
          totalEvents: totalEvents[0]?.count || 0,
          totalElections: totalElections[0]?.count || 0,
          totalVotes: totalVotes[0]?.count || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch analytics" });
    }
  });

  app.patch("/api/users/:userId/role", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { role } = req.body;
      
      if (!["member", "coordinator", "admin"].includes(role)) {
        return res.status(400).json({ success: false, error: "Invalid role" });
      }

      const [user] = await db.update(schema.users)
        .set({ role })
        .where(eq(schema.users.id, req.params.userId))
        .returning();

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update user role" });
    }
  });

  app.patch("/api/campaigns/:id/reject", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [campaign] = await db.update(schema.issueCampaigns)
        .set({ status: "rejected" })
        .where(eq(schema.issueCampaigns.id, req.params.id))
        .returning();

      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to reject campaign" });
    }
  });

  app.post("/api/badges", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const badgeData = schema.insertBadgeSchema.parse(req.body);
      const [badge] = await db.insert(schema.badges).values(badgeData).returning();
      res.json({ success: true, data: badge });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create badge" });
    }
  });

  // Ideas Endpoints
  app.get("/api/ideas", async (req: Request, res: Response) => {
    try {
      const { category, status, sortBy = "date", limit = "20", offset = "0" } = req.query;
      
      let query = db.query.ideas.findMany({
        with: {
          member: { with: { user: true } },
          votes: true,
          comments: { with: { member: { with: { user: true } } } }
        },
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: sortBy === "votes" ? desc(schema.ideas.votesCount) : desc(schema.ideas.createdAt)
      });

      let ideas = await query;

      if (category) {
        ideas = ideas.filter(idea => idea.category === category);
      }

      if (status) {
        ideas = ideas.filter(idea => idea.status === status);
      }

      res.json({ success: true, data: ideas });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch ideas" });
    }
  });

  app.get("/api/ideas/:id", async (req: Request, res: Response) => {
    try {
      const idea = await db.query.ideas.findFirst({
        where: eq(schema.ideas.id, req.params.id),
        with: {
          member: { with: { user: true } },
          votes: { with: { member: { with: { user: true } } } },
          comments: { 
            with: { member: { with: { user: true } } },
            orderBy: desc(schema.ideaComments.createdAt)
          }
        }
      });

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      res.json({ success: true, data: idea });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch idea" });
    }
  });

  app.post("/api/ideas", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const ideaData = schema.insertIdeaSchema.parse({
        ...req.body,
        memberId: member.id
      });

      const [idea] = await db.insert(schema.ideas).values(ideaData).returning();
      res.json({ success: true, data: idea });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create idea" });
    }
  });

  app.patch("/api/ideas/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const idea = await db.query.ideas.findFirst({
        where: eq(schema.ideas.id, req.params.id),
        with: { member: true }
      });

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (idea.member.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      const [updated] = await db.update(schema.ideas)
        .set(req.body)
        .where(eq(schema.ideas.id, req.params.id))
        .returning();

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update idea" });
    }
  });

  app.delete("/api/ideas/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const idea = await db.query.ideas.findFirst({
        where: eq(schema.ideas.id, req.params.id),
        with: { member: true }
      });

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      if (idea.member.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      await db.delete(schema.ideas).where(eq(schema.ideas.id, req.params.id));
      res.json({ success: true, data: { message: "Idea deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete idea" });
    }
  });

  app.post("/api/ideas/:id/vote", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const { voteType } = req.body;

      if (!["upvote", "downvote"].includes(voteType)) {
        return res.status(400).json({ success: false, error: "Invalid vote type" });
      }

      const existingVote = await db.query.ideaVotes.findFirst({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.memberId, member.id)
        )
      });

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          return res.status(400).json({ success: false, error: "Already voted" });
        }
        await db.delete(schema.ideaVotes).where(eq(schema.ideaVotes.id, existingVote.id));
      }

      const [vote] = await db.insert(schema.ideaVotes).values({
        ideaId: req.params.id,
        memberId: member.id,
        voteType
      }).returning();

      const upvotes = await db.query.ideaVotes.findMany({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.voteType, "upvote")
        )
      });

      const downvotes = await db.query.ideaVotes.findMany({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.voteType, "downvote")
        )
      });

      await db.update(schema.ideas)
        .set({ votesCount: upvotes.length - downvotes.length })
        .where(eq(schema.ideas.id, req.params.id));

      res.json({ success: true, data: vote });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to vote on idea" });
    }
  });

  app.delete("/api/ideas/:id/vote", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const vote = await db.query.ideaVotes.findFirst({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.memberId, member.id)
        )
      });

      if (!vote) {
        return res.status(404).json({ success: false, error: "Vote not found" });
      }

      await db.delete(schema.ideaVotes).where(eq(schema.ideaVotes.id, vote.id));

      const upvotes = await db.query.ideaVotes.findMany({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.voteType, "upvote")
        )
      });

      const downvotes = await db.query.ideaVotes.findMany({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.voteType, "downvote")
        )
      });

      await db.update(schema.ideas)
        .set({ votesCount: upvotes.length - downvotes.length })
        .where(eq(schema.ideas.id, req.params.id));

      res.json({ success: true, data: { message: "Vote removed successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to remove vote" });
    }
  });

  app.post("/api/ideas/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const commentData = schema.insertIdeaCommentSchema.parse({
        ...req.body,
        ideaId: req.params.id,
        memberId: member.id
      });

      const [comment] = await db.insert(schema.ideaComments).values(commentData).returning();

      const commentsCount = await db.query.ideaComments.findMany({
        where: eq(schema.ideaComments.ideaId, req.params.id)
      });

      await db.update(schema.ideas)
        .set({ commentsCount: commentsCount.length })
        .where(eq(schema.ideas.id, req.params.id));

      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to add comment" });
    }
  });

  app.patch("/api/ideas/:id/status", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body;

      if (!["pending", "under_review", "approved", "rejected", "implemented"].includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status" });
      }

      const [idea] = await db.update(schema.ideas)
        .set({ status })
        .where(eq(schema.ideas.id, req.params.id))
        .returning();

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      res.json({ success: true, data: idea });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update idea status" });
    }
  });

  // Knowledge Base Endpoints
  app.get("/api/knowledge/categories", async (req: Request, res: Response) => {
    try {
      const categories = await db.query.knowledgeCategories.findMany({
        orderBy: asc(schema.knowledgeCategories.order)
      });
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch categories" });
    }
  });

  app.get("/api/knowledge/articles", async (req: Request, res: Response) => {
    try {
      const { category, published, limit = "20", offset = "0" } = req.query;

      let articles = await db.query.knowledgeArticles.findMany({
        with: {
          category: true,
          author: true
        },
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: desc(schema.knowledgeArticles.createdAt)
      });

      if (category) {
        articles = articles.filter(article => article.categoryId === category);
      }

      if (published !== undefined) {
        const isPublished = published === "true";
        articles = articles.filter(article => article.published === isPublished);
      }

      res.json({ success: true, data: articles });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch articles" });
    }
  });

  app.get("/api/knowledge/articles/:slug", async (req: Request, res: Response) => {
    try {
      const article = await db.query.knowledgeArticles.findFirst({
        where: eq(schema.knowledgeArticles.slug, req.params.slug),
        with: {
          category: true,
          author: true,
          feedback: true
        }
      });

      if (!article) {
        return res.status(404).json({ success: false, error: "Article not found" });
      }

      res.json({ success: true, data: article });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch article" });
    }
  });

  app.post("/api/knowledge/articles", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const articleData = schema.insertKnowledgeArticleSchema.parse({
        ...req.body,
        authorId: req.user!.id
      });

      const [article] = await db.insert(schema.knowledgeArticles).values(articleData).returning();
      res.json({ success: true, data: article });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create article" });
    }
  });

  app.patch("/api/knowledge/articles/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [article] = await db.update(schema.knowledgeArticles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(schema.knowledgeArticles.id, req.params.id))
        .returning();

      if (!article) {
        return res.status(404).json({ success: false, error: "Article not found" });
      }

      res.json({ success: true, data: article });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update article" });
    }
  });

  app.delete("/api/knowledge/articles/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.knowledgeArticles).where(eq(schema.knowledgeArticles.id, req.params.id));
      res.json({ success: true, data: { message: "Article deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete article" });
    }
  });

  app.post("/api/knowledge/articles/:id/view", async (req: Request, res: Response) => {
    try {
      const article = await db.query.knowledgeArticles.findFirst({
        where: eq(schema.knowledgeArticles.id, req.params.id)
      });

      if (!article) {
        return res.status(404).json({ success: false, error: "Article not found" });
      }

      await db.update(schema.knowledgeArticles)
        .set({ viewsCount: (article.viewsCount || 0) + 1 })
        .where(eq(schema.knowledgeArticles.id, req.params.id));

      res.json({ success: true, data: { message: "View count incremented" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to increment view count" });
    }
  });

  app.post("/api/knowledge/articles/:id/feedback", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const { helpful } = req.body;

      const existingFeedback = await db.query.articleFeedback.findFirst({
        where: and(
          eq(schema.articleFeedback.articleId, req.params.id),
          eq(schema.articleFeedback.memberId, member.id)
        )
      });

      if (existingFeedback) {
        await db.delete(schema.articleFeedback).where(eq(schema.articleFeedback.id, existingFeedback.id));
      }

      const [feedback] = await db.insert(schema.articleFeedback).values({
        articleId: req.params.id,
        memberId: member.id,
        helpful
      }).returning();

      const allFeedback = await db.query.articleFeedback.findMany({
        where: eq(schema.articleFeedback.articleId, req.params.id)
      });

      const helpfulCount = allFeedback.filter(f => f.helpful).length;

      await db.update(schema.knowledgeArticles)
        .set({ helpfulCount })
        .where(eq(schema.knowledgeArticles.id, req.params.id));

      res.json({ success: true, data: feedback });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to submit feedback" });
    }
  });

  app.get("/api/knowledge/faqs", async (req: Request, res: Response) => {
    try {
      const { category, published, limit = "50", offset = "0" } = req.query;

      let faqs = await db.query.faqs.findMany({
        with: { category: true },
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: asc(schema.faqs.order)
      });

      if (category) {
        faqs = faqs.filter(faq => faq.categoryId === category);
      }

      if (published !== undefined) {
        const isPublished = published === "true";
        faqs = faqs.filter(faq => faq.published === isPublished);
      }

      res.json({ success: true, data: faqs });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/knowledge/faqs", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const faqData = schema.insertFaqSchema.parse(req.body);
      const [faq] = await db.insert(schema.faqs).values(faqData).returning();
      res.json({ success: true, data: faq });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create FAQ" });
    }
  });

  app.patch("/api/knowledge/faqs/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [faq] = await db.update(schema.faqs)
        .set(req.body)
        .where(eq(schema.faqs.id, req.params.id))
        .returning();

      if (!faq) {
        return res.status(404).json({ success: false, error: "FAQ not found" });
      }

      res.json({ success: true, data: faq });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update FAQ" });
    }
  });

  app.delete("/api/knowledge/faqs/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.faqs).where(eq(schema.faqs.id, req.params.id));
      res.json({ success: true, data: { message: "FAQ deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete FAQ" });
    }
  });

  app.get("/api/knowledge/search", async (req: Request, res: Response) => {
    try {
      const { q, limit = "20" } = req.query;

      if (!q) {
        return res.status(400).json({ success: false, error: "Search query required" });
      }

      const searchQuery = (q as string).toLowerCase();

      const articles = await db.query.knowledgeArticles.findMany({
        with: { category: true, author: true },
        limit: parseInt(limit as string)
      });

      const faqs = await db.query.faqs.findMany({
        with: { category: true },
        limit: parseInt(limit as string)
      });

      const matchedArticles = articles.filter(article => 
        article.title.toLowerCase().includes(searchQuery) ||
        article.content.toLowerCase().includes(searchQuery) ||
        (article.summary && article.summary.toLowerCase().includes(searchQuery))
      );

      const matchedFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery) ||
        faq.answer.toLowerCase().includes(searchQuery)
      );

      res.json({
        success: true,
        data: {
          articles: matchedArticles,
          faqs: matchedFaqs
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Search failed" });
    }
  });

  // Donation Campaign Endpoints
  app.get("/api/donation-campaigns", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const campaigns = await db.query.donationCampaigns.findMany({
        where: status ? eq(schema.donationCampaigns.status, status as any) : undefined,
        with: {
          creator: {
            columns: {
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: desc(schema.donationCampaigns.createdAt)
      });

      res.json({ success: true, data: campaigns });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/donation-campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaign = await db.query.donationCampaigns.findFirst({
        where: eq(schema.donationCampaigns.id, req.params.id),
        with: {
          creator: {
            columns: {
              firstName: true,
              lastName: true,
            }
          },
          donations: {
            where: eq(schema.donations.paymentStatus, "completed"),
            orderBy: desc(schema.donations.createdAt),
            limit: 10,
          }
        }
      });

      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/donation-campaigns", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const campaignData = schema.insertDonationCampaignSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });

      const [campaign] = await db.insert(schema.donationCampaigns)
        .values(campaignData)
        .returning();

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Failed to create campaign" });
    }
  });

  app.patch("/api/donation-campaigns/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const updates = req.body;
      delete updates.id;
      delete updates.createdAt;
      delete updates.createdBy;
      
      updates.updatedAt = new Date();

      const [campaign] = await db.update(schema.donationCampaigns)
        .set(updates)
        .where(eq(schema.donationCampaigns.id, req.params.id))
        .returning();

      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to update campaign" });
    }
  });

  app.delete("/api/donation-campaigns/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.donationCampaigns)
        .where(eq(schema.donationCampaigns.id, req.params.id));

      res.json({ success: true, data: { message: "Campaign deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete campaign" });
    }
  });

  // Donation Endpoints
  app.post("/api/donations/create", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, campaign_id, is_anonymous, message } = req.body;
      const member_id = req.user!.id;

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, member_id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [donation] = await db.insert(schema.donations).values({
        id: crypto.randomUUID(),
        memberId: member.id,
        campaignId: campaign_id || null,
        amount: amount * 100,
        currency: "NGN",
        paymentMethod: "paystack",
        paymentStatus: "pending",
        isAnonymous: is_anonymous || false,
        message: message || null,
      }).returning();

      const paystackResponse = await paystack.transaction.initialize({
        email: member.user.email,
        amount: amount * 100,
        reference: donation.id,
        callback_url: `${process.env.VITE_BASE_URL || "http://localhost:5000"}/donations/verify`,
        metadata: {
          donation_id: donation.id,
          campaign_id: campaign_id || null,
          member_id: member.id,
        }
      });

      res.json({
        success: true,
        data: {
          authorization_url: paystackResponse.data.authorization_url,
          access_code: paystackResponse.data.access_code,
          reference: paystackResponse.data.reference,
        }
      });
    } catch (error: any) {
      console.error("Donation creation error:", error);
      res.status(500).json({ success: false, error: "Failed to create donation" });
    }
  });

  app.post("/api/donations/verify", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;

      const verification = await paystack.transaction.verify(reference);

      if (verification.data.status === "success") {
        await db.update(schema.donations)
          .set({
            paymentStatus: "completed",
            paystackReference: reference,
          })
          .where(eq(schema.donations.id, reference));

        const donation = await db.query.donations.findFirst({
          where: eq(schema.donations.id, reference)
        });

        if (donation && donation.campaignId) {
          await db.update(schema.donationCampaigns)
            .set({
              currentAmount: sql`current_amount + ${donation.amount}`,
            })
            .where(eq(schema.donationCampaigns.id, donation.campaignId));
        }

        res.json({ success: true, data: { donation } });
      } else {
        await db.update(schema.donations)
          .set({ paymentStatus: "failed" })
          .where(eq(schema.donations.id, reference));

        res.status(400).json({ success: false, error: "Payment verification failed" });
      }
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(500).json({ success: false, error: "Failed to verify payment" });
    }
  });

  app.post("/api/donations/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const { donationId, campaignId, isRecurring, memberId } = session.metadata;

        await db.update(schema.donations)
          .set({ 
            paymentStatus: "completed",
            stripePaymentIntentId: session.payment_intent || session.subscription || session.id
          })
          .where(eq(schema.donations.id, donationId));

        const donation = await db.query.donations.findFirst({
          where: eq(schema.donations.id, donationId)
        });

        if (campaignId && donation) {
          await db.update(schema.donationCampaigns)
            .set({ 
              currentAmount: sql`${schema.donationCampaigns.currentAmount} + ${donation.amount}` 
            })
            .where(eq(schema.donationCampaigns.id, campaignId));
        }

        if (isRecurring === "true" && memberId && donation) {
          const nextPaymentDate = new Date();
          if (donation.recurringFrequency === "monthly") {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          } else if (donation.recurringFrequency === "quarterly") {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
          } else if (donation.recurringFrequency === "yearly") {
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
          }

          await db.insert(schema.recurringDonations).values({
            donationId,
            memberId,
            campaignId: campaignId || null,
            amount: donation.amount,
            frequency: donation.recurringFrequency!,
            status: "active",
            nextPaymentDate,
            stripeSubscriptionId: session.subscription || null,
          });
        }
      } else if (event.type === "invoice.payment_succeeded" && event.data.object.subscription) {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;

        const recurring = await db.query.recurringDonations.findFirst({
          where: eq(schema.recurringDonations.stripeSubscriptionId, subscriptionId)
        });

        if (recurring) {
          const [newDonation] = await db.insert(schema.donations).values({
            memberId: recurring.memberId,
            campaignId: recurring.campaignId,
            amount: recurring.amount,
            currency: "NGN",
            paymentMethod: "stripe",
            paymentStatus: "completed",
            stripePaymentIntentId: invoice.payment_intent,
            isRecurring: true,
            recurringFrequency: recurring.frequency,
          }).returning();

          if (recurring.campaignId) {
            await db.update(schema.donationCampaigns)
              .set({ 
                currentAmount: sql`${schema.donationCampaigns.currentAmount} + ${recurring.amount}` 
              })
              .where(eq(schema.donationCampaigns.id, recurring.campaignId));
          }

          const nextPaymentDate = new Date();
          if (recurring.frequency === "monthly") {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          } else if (recurring.frequency === "quarterly") {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
          } else if (recurring.frequency === "yearly") {
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
          }

          await db.update(schema.recurringDonations)
            .set({ 
              nextPaymentDate,
              updatedAt: new Date()
            })
            .where(eq(schema.recurringDonations.id, recurring.id));
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.get("/api/donations", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const donations = await db.query.donations.findMany({
        where: eq(schema.donations.memberId, member.id),
        with: {
          campaign: true
        },
        orderBy: desc(schema.donations.createdAt)
      });

      res.json({ success: true, data: donations });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch donations" });
    }
  });

  app.get("/api/donations/recent", async (req: Request, res: Response) => {
    try {
      const { limit = "10" } = req.query;

      const donations = await db.query.donations.findMany({
        where: eq(schema.donations.paymentStatus, "completed"),
        with: {
          member: {
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                }
              }
            }
          },
          campaign: {
            columns: {
              title: true,
            }
          }
        },
        orderBy: desc(schema.donations.createdAt),
        limit: parseInt(limit as string)
      });

      const publicDonations = donations.map(donation => ({
        id: donation.id,
        amount: donation.amount,
        campaignTitle: donation.campaign?.title || "General Fund",
        donorName: donation.isAnonymous 
          ? "Anonymous" 
          : donation.donorName || (donation.member ? `${donation.member.user.firstName} ${donation.member.user.lastName}` : "Anonymous"),
        message: donation.message,
        createdAt: donation.createdAt,
      }));

      res.json({ success: true, data: publicDonations });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch recent donations" });
    }
  });

  app.get("/api/donations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const donation = await db.query.donations.findFirst({
        where: eq(schema.donations.id, req.params.id),
        with: {
          campaign: true,
          member: {
            with: { user: true }
          }
        }
      });

      if (!donation) {
        return res.status(404).json({ success: false, error: "Donation not found" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (donation.memberId !== member?.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      res.json({ success: true, data: donation });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch donation" });
    }
  });

  app.post("/api/recurring-donations/:id/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const recurring = await db.query.recurringDonations.findFirst({
        where: eq(schema.recurringDonations.id, req.params.id)
      });

      if (!recurring) {
        return res.status(404).json({ success: false, error: "Recurring donation not found" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (recurring.memberId !== member?.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      if (recurring.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(recurring.stripeSubscriptionId);
      }

      const [updated] = await db.update(schema.recurringDonations)
        .set({ 
          status: "cancelled",
          updatedAt: new Date()
        })
        .where(eq(schema.recurringDonations.id, req.params.id))
        .returning();

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to cancel recurring donation" });
    }
  });

  // Admin Donation Endpoints
  app.get("/api/admin/donations", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { status, campaignId, startDate, endDate } = req.query;

      let whereConditions: any[] = [];
      
      if (status) {
        whereConditions.push(eq(schema.donations.paymentStatus, status as any));
      }
      if (campaignId) {
        whereConditions.push(eq(schema.donations.campaignId, campaignId as string));
      }
      if (startDate) {
        whereConditions.push(gte(schema.donations.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        whereConditions.push(lte(schema.donations.createdAt, new Date(endDate as string)));
      }

      const donations = await db.query.donations.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: {
          member: {
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          campaign: true
        },
        orderBy: desc(schema.donations.createdAt)
      });

      res.json({ success: true, data: donations });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch donations" });
    }
  });

  app.get("/api/admin/donations/stats", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId } = req.query;

      const completedConditions = [eq(schema.donations.paymentStatus, "completed")];
      if (campaignId) {
        completedConditions.push(eq(schema.donations.campaignId, campaignId as string));
      }

      const totalRaised = await db
        .select({ sum: sql<number>`COALESCE(SUM(${schema.donations.amount}), 0)` })
        .from(schema.donations)
        .where(and(...completedConditions));

      const donorCount = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${schema.donations.memberId})` })
        .from(schema.donations)
        .where(and(...completedConditions));

      const donationCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.donations)
        .where(and(...completedConditions));

      const recurringCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.recurringDonations)
        .where(eq(schema.recurringDonations.status, "active"));

      const averageDonation = totalRaised[0].sum > 0 
        ? Math.round(totalRaised[0].sum / donationCount[0].count)
        : 0;

      res.json({
        success: true,
        data: {
          totalRaised: totalRaised[0].sum,
          donorCount: donorCount[0].count,
          donationCount: donationCount[0].count,
          recurringDonationsActive: recurringCount[0].count,
          averageDonation,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch donation stats" });
    }
  });

  app.post("/api/admin/donations/:id/refund", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const donation = await db.query.donations.findFirst({
        where: eq(schema.donations.id, req.params.id)
      });

      if (!donation) {
        return res.status(404).json({ success: false, error: "Donation not found" });
      }

      if (donation.paymentStatus !== "completed") {
        return res.status(400).json({ success: false, error: "Can only refund completed donations" });
      }

      if (!donation.stripePaymentIntentId) {
        return res.status(400).json({ success: false, error: "No payment intent found" });
      }

      try {
        await stripe.refunds.create({
          payment_intent: donation.stripePaymentIntentId,
        });
      } catch (stripeError: any) {
        console.error("Stripe refund error:", stripeError);
        return res.status(400).json({ success: false, error: "Stripe refund failed: " + stripeError.message });
      }

      const [updated] = await db.update(schema.donations)
        .set({ paymentStatus: "refunded" })
        .where(eq(schema.donations.id, req.params.id))
        .returning();

      if (donation.campaignId) {
        await db.update(schema.donationCampaigns)
          .set({ 
            currentAmount: sql`GREATEST(${schema.donationCampaigns.currentAmount} - ${donation.amount}, 0)` 
          })
          .where(eq(schema.donationCampaigns.id, donation.campaignId));
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Refund error:", error);
      res.status(500).json({ success: false, error: "Failed to process refund" });
    }
  });

  // Chatbot Endpoints
  app.post("/api/chatbot/conversations", async (req: Request, res: Response) => {
    try {
      const { memberId, sessionId } = req.body;
      const [conversation] = await db.insert(schema.chatbotConversations)
        .values({ memberId, sessionId })
        .returning();
      res.json({ success: true, data: conversation });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create conversation" });
    }
  });

  app.get("/api/chatbot/conversations/:id", async (req: Request, res: Response) => {
    try {
      const conversation = await db.query.chatbotConversations.findFirst({
        where: eq(schema.chatbotConversations.id, req.params.id),
        with: {
          messages: {
            orderBy: asc(schema.chatbotMessages.createdAt)
          }
        }
      });

      if (!conversation) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      res.json({ success: true, data: conversation });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/chatbot/message", async (req: AuthRequest, res: Response) => {
    try {
      const { conversation_id, message, session_id } = req.body;
      
      let memberId = null;
      let memberContext = "";

      if (req.isAuthenticated() && req.user) {
        const member = await db.query.members.findFirst({
          where: eq(schema.members.userId, req.user.id),
          with: {
            user: true,
            ward: {
              with: {
                lga: {
                  with: { state: true }
                }
              }
            }
          }
        });

        if (member) {
          memberId = member.id;
          memberContext = `\n\nContext: You are speaking with ${member.user.firstName} ${member.user.lastName}, an APC member from ${member.ward?.name || 'Nigeria'}, ${member.ward?.lga?.name || ''}, ${member.ward?.lga?.state?.name || ''}. Personalize your responses when relevant.`;
        }
      }

      let conversation;
      if (conversation_id) {
        conversation = await db.query.chatbotConversations.findFirst({
          where: eq(schema.chatbotConversations.id, conversation_id)
        });
      }
      
      if (!conversation) {
        [conversation] = await db.insert(schema.chatbotConversations).values({
          memberId,
          sessionId: session_id || crypto.randomUUID(),
        }).returning();
      }

      await db.insert(schema.chatbotMessages).values({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });

      const history = await db.query.chatbotMessages.findMany({
        where: eq(schema.chatbotMessages.conversationId, conversation.id),
        orderBy: desc(schema.chatbotMessages.createdAt),
        limit: 10
      });

      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant for APC Connect, a political engagement platform for Nigeria's All Progressives Congress (APC). 

Your role is to help users understand:
- How to use the APC Connect platform
- APC party policies and positions
- Nigerian politics and governance
- Democratic participation and civic engagement
- Platform features like elections, campaigns, events, and volunteer tasks

Be friendly, informative, and politically neutral when discussing governance. Encourage democratic participation and civic engagement. Keep responses concise and helpful.${memberContext}`
        },
        ...history.reverse().map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

      await db.insert(schema.chatbotMessages).values({
        conversationId: conversation.id,
        role: "assistant",
        content: aiResponse,
      });

      res.json({
        success: true,
        data: {
          conversation_id: conversation.id,
          message: aiResponse,
        }
      });

    } catch (error: any) {
      console.error('Chatbot error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  });

  app.get("/api/chatbot/suggestions", (req: Request, res: Response) => {
    const suggestions = [
      "How do I register as an APC member?",
      "What are the current elections I can vote in?",
      "How does the volunteer task system work?",
      "What are APC's key policies?",
      "How can I submit a policy idea?",
      "How do I pay my membership dues?",
      "What badges can I earn on the platform?",
      "How does the political literacy quiz work?",
    ];
    
    res.json({ success: true, data: suggestions });
  });

  io.on("connection", (socket) => {
    console.log("Client connected to situation room");

    socket.on("disconnect", () => {
      console.log("Client disconnected from situation room");
    });
  });

  return httpServer;
}
