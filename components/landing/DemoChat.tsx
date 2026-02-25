'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const ENTRY_PROMPTS = [
    "How are you arriving today?",
    "What's sitting with you right now?",
    "If you could name one thing on your mind, what would it be?",
];

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
        if (!text.trim() || typing || usedCount >= 1) return;
        const userMsg = text.trim();
        const updatedMessages = [...messages, { role: 'user', text: userMsg }];
        setMessages(updatedMessages as any);
        setInput('');
        setTyping(true);

        try {
            const res = await fetch('/api/chat/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages((m) => [...m, { role: 'ai', text: data.reply }]);
            } else {
                throw new Error('Preview failed');
            }
        } catch (e) {
            console.error('Preview error:', e);
            setMessages((m) => [...m, {
                role: 'ai',
                text: "I hear you. If you had to name the exact feeling underneath those words, what would it be?"
            }]);
        } finally {
            setTyping(false);
            setUsedCount(prev => {
                const next = prev + 1;
                if (next === 1) {
                    localStorage.setItem('initial_pii_score', '18');
                }
                return next;
            });
        }
    };

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden max-w-lg mx-auto shadow-2xl transition-all">
            {/* Header */}
            <div className="px-5 py-3 border-b border-[var(--border)] flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                    <span className="text-sm text-[var(--text-muted)] tracking-wide">MindMantra · Preview</span>
                </div>
                {usedCount >= 1 && (
                    <span className="text-[10px] text-[var(--accent)] font-bold uppercase tracking-widest animate-pulse">
                        Ready to Begin
                    </span>
                )}
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4 min-h-[160px]">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`msg-enter flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'ai'
                                ? 'bg-[var(--ai-bubble)] text-[var(--text-primary)] rounded-tl-sm shadow-sm'
                                : 'bg-[var(--user-bubble)] text-[var(--text-primary)] rounded-tr-sm shadow-sm'
                                }`}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}

                {typing && (
                    <div className="flex justify-start">
                        <div className="bg-[var(--ai-bubble)] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm">
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input / Interstitial */}
            <div className="px-5 pb-5">
                {usedCount >= 1 ? (
                    <div className="space-y-4 pt-4 border-t border-[var(--border)] animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="text-center">
                            <p className="text-[12px] text-[var(--text-primary)] font-medium mb-1">Preview complete. Shall we begin the real work?</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Bridging your reflection to the mental map...</p>
                        </div>
                        <Link
                            href="/chat"
                            className="flex items-center justify-center p-4 rounded-xl bg-[var(--accent)] text-black font-bold uppercase tracking-wider hover:scale-[1.02] transition-all shadow-[0_4px_20px_rgba(var(--accent-rgb),0.3)]"
                        >
                            Begin Full Session →
                        </Link>
                    </div>
                ) : (
                    <div className="relative group">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && send(input)}
                            placeholder="Share your first reflection..."
                            className="input-glow w-full bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl pl-4 pr-12 py-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] transition-all"
                        />
                        <button
                            onClick={() => send(input)}
                            disabled={!input.trim() || typing}
                            className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-[var(--accent)] rounded-lg text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
