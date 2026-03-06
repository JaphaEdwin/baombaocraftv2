/**
 * TOTP (Time-based One-Time Password) Service
 * For Google Authenticator admin access
 */

import crypto from 'crypto';

// IMPORTANT: Generate this once and store securely in .env
// Use: node -e "console.log(require('crypto').randomBytes(20).toString('base32'))"
const ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || '';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  
  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  
  return Buffer.from(bytes);
}

function generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): string {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / timeStep);
  
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));
  
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

export function verifyTOTP(token: string, secret?: string): boolean {
  const secretToUse = secret || ADMIN_TOTP_SECRET;
  
  if (!secretToUse) {
    console.error('TOTP secret not configured');
    return false;
  }
  
  // Check current time window and adjacent windows (30 sec tolerance)
  for (let i = -1; i <= 1; i++) {
    const time = Math.floor(Date.now() / 1000 / 30) + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));
    
    const key = base32Decode(secretToUse);
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    
    const otp = (binary % 1000000).toString().padStart(6, '0');
    
    if (otp === token) {
      return true;
    }
  }
  
  return false;
}

export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  let secret = '';
  
  for (let i = 0; i < buffer.length; i++) {
    secret += BASE32_CHARS[buffer[i] % 32];
  }
  
  return secret;
}

export function getTOTPUri(secret: string, email: string, issuer: string = 'BaoMbao Admin'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// Generate QR code URL (use Google Charts API for simplicity)
export function getTOTPQRCode(secret: string, email: string): string {
  const uri = getTOTPUri(secret, email);
  return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(uri)}`;
}
