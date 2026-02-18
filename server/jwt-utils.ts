import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";

if (!process.env.JWT_SECRET) {
  console.error("\n" + "=".repeat(80));
  console.error("CRITICAL: JWT_SECRET environment variable is not set.");
  console.error("=".repeat(80));
  console.error("Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
  console.error("Then set JWT_SECRET in your .env file or environment.\n");
  throw new Error("JWT_SECRET environment variable is required. Cannot start without it.");
}
const JWT_SECRET = process.env.JWT_SECRET;

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface TokenPayload {
  userId: string;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId } as TokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId } as TokenPayload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): string {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload.userId;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Access token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid access token");
    }
    throw new Error("Token verification failed");
  }
}

export function verifyRefreshToken(token: string): string {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload.userId;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Refresh token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid refresh token");
    }
    throw new Error("Token verification failed");
  }
}

export function getRefreshTokenExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);
  return expiryDate;
}

export async function hashRefreshToken(token: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(token, saltRounds);
}

export async function verifyRefreshTokenHash(token: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(token, hash);
}
