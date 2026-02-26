// Session Arc Logic — Phase directives and soft transition scoring

export type Phase =
    | 'ENTRY'
    | 'RECOGNITION'
    | 'DEEPENING'
    | 'INSIGHT'
    | 'CLOSURE'
    | 'FUTURE_THREAD'
    | 'SEALED';

export const PHASE_DELAY_MS: Record<Phase, number> = {
    ENTRY: 1600,
    RECOGNITION: 2000,
    DEEPENING: 2000,
    INSIGHT: 2800,
    CLOSURE: 2200,
    FUTURE_THREAD: 2000,
    SEALED: 0,
};

export function getPhaseDirective(phase: Phase): string {
    switch (phase) {
        case 'ENTRY':
            return `PHASE: ENTRY (Generic Mode)
Rules:
- Response MUST be ONE sentence only.
- 20–25 words maximum.
- Poetic, calm, grounding tone.
- NO analysis, NO advice, NO lists.
Goal: Reduce token cost while creating an emotional hook.`;

        case 'RECOGNITION':
            return `PHASE: RECOGNITION
Rules:
- Briefly reference a remembered pattern from past context.
- Target Feeling: "I am remembered."
- Keep it brief and subtle.`;

        case 'DEEPENING':
            return `PHASE: DEEPENING
Rules:
- Introduce ONE contextual MCQ.
- Exactly 1 question and 4 options (A, B, C, D).
- NO explanation text.
- Purpose: Gather structured data and increase engagement efficiently.`;

        case 'INSIGHT':
            return `PHASE: INSIGHT (Premium Mode)
Rules:
- Triggered by GeneratePattern.
- Deliver the ANTIGRAVITY BOX format:
  1. What is broken
  2. What can be worse if unchanged
  3. Immediate next step (simple/actionable)
  4. Future Beast Mode (empowered identity)
- Deep but concise. Use user's language patterns.`;

        case 'CLOSURE':
            return `PHASE: CLOSURE
Rules:
- Offer ONE short daily mantra.
- 1 line only.
- Grounded and empowering.`;

        case 'FUTURE_THREAD':
            return `PHASE: FUTURE_THREAD
Rules:
- Leave ONE subtle curiosity thread for tomorrow.
- Example: "Notice what shifts tomorrow when you respond differently."`;

        case 'SEALED':
            return `This session is sealed. Do not respond.`;
    }
}

export function shouldAdvancePhase(
    currentPhase: Phase,
    messageCount: number,
    depthScore: number,
    isPatternGeneration: boolean
): boolean {
    switch (currentPhase) {
        case 'ENTRY':
            // Move to RECOGNITION after first exchange
            return messageCount >= 1;

        case 'RECOGNITION':
            // Move to DEEPENING after 2-3 exchanges
            return messageCount >= 3;

        case 'DEEPENING':
            // Move to INSIGHT if GeneratePattern is triggered
            return isPatternGeneration;

        case 'INSIGHT':
            // Move to CLOSURE after insight delivered
            return true;

        case 'CLOSURE':
            // Move to FUTURE_THREAD after closure
            return true;

        case 'FUTURE_THREAD':
            return true;

        default:
            return false;
    }
}

export function getNextPhase(current: Phase): Phase {
    const sequence: Phase[] = [
        'ENTRY',
        'RECOGNITION',
        'DEEPENING',
        'INSIGHT',
        'CLOSURE',
        'FUTURE_THREAD',
        'SEALED',
    ];
    const idx = sequence.indexOf(current);
    return idx < sequence.length - 1 ? sequence[idx + 1] : 'SEALED';
}
