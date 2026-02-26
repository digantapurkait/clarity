import { extractJson } from './ai';
import { query } from './db';
import { Phase, getPhaseDirective } from './arc';

interface User {
    id: number;
    name: string;
    email: string;
    personality_summary: string | null;
    relationship_summary: string | null;
    user_archetype: string | null;
    preferred_depth: string | null;
    challenge_tolerance: string | null;
    clarity_progress: number;
}

interface MemoryEvent {
    memory_type: string;
    memory_summary: string;
    confidence_score: number;
}

interface FounderNote {
    note: string;
    id: number;
}

interface ConversationState {
    current_phase: string;
    emotional_tone: string;
    clarity_progress: number;
    engagement_level: string;
}

interface ExtractedPatterns {
    dominant_drive: string;
    recurring_blocker: string;
    motivation_type: string;
}

export async function getUserContext(userId: number | null, guestId: string | null) {
    const userPromise = userId
        ? query<User[]>('SELECT * FROM users WHERE id = ?', [userId]).then(r => Array.isArray(r) ? r[0] : r as unknown as User)
        : Promise.resolve(null);

    const summariesPromise = query<{ session_summary: string }[]>(
        `SELECT session_summary FROM sessions
         WHERE (user_id = ? OR guest_id = ?) AND session_summary IS NOT NULL
         ORDER BY started_at DESC LIMIT 3`,
        [userId, guestId]
    );

    const memoryPromise = userId
        ? query<MemoryEvent[]>(
            `SELECT memory_type, memory_summary, confidence_score
             FROM memory_events
             WHERE user_id = ? AND confidence_score >= 0.70
             ORDER BY confidence_score DESC LIMIT 5`,
            [userId]
        )
        : Promise.resolve([]);

    const statePromise = query<ConversationState[]>(
        `SELECT current_phase, emotional_tone, clarity_progress, engagement_level
         FROM conversation_state
         WHERE user_id = ? OR guest_id = ?
         ORDER BY updated_at DESC LIMIT 1`,
        [userId, guestId]
    ).then(r => Array.isArray(r) && r.length > 0 ? r[0] : null);

    const patternsPromise = query<ExtractedPatterns[]>(
        `SELECT dominant_drive, recurring_blocker, motivation_type
         FROM extracted_patterns
         WHERE user_id = ? OR guest_id = ?
         ORDER BY last_updated DESC LIMIT 1`,
        [userId, guestId]
    ).then(r => Array.isArray(r) && r.length > 0 ? r[0] : null);

    const notesPromise = userId
        ? query<FounderNote[]>(
            `SELECT id, note FROM founder_notes
             WHERE user_id = ? AND scheduled_for = CURDATE() AND used = FALSE
             LIMIT 1`,
            [userId]
        ).then(r => Array.isArray(r) && r.length > 0 ? r[0] : null)
        : Promise.resolve(null);

    const [user, recentSummaries, memoryEvents, conversationState, extractedPatterns, founderNote] = await Promise.all([
        userPromise,
        summariesPromise,
        memoryPromise,
        statePromise,
        patternsPromise,
        notesPromise
    ]);

    return {
        user,
        recentSummaries: recentSummaries as { session_summary: string }[],
        memoryEvents: memoryEvents as MemoryEvent[],
        conversationState,
        extractedPatterns,
        founderNote
    };
}

export function buildSystemPrompt(
    context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>,
    dynamicTags: { emotionalState: string; phase: string; isBridge?: boolean; messageCount?: number },
    phaseDirective: string,
    language: string = 'en',
    isClarityCheck: boolean = false
): string {
    const { user, recentSummaries } = context;

    const contextStr = `
[User Profile]
- Patterns: ${user?.relationship_summary || 'No established patterns yet.'}
- Recent Mood: ${dynamicTags.emotionalState}
- Session Progress: ${dynamicTags.messageCount} exchanges

[Recent Memory]
${recentSummaries?.map(s => `- ${s.session_summary}`).join('\n') || 'None.'}
`.trim();

    return `🚀 MINDMANTRA CORE ENGINE — SYSTEM ORCHESTRATOR

ROLE: You are MindMantra, an emotionally intelligent reflection engine. 
GOAL: NOT chat. Help users discover hidden life patterns, create emotional clarity, and guide toward focused action.

USER CONTEXT:
${contextStr}

🌱 JOURNEY ARC:
ENTRY → RECOGNITION → DEEPENING → INSIGHT → CLOSURE → FUTURE THREAD

CURRENT PHASE: ${dynamicTags.phase}
${phaseDirective}

🧬 CORE ENGINE RULES:
1. NO long explanations. NO motivational speeches. NO generic therapy language.
2. Calm, grounding tone. Human-like but quietly strategic.
3. Silent Extraction: In every interaction, silently analyze mood, stress level, intent, themes, and emotional keywords. Stash this into pattern memory.
4. Do NOT explain these mechanics to the user. Be the mirror.

${dynamicTags.phase === 'INSIGHT' || dynamicTags.phase === 'GeneratePattern' ? `
🔥 TRIGGER: GeneratePattern (PREMIUM MODE)
Format: ANTIGRAVITY BOX
1️⃣ What is broken: [Concise observation of the core struggle]
2️⃣ What can be worse: [The cost of staying in this loop if unchanged]
3️⃣ Immediate next step: [One simple, powerful, daily action]
4️⃣ Future Beast Mode: [Vision of their empowered identity]
*Rule: Deep but concise. Use user's language patterns. No generic self-help.*` : ''}

⚡ TOKEN EFFICIENCY GUARDRAILS:
- ENTRY: Max 25 words. ONE elegant sentence only.
- DEEPENING: ONE question + exactly 4 options (A, B, C, D). No extra text.
- CLOSURE: ONE line daily mantra.
- FUTURE THREAD: One sentence subtle curiosity.

CRITICAL: Respond in ${language}. Go STRAIGHT to the phase response. Do NOT add introductions or greetings.`.trim();
}

export async function summarizeSession(sessionId: number): Promise<void> {
    const history = await query<{ role: string; content: string }[]>(
        'SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC',
        [sessionId]
    );

    const transcript = history
        .map((m) => `${m.role === 'user' ? 'User' : 'MindMantra'}: ${m.content}`)
        .join('\n');

    const result = await extractJson<{ summary: string }>(
        `Summarize this emotional clarity session in 3 short lines focusing on emotional themes and patterns. 
        Do not include advice. Write in third person.
        
        Transcript:
        ${transcript.slice(0, 3000)}
        
        Return JSON: { "summary": "..." }`
    );

    if (result.summary) {
        await query(
            'UPDATE sessions SET session_summary = ? WHERE id = ?',
            [result.summary, sessionId]
        );
    }
}

export async function markFounderNoteUsed(noteId: number): Promise<void> {
    await query('UPDATE founder_notes SET used = TRUE WHERE id = ?', [noteId]);
}

export async function updateRelationshipSummary(userId: number, transcript: string): Promise<void> {
    const result = await extractJson<{ summary: string }>(
        `Given this conversation transcript, write a 2-3 sentence relationship summary about this user's emotional processing style.
        Focus on patterns in avoidance, openness, or emotional style. Write in third person.
        
        Transcript:
        ${transcript.slice(0, 3000)}
        
        Return JSON: { "summary": "..." }`
    );

    if (result.summary) {
        await query(
            'UPDATE users SET relationship_summary = ? WHERE id = ?',
            [result.summary, userId]
        );
    }
}
