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

        const { email, phone, userId: maybeUserId, deviceHash, browserInfo } = await req.json();
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const ipHash = hashIp(ip);

        // 1. Find User or create if doesn't exist
        let user: { id: number } | null = null;

        if (maybeUserId && email) {
            // Attempt to link email to this specific user (e.g. they started with phone)
            try {
                const result = await query('UPDATE users SET email = ? WHERE id = ? AND email IS NULL', [email, maybeUserId]);
                if ((result as any).affectedRows > 0) {
                    user = { id: maybeUserId };
                }
            } catch (e) {
                // Email might be taken by another user, that's fine, we'll look them up next below
            }
        }

        if (!user) {
            const identifier = email || phone;
            const lookupField = email ? 'email' : 'phone';

            if (!identifier) {
                return NextResponse.json({ error: 'Email or Phone is required' }, { status: 400 });
            }

            const users = await query<{ id: number }[]>(
                `SELECT id FROM users WHERE ${lookupField} = ?`, [identifier]
            );
            user = Array.isArray(users) ? users[0] : null;

            if (!user) {
                const result = await query<{ insertId: number }>(
                    `INSERT INTO users (${lookupField}) VALUES (?)`, [identifier]
                );
                user = { id: (result as any).insertId };
            }
        }

        // 2. Check Device Trust
        const trusted = await isDeviceTrusted(user.id, deviceHash);
        if (trusted) {
            console.log(`[AUTH] Trust bypass for user ${user.id}`);
            return NextResponse.json({ status: 'bypass', userId: user.id });
        }

        // 3. Generate & Send OTP
        // NEW LOGIC: If it's a phone, we save it but redirect to email for actual OTP
        if (phone && !email) {
            // Find if this user already has an email associated
            const userWithEmail = await query<{ email: string | null }[]>(
                'SELECT email FROM users WHERE id = ?', [user.id]
            );
            const associatedEmail = userWithEmail[0]?.email;

            if (!associatedEmail) {
                // Return a specific status to capture email on frontend
                return NextResponse.json({
                    status: 'require_email',
                    userId: user.id,
                    notice: 'Mobile-based OTP coming soon. For now, please verify with your email.'
                });
            } else {
                // Use the associated email but warn that SMS is coming soon
                const { code } = await createOtpRecord(user.id, 'email');
                console.log(`[AUTH_DEBUG] OTP code for linked email ${associatedEmail}: ${code}`);
                const delivered = await sendEmailOtp(associatedEmail, code);

                return NextResponse.json({
                    status: 'pending_email',
                    userId: user.id,
                    notice: 'Mobile-based OTP coming soon. Code sent to your linked email.',
                    retryAfter: 60
                });
            }
        }

        // Standard Email flow
        const logIdentifier = email || phone || user.id.toString();
        const { code } = await createOtpRecord(user.id, 'email');
        console.log(`[AUTH_DEBUG] OTP code for ${logIdentifier}: ${code}`);

        const delivered = await sendEmailOtp(email, code);

        return NextResponse.json({
            status: delivered ? 'pending_email' : 'pending_fallback',
            userId: user.id,
            error: delivered ? null : 'Delivery failed. Please try again.',
            retryAfter: 60
        });

    } catch (err: any) {
        console.error('[AUTH_REQUEST_ERROR]', err.message);
        return NextResponse.json({ error: 'Authentication request failed' }, { status: 500 });
    }
}
