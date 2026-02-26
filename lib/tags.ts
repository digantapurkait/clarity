import { extractJson } from './ai';
import { query } from './db';

interface TagResult extends AnalyticalSignals {
    mood: string;          // e.g. "tired", "overwhelmed", "okay"
    topic: string;         // e.g. "work", "relationship", "health", "general"
    stress_level: number;  // 0–1
    emotional_depth_score: number; // 0–1: how much did user disclose?
    clarity_signal: number;        // 0–1: signs of resolution/clarity
    resistance_level: number;      // 0–1: deflection or pushback

    // New Diagnostic Signals
    energy_level: number;         // 0-10: 0=burned out, 10=vibrant
    cognitive_load_score: number; // 0-1: 0=clear, 1=overloaded
    intent_type: string;          // e.g. "venting", "seeking_clarity", "avoiding"
    trigger_keywords: string[];   // Specific words indicating stress/patterns
    sentiment_score: number;      // -1 to 1
}

interface AnalyticalSignals {
    user_archetype?: string;     // builder, explorer, analyzer, dreamer
    dominant_drive?: string;
    recurring_blocker?: string;
    motivation_type?: string;
}

export async function extractTags(userMessage: string, historyTranscript?: string): Promise<TagResult> {
    const result = await extractJson<TagResult>(`
You are a Personal Mental Pattern Intelligence System. Analyze the user's message for deep emotional and cognitive signals.
Context: "${historyTranscript ? historyTranscript.slice(-2000) : ''}"
Current Message: "${userMessage.slice(0, 500)}"

Extract signals. 
- cognitive_load_score: 0.0 (clear) to 1.0 (overwhelmed/saturated)
- energy_level: 0 (total exhaustion) to 10 (high vibrancy)
- intent_type: what does the user actually WANT in this moment? (venting, clarity, avoidance, validation)
- trigger_keywords: 2-3 specific phrases/words that seem to trigger this state.

Return JSON:
{
  "mood": "one word representing current emotional state",
  "topic": "the primary subject/domain of the message",
  "stress_level": 0.0-1.0,
  "emotional_depth_score": 0.0-1.0,
  "clarity_signal": 0.0-1.0,
  "resistance_level": 0.0-1.0,
  "energy_level": 0-10,
  "cognitive_load_score": 0.0-1.0,
  "intent_type": "venting|clarity|avoidance|validation",
  "trigger_keywords": ["specific words indicating stress or activation"],
  "repeating_themes": ["patterns that seem to be recurring from context"],
  "sentiment_score": -1.0-1.0,
  "user_archetype": "builder|explorer|analyzer|dreamer (optional)",
  "dominant_drive": "short string (optional)",
  "recurring_blocker": "short string (optional)",
  "motivation_type": "short string (optional)"
}`);

    return {
        mood: result.mood || 'neutral',
        topic: result.topic || 'general',
        stress_level: Number(result.stress_level) || 0,
        emotional_depth_score: Number(result.emotional_depth_score) || 0,
        clarity_signal: Number(result.clarity_signal) || 0,
        resistance_level: Number(result.resistance_level) || 0,
        energy_level: Number(result.energy_level) || 5,
        cognitive_load_score: Number(result.cognitive_load_score) || 0.5,
        intent_type: result.intent_type || 'unspecified',
        trigger_keywords: result.trigger_keywords || [],
        sentiment_score: Number(result.sentiment_score) || 0,
        user_archetype: result.user_archetype,
        dominant_drive: result.dominant_drive,
        recurring_blocker: result.recurring_blocker,
        motivation_type: result.motivation_type
    };
}

export function calculateContextScore(
    messageCount: number,
    avgDepth: number,
    patternsDetected: boolean
): number {
    // Score 0-100 logic
    // count (40%), depth (40%), patterns (20%)
    const countWeight = Math.min(messageCount / 8, 1) * 40;
    const depthWeight = Math.min(avgDepth, 1) * 40;
    const patternWeight = patternsDetected ? 20 : 0;

    return Math.round(countWeight + depthWeight + patternWeight);
}

export function calculatePIIScore(
    tags: TagResult,
    currentPII: number
): number {
    // PII (Pattern Improvement Index) Logic
    // Increases based on clarity signal and emotional depth
    // Decreases slightly on high resistance or extreme cognitive load
    let delta = 0;
    if (tags.clarity_signal > 0.7) delta += 5;
    if (tags.emotional_depth_score > 0.7) delta += 3;
    if (tags.resistance_level > 0.7) delta -= 2;
    if (tags.cognitive_load_score > 0.8) delta -= 1;

    // Minimum positive increment of +1 per response
    if (delta <= 0) delta = 1;

    return Math.max(0, currentPII + delta);
}

export async function logEmotionalEvent(
    userId: number | null,
    guestId: string | null,
    sessionId: number | null,
    tags: TagResult
): Promise<void> {
    await query(`
        INSERT INTO emotional_events (
            user_id, guest_id, session_id, primary_emotion, emotion_intensity, 
            energy_level, context_tag, intent_type, trigger_keywords, 
            sentiment_score, cognitive_load_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId, guestId, sessionId,
            tags.mood, Math.round(tags.stress_level * 10),
            tags.energy_level, tags.topic, tags.intent_type,
            JSON.stringify(tags.trigger_keywords),
            tags.sentiment_score, tags.cognitive_load_score
        ]
    );
}

// Update user's frequent_topics and recurring_emotions with recency weighting
export async function updateUserProfile(
    userId: number,
    mood: string,
    topic: string
): Promise<void> {
    interface UserRow {
        frequent_topics: Record<string, { count: number; last_seen: string }> | null;
        recurring_emotions: Record<string, { count: number; last_seen: string }> | null;
    }

    const rows = await query<UserRow[]>(
        'SELECT frequent_topics, recurring_emotions FROM users WHERE id = ?',
        [userId]
    );
    const user = Array.isArray(rows) ? rows[0] : rows as unknown as UserRow;
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    // Update topics
    const topics: Record<string, { count: number; last_seen: string }> =
        (user.frequent_topics as Record<string, { count: number; last_seen: string }>) || {};
    if (topic && topic !== 'general') {
        topics[topic] = {
            count: (topics[topic]?.count || 0) + 1,
            last_seen: today,
        };
    }

    // Update emotions
    const emotions: Record<string, { count: number; last_seen: string }> =
        (user.recurring_emotions as Record<string, { count: number; last_seen: string }>) || {};
    if (mood) {
        emotions[mood] = {
            count: (emotions[mood]?.count || 0) + 1,
            last_seen: today,
        };
    }

    await query(
        'UPDATE users SET frequent_topics = ?, recurring_emotions = ? WHERE id = ?',
        [JSON.stringify(topics), JSON.stringify(emotions), userId]
    );
}

// Recency-weighted suggestion scoring
// score = (lifetime_frequency * 0.6) + (recent_occurrence * 0.4)
interface SuggestionEntry {
    key: string;
    score: number;
}

export function getSuggestions(
    frequentTopics: Record<string, { count: number; last_seen: string }> | null,
    recurringEmotions: Record<string, { count: number; last_seen: string }> | null,
    sessionCount: number
): string[] {
    const generic = [
        'Low energy today',
        'Overthinking',
        'Work pressure',
        'Just checking in',
        "I don't know what I'm feeling",
    ];

    if (sessionCount < 3 || (!frequentTopics && !recurringEmotions)) {
        return generic;
    }

    const now = Date.now();
    const entries: SuggestionEntry[] = [];

    const scoreEntry = (
        key: string,
        count: number,
        lastSeen: string,
        type: 'topic' | 'emotion'
    ) => {
        const daysSince = Math.max(
            0,
            (now - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24)
        );
        const recencyScore = Math.max(0, 1 - daysSince / 7); // Decays over 7 days
        const score = count * 0.6 + recencyScore * 0.4;
        const label =
            type === 'topic'
                ? topicToLabel(key)
                : emotionToLabel(key);
        entries.push({ key: label, score });
    };

    if (frequentTopics) {
        Object.entries(frequentTopics).forEach(([k, v]) =>
            scoreEntry(k, v.count, v.last_seen, 'topic')
        );
    }
    if (recurringEmotions) {
        Object.entries(recurringEmotions).forEach(([k, v]) =>
            scoreEntry(k, v.count, v.last_seen, 'emotion')
        );
    }

    const topThree = entries
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((e) => e.key);

    // Always keep escape hatch
    return [...topThree, 'Just checking in', "I don't know what I'm feeling"].slice(0, 5);
}

export async function syncConversationState(
    userId: number | null,
    guestId: string | null,
    tags: TagResult,
    phase: string,
    sessionId: number | null
): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Log high-frequency event for pattern engine
    await logEmotionalEvent(userId, guestId, sessionId, tags).catch(console.error);

    // 1. Update User analytical fields and PII if logged in
    if (userId) {
        const userRows = await query<{ pii_score: number }[]>(
            'SELECT pii_score FROM users WHERE id = ?', [userId]
        );
        const currentPII = Array.isArray(userRows) && userRows.length > 0 ? userRows[0].pii_score : 0;
        const newPII = calculatePIIScore(tags, currentPII);

        await query(`
            UPDATE users SET 
                user_archetype = COALESCE(?, user_archetype),
                clarity_progress = clarity_progress + ?,
                pii_score = ?,
                updated_at = NOW()
            WHERE id = ?`,
            [tags.user_archetype || null, tags.clarity_signal > 0.5 ? 5 : 0, newPII, userId]
        );
    }

    // 2. Update/Insert Conversation State
    const stateExists = await query<{ id: number }[]>(
        'SELECT id FROM conversation_state WHERE user_id = ? OR guest_id = ? LIMIT 1',
        [userId, guestId]
    );

    if (Array.isArray(stateExists) && stateExists.length > 0) {
        await query(`
            UPDATE conversation_state SET 
                current_phase = ?,
                emotional_tone = ?,
                clarity_progress = clarity_progress + ?,
                engagement_level = ?,
                updated_at = NOW()
            WHERE id = ?`,
            [
                phase,
                tags.mood,
                (tags.clarity_signal > 0.5 ? 5 : 2),
                tags.resistance_level > 0.5 ? 'low' : 'high',
                stateExists[0].id
            ]
        );
    } else {
        await query(`
            INSERT INTO conversation_state (user_id, guest_id, current_phase, emotional_tone, clarity_progress, engagement_level)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, guestId, phase, tags.mood, Math.max(5, tags.clarity_signal * 10), 'medium']
        );
    }

    // 3. Update/Insert Extracted Patterns
    if (tags.dominant_drive || tags.recurring_blocker || tags.motivation_type) {
        const patternsExists = await query<{ id: number }[]>(
            'SELECT id FROM extracted_patterns WHERE user_id = ? OR guest_id = ? LIMIT 1',
            [userId, guestId]
        );

        if (Array.isArray(patternsExists) && patternsExists.length > 0) {
            await query(`
                UPDATE extracted_patterns SET 
                    dominant_drive = COALESCE(?, dominant_drive),
                    recurring_blocker = COALESCE(?, recurring_blocker),
                    motivation_type = COALESCE(?, motivation_type),
                    last_updated = NOW()
                WHERE id = ?`,
                [tags.dominant_drive || null, tags.recurring_blocker || null, tags.motivation_type || null, patternsExists[0].id]
            );
        } else {
            await query(`
                INSERT INTO extracted_patterns (user_id, guest_id, dominant_drive, recurring_blocker, motivation_type)
                VALUES (?, ?, ?, ?, ?)`,
                [userId, guestId, tags.dominant_drive || null, tags.recurring_blocker || null, tags.motivation_type || null]
            );
        }
    }
}

function topicToLabel(topic: string): string {
    const map: Record<string, string> = {
        work: 'Work pressure again',
        relationship: 'Relationship on my mind',
        health: 'Health worry',
        family: 'Family tension',
        finances: 'Financial stress',
    };
    return map[topic] || `${topic} on my mind`;
}

function emotionToLabel(emotion: string): string {
    const map: Record<string, string> = {
        tired: 'Low energy today',
        overwhelmed: 'Feeling overwhelmed',
        anxious: 'Anxiety creeping in',
        stuck: 'Feeling stuck',
        okay: 'Just okay today',
        sad: 'Feeling low',
        frustrated: 'Frustrated today',
    };
    return map[emotion] || `Feeling ${emotion}`;
}
