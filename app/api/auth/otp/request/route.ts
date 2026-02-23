import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isDeviceTrusted, hashIp } from '@/lib/auth/trust';
import { createOtpRecord } from '@/lib/auth/otp';
import { sendEmailOtp } from '@/lib/auth/providers/resend';
import { isRateLimited } from '@/lib/auth/rate-limit';

export async function POST(req: NextRequest) {
    try {
        if (isRateLimited(req)) {
            return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
        }

        const { email, phone, deviceHash, browserInfo } = await req.json();
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const ipHash = hashIp(ip);

        if (!email && !phone) {
            return NextResponse.json({ error: 'Email or Phone is required' }, { status: 400 });
        }

        // 1. Find User or create if doesn't exist (Progressive onboarding)
        const identifier = email || phone;
        const lookupField = email ? 'email' : 'phone';

        let users = await query<{ id: number }[]>(
            `SELECT id FROM users WHERE ${lookupField} = ?`, [identifier]
        );
        let user = Array.isArray(users) ? users[0] : null;

        if (!user) {
            const result = await query<{ insertId: number }>(
                `INSERT INTO users (${lookupField}) VALUES (?)`, [identifier]
            );
            user = { id: (result as any).insertId };
        }

        // 2. Check Device Trust
        const trusted = await isDeviceTrusted(user.id, deviceHash);
        if (trusted) {
            console.log(`[AUTH] Trust bypass for user ${user.id}`);
            return NextResponse.json({ status: 'bypass', userId: user.id });
        }

        // 3. Generate & Send OTP (Default to provided channel)
        const channel = phone ? 'sms' : 'email';
        const { code } = await createOtpRecord(user.id, channel);

        // CRITICAL: Log OTP to server console
        console.log(`[AUTH_DEBUG] OTP code for ${identifier}: ${code}`);

        let delivered = false;
        try {
            if (channel === 'email') {
                delivered = await sendEmailOtp(email, code);
            } else {
                // For phone-first logins, we trigger SMS immediately
                // Note: We'll implement sendSmsOtp in providers/fast2sms.ts
                const { sendSmsOtp } = await import('@/lib/auth/providers/fast2sms');
                delivered = await sendSmsOtp(phone, code);
            }
        } catch (e: any) {
            console.error('[AUTH_DELIVERY_ERROR]', e.message);
        }

        return NextResponse.json({
            status: delivered ? `pending_${channel}` : 'pending_fallback',
            userId: user.id,
            error: delivered ? null : 'Delivery failed. Please try again or wait for fallback.',
            retryAfter: 60
        });

    } catch (err: any) {
        console.error('[AUTH_REQUEST_ERROR]', err.message);
        return NextResponse.json({ error: 'Authentication request failed' }, { status: 500 });
    }
}
