import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    const authSession = await getServerSession(authOptions);
    const { hook, guestId } = await req.json();

    let userId = null;
    if (authSession?.user?.email) {
        const userRows = await query<{ id: number }[]>('SELECT id FROM users WHERE email = ?', [authSession.user.email]);
        if (Array.isArray(userRows) && userRows.length > 0) {
            userId = userRows[0].id;
        }
    }

    if (userId) {
        await query(
            'UPDATE users SET curiosity_click_count = curiosity_click_count + 1 WHERE id = ?',
            [userId]
        );
    } else if (guestId) {
        // Option: Log to a hypothetical guest_events table or conversation_state
        // For now, if we don't have a column in conversation_state, we'll just log to console or skip
        console.log(`[CURIOSITY] Guest ${guestId} clicked hook: ${hook}`);
    }

    return NextResponse.json({ success: true });
}
