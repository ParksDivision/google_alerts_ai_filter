import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';

/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */

// Extend Express Request type to include user
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Middleware to authenticate JWT token
 * Extracts token from Authorization header and verifies it
 */
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Debug logging
    console.log('Auth middleware - Path:', req.path);
    console.log('Auth middleware - Auth header present:', !!authHeader);
    console.log('Auth middleware - Token extracted:', token ? `${token.substring(0, 20)}...` : 'none');

    if (!token) {
      console.log('Auth middleware - No token provided');
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    const decoded = verifyToken(token);
    console.log('Auth middleware - Token decoded:', !!decoded, 'Type:', decoded?.type);

    if (!decoded || decoded.type !== 'access') {
      console.log('Auth middleware - Invalid token or wrong type');
      res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    console.log('Auth middleware - Success, user:', decoded.email);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);

      if (decoded && decoded.type === 'access') {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
}
