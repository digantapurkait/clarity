import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

function isAdmin(req: NextRequest): boolean {
    return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD;
}

// POST: inject founder note OR update personality/relationship summary
export async function POST(req: NextRequest) {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userId, type, content, scheduledFor } = body;

    if (!userId || !type || !content) {
        return NextResponse.json({ error: 'userId, type, content required' }, { status: 400 });
    }

    if (type === 'note') {
        // Schedule a founder note for a specific date
        const date = scheduledFor || new Date().toISOString().split('T')[0];
        await query(
            'INSERT INTO founder_notes (user_id, note, scheduled_for) VALUES (?, ?, ?)',
            [userId, content, date]
        );
        return NextResponse.json({ success: true, message: 'Founder note scheduled' });
    }

    if (type === 'personality_summary') {
        await query('UPDATE users SET personality_summary = ? WHERE id = ?', [content, userId]);
        return NextResponse.json({ success: true, message: 'Personality summary updated' });
    }

    if (type === 'relationship_summary') {
        await query('UPDATE users SET relationship_summary = ? WHERE id = ?', [content, userId]);
        return NextResponse.json({ success: true, message: 'Relationship summary updated' });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}

// GET: fetch notes and summaries for a user
export async function GET(req: NextRequest) {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const [userRows, noteRows, recentMessages] = await Promise.all([
        query<{ personality_summary: string | null; relationship_summary: string | null }[]>(
            'SELECT personality_summary, relationship_summary FROM users WHERE id = ?', [userId]
        ),
        query<{ id: number; note: string; scheduled_for: string; used: boolean }[]>(
            'SELECT id, note, scheduled_for, used FROM founder_notes WHERE user_id = ? ORDER BY scheduled_for DESC LIMIT 10',
            [userId]
        ),
        query<{ role: string; content: string; created_at: string }[]>(
            `SELECT m.role, m.content, m.created_at FROM messages m
       JOIN sessions s ON m.session_id = s.id
       WHERE s.user_id = ? ORDER BY m.created_at DESC LIMIT 20`,
            [userId]
        ),
    ]);

    const user = Array.isArray(userRows) ? userRows[0] : null;

    return NextResponse.json({
        personalitySummary: user?.personality_summary || '',
        relationshipSummary: user?.relationship_summary || '',
        founderNotes: Array.isArray(noteRows) ? noteRows : [],
        recentMessages: Array.isArray(recentMessages) ? recentMessages.reverse() : [],
    });
}
