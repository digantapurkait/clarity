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

        const { email, deviceHash, browserInfo } = await req.json();
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const ipHash = hashIp(ip);

        // 1. Find User or create if doesn't exist (Progressive onboarding)
        let users = await query<{ id: number }[]>(
            'SELECT id FROM users WHERE email = ?', [email]
        );
        let user = Array.isArray(users) ? users[0] : null;

        if (!user) {
            const result = await query<{ insertId: number }>(
                'INSERT INTO users (email) VALUES (?)', [email]
            );
            user = { id: (result as any).insertId };
        }

        // 2. Check Device Trust
        const trusted = await isDeviceTrusted(user.id, deviceHash);
        if (trusted) {
            console.log(`[AUTH] Trust bypass for user ${user.id}`);
            return NextResponse.json({ status: 'bypass', userId: user.id });
        }

        // 3. Generate & Send OTP (Default to Email)
        const { code } = await createOtpRecord(user.id, 'email');
        const sent = await sendEmailOtp(email, code);

        if (!sent) {
            return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
        }

        return NextResponse.json({
            status: 'pending_email',
            userId: user.id,
            retryAfter: 60
        });

    } catch (err: any) {
        console.error('[AUTH_REQUEST_ERROR]', err.message);
        return NextResponse.json({ error: 'Authentication request failed' }, { status: 500 });
    }
}
