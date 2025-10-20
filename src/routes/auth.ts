import { Router, Response } from 'express';
import {
  createUser,
  authenticateUser,
  getUserById,
  refreshAccessToken,
  updateUserPassword,
  updateUserProfile,
} from '../services/authService.js';
import { CreateUserSchema, LoginSchema, UpdateUserSchema } from '../models/User.js';
import { validateBody } from '../middleware/validation.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  registerLimiter,
  validateBody(CreateUserSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await createUser(req.body);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user },
      });
    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to register user',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user and return JWT tokens
 */
router.post(
  '/login',
  authLimiter,
  validateBody(LoginSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const result = await authenticateUser(email, password);

      if (!result) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
      return;
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result) {
      res.status(403).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get(
  '/me',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const user = await getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user information',
      });
    }
  }
);

/**
 * PUT /api/auth/me
 * Update current user profile
 */
router.put(
  '/me',
  authenticateToken,
  validateBody(UpdateUserSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { password, ...profileUpdates } = req.body;

      // Update password separately if provided
      if (password) {
        await updateUserPassword(req.user.userId, password);
      }

      // Update profile
      const updatedUser = await updateUserProfile(req.user.userId, profileUpdates);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
      });
    } catch (error: any) {
      console.error('Update profile error:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Email already in use',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal, no server action needed with JWT)
 */
router.post(
  '/logout',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    // With JWT, logout is handled client-side by removing the token
    // This endpoint exists for consistency and can be used for logging/analytics
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
);

export default router;
