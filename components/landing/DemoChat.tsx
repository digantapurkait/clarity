'use client';

import { useState } from 'react';
import Link from 'next/link';

const DEMO_RESPONSES: Record<string, string> = {
    default: "It sounds like something is weighing on you. What feels most present right now?",
    tired: "You said tired — I wonder if it's the kind of tired that sleep fixes, or something deeper. Which is it today?",
    overwhelmed: "Overwhelmed can mean so many things. Maybe there's one thing that's sitting heaviest underneath all of it?",
    anxious: "It sounds like your mind is moving faster than you'd like. What's it circling around most?",
    sad: "I hear you. Sometimes just naming it is the first honest moment of the day. What brought this up?",
    okay: "Just okay — I notice that. Is 'okay' a landing place today, or is it something you're moving through?",
    work: "Work pressure has a particular weight. Is it the work itself, or something around it — expectations, people, pace?",
    stuck: "Stuck is such an honest word. What does it feel like from the inside — heavy, foggy, or something else?",
};

function getDemoResponse(input: string): string {
    const lower = input.toLowerCase();
    if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('drained')) return DEMO_RESPONSES.tired;
    if (lower.includes('overwhelm') || lower.includes('too much')) return DEMO_RESPONSES.overwhelmed;
    if (lower.includes('anxi') || lower.includes('stress') || lower.includes('worry')) return DEMO_RESPONSES.anxious;
    if (lower.includes('sad') || lower.includes('low') || lower.includes('down')) return DEMO_RESPONSES.sad;
    if (lower.includes('okay') || lower.includes('fine') || lower.includes('alright')) return DEMO_RESPONSES.okay;
    if (lower.includes('work') || lower.includes('job') || lower.includes('meeting')) return DEMO_RESPONSES.work;
    if (lower.includes('stuck') || lower.includes('lost') || lower.includes('confused')) return DEMO_RESPONSES.stuck;
    return DEMO_RESPONSES.default;
}

import { t } from '@/lib/i18n';

export default function DemoChat() {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
        { role: 'ai', text: t('entryPrompt') },
    ]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [used, setUsed] = useState(false);

    const send = async (text: string) => {
        if (!text.trim() || typing || used) return;
        const userMsg = text.trim();
        setMessages((m) => [...m, { role: 'user', text: userMsg }]);
        setInput('');
        setTyping(true);

        await new Promise((r) => setTimeout(r, 400));
        const reply = getDemoResponse(userMsg);
        setMessages((m) => [...m, { role: 'ai', text: reply }]);
        setTyping(false);
        setUsed(true);
    };

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden max-w-lg mx-auto">
            {/* Header */}
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-sm text-[var(--text-muted)] tracking-wide">MindMantra · Preview</span>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4 min-h-[180px]">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`msg-enter flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'ai'
                                ? 'bg-[var(--ai-bubble)] text-[var(--text-primary)] rounded-tl-sm'
                                : 'bg-[var(--user-bubble)] text-[var(--text-primary)] rounded-tr-sm'
                                }`}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}

                {typing && (
                    <div className="flex justify-start">
                        <div className="bg-[var(--ai-bubble)] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="px-4 pb-4">
                {used ? (
                    <Link href="/chat" className="block text-center text-xs text-[var(--accent)] hover:underline py-2">
                        Start your full session to continue →
                    </Link>
                ) : (
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && send(input)}
                            placeholder="Write anything..."
                            className="input-glow flex-1 bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                        />
                        <button
                            onClick={() => send(input)}
                            className="px-4 py-2.5 bg-[var(--accent)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
