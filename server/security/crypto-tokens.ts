import crypto from "crypto";

// Validate SESSION_SECRET configuration
const SESSION_SECRET = process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && (!SESSION_SECRET || SESSION_SECRET === "apc-connect-secret-key-2024")) {
  throw new Error(
    "CRITICAL SECURITY ERROR: SESSION_SECRET must be set to a secure random value in production. " +
    "Generate one using: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

// Use SESSION_SECRET if available, otherwise use development-only default
const secret = SESSION_SECRET || "apc-connect-secret-dev-only";

/**
 * Token expiry times in milliseconds
 */
export const TOKEN_EXPIRY = {
  QUIZ: 15 * 60 * 1000, // 15 minutes
  TASK: 30 * 60 * 1000, // 30 minutes
  EVENT: 60 * 60 * 1000, // 1 hour
};

/**
 * Generate a secure HMAC-based token for high-value actions
 */
export function generateSecureToken(
  resourceType: string,
  resourceId: string,
  memberId: string,
  expiryMs: number = TOKEN_EXPIRY.QUIZ
): string {
  const timestamp = Date.now();
  const expiresAt = timestamp + expiryMs;
  const payload = `${resourceType}:${resourceId}:${memberId}:${expiresAt}`;
  
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  
  // Return base64 encoded token with payload and signature
  const tokenData = {
    resourceType,
    resourceId,
    memberId,
    expiresAt,
    signature,
  };
  
  return Buffer.from(JSON.stringify(tokenData)).toString("base64");
}

/**
 * Verify a secure token and return the payload if valid
 */
export function verifySecureToken(
  token: string,
  expectedResourceType: string
): {
  valid: boolean;
  memberId?: string;
  resourceId?: string;
  error?: string;
} {
  try {
    // Decode token
    const tokenData = JSON.parse(
      Buffer.from(token, "base64").toString("utf-8")
    );
    
    const { resourceType, resourceId, memberId, expiresAt, signature } = tokenData;
    
    // Check resource type
    if (resourceType !== expectedResourceType) {
      return { valid: false, error: "Invalid token type" };
    }
    
    // Check expiry
    if (Date.now() > expiresAt) {
      return { valid: false, error: "Token expired" };
    }
    
    // Regenerate signature to verify
    const payload = `${resourceType}:${resourceId}:${memberId}:${expiresAt}`;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    
    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid signature" };
    }
    
    return { valid: true, memberId, resourceId };
  } catch (error) {
    return { valid: false, error: "Invalid token format" };
  }
}

/**
 * Generate a secure quiz token
 */
export function generateQuizToken(quizId: string, memberId: string): string {
  return generateSecureToken("quiz", quizId, memberId, TOKEN_EXPIRY.QUIZ);
}

/**
 * Verify a quiz token
 */
export function verifyQuizToken(token: string): {
  valid: boolean;
  memberId?: string;
  quizId?: string;
  error?: string;
} {
  const result = verifySecureToken(token, "quiz");
  return {
    valid: result.valid,
    memberId: result.memberId,
    quizId: result.resourceId,
    error: result.error,
  };
}

/**
 * Generate a fingerprint from request metadata
 */
export function generateFingerprint(
  ipAddress: string,
  userAgent: string
): string {
  const data = `${ipAddress}:${userAgent}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}
