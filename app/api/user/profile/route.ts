import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { language } = await req.json();
    if (!language) {
        return NextResponse.json({ error: 'Language required' }, { status: 400 });
    }

    await query(
        'UPDATE users SET language_preference = ? WHERE email = ?',
        [language, authSession.user.email]
    );

    return NextResponse.json({ success: true });
}
