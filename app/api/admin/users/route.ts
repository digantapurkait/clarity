import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { chat } from '@/lib/openai';

// Simple admin auth — checks header against env var
function isAdmin(req: NextRequest): boolean {
    const adminKey = req.headers.get('x-admin-key');
    return adminKey === process.env.ADMIN_PASSWORD;
}

// GET: list all users with last session info
export async function GET(req: NextRequest) {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await query<{
        id: number; name: string | null; email: string; created_at: string;
        relationship_summary: string | null; personality_summary: string | null;
        last_phase: string | null; last_session: string | null; session_count: number;
    }[]>(
        `SELECT u.id, u.name, u.email, u.created_at, u.relationship_summary, u.personality_summary,
            s.phase as last_phase, s.started_at as last_session,
            COUNT(s.id) as session_count
     FROM users u
     LEFT JOIN sessions s ON s.user_id = u.id
     GROUP BY u.id
     ORDER BY s.started_at DESC`
    );

    return NextResponse.json({ users: Array.isArray(users) ? users : [] });
}
