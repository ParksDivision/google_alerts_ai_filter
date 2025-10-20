import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection.js';
import { User, PublicUser, CreateUserInput, toPublicUser } from '../models/User.js';

/**
 * Authentication Service
 * Handles user authentication, password hashing, and JWT token generation
 */

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: JWT_SECRET not set in production environment!');
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  // Check if user already exists
  const existingUser = await query<User>(
    'SELECT id FROM users WHERE email = $1',
    [input.email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const result = await query<User>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.email.toLowerCase(), passwordHash, input.name || null]
  );

  return toPublicUser(result.rows[0]);
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: PublicUser; accessToken: string; refreshToken: string } | null> {
  // Find user by email
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  // Update last login
  await query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<PublicUser | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE id = $1 AND is_active = true',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return toPublicUser(result.rows[0]);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<PublicUser | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return toPublicUser(result.rows[0]);
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);

  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, userId]
  );
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: { email?: string; name?: string }
): Promise<PublicUser> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(updates.email.toLowerCase());
  }

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (setClauses.length === 0) {
    // No updates, just return current user
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);

  const result = await query<User>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return toPublicUser(result.rows[0]);
}

/**
 * Deactivate user account
 */
export async function deactivateUser(userId: string): Promise<void> {
  await query(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; user: PublicUser } | null> {
  const decoded = verifyToken(refreshToken);

  if (!decoded || decoded.type !== 'refresh') {
    return null;
  }

  const user = await getUserById(decoded.userId);
  if (!user) {
    return null;
  }

  const accessToken = generateAccessToken(user.id, user.email);

  return {
    accessToken,
    user,
  };
}
