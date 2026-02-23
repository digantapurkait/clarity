
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(req.url);
        const guestId = searchParams.get('guestId');

        const userEmail = session?.user?.email;
        let userId: number | null = null;
        let subscriptionStatus = 'free';

        if (userEmail) {
            const users = await query<any[]>(
                'SELECT id, subscription_status FROM users WHERE email = ?',
                [userEmail]
            );
            if (Array.isArray(users) && users.length > 0) {
                userId = users[0].id;
                subscriptionStatus = users[0].subscription_status;
            }
        }

        // Fetch latest pattern cluster
        const patterns = await query<any[]>(
            `SELECT id, pattern_type, summary_text, prevention_suggestion, confidence_score
             FROM pattern_clusters 
             WHERE (user_id = ? OR guest_id = ?)
             ORDER BY created_at DESC LIMIT 1`,
            [userId, guestId]
        );

        let pattern = Array.isArray(patterns) && patterns.length > 0 ? patterns[0] : null;

        // Fallback to latest Onboarding/Session summary if no clustered pattern exists
        if (!pattern) {
            const sessions = await query<any[]>(
                `SELECT session_summary as summary_text, 'initial_reflection' as pattern_type
                 FROM sessions 
                 WHERE (user_id = ? OR guest_id = ?) AND session_summary IS NOT NULL
                 ORDER BY started_at DESC LIMIT 1`,
                [userId, guestId]
            );
            if (Array.isArray(sessions) && sessions.length > 0) {
                pattern = {
                    ...sessions[0],
                    prevention_suggestion: "This is your starting point. As we talk more, I'll begin to see the deeper structures behind these thoughts."
                };
            }
        }

        // Fetch recent diagnostic averages
        const diagnostics = await query<any[]>(
            `SELECT AVG(energy_level) as avg_energy, AVG(cognitive_load_score) as avg_load
             FROM emotional_events
             WHERE (user_id = ? OR guest_id = ?) AND timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
            [userId, guestId]
        );
        const stats = Array.isArray(diagnostics) && diagnostics.length > 0 ? diagnostics[0] : { avg_energy: 5, avg_load: 0.5 };

        return NextResponse.json({
            pattern,
            subscription_status: subscriptionStatus,
            diagnostics: {
                energy: stats.avg_energy || 5,
                load: stats.avg_load || 0.5
            }
        });

    } catch (error: any) {
        console.error('[PATTERNS_API_ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 });
    }
}
