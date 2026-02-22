import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';
import { getSuggestions } from '@/lib/tags';

interface UserRow {
    id: number;
    frequent_topics: string | null;
    recurring_emotions: string | null;
}

import { t } from '@/lib/i18n';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language') || 'en';

    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
        return NextResponse.json({ suggestions: getDefaultSuggestions(language) });
    }

    const rows = await query<UserRow[]>(
        'SELECT id, frequent_topics, recurring_emotions FROM users WHERE email = ?',
        [authSession.user.email]
    );
    const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!user) return NextResponse.json({ suggestions: getDefaultSuggestions(language) });

    // Count sealed sessions
    const countRows = await query<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND phase = 'SEALED'",
        [user.id]
    );
    const sessionCount = Array.isArray(countRows) && countRows.length > 0 ? Number(countRows[0].count) : 0;

    const frequentTopics = user.frequent_topics ? JSON.parse(user.frequent_topics) : null;
    const recurringEmotions = user.recurring_emotions ? JSON.parse(user.recurring_emotions) : null;

    const suggestions = getSuggestions(frequentTopics, recurringEmotions, sessionCount);

    // We can localize specific suggestions here if needed
    return NextResponse.json({ suggestions });
}

function getDefaultSuggestions(lang: string = 'en'): string[] {
    return [
        t('overthinking', lang),
        'Low energy today',
        'Work pressure',
        'Just checking in',
        "I don't know what I'm feeling",
    ];
}
