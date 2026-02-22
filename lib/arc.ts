// Session Arc Logic — Phase directives and soft transition scoring

export type Phase =
    | 'ENTRY'
    | 'RECOGNITION'
    | 'DEEPENING'
    | 'INSIGHT'
    | 'CLOSURE'
    | 'FUTURE_THREAD'
    | 'SEALED';

// Intentional pacing delays per phase (milliseconds)
// Makes responses feel reflective, not computational
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
            return `You are in the ENTRY phase.
Ask gently how the user is arriving today — one simple, open question.
Example: "How are you arriving today?" or "What's been sitting with you?"
After their first response, the system will evaluate emotional depth to determine next phase.
Do not reference memory yet. Just open the space.`;

        case 'RECOGNITION':
            return `You are in the RECOGNITION phase.
Reference ONE specific phrase or feeling from a past session verbatim.
Format: "Last [day/week], you mentioned [exact phrase] — is today carrying something similar?"
Then wait. Do not ask another question.
This is the moment the user feels remembered.`;

        case 'DEEPENING':
            return `You are in the DEEPENING phase.
Ask ONE reflective question that slows the user down emotionally.
Examples: "What feels heaviest right now?" or "If you paused for a second — what's underneath that?"
Never ask for details or explanation. Ask for felt experience.
Stay in this phase until the user shows emotional depth or clarity.`;

        case 'INSIGHT':
            return `You are in the INSIGHT phase.
Offer a short, personalized observation (2–3 sentences maximum).
Mirror the user's exact language. Never substitute with clinical terms.
This is reflection, not advice. You are showing them what you've noticed — gently.
Use tentative language: "it sounds like", "I wonder if", "maybe", "perhaps".
Never conclude their emotional state definitively.`;

        case 'CLOSURE':
            return `You are in the CLOSURE phase.
Offer a small mantra or focus for today. Phrase it as an invitation, not a prescription.
Example: "Would a small focus help for today?" Then offer one line: "One pause before reacting."
Keep it quiet and personal. This is emotional completion — not advice.`;

        case 'FUTURE_THREAD':
            return `You are in the FUTURE_THREAD phase.
Plant a soft return curiosity. One sentence only.
Example: "Let's see how this feels tomorrow." or "I'll be here when you're ready."
Do not summarize the session. Do not give advice. Just leave a thread open.
This is the last message. After this, the session is sealed.`;

        case 'SEALED':
            return `This session is sealed. Do not respond.`;
    }
}

// Determine if phase should advance based on depth signals
export function shouldAdvancePhase(
    currentPhase: Phase,
    depthScore: number,
    claritySignal: number,
    resistanceLevel: number
): boolean {
    switch (currentPhase) {
        case 'ENTRY':
            // Always advance to RECOGNITION after first user message
            return true;

        case 'RECOGNITION':
            // Advance if user engaged (not deflecting) — low bar intentional
            return resistanceLevel < 0.6;

        case 'DEEPENING':
            // Core soft gate: advance only when genuinely open
            return depthScore > 0.60 && resistanceLevel < 0.45;

        case 'INSIGHT':
            // Always advance to CLOSURE after insight is delivered
            return true;

        case 'CLOSURE':
            // Always advance to FUTURE_THREAD after closure
            return true;

        case 'FUTURE_THREAD':
            // Seal session
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
