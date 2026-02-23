
import { query } from './db';

interface EmotionalEvent {
    id: number;
    primary_emotion: string;
    emotion_intensity: number;
    energy_level: number;
    context_tag: string;
    timestamp: string;
    cognitive_load_score: number;
}

export async function analyzePatterns(userId: number): Promise<void> {
    const events = await query<EmotionalEvent[]>(
        `SELECT id, primary_emotion, emotion_intensity, energy_level, context_tag, timestamp, cognitive_load_score
         FROM emotional_events 
         WHERE user_id = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 14 DAY)
         ORDER BY timestamp DESC`,
        [userId]
    );

    if (!Array.isArray(events) || events.length < 3) return;

    // 1. Detect Burnout Loops (High cognitive load + Low energy over time)
    const burnoutSignals = events.filter(e => e.cognitive_load_score > 0.7 && e.energy_level < 4);
    if (burnoutSignals.length >= 3) {
        await createPatternCluster(userId, 'BURNOUT_LOOP', burnoutSignals, {
            summary: "A recurring cycle of high cognitive load and declining energy detected.",
            suggestion: "Consider blocking 15 minutes of 'mind-gap' after head-heavy tasks."
        });
    }

    // 2. Detect Contextual Triggers (e.g. Work stress spikes)
    const contexts = [...new Set(events.map(e => e.context_tag))];
    for (const context of contexts) {
        const contextEvents = events.filter(e => e.context_tag === context && e.emotion_intensity > 7);
        if (contextEvents.length >= 3) {
            await createPatternCluster(userId, 'INTENSE_TRIGGER', contextEvents, {
                summary: `Recurring intensity detected in ${context} context.`,
                suggestion: `Notice what specifically changes in your body when ${context} topics arise.`
            });
        }
    }
}

async function createPatternCluster(
    userId: number,
    type: string,
    supportingEvents: EmotionalEvent[],
    details: { summary: string; suggestion: string }
) {
    // Check if similar cluster exists recently to avoid spam
    const existing = await query<any[]>(
        'SELECT id FROM pattern_clusters WHERE user_id = ? AND pattern_type = ? AND created_at > DATE_SUB(NOW(), INTERVAL 3 DAY)',
        [userId, type]
    );
    if (Array.isArray(existing) && existing.length > 0) return;

    const frequency = supportingEvents.length / 14; // events per day over window
    const confidence = Math.min(supportingEvents.length / 5, 1);

    const result = await query<{ insertId: number }>(
        `INSERT INTO pattern_clusters 
         (user_id, pattern_type, frequency_score, confidence_score, summary_text, prevention_suggestion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, type, frequency, confidence, details.summary, details.suggestion]
    );

    // Create a progressive insight teaser
    await query(
        `INSERT INTO insights (user_id, insight_type, insight_text, source_pattern_id)
         VALUES (?, ?, ?, ?)`,
        [userId, 'PATTERN_ALARM', details.summary, result.insertId]
    );
}
