import { z } from 'zod';

/**
 * User model schema and types
 */

// Database User type
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
  is_active: boolean;
}

// Public user type (without password)
export type PublicUser = Omit<User, 'password_hash'>;

// User creation input
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(255).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// User update input
export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1).max(255).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// Login input
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Convert User to PublicUser (remove sensitive fields)
 */
export function toPublicUser(user: User): PublicUser {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}
