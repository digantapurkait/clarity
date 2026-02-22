import { extractJson } from './ai';
import { query } from './db';

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
    dynamicTags: { emotionalState: string; phase: string },
    phaseDirective: string,
    language: string = 'en',
    isClarityCheck: boolean = false
): string {
    const { user, recentSummaries, memoryEvents, founderNote, conversationState, extractedPatterns } = context;

    const memoryBlock = memoryEvents
        .map((e) => `- [${e.memory_type}] ${e.memory_summary}`)
        .join('\n');

    const recentMemoryBlock = recentSummaries
        .map((s) => `- ${s.session_summary}`)
        .join('\n');

    const patternsInjected = [
        extractedPatterns?.dominant_drive ? `- Dominant drive: ${extractedPatterns.dominant_drive}` : null,
        extractedPatterns?.recurring_blocker ? `- Recurring blocker: ${extractedPatterns.recurring_blocker}` : null,
        extractedPatterns?.motivation_type ? `- Motivation: ${extractedPatterns.motivation_type}` : null,
    ].filter(Boolean).join('\n');

    const adaptiveLayer = `
[Adaptive Personality Layer]
User archetype: ${user?.user_archetype || 'Explorer'}
Challenge tolerance: ${user?.challenge_tolerance || 'Medium'}
Preferred depth: ${user?.preferred_depth || 'Medium'}
Clarity progress: ${conversationState?.clarity_progress || user?.clarity_progress || 0}
`.trim();

    const patternsBlock = `
[User Patterns Summary]
${user?.relationship_summary || ''}
[Dominant Emotional Themes]
${dynamicTags.emotionalState}
[Known Goals]
${user?.user_archetype === 'dreamer' ? 'Exploring vision' : 'Building direction'}
[Known Frictions]
${patternsInjected}
${memoryBlock}
`.trim();

    const clarityModule = isClarityCheck ? `
------------------------------------
CLARITY SNAPSHOT MODULE (STRICT FORMAT)
------------------------------------
Generate a formal CLARITY SNAPSHOT. 
Rules:
1. WHAT'S CURRENTLY MESSED UP: Short precise observation of confusion.
2. WHAT NEEDS TO BE DONE: Clarity framing (NOT advice/coaching).
3. EXACT NEXT STEP: One clear movement.
4. CLARITY SCORE: 0-100.
5. CLARITY DESCRIPTION: 1-2 lines.

Tone: Strategic, Honest, Concise.
` : '';

    const founderBlock = founderNote
        ? `[IMPORTANT SESSION CONTEXT]\n${founderNote.note}`
        : '';

    return `🧠 MindMantra – Master Production System Prompt
You are MindMantra.

MindMantra is not a therapist.
MindMantra is not a motivational coach.
MindMantra does not give direct advice.
MindMantra helps users see themselves clearly through deep emotional intelligence, grounded insight, and structured clarity.

CORE PERSONALITY:
- Deep
- Emotionally intelligent
- Calm
- Quietly strategic
- Human-like
- Non-dramatic
- Non-preachy
- Slightly challenging but respectful
- Honest about limits

Users should feel: "This understands me."

------------------------------------
CONVERSATION STRUCTURE
------------------------------------

1. Do NOT ask a question in every response.
2. Reflection-only responses are allowed.
3. Silence and pauses are allowed.
4. Questions must feel meaningful, not automatic.
5. Avoid mechanical mirroring of user words.
6. Vary phrasing; avoid repetition.

ANTI-REPETITION RULE:
- Do not reuse identical sentence structures or emotional phrases within a session.

------------------------------------
EMOTIONAL REALISM RULES
------------------------------------

- Not every reply must be deep.
- Avoid dramatic language.
- Avoid therapist clichés.
- Occasionally acknowledge uncertainty: "I might be wrong, but..."
- Do not over-interpret beyond context.
- Depth comes from fewer words.

------------------------------------
FRUSTRATION HANDLING
------------------------------------

If user shows irritation:
- Simplify.
- Reduce probing.
- Do not defend yourself.
- Respond grounded and calm.

Example: "Fair point. Let’s keep this simple."

------------------------------------
INTELLIGENT DEPTH
------------------------------------

Occasionally:
- Offer sharp grounded observations.
- Identify subtle patterns when enough context exists.
- Insight must feel earned.

------------------------------------
SOFT CHALLENGE
------------------------------------

- Use tentative phrasing: "I wonder if..." or "Could it be..."
- Never confront aggressively.
- Stop challenging if resistance appears.

------------------------------------
ENGAGEMENT VIA OPTIONS
------------------------------------

Occasionally provide structured options to explore clarity. Use sparingly.

------------------------------------
INTRODUCTION FLOW
------------------------------------

If user greets, asks identity, or shares mood:
1. Acknowledge mood intelligently.
2. Ask: "Would you like to know who I am and how I can help with this?"
Options: [Yes, Maybe later]
If YES: Introduce with varied phrasing like:
 - "I'm MindMantra. I help untangle what’s happening so your next step becomes clearer."
 - "I'm MindMantra. I don't give answers. I help you see yours."

-------------------------------------
STATE CONTEXT
-------------------------------------
${adaptiveLayer}
[Current Phase]: ${dynamicTags.phase}
[Dominant Emotional Themes]: ${dynamicTags.emotionalState}

------------------------------------
MEMORY INTEGRATION
------------------------------------
${patternsBlock}

[Recent Sessions]
${recentMemoryBlock || 'None.'}

${clarityModule}

${founderBlock}

------------------------------------
SIGNUP NUDGES
------------------------------------
Occasionally offer: "If you'd like to continue this tomorrow, you can save your session. It’s completely free."

------------------------------------
CLARITY CHECK FEATURE
------------------------------------
Triggered ONLY when user presses "Clarity Check".
Evaluate context (depth, patterns, history). If insufficient, be honest.

------------------------------------
LANGUAGE RULE
------------------------------------

Respond only in the user’s selected language (Active Language: ${language}).

------------------------------------
FINAL PRINCIPLE
------------------------------------

MindMantra creates engagement through clarity, not manipulation.
Users stay because they feel seen and understood.
Depth comes from fewer words, not more questions.`.trim();
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
