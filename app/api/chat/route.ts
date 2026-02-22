import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { query } from '@/lib/db';
import { chat, chatStream } from '@/lib/ai';
import { getUserContext, buildSystemPrompt, markFounderNoteUsed } from '@/lib/memory';
import {
    Phase,
    getPhaseDirective,
    getNextPhase,
    shouldAdvancePhase,
    PHASE_DELAY_MS,
} from '@/lib/arc';
import { extractTags, updateUserProfile, calculateContextScore, syncConversationState } from '@/lib/tags';

interface Session {
    id: number;
    phase: Phase;
    emotional_depth_score: number;
    clarity_signal: number;
    resistance_level: number;
    message_count: number;
}

interface DBMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: NextRequest) {
    try {
        const authSession = await getServerSession(authOptions);
        const body = await req.json();
        const { message, guestId, language = 'en', isClarityCheck = false } = body;

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // Identify user and session in parallel
        const userEmail = authSession?.user?.email;

        let userId: number | null = null;
        if (userEmail) {
            const users = await query<{ id: number }[]>(
                'SELECT id FROM users WHERE email = ?',
                [userEmail]
            );
            userId = Array.isArray(users) && users.length > 0 ? users[0].id : null;
        }

        // Initialize or fetch session
        const sessionResults = await query<Session[]>(
            `SELECT id, phase, emotional_depth_score, clarity_signal, resistance_level,
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
            session = {
                id: insertResult.insertId,
                phase: 'ENTRY',
                emotional_depth_score: 0,
                clarity_signal: 0,
                resistance_level: 0,
                message_count: 0
            };
        }

        const sessionId = session.id;
        const currentPhase = session.phase as Phase;

        // Clarity Check Logic
        if (isClarityCheck) {
            const contextScore = calculateContextScore(
                session.message_count,
                session.emotional_depth_score,
                session.clarity_signal > 0.3 // Simple pattern heuristic
            );

            if (contextScore < 45) {
                return NextResponse.json({
                    reply: "I can offer basic clarity now, but I'd need to understand a bit more about the patterns here to give you a full snapshot. Should we keep talking for a few more minutes?",
                    suggestions: ["Yes, let's keep going", "What do you need to know?"],
                    isIntervention: true
                });
            }
        }

        if (currentPhase === 'SEALED') {
            return NextResponse.json({
                reply: "Today's session is complete. I'll be here tomorrow when you're ready.",
                phase: 'SEALED',
                sealed: true,
            });
        }

        // Save user message
        await query(
            'INSERT INTO messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)',
            [sessionId, userId || null, 'user', message]
        );

        // Fetch full context
        const context = await getUserContext(userId, guestId);
        if (!context) {
            return NextResponse.json({ error: 'Could not load context' }, { status: 500 });
        }

        const history = await query<DBMessage[]>(
            `SELECT role, content FROM messages
             WHERE session_id = ? ORDER BY created_at ASC`,
            [sessionId]
        );

        const phaseDirective = getPhaseDirective(currentPhase);

        // Calculate dynamic context tags
        const emotionalState = session.resistance_level > 0.6
            ? 'frustration'
            : session.emotional_depth_score > 0.6
                ? 'deepening'
                : session.clarity_signal > 0.6
                    ? 'clarity'
                    : 'recognition';

        const systemPrompt = buildSystemPrompt(
            context,
            { emotionalState, phase: currentPhase.toLowerCase() },
            phaseDirective,
            language,
            isClarityCheck
        );

        const encoder = new TextEncoder();
        let geminiStream;
        try {
            geminiStream = await chatStream(
                systemPrompt,
                (Array.isArray(history) ? history : []) as { role: 'user' | 'assistant'; content: string }[]
            );
        } catch (error: any) {
            console.error('[API] chatStream failed:', error.message);
            return NextResponse.json({
                error: 'Service temporarily unavailable. Please try again in a moment.',
                details: error.message
            }, { status: 503 });
        }

        const responseStream = new ReadableStream({
            async start(controller) {
                let aiReply = '';
                try {
                    for await (const chunk of geminiStream) {
                        const text = chunk.text();
                        aiReply += text;
                        controller.enqueue(encoder.encode(text));
                    }

                    // Once AI finishes, handle background tasks
                    let nextPhase: Phase = currentPhase;
                    let mantra: string | null = null;

                    // Save AI response to DB
                    await query(
                        'INSERT INTO messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)',
                        [sessionId, userId || null, 'assistant', aiReply]
                    );

                    try {
                        const historyForTags = await query<DBMessage[]>(
                            `SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 6`,
                            [sessionId]
                        );
                        const transcript = historyForTags.reverse().map(m => `${m.role}: ${m.content}`).join('\n');
                        const tags = await extractTags(message, transcript);

                        // Background: Sync conversation state and archetypes
                        syncConversationState(userId, guestId, tags, nextPhase).catch(console.error);
                        const newDepth = (session!.emotional_depth_score * 0.4 + tags.emotional_depth_score * 0.6);
                        const newClarity = (session!.clarity_signal * 0.4 + tags.clarity_signal * 0.6);
                        const newResistance = (session!.resistance_level * 0.4 + tags.resistance_level * 0.6);

                        const advance = shouldAdvancePhase(currentPhase, newDepth, newClarity, newResistance);
                        if (advance) {
                            nextPhase = getNextPhase(currentPhase);
                        }

                        if (currentPhase === 'CLOSURE') {
                            mantra = aiReply.split('\n').find(l => l.length > 10 && l.length < 120) || aiReply.slice(0, 100);
                        }

                        await query(
                            `UPDATE sessions SET phase = ?, emotional_depth_score = ?, clarity_signal = ?,
                             resistance_level = ?, mantra = COALESCE(?, mantra)
                             WHERE id = ?`,
                            [nextPhase, newDepth, newClarity, newResistance, mantra, sessionId]
                        );

                        if (nextPhase === 'SEALED') {
                            await query('UPDATE sessions SET sealed_at = NOW() WHERE id = ?', [sessionId]);

                            if (context.founderNote) {
                                await markFounderNoteUsed(context.founderNote.id);
                            }

                            // Summarize session for future memory
                            import('@/lib/memory').then(({ summarizeSession }) => {
                                summarizeSession(sessionId).catch(console.error);
                            });

                            if (userId) {
                                const transcript = (Array.isArray(history) ? history : [] as DBMessage[])
                                    .map((m: DBMessage) => `${m.role === 'user' ? 'User' : 'MindMantra'}: ${m.content}`)
                                    .join('\n');
                                updateUserProfile(userId, tags.mood, tags.topic).catch(console.error);
                                import('@/lib/memory').then(({ updateRelationshipSummary }) => {
                                    updateRelationshipSummary(userId, transcript).catch(console.error);
                                });
                            }
                        } else if (userId) {
                            await updateUserProfile(userId, tags.mood, tags.topic);
                        }
                    } catch (e) {
                        console.error('Processing background tasks failed:', e);
                    }

                    // Final metadata chunk
                    const metadata = {
                        phase: nextPhase,
                        sealed: nextPhase === 'SEALED',
                        paceMs: PHASE_DELAY_MS[currentPhase],
                        mantra: currentPhase === 'CLOSURE' ? mantra : null,
                    };
                    controller.enqueue(encoder.encode(`\n\n__METADATA__${JSON.stringify(metadata)}`));
                } catch (e: any) {
                    console.error('Streaming error:', e);
                    controller.error(e);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(responseStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('[CHAT_API_ERROR]', error);
        return NextResponse.json({
            error: error.message || 'An unexpected error occurred',
            reply: "I'm having a bit of trouble connecting right now. Can we try again in a moment?"
        }, { status: 500 });
    }
}


// GET: fetch current session messages
export async function GET(req: NextRequest) {
    const authSession = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get('guestId');

    const userEmail = authSession?.user?.email;
    let userId: number | null = null;
    if (userEmail) {
        const users = await query<{ id: number }[]>(
            'SELECT id FROM users WHERE email = ?',
            [userEmail]
        );
        userId = Array.isArray(users) && users.length > 0 ? users[0].id : null;
    }

    if (!userId && !guestId) {
        return NextResponse.json({ messages: [], session: null });
    }

    const sessions = await query<Session[]>(
        `SELECT id, phase FROM sessions 
         WHERE (user_id = ? OR guest_id = ?) AND phase != 'SEALED'
         ORDER BY started_at DESC LIMIT 1`,
        [userId, guestId]
    );
    const session = Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null;
    if (!session) return NextResponse.json({ messages: [], session: null });

    const messages = await query<DBMessage[]>(
        'SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
        [session.id]
    );

    return NextResponse.json({
        messages: Array.isArray(messages) ? messages : [],
        session: { phase: session.phase, sealed: session.phase === 'SEALED' },
    });
}
