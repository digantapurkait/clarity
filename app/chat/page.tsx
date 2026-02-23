'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from 'react';
import { t, languages } from '@/lib/i18n';
import Link from 'next/link';
import PatternDiscovery from '@/components/chat/PatternDiscovery';
import PIIScoreIndicator from '@/components/chat/PIIScoreIndicator';
import { useSession, signOut } from 'next-auth/react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isMantra?: boolean;
    isError?: boolean;
    isClarity?: boolean;
    isIntervention?: boolean;
    suggestions?: string[];
}

const PHASE_OPTIONS: Record<string, string[]> = {
    'ENTRY': ['Help me reflect', 'I feel overwhelmed', 'Just venting'],
    'RECOGNITION': ['See my patterns', 'Why does this happen?', 'Is this normal?'],
    'DEEPENING': ['Go deeper', 'Connect the dots', 'What am I missing?'],
    'INSIGHT': ['Give me clarity', 'What should I do?', 'Reframe this'],
    'CLOSURE': ['I am ready', 'Save this wisdom', 'End for today'],
};

export default function ChatPage() {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [typing, setTyping] = useState(false);
    const [sealed, setSealed] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [language, setLanguage] = useState('en');
    const [showSignup, setShowSignup] = useState(false);
    const [lastGenericReply, setLastGenericReply] = useState<string | null>(null);
    const [showContrast, setShowContrast] = useState(false);
    const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
    const [showRecovery, setShowRecovery] = useState(false);
    const [curiosityHook, setCuriosityHook] = useState<string | null>(null);
    const [phase, setPhase] = useState<string>('ENTRY');
    const [curiosityClicked, setCuriosityClicked] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Guest ID management
    useEffect(() => {
        let guestId = localStorage.getItem('guest_id');
        if (!guestId) {
            guestId = crypto.randomUUID();
            localStorage.setItem('guest_id', guestId);
        }

        const lang = localStorage.getItem('pref_lang') || 'en';
        setLanguage(lang);

        const init = async () => {
            // Check for trigger context from URL
            const urlParams = new URLSearchParams(window.location.search);
            const trigger = urlParams.get('trigger');

            // If user is logged in and was a guest, merge sessions
            if (session && guestId) {
                await fetch('/api/auth/merge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guestId }),
                });
                localStorage.removeItem('guest_id');
                guestId = null;
            }

            // Sync demo context if present
            const demoContext = localStorage.getItem('mindmantra_demo_context');
            if (demoContext) {
                try {
                    const parsed = JSON.parse(demoContext);
                    await fetch('/api/chat/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages: parsed, guestId }),
                    });
                    localStorage.removeItem('mindmantra_demo_context');
                } catch (e) {
                    console.error('Demo sync error:', e);
                }
            }

            const chatRes = await fetch(`/api/chat${guestId ? `?guestId=${guestId}` : ''}`);
            const suggestRes = await fetch(`/api/suggestions?language=${lang}`);

            if (chatRes.ok) {
                const data = await chatRes.json();
                if (data.messages && data.messages.length > 0) {
                    setMessages(data.messages.map((m: any) => ({
                        role: m.role,
                        content: m.content,
                        isMantra: m.isMantra,
                        isClarity: m.isClarity
                    })));
                    setSealed(data.session?.sealed || false);
                } else {
                    setMessages([{ role: 'assistant', content: t('entryPrompt', lang) || "How are you arriving today?" }]);
                }
            }

            if (suggestRes.ok) {
                const s = await suggestRes.json();
                setSuggestions(s.suggestions || []);
            }

            // Handle triggers
            if (trigger === 'patterns') {
                // The PatternDiscovery component handles its own state, 
                // but we might want to "nudge" it or just let the user click.
                // For now, it's enough that we synced and fetched messages.
            } else if (trigger === 'clarity') {
                // If it's a clarity check, we might want to auto-trigger it
                // but usually user needs to have enough context.
                // For now, we'll just let the messages render.
            }

            setInitialized(true);
        };

        init();
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const handleLanguageChange = async (newLang: string) => {
        setLanguage(newLang);
        localStorage.setItem('pref_lang', newLang);

        if (session) {
            await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: newLang }),
            });
        }
    };

    const send = async (text: string, isClarityCheck: boolean = false) => {
        if (!text.trim() && !isClarityCheck) return;
        if (loading || typing || sealed) return;

        const userText = text.trim();
        if (!isClarityCheck) {
            setMessages((prev) => [...prev, { role: 'user', content: userText }]);
            setInput('');
            resetInactivityTimer();
        }
        setLoading(true);

        const guestId = localStorage.getItem('guest_id');

        // We show typing immediately while waiting for the first chunk
        setTyping(true);

        const startTime = Date.now();
        const minPacingDelay = 4500;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: isClarityCheck ? 'System: Clarity Check Triggered' : userText,
                    guestId,
                    language,
                    isClarityCheck
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMessage = errorData.error || 'Service temporarily unavailable. Please try again in a moment.';

                // Ensure minor delay even for errors to maintain mindful pacing
                const elapsed = Date.now() - startTime;
                if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));

                setMessages((prev) => [...prev, {
                    role: 'assistant',
                    content: errorMessage,
                    isError: true,
                    isIntervention: errorData.isIntervention,
                    suggestions: errorData.suggestions
                }]);
                setTyping(false);
                setLoading(false);
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            let accumulatedReply = '';
            let metadataReceived = false;
            let metadataBuffer = '';
            let firstTokenShown = false;

            // Add placeholder for the AI response
            setMessages((prev) => [...prev, { role: 'assistant', content: '', isClarity: isClarityCheck }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                if (chunk.includes('__METADATA__')) {
                    const [contentPart, metadataPart] = chunk.split('__METADATA__');
                    accumulatedReply += contentPart;
                    metadataBuffer += metadataPart;
                    metadataReceived = true;
                } else if (metadataReceived) {
                    metadataBuffer += chunk;
                } else {
                    accumulatedReply += chunk;
                }

                // Deliberate Pacing: wait for min delay before showing first token
                if (!firstTokenShown && accumulatedReply.length > 0) {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minPacingDelay) {
                        await new Promise(r => setTimeout(r, minPacingDelay - elapsed));
                    }
                    firstTokenShown = true;
                    setTyping(false);
                    setLoading(false);
                }

                // Smooth token delivery
                setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last && last.role === 'assistant') {
                        last.content = accumulatedReply;
                    }
                    return next;
                });
            }

            if (metadataReceived) {
                try {
                    const metadata = JSON.parse(metadataBuffer);
                    setSealed(metadata.sealed);

                    if (metadata.mantra) {
                        setMessages((prev) => {
                            const next = [...prev];
                            const last = next[next.length - 1];
                            if (last && last.role === 'assistant') {
                                last.isMantra = true;
                                last.content = metadata.mantra;
                            }
                            return next;
                        });
                    }

                    if (metadata.genericReply) {
                        setLastGenericReply(metadata.genericReply);
                    }

                    if (metadata.sealed && !session) {
                        setTimeout(() => setShowSignup(true), 2500);
                    }
                    if (metadata.curiosityHook) {
                        setCuriosityHook(metadata.curiosityHook);
                        setCuriosityClicked(false);
                    }
                    if (metadata.phase) {
                        setPhase(metadata.phase);
                    }
                    resetInactivityTimer();
                } catch (e) {
                    console.error('Failed to parse session metadata:', e);
                }
            }

        } catch (e) {
            console.error('Chat error:', e);
            setTyping(false);
            setLoading(false);
            setMessages((prev) => [...prev, {
                role: 'assistant',
                isError: true,
                content: t('errorQuiet', language) || "Something went quiet. I'm still here — try again.",
            }]);
        }
    };

    const handleCuriosityClick = async () => {
        if (!curiosityHook) return;
        setCuriosityClicked(true);
        const guestId = localStorage.getItem('guest_id');

        await fetch('/api/user/curiosity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hook: curiosityHook, guestId })
        });

        send(`Tell me more about: ${curiosityHook}`);
    };

    const handleRetry = () => {
        // Find the last user message
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
            // Remove the error message from history
            setMessages(prev => prev.slice(0, -1));
            send(lastUserMessage.content);
        }
    };

    const name = session?.user?.name || session?.user?.email?.split('@')[0] || (session ? 'there' : 'Guest');

    const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        const timer = setTimeout(() => {
            if (!loading && !typing && !sealed && messages.length > 2) {
                setShowRecovery(true);
            }
        }, 20000);
        setInactivityTimer(timer);
    };

    useEffect(() => {
        return () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
        };
    }, [inactivityTimer]);

    if (!initialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex gap-1.5">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                </div>
            </div>
        );
    }

    // ... inside ChatPage ...
    const userId = (session?.user as any)?.id || null;

    return (
        <div className="min-h-screen flex flex-col relative">
            {/* Full-width Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-deep)] z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
                        <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">M</div>
                        <span className="font-semibold text-[var(--text-primary)] tracking-tight">MindMantra</span>
                    </Link>
                    <div className="h-4 w-px bg-[var(--border)] hidden sm:block mx-1" />
                    <span className="text-sm font-medium text-[var(--text-muted)] hidden sm:block">{name}</span>
                </div>

                <div className="flex items-center gap-6">
                    <PIIScoreIndicator userId={userId} />
                    <PatternDiscovery userId={userId} />

                    <div className="flex items-center gap-3">
                        <select
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="bg-transparent text-xs text-[var(--text-muted)] border-none focus:ring-0 cursor-pointer"
                        >
                            {languages.map(l => <option key={l.code} value={l.code} className="bg-[var(--bg-card)]">{l.name}</option>)}
                        </select>

                        {session ? (
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                            >
                                leave
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link href="/auth/signin" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                                    sign in
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Centered Chat Content Container */}
            <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 overflow-hidden">
                <div className="flex-1 py-6 space-y-5 overflow-y-auto scrollbar-hide">
                    {/* New Session Reset Option */}
                    {!session && (
                        <div className="flex justify-center pb-4">
                            <button
                                onClick={() => {
                                    if (confirm('Start a fresh session? This will clear current history.')) {
                                        localStorage.removeItem('guest_id');
                                        window.location.reload();
                                    }
                                }}
                                className="px-4 py-1.5 rounded-full border border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all bg-[var(--bg-card)]/50 backdrop-blur-sm"
                            >
                                new session
                            </button>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`msg-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.isMantra ? (
                                <div className="mantra-card px-5 py-4 rounded-2xl max-w-[85%] space-y-1">
                                    <p className="text-xs text-[rgba(251,191,36,0.7)] uppercase tracking-widest">{t('mantraTitle', language) || "Today's focus"}</p>
                                    <p className="text-[var(--text-primary)] text-sm leading-relaxed">{msg.content}</p>
                                </div>
                            ) : msg.isClarity ? (
                                <div className="cl-snapshot-card w-full max-w-[90%] bg-[rgba(15,15,30,0.8)] border border-[rgba(251,191,36,0.3)] rounded-2xl p-5 space-y-4 backdrop-blur-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <div className="w-12 h-12 rounded-full border border-[var(--accent)] animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] font-bold">Clarity Snapshot</span>
                                    </div>
                                    <div className="space-y-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
                                        {msg.content}
                                    </div>
                                    <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-[10px] text-white/30 uppercase tracking-widest">MindMantra Analytical Layer</span>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`relative max-w-[85%] px-4 py-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant'
                                        ? (msg.isIntervention ? 'bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)]' : 'bg-[var(--ai-bubble)]') + ' text-[var(--text-primary)] rounded-tl-sm'
                                        : 'bg-[var(--user-bubble)] text-[var(--text-primary)] rounded-tr-sm'
                                        } ${msg.isError ? 'border border-red-500/20' : ''}`}
                                >
                                    {msg.content}

                                    {/* Contrast Toggle for last assistant message */}
                                    {msg.role === 'assistant' && i === messages.length - 1 && lastGenericReply && (
                                        <div className="mt-3 pt-3 border-t border-white/5">
                                            <button
                                                onClick={() => setShowContrast(!showContrast)}
                                                className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-bold"
                                            >
                                                {showContrast ? '← Hide generic AI reply' : '👉 See generic AI reply'}
                                            </button>
                                            {showContrast && (
                                                <div className="mt-2 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-white/5 text-[12px] text-[var(--text-secondary)] italic animate-in fade-in slide-in-from-top-1">
                                                    <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-1">Standard AI Baseline:</span>
                                                    {lastGenericReply}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {msg.suggestions && msg.suggestions.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {msg.suggestions.map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => send(s)}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] transition-colors"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {msg.isError && !msg.isIntervention && (
                                        <button
                                            onClick={handleRetry}
                                            className="mt-2 block text-[10px] uppercase tracking-widest text-[var(--accent)] hover:underline font-bold"
                                        >
                                            try again
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {typing && (
                        <div className="flex justify-start msg-enter">
                            <div className="bg-[var(--ai-bubble)] px-4 py-3.5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                        </div>
                    )}

                    {sealed && (
                        <div className="msg-enter text-center py-6 space-y-2">
                            <div className="text-2xl">○</div>
                            <p className="text-sm text-[var(--text-muted)]">{t('sealedOne', language) || "Today's session is complete."}</p>
                            <p className="text-xs text-[var(--text-muted)]">{t('sealedTwo', language) || "I'll be here tomorrow when you're ready."}</p>
                        </div>
                    )}

                    {/* Recovery Prompt */}
                    {showRecovery && !sealed && (
                        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-xs p-5 bg-[var(--bg-card)] border border-[var(--accent)] rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-300 z-50">
                            <p className="text-sm font-medium text-[var(--text-primary)] mb-4 text-center">Want to refine this so the pattern becomes clearer?</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => { setShowRecovery(false); setInput('Mental overvhelm'); send('Stuck in mind'); }} className="py-2.5 bg-[var(--accent)] rounded-xl text-xs font-bold text-white">Yes, refine it</button>
                                <button onClick={() => setShowRecovery(false)} className="py-2.5 bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">I'm done for now</button>
                            </div>
                        </div>
                    )}

                    {showSignup && !session && (
                        <div className="msg-enter p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-active)] shadow-2xl space-y-4 mx-auto max-w-sm">
                            <p className="text-sm text-center text-[var(--text-primary)] font-medium">
                                {t('savePrompt', language)}
                            </p>
                            <div className="flex flex-col gap-2">
                                <Link
                                    href={`/auth/signin?guestId=${localStorage.getItem('guest_id')}`}
                                    className="w-full py-3 bg-[var(--accent)] rounded-xl text-sm font-medium text-center hover:opacity-90 transition-opacity"
                                >
                                    {t('saveBtn', language)}
                                </Link>
                                <button
                                    onClick={() => setShowSignup(false)}
                                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-2"
                                >
                                    {t('finishBtn', language)}
                                </button>
                            </div>
                            <p className="text-center text-[10px] text-[var(--text-muted)]">
                                {t('privacyNotice', language)}
                            </p>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {!sealed && !showSignup && (
                    <div className="pb-6 pt-2 space-y-3 bg-[var(--bg-deep)]">
                        {/* Curiosity Hook (Insight Teaser) */}
                        {curiosityHook && !curiosityClicked && (
                            <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4">
                                <button
                                    onClick={handleCuriosityClick}
                                    className="px-4 py-2 bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.3)] rounded-full text-[11px] text-[var(--accent)] font-medium flex items-center gap-2 hover:bg-[rgba(251,191,36,0.2)] transition-all shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                                    {curiosityHook}
                                </button>
                            </div>
                        )}

                        {/* Dynamic Intent Options */}
                        {!loading && !typing && messages.length >= 2 && (
                            <div className="flex justify-center flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
                                {(PHASE_OPTIONS[phase] || PHASE_OPTIONS['ENTRY']).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => send(opt)}
                                        className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {suggestions.length > 0 && messages.length <= 1 && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {suggestions.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => send(s)}
                                        className="suggestion-btn px-3.5 py-2 rounded-xl text-xs"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 items-center">
                            <button
                                onClick={() => send('', true)}
                                disabled={loading || typing || messages.length < 5}
                                title="Clarity Check"
                                className="w-11 h-11 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-20 group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                                </svg>
                            </button>
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                                placeholder={t('inputPlaceholder', language)}
                                disabled={loading || typing}
                                className="input-glow flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-40"
                            />
                            <button
                                onClick={() => send(input)}
                                disabled={loading || typing || !input.trim()}
                                className="px-4 py-3 bg-[var(--accent)] rounded-xl text-sm font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
                            >
                                {t('send', language)}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

