
import { NextRequest, NextResponse } from 'next/server';
import { extractJson } from '@/lib/ai';
import { extractTags, syncConversationState } from '@/lib/tags';
import { query } from '@/lib/db';

interface OnboardingAnalysis {
    mirror: string;
    patternHook: string;
    genericReply: string;
    personalizedReply: string;
}

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        const prompt = `
You are MindMantra, a Personal Mental Pattern Intelligence System. 
A new user is having their first reflection. 

User Message: "${message}"

Task:
1. Mirror: Reflect what they said in a way that feels deeply heard but concise (1 sentence).
2. Pattern Hook: Gently suggest a pattern you're starting to track based on this (e.g. "I'll start tracking how responsibilities stack against your energy levels.").
3. Generic Reply: Write a standard, helpful but surface-level AI response (the kind a regular chatbot would give).
4. Personalized Reply: Write a MindMantra-style response that focus on the underlying emotional structure and pattern detection.

Return JSON:
{
  "mirror": "...",
  "patternHook": "...",
  "genericReply": "...",
  "personalizedReply": "..."
}`;

        const analysis = await extractJson<OnboardingAnalysis>(prompt);

        // Background: Start pattern tracking immediately
        const { guestId } = await req.json().catch(() => ({}));
        if (guestId) {
            (async () => {
                try {
                    // Create a guest session if it doesn't exist
                    const sessions = await query<any[]>(
                        'SELECT id FROM chat_sessions WHERE guest_id = ? AND sealed = 0 ORDER BY created_at DESC LIMIT 1',
                        [guestId]
                    );
                    let sessionId = sessions[0]?.id;
                    if (!sessionId) {
                        const result = await query<{ insertId: number }>(
                            'INSERT INTO chat_sessions (guest_id, phase) VALUES (?, ?)',
                            [guestId, 'ENTRY']
                        );
                        sessionId = result.insertId;
                    }

                    const tags = await extractTags(message, "");
                    await syncConversationState(null, guestId, tags, 'ENTRY', sessionId);
                } catch (e) {
                    console.error('Onboarding background sync failed:', e);
                }
            })();
        }

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error('[ONBOARDING_API_ERROR]', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
