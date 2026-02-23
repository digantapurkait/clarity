'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DEMO_RESPONSES: Record<string, string[]> = {
    default: [
        "It sounds like something is weighing on you. What feels most present right now?",
        "I hear you. If you had to name the exact feeling underneath those words, what would it be?",
        "That's honest. What's one thing that happened today that made you feel this way?"
    ],
    tired: [
        "You said tired — I wonder if it's the kind of tired that sleep fixes, or something deeper. Which is it today?",
        "Drained energy usually has a source. Is it the pace of the day, or something you're carrying?",
    ],
    overwhelmed: [
        "Overwhelmed can mean so many things. Maybe there's one thing that's sitting heaviest underneath all of it?",
        "When everything feels like a priority, nothing is. What's the one thing you can't stop thinking about?",
    ],
    anxious: [
        "It sounds like your mind is moving faster than you'd like. What's it circling around most?",
        "Anxiety usually points to something we care about. What feels at stake right now?",
    ],
    okay: [
        "Just okay — I notice that. Is 'okay' a landing place today, or is it something you're moving through?",
        "Sometimes 'okay' is just a shield. Is there something small that's actually bothering you?",
    ],
    work: [
        "Work pressure has a particular weight. Is it the work itself, or something around it — expectations, people, pace?",
        "When work stays on your mind, it's usually because something feels unfinished emotionally. What is it?",
    ],
};

const ENTRY_PROMPTS = [
    "How are you arriving today?",
    "What's sitting with you right now?",
    "If you could name one thing on your mind, what would it be?",
];

function getDemoResponse(input: string): string {
    const lower = input.toLowerCase();
    let category = 'default';

    if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('drained')) category = 'tired';
    else if (lower.includes('overwhelm') || lower.includes('too much') || lower.includes('busy')) category = 'overwhelmed';
    else if (lower.includes('anxi') || lower.includes('stress') || lower.includes('worry') || lower.includes('nervous')) category = 'anxious';
    else if (lower.includes('okay') || lower.includes('fine') || lower.includes('alright')) category = 'okay';
    else if (lower.includes('work') || lower.includes('job') || lower.includes('meeting')) category = 'work';

    const options = DEMO_RESPONSES[category] || DEMO_RESPONSES.default;
    return options[Math.floor(Math.random() * options.length)];
}

export default function DemoChat() {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [usedCount, setUsedCount] = useState(0);

    // Fix Hydration: Initialize random prompt only on client
    useEffect(() => {
        setMessages([
            { role: 'ai', text: ENTRY_PROMPTS[Math.floor(Math.random() * ENTRY_PROMPTS.length)] }
        ]);
        // Clean up previous demo context on refresh if needed
        localStorage.removeItem('mindmantra_demo_context');
    }, []);

    // Sync to localStorage
    useEffect(() => {
        if (messages.length > 1) {
            localStorage.setItem('mindmantra_demo_context', JSON.stringify(messages));
        }
    }, [messages]);

    const send = async (text: string) => {
        if (!text.trim() || typing || usedCount >= 2) return;
        const userMsg = text.trim();
        setMessages((m) => [...m, { role: 'user', text: userMsg }]);
        setInput('');
        setTyping(true);

        const delay = Math.random() * 800 + 600;
        await new Promise((r) => setTimeout(r, delay));

        const reply = getDemoResponse(userMsg);
        setMessages((m) => [...m, { role: 'ai', text: reply }]);
        setTyping(false);
        setUsedCount(prev => prev + 1);
    };

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden max-w-lg mx-auto shadow-2xl">
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

            {/* Input / Interstitial */}
            <div className="px-4 pb-4">
                {usedCount >= 2 ? (
                    <div className="space-y-3 pt-2">
                        <div className="text-center mb-4">
                            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Session Preview Complete</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/chat?trigger=patterns"
                                className="flex flex-col items-center justify-center p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-deep)] hover:border-[var(--accent)] transition-all group"
                            >
                                <span className="text-lg mb-1 group-hover:scale-110 transition-transform">◎</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)]">Reflection Board</span>
                            </Link>
                            <Link
                                href="/chat?trigger=clarity"
                                className="flex flex-col items-center justify-center p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-deep)] hover:border-[var(--accent)] transition-all group"
                            >
                                <span className="text-lg mb-1 group-hover:scale-110 transition-transform">⚡</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)]">Clarity Score</span>
                            </Link>
                        </div>
                        <Link href="/chat" className="block text-center text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors py-2">
                            Skip to full session →
                        </Link>
                    </div>
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
                            disabled={!input.trim() || typing}
                            className="px-4 py-2.5 bg-[var(--accent)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
