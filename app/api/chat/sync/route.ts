import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const authSession = await getServerSession(authOptions);
        const { messages, guestId } = await req.json();

        const userEmail = authSession?.user?.email;
        let userId: number | null = null;
        if (userEmail) {
            const users = await query<{ id: number }[]>(
                'SELECT id FROM users WHERE email = ?',
                [userEmail]
            );
            userId = Array.isArray(users) && users.length > 0 ? users[0].id : null;
        }

        // Get current active session
        const sessionResults = await query<any[]>(
            `SELECT id, started_at,
                (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count
             FROM sessions s
             WHERE (user_id = ? OR guest_id = ?) AND phase != 'SEALED'
             ORDER BY started_at DESC LIMIT 1`,
            [userId, guestId]
        );

        let session = Array.isArray(sessionResults) && sessionResults.length > 0 ? sessionResults[0] : null;

        if (!session) {
            const insertResult = await query<{ insertId: number }>(
                'INSERT INTO sessions (user_id, guest_id, phase) VALUES (?, ?, ?)',
                [userId, guestId, 'ENTRY']
            );
            session = { id: insertResult.insertId, message_count: 0 };
        }

        const sessionId = session.id;

        // Only sync if the DB session is empty (prevent duplicate syncs)
        if (session.message_count === 0 && Array.isArray(messages)) {
            for (const msg of messages) {
                await query(
                    'INSERT INTO messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)',
                    [sessionId, userId || null, msg.role === 'ai' ? 'assistant' : 'user', msg.text || msg.content]
                );
            }

            // Also check for the latest onboarding reflection summary to bridge it in
            const reflections = await query<any[]>(
                `SELECT session_summary FROM sessions 
                 WHERE (user_id = ? OR guest_id = ?) AND session_summary IS NOT NULL 
                 ORDER BY started_at DESC LIMIT 1`,
                [userId, guestId]
            );

            if (reflections.length > 0 && reflections[0].session_summary) {
                const summaryMsg = `I've carried over the patterns from your reflection board. We were looking at: "${reflections[0].session_summary}". Where should we start?`;
                await query(
                    'INSERT INTO messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)',
                    [sessionId, userId || null, 'assistant', summaryMsg]
                );
            }
        }

        return NextResponse.json({ success: true, sessionId });
    } catch (error: any) {
        console.error('[SYNC_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
