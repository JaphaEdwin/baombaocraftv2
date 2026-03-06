/**
 * Secure Admin Access Routes
 * Hidden endpoint for TOTP-based admin access
 */

import { Router } from 'express';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyTOTP, generateTOTPSecret, getTOTPQRCode, getTOTPUri } from '../services/totp.service.js';
import prisma from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'baombaocraft@gmail.com';

// Verify TOTP and issue admin token
router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code format',
      });
    }

    // Rate limiting check (prevent brute force)
    const clientIP = req.ip || req.socket.remoteAddress;
    const rateLimitKey = `totp_attempts:${clientIP}`;
    
    // In production, use Redis for rate limiting
    // For now, we'll just verify the TOTP
    
    const isValid = verifyTOTP(code);

    if (!isValid) {
      // Log failed attempt
      console.warn(`Failed TOTP attempt from ${clientIP} at ${new Date().toISOString()}`);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid code',
      });
    }

    // Find or create admin user
    let admin = await prisma.user.findFirst({
      where: {
        email: ADMIN_EMAIL,
        role: { in: ['admin', 'super_admin'] },
      },
    });

    if (!admin) {
      // Admin doesn't exist, deny access
      return res.status(401).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Generate admin token
    const accessToken = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role,
        isAdminAccess: true,
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Log successful access
    console.log(`Admin access granted via TOTP for ${admin.email} from ${clientIP}`);

    res.json({
      success: true,
      accessToken,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      redirectUrl: process.env.ADMIN_URL || '/admin',
    });
  })
);

// Setup endpoint - only works once or with existing admin auth
// This is for initial TOTP setup
router.post(
  '/setup',
  asyncHandler(async (req: Request, res: Response) => {
    const { setupKey } = req.body;
    
    // Require a one-time setup key from environment
    const SETUP_KEY = process.env.ADMIN_SETUP_KEY;
    
    if (!SETUP_KEY || setupKey !== SETUP_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup key',
      });
    }

    // Generate new TOTP secret
    const secret = generateTOTPSecret();
    const qrCode = getTOTPQRCode(secret, ADMIN_EMAIL);
    const uri = getTOTPUri(secret, ADMIN_EMAIL);

    // IMPORTANT: This secret must be saved to .env as ADMIN_TOTP_SECRET
    // and the setupKey should be removed/changed after setup
    
    res.json({
      success: true,
      message: 'Save this secret to your .env file as ADMIN_TOTP_SECRET',
      secret,
      qrCode,
      uri,
      instructions: [
        '1. Open Google Authenticator app',
        '2. Tap + button to add account',
        '3. Scan the QR code or enter the secret manually',
        '4. Copy the secret to your .env file: ADMIN_TOTP_SECRET=' + secret,
        '5. Remove or change ADMIN_SETUP_KEY in .env',
        '6. Restart the server',
      ],
    });
  })
);

// Health check - minimal endpoint to verify the access system is running
router.get('/ping', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

export default router;
