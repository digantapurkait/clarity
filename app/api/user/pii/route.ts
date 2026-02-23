import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    const authSession = await getServerSession(authOptions);
    const guestId = req.nextUrl.searchParams.get('guestId');

    let userId = null;
    if (authSession?.user?.email) {
        const userRows = await query<{ id: number }[]>('SELECT id FROM users WHERE email = ?', [authSession.user.email]);
        if (Array.isArray(userRows) && userRows.length > 0) {
            userId = userRows[0].id;
        }
    }

    if (!userId && !guestId) {
        return NextResponse.json({ pii_score: 0 });
    }

    const rows = await query<any[]>(
        `SELECT pii_score, clarity_progress FROM users WHERE id = ? OR (id IS NULL AND ? IS NOT NULL)`,
        [userId, guestId]
    );

    // If it's a guest, we might not have a full 'user' row yet or PII might be in conversation_state
    if (userId) {
        const user = await query<{ pii_score: number, clarity_progress: number }[]>(
            'SELECT pii_score, clarity_progress FROM users WHERE id = ?', [userId]
        );
        return NextResponse.json(user[0] || { pii_score: 0, clarity_progress: 0 });
    } else {
        const state = await query<{ clarity_progress: number }[]>(
            'SELECT clarity_progress FROM conversation_state WHERE guest_id = ? LIMIT 1', [guestId]
        );
        return NextResponse.json({
            pii_score: state[0]?.clarity_progress || 0, // Fallback for guest
            clarity_progress: state[0]?.clarity_progress || 0
        });
    }
}
