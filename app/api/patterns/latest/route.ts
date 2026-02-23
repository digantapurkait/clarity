
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

        const pattern = Array.isArray(patterns) && patterns.length > 0 ? patterns[0] : null;

        return NextResponse.json({
            pattern,
            subscription_status: subscriptionStatus
        });

    } catch (error: any) {
        console.error('[PATTERNS_API_ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 });
    }
}
