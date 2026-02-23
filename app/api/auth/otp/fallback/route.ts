import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendSmsOtp } from '@/lib/auth/providers/textlocal';

export async function POST(req: NextRequest) {
    try {
        const { userId, phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number required for fallback' }, { status: 400 });
        }

        // 1. Get the pending OTP record for this user
        const logs = await query<{ otp_hash: string }[]>(
            `SELECT otp_hash FROM otp_logs 
             WHERE user_id = ? AND status = 'pending' AND expires_at > NOW() 
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        const log = Array.isArray(logs) ? logs[0] : null;

        if (!log) {
            return NextResponse.json({ error: 'No active verification session found' }, { status: 404 });
        }

        // 2. We need the plaintext code. 
        // In a real production system, we might re-generate it or have 
        // a secondary table with short-lived plaintext for delivery.
        // For this implementation, we'll re-generate a NEW code for SMS 
        // to keep it simple and secure.

        const { createOtpRecord } = await import('@/lib/auth/otp');
        const { code } = await createOtpRecord(userId, 'sms');

        const sent = await sendSmsOtp(phone, code);

        if (!sent) {
            return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
        }

        return NextResponse.json({ status: 'pending_sms' });

    } catch (err: any) {
        console.error('[AUTH_FALLBACK_ERROR]', err.message);
        return NextResponse.json({ error: 'Fallback failed' }, { status: 500 });
    }
}
