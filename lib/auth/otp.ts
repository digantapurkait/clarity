import { query } from '@/lib/db';
import { hashOtp } from './crypto';

const OTP_SECRET = process.env.OTP_SECRET || 'fallback-secret-for-mvp';
const OTP_EXPIRY_MINS = 5;

/**
 * Generates a random 6-digit numeric OTP.
 */
export function generate6DigitOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Stores a hashed OTP and returns the plaintext for delivery.
 */
export async function createOtpRecord(userId: number, channel: 'email' | 'sms'): Promise<{ code: string }> {
    const code = generate6DigitOtp();
    const hashed = hashOtp(code, OTP_SECRET);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINS * 60 * 1000);

    await query(
        'INSERT INTO otp_logs (user_id, otp_hash, channel, expires_at) VALUES (?, ?, ?, ?)',
        [userId, hashed, channel, expiresAt]
    );

    return { code };
}

/**
 * Verifies an OTP against the pending logs.
 */
export async function verifyOtp(userId: number, code: string): Promise<boolean> {
    const hashed = hashOtp(code, OTP_SECRET);

    const logs = await query<{ id: number; attempt_count: number }[]>(
        `SELECT id, attempt_count FROM otp_logs 
         WHERE user_id = ? AND status = 'pending' AND expires_at > NOW() 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );

    const log = Array.isArray(logs) ? logs[0] : null;

    if (!log) return false;

    if (log.attempt_count >= 5) {
        await query("UPDATE otp_logs SET status = 'failed' WHERE id = ?", [log.id]);
        return false;
    }

    const check = await query<{ id: number }[]>(
        "SELECT id FROM otp_logs WHERE id = ? AND otp_hash = ?",
        [log.id, hashed]
    );

    const match = Array.isArray(check) && check.length > 0;

    if (match) {
        await query("UPDATE otp_logs SET status = 'verified' WHERE id = ?", [log.id]);
        return true;
    } else {
        await query("UPDATE otp_logs SET attempt_count = attempt_count + 1 WHERE id = ?", [log.id]);
        return false;
    }
}
