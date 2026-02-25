import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai';

export async function POST(req: NextRequest) {
    try {
        const { messages, language = 'en' } = await req.json();

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Messages required' }, { status: 400 });
        }

        const systemPrompt = `
You are MindMantra, a pattern-intelligence AI. 
This is a short preview interaction (maximum 2 turns).
Your goal is to be perceptive, concise (1-2 sentences), and slightly challenging. 
Acknowledge the user's input grounded in emotional intelligence. 
Do not give advice. Identify a subtle pattern or ask a deep clarifying question.
Never use generic therapist clichés.
Active Language: ${language}
`.trim();

        // Convert the demo messages format to the format required by the AI lib
        const aiMessages = messages.map((m: any) => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.text || m.content
        })) as { role: 'user' | 'assistant'; content: string }[];

        const reply = await chat(systemPrompt, aiMessages);

        return NextResponse.json({ reply });
    } catch (error: any) {
        console.error('[PREVIEW_CHAT_ERROR]', error);
        return NextResponse.json({
            reply: "I hear you. If you had to name the exact feeling underneath those words, what would it be?"
        });
    }
}
