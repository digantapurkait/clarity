import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai';

/**
 * On-Demand Generic AI Comparison API
 * Generates a surface-level AI response for comparison purposes.
 * This is decoupled from main chat to save tokens and improve latency.
 */
export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        const genericSystemPrompt = `Provide a standard, helpful, but surface-level AI assistant response. 
        Do NOT apply any pattern intelligence, deep emotional reflection, or memory-based context.
        Keep it polite, generic, and under 3 sentences.`;

        const genericReply = await chat(genericSystemPrompt, [{ role: 'user', content: message }]);

        return NextResponse.json({ genericReply });
    } catch (error: any) {
        console.error('[GENERIC_CHAT_ERROR]', error);
        return NextResponse.json({
            error: 'Failed to generate generic reply',
            genericReply: "I'm sorry, I couldn't generate a generic comparison right now."
        }, { status: 500 });
    }
}
