import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guestId } = await req.json();
    if (!guestId) {
        return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
    }

    // Get user ID
    const users = await query<{ id: number }[]>(
        'SELECT id FROM users WHERE email = ?',
        [authSession.user.email]
    );
    const userId = Array.isArray(users) && users.length > 0 ? users[0].id : null;

    if (!userId) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Merge logic
    await query(
        'UPDATE sessions SET user_id = ?, guest_id = NULL WHERE guest_id = ?',
        [userId, guestId]
    );

    // Update messages as well (to be safe, though they link via session_id)
    await query(
        'UPDATE messages SET user_id = ? WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)',
        [userId, userId]
    );

    return NextResponse.json({ success: true });
}
