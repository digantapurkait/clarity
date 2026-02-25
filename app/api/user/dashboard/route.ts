import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    const authSession = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get('guestId');

    let userId = null;
    if (authSession?.user?.email) {
        const userRows = await query<{ id: number }[]>('SELECT id FROM users WHERE email = ?', [authSession.user.email]);
        if (Array.isArray(userRows) && userRows.length > 0) {
            userId = userRows[0].id;
        }
    }

    if (!userId && !guestId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Aggregate Dashboard Data
    const patterns = await query<any[]>(
        `SELECT summary_text as summary, prevention_suggestion as prevention, pattern_type as type, created_at as detected_at
         FROM pattern_clusters
         WHERE user_id = ? OR guest_id = ?
         ORDER BY created_at DESC LIMIT 5`,
        [userId, guestId]
    );

    const metrics = await query<any[]>(
        `SELECT 
            pii_score as pii, 
            curiosity_click_count + option_click_count as clarity_activity,
            (SELECT COUNT(*) FROM emotional_events WHERE user_id = u.id OR guest_id = ?) as reflections,
            (SELECT COUNT(*) FROM sessions WHERE user_id = u.id OR guest_id = ?) as sessions
         FROM users u
         WHERE id = ? OR (id IS NULL AND ? IS NOT NULL)
         LIMIT 1`,
        [guestId, guestId, userId, guestId]
    );

    const stats = metrics[0] || { pii: 0, clarity_activity: 0, reflections: 0, sessions: 0 };

    // Trends (recent 7 emotional events)
    const trends = await query<any[]>(
        `SELECT energy_level as energy, cognitive_load_score as \`load\`
         FROM emotional_events
         WHERE user_id = ? OR guest_id = ?
         ORDER BY timestamp DESC LIMIT 7`,
        [userId, guestId]
    );

    return NextResponse.json({
        patterns: Array.isArray(patterns) ? patterns : [],
        metrics: {
            pii: stats.pii || 12,
            clarity: Math.min(100, (stats.clarity_activity * 5) + 5),
            reflections: stats.reflections || 0,
            sessions: stats.sessions || 0
        },
        trends: {
            energy: trends.map(t => t.energy).reverse(),
            load: trends.map(t => t.load).reverse()
        }
    });
}
