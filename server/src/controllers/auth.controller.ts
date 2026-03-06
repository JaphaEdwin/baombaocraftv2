/**
 * Authentication Controller
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { JwtPayload, UserRole } from '../middleware/auth.js';
import { sendEmail } from '../services/email.service.js';
import { logger } from '../utils/logger.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate tokens
function generateAccessToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function generateRefreshToken(): string {
  return uuidv4();
}

/**
 * Register new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phone, companyName } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existingUser) {
    throw new ApiError(400, 'User with this email or phone already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Generate verification token
  const verifyToken = uuidv4();

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone,
      companyName,
      verifyToken,
      role: 'customer',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  // Send verification email
  try {
    await sendEmail({
      to: email,
      subject: 'Verify your BaoMbao account',
      template: 'verify-email',
      data: {
        name: firstName,
        verifyUrl: `${process.env.FRONTEND_URL}/verify?token=${verifyToken}`,
      },
    });
  } catch (err) {
    logger.error('Failed to send verification email:', err);
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data: { user },
  });
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      role: true,
      verified: true,
    },
  });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if verified (optional - can skip for admin)
  if (!user.verified && user.role === 'customer') {
    throw new ApiError(401, 'Please verify your email before logging in');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshTokenValue = generateRefreshToken();

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken: refreshTokenValue,
    },
  });
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new ApiError(401, 'Refresh token required');
  }

  // Find refresh token
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  // Generate new access token
  const accessToken = generateAccessToken(storedToken.user);

  res.json({
    success: true,
    data: { accessToken },
  });
});

/**
 * Forgot password
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({
      success: true,
      message: 'If an account exists, a password reset link has been sent',
    });
    return;
  }

  // Generate reset token
  const resetToken = uuidv4();
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetExpires },
  });

  // Send reset email
  try {
    await sendEmail({
      to: email,
      subject: 'Reset your BaoMbao password',
      template: 'reset-password',
      data: {
        name: user.firstName,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
      },
    });
  } catch (err) {
    logger.error('Failed to send reset email:', err);
  }

  res.json({
    success: true,
    message: 'If an account exists, a password reset link has been sent',
  });
});

/**
 * Reset password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 12);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetExpires: null,
    },
  });

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id },
  });

  res.json({
    success: true,
    message: 'Password reset successful. Please login with your new password.',
  });
});

/**
 * Verify email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  const user = await prisma.user.findFirst({
    where: { verifyToken: token },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid verification token');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verified: true,
      verifyToken: null,
    },
  });

  res.json({
    success: true,
    message: 'Email verified successfully. You can now login.',
  });
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      companyName: true,
      address: true,
      city: true,
      country: true,
      preferredContact: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: { user },
  });
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, phone, companyName, address, city, preferredContact } = req.body;

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      firstName,
      lastName,
      phone,
      companyName,
      address,
      city,
      preferredContact,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      companyName: true,
      address: true,
      city: true,
      preferredContact: true,
    },
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
});
