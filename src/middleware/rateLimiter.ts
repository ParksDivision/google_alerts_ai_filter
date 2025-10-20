import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP address
 */

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10), // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Very strict limiter for registration
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    success: false,
    error: 'Too many accounts created from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for expensive operations (like starting analysis jobs)
export const jobLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 jobs per minute
  message: {
    success: false,
    error: 'Too many job requests, please wait a moment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
