import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/auth/otp';
import { markDeviceAsTrusted, hashIp } from '@/lib/auth/trust';

export async function POST(req: NextRequest) {
    try {
        const { userId, code, deviceHash, browserInfo } = await req.json();

        // 1. Verify OTP
        const isValid = await verifyOtp(userId, code);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
        }

        // 2. Mark Device as Trusted
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const ipHash = hashIp(ip);

        await markDeviceAsTrusted(userId, deviceHash, ipHash, browserInfo);

        return NextResponse.json({ status: 'verified', userId });

    } catch (err: any) {
        console.error('[AUTH_VERIFY_ERROR]', err.message);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
