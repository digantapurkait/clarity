import { createHmac } from 'crypto';

/**
 * Hashes an OTP code with a secret salt using HMAC-SHA256.
 */
export function hashOtp(code: string, salt: string): string {
    return createHmac('sha256', salt).update(code).digest('hex');
}

/**
 * Compares a plaintext code with a hashed version.
 */
export function compareOtp(plaintext: string, hashed: string, salt: string): boolean {
    const freshHash = hashOtp(plaintext, salt);
    return freshHash === hashed;
}
