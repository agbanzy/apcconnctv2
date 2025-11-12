import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// General API rate limiter (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication (5 attempts per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

// Airtime conversion limiter (10 conversions per hour)
export const airtimeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many airtime conversions, please try again later.',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP with IPv6 support
    if ((req.user as any)?.id) {
      return (req.user as any).id;
    }
    // Use ipKeyGenerator for proper IPv4 and IPv6 handling
    return ipKeyGenerator(req.ip || '');
  },
});

// Voting limiter (prevent spam voting)
export const votingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many voting requests, please wait a moment.',
});
