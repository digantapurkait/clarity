import { query } from '@/lib/db';

const TRUST_THRESHOLD = 5;
const EXPIRY_DAYS = 30;

/**
 * Checks if a device is trusted for a given user.
 */
export async function isDeviceTrusted(userId: number, deviceHash: string): Promise<boolean> {
    const devices = await query<{ trust_score: number; last_used_at: Date }[]>(
        `SELECT trust_score, last_used_at FROM trusted_devices 
         WHERE user_id = ? AND device_hash = ?`,
        [userId, deviceHash]
    );

    const device = Array.isArray(devices) ? devices[0] : null;

    if (!device) return false;

    // Check if score is high enough and not expired
    const isHighTrust = device.trust_score >= TRUST_THRESHOLD;
    const isRecent = (Date.now() - new Date(device.last_used_at).getTime()) < EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (isHighTrust && isRecent) {
        // Update last used in background
        query('UPDATE trusted_devices SET last_used_at = NOW() WHERE user_id = ? AND device_hash = ?', [userId, deviceHash]).catch(console.error);
        return true;
    }

    return false;
}

/**
 * Registers or updates a device's trust score.
 */
export async function markDeviceAsTrusted(
    userId: number,
    deviceHash: string,
    ipHash: string,
    browser: string
): Promise<void> {
    await query(
        `INSERT INTO trusted_devices (user_id, device_hash, ip_hash, browser, trust_score, last_used_at)
         VALUES (?, ?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE 
            trust_score = LEAST(trust_score + 1, 10),
            ip_hash = ?,
            browser = ?,
            last_used_at = NOW()`,
        [userId, deviceHash, ipHash, browser, ipHash, browser]
    );
}

/**
 * Simple hash for server-side IP tracking.
 */
export function hashIp(ip: string): string {
    const { createHash } = require('crypto');
    return createHash('sha256').update(ip).digest('hex');
}
