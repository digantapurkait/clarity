'use client';

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from 'react';
import { t, languages } from '@/lib/i18n';
import Link from 'next/link';
import PatternDiscovery from '@/components/chat/PatternDiscovery';
import PIIScoreIndicator from '@/components/chat/PIIScoreIndicator';
import { useSession, signOut } from 'next-auth/react';
import MCQOverlay from '@/components/chat/MCQOverlay';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isMantra?: boolean;
    isError?: boolean;
    isClarity?: boolean;
    isIntervention?: boolean;
    suggestions?: string[];
    genericReply?: string | null;
    genericReplyLoading?: boolean;
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
    const [showInitialAuthPrompt, setShowInitialAuthPrompt] = useState(false);
    const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
    const [lastGenericReply, setLastGenericReply] = useState<string | null>(null);
    const [showContrast, setShowContrast] = useState(false);
    const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
    const [showRecovery, setShowRecovery] = useState(false);
    const [curiosityHook, setCuriosityHook] = useState<string | null>(null);
    const [phase, setPhase] = useState<string>('ENTRY');
    const [curiosityClicked, setCuriosityClicked] = useState(false);

    // MCQ State
    const [activeMCQ, setActiveMCQ] = useState<{ question: string; options: string[] } | null>(null);
    const [showMCQ, setShowMCQ] = useState(false);

    // Prompt for auth immediately if guest
    useEffect(() => {
        if (!session && initialized) {
            setShowInitialAuthPrompt(true);
        }
    }, [session, initialized]);

    const handleAuthRedirect = () => {
        // Save current chat state to help return back
        localStorage.setItem('pending_chat_context', JSON.stringify(messages));
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname + '?bridge=true')}`;
    };

    const handleSkip = () => {
        setShowInitialAuthPrompt(false);
        setShowSkipConfirmation(true);
    };

    const handleConfirmSkip = () => {
        setShowSkipConfirmation(false);
        // Continue with guest session
    };

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
            const bridge = urlParams.get('bridge');

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
                    setPhase(data.session?.phase || 'ENTRY');
                } else if (bridge === 'true') {
                    const landingReflection = localStorage.getItem('landing_reflection');
                    if (landingReflection) {
                        setMessages([{ role: 'user', content: landingReflection }]);
                        localStorage.removeItem('landing_reflection');
                        // Use a custom send logic to ensure it feels contextually correct
                        setInitialized(true);
                        setTimeout(() => handleBridgeMessage(landingReflection), 500);
                        return;
                    } else {
                        setMessages([{ role: 'assistant', content: t('entryPrompt', lang) || "How are you arriving today?" }]);
                    }
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
                    const parts = chunk.split('__METADATA__');
                    accumulatedReply += parts[0];
                    metadataBuffer += parts[1] || '';
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

            // After stream ends, process metadata
            if (metadataBuffer) {
                try {
                    const metadata = JSON.parse(metadataBuffer);

                    setMessages((prev) => {
                        const next = [...prev];
                        const last = next[next.length - 1];
                        if (last && last.role === 'assistant') {
                            if (metadata.mantra) {
                                last.isMantra = true;
                                last.content = metadata.mantra;
                            }
                            if (metadata.suggestions) {
                                last.suggestions = metadata.suggestions;
                            }
                        }
                        return next;
                    });

                    if (metadata.genericReply) setLastGenericReply(metadata.genericReply);
                    if (metadata.sealed && !session) setTimeout(() => setShowSignup(true), 2500);
                    if (metadata.curiosityHook) {
                        setCuriosityHook(metadata.curiosityHook);
                        setCuriosityClicked(false);
                    }
                    if (metadata.phase) setPhase(metadata.phase);
                    if (metadata.suggestions) setSuggestions(metadata.suggestions);
                    if (metadata.sealed) setSealed(true);

                    if (metadata.mcq) {
                        setActiveMCQ(metadata.mcq);
                        setTimeout(() => setShowMCQ(true), 1500);
                    }

                    resetInactivityTimer();
                } catch (e) {
                    console.error('Failed to parse session metadata:', e);
                }
            }
        } catch (e: any) {
            console.error('Chat error:', e);
            setTyping(false);
            setLoading(false);
            setMessages((prev) => [...prev, {
                role: 'assistant',
                isError: true,
                content: t('errorQuiet', language) || "Something went quiet. I'm still here — try again.",
            }]);
        } finally {
            setLoading(false);
            setTyping(false);
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

    const handleBridgeMessage = async (reflection: string) => {
        setTyping(true);
        setLoading(true);
        const guestId = localStorage.getItem('guest_id');
        const initialScore = parseInt(localStorage.getItem('initial_pii_score') || '18');

        // Add a placeholder assistant message for the bridge response
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: reflection,
                    guestId,
                    language,
                    isBridge: true,
                    initialScore
                }),
            });

            if (!res.ok) throw new Error('Bridge failed');

            const reader = res.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            let accumulatedReply = '';
            let metadataBuffer = '';
            let metadataReceived = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });

                if (chunk.includes('__METADATA__')) {
                    const parts = chunk.split('__METADATA__');
                    accumulatedReply += parts[0];
                    metadataBuffer += parts[1] || '';
                    metadataReceived = true;
                } else if (metadataReceived) {
                    metadataBuffer += chunk;
                } else {
                    accumulatedReply += chunk;
                }

                setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last && last.role === 'assistant') {
                        last.content = accumulatedReply;
                    }
                    return next;
                });
            }

            if (metadataBuffer) {
                try {
                    const metadata = JSON.parse(metadataBuffer);
                    if (metadata.phase) setPhase(metadata.phase);
                    if (metadata.suggestions) setSuggestions(metadata.suggestions);
                    if (metadata.mcq) {
                        setActiveMCQ(metadata.mcq);
                        setTimeout(() => setShowMCQ(true), 1500);
                    }
                } catch (e) {
                    console.error('Bridge metadata error:', e);
                }
            }

            setTyping(false);
            setLoading(false);
        } catch (e) {
            console.error('Bridge error:', e);
            setTyping(false);
            setLoading(false);
            setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === 'assistant') {
                    last.content = "I'm here, but I had a momentary lapse in connection. Let's continue.";
                    last.isError = true;
                }
                return next;
            });
        }
    };

    const handleMCQSelect = (option: string) => {
        send(`My reflection: ${option}`);
        setShowMCQ(false);
    };

    const fetchGenericReply = async (index: number) => {
        const msg = messages[index];
        if (!msg || msg.role !== 'assistant' || msg.genericReply || msg.genericReplyLoading) return;

        // Find the user message before this assistant message
        const lastUserMsg = messages.slice(0, index).reverse().find(m => m.role === 'user');
        if (!lastUserMsg) return;

        setMessages(prev => {
            const next = [...prev];
            next[index] = { ...next[index], genericReplyLoading: true };
            return next;
        });

        try {
            const res = await fetch('/api/chat/generic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: lastUserMsg.content }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => {
                    const next = [...prev];
                    next[index] = { ...next[index], genericReply: data.genericReply, genericReplyLoading: false };
                    return next;
                });
            } else {
                throw new Error('Failed to fetch generic reply');
            }
        } catch (e) {
            console.error('Generic reply fetch error:', e);
            setMessages(prev => {
                const next = [...prev];
                next[index] = { ...next[index], genericReply: "Could not generate comparison.", genericReplyLoading: false };
                return next;
            });
        }
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
            setShowRecovery(true);
        }, 60000); // 1 minute of inactivity
        setInactivityTimer(timer);

        // Track last activity for 15-minute session timeout
        localStorage.setItem('last_activity', Date.now().toString());
    };

    // Session timeout checker
    useEffect(() => {
        const interval = setInterval(() => {
            const lastActivity = localStorage.getItem('last_activity');
            if (lastActivity && session) {
                const diff = Date.now() - parseInt(lastActivity);
                if (diff > 15 * 60 * 1000) { // 15 minutes
                    signOut({ callbackUrl: '/?timeout=true' });
                }
            }
        }, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [session]);

    const handleRefinedInteraction = async (choice: string) => {
        setShowRecovery(false);
        // Track the click for retention engine (PII)
        const guestId = localStorage.getItem('guest_id');
        await fetch('/api/user/curiosity', { // Reuse curiosity endpoint or create specific one
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hook: `Choice: ${choice}`, guestId })
        });

        send(choice);
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
        <div className="min-h-screen flex flex-col relative pt-20">
            {showMCQ && activeMCQ && (
                <MCQOverlay
                    question={activeMCQ.question}
                    options={activeMCQ.options}
                    onSelect={handleMCQSelect}
                    onClose={() => setShowMCQ(false)}
                />
            )}
            {/* Initial Auth Interstitial */}
            {showInitialAuthPrompt && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[32px] p-8 shadow-2xl space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-[0.05] blur-[40px]" />
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 bg-[var(--accent-soft)] rounded-2xl flex items-center justify-center mx-auto text-[var(--accent)] text-xl font-bold">M</div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">One small step for your mind.</h2>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed px-4">
                                Sign in to ensure your sessions are remembered and your emotional patterns are preserved securely.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={handleAuthRedirect}
                                className="w-full py-4 bg-[var(--accent)] rounded-2xl text-[16px] font-bold text-white hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
                            >
                                Secure my patterns
                            </button>
                            <button
                                onClick={handleSkip}
                                className="w-full py-3 text-[12px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-bold"
                            >
                                Skip for now
                            </button>
                        </div>
                        <p className="text-[11px] text-center text-[var(--text-muted)]">
                            MindMantra is completely free.
                        </p>
                    </div>
                </div>
            )}

            {/* Skip Confirmation (Value Prop) */}
            {showSkipConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-xl animate-in zoom-in duration-300">
                    <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[32px] p-8 shadow-2xl space-y-6">
                        <div className="space-y-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-widest">Wait — there's more</span>
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Are you sure?</h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                Without signing in, you’re missing out on **deep insights** and **memory patterns** that build over time. MindMantra works best when it knows your history. It’s completely free.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={handleAuthRedirect}
                                className="w-full py-4 bg-[var(--accent)] rounded-2xl text-[16px] font-bold text-white hover:scale-[1.02] transition-all"
                            >
                                Actually, sign me in
                            </button>
                            <button
                                onClick={handleConfirmSkip}
                                className="w-full py-3 text-[12px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-bold"
                            >
                                Continue as guest anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                (() => {
                                    let data: any = null;
                                    try {
                                        // Attempt to parse if it looks like JSON, otherwise treat as raw text
                                        if (msg.content.trim().startsWith('{')) {
                                            data = JSON.parse(msg.content);
                                        }
                                    } catch (e) {
                                        console.error('Clarity parse error:', e);
                                    }

                                    if (!data) return (
                                        <div className="bg-[rgba(15,15,30,0.9)] border border-[rgba(251,191,36,0.2)] rounded-2xl p-6 text-sm italic text-[var(--text-muted)]">
                                            {msg.content}
                                        </div>
                                    );

                                    const isPremium = session?.user?.email?.endsWith('@gmail.com'); // Placeholder logic for now

                                    return (
                                        <div className="cl-snapshot-popup w-full max-w-[95%] bg-[#0A0A0F] border border-[rgba(251,191,36,0.3)] rounded-3xl p-7 space-y-7 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden animate-in zoom-in-95 duration-500 backdrop-blur-2xl">
                                            {/* Glow Accent */}
                                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--accent)] opacity-10 blur-[80px]" />

                                            <div className="flex justify-between items-start border-b border-white/5 pb-4">
                                                <div>
                                                    <h3 className="text-[10px] items-center flex gap-1.5 uppercase tracking-[0.3em] text-[var(--accent)] font-bold mb-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                                                        Clarity Snapshot
                                                    </h3>
                                                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest leading-none">MindMantra Intelligence Layer</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-light text-[var(--accent)]">{data.score}%</div>
                                                    <div className="text-[8px] uppercase tracking-widest text-white/30">Clarity Index</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-[9px] uppercase tracking-widest text-red-400/80 mb-2 font-bold">What is messed up right now</h4>
                                                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium">
                                                            {data.messed_up}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[9px] uppercase tracking-widest text-orange-400/80 mb-2 font-bold">What can be even worse</h4>
                                                        <p className="text-[12px] text-[var(--text-secondary)] italic leading-relaxed">
                                                            {data.future_risk}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                                                        <h4 className="text-[9px] uppercase tracking-widest text-[#4ADE80] mb-2 font-bold">Immediate next step</h4>
                                                        <p className="text-[13px] text-white font-semibold leading-relaxed">
                                                            {data.immediate_step}
                                                        </p>
                                                    </div>

                                                    <div className="relative">
                                                        <h4 className="text-[9px] uppercase tracking-widest text-blue-400/80 mb-2 font-bold">Future strategic actions</h4>
                                                        <div className={`space-y-2 transition-all duration-700 ${!isPremium ? 'blur-sm select-none opacity-40' : ''}`}>
                                                            {Array.isArray(data.future_actions) ? data.future_actions.map((act: string, idx: number) => (
                                                                <div key={idx} className="flex gap-2 text-[11px] text-[var(--text-secondary)]">
                                                                    <span className="text-[var(--accent)] opacity-50">•</span>
                                                                    <span>{act}</span>
                                                                </div>
                                                            )) : <p className="text-[11px] text-[var(--text-secondary)]">{data.future_actions}</p>}
                                                        </div>
                                                        {!isPremium && (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                                                                <button className="px-3 py-1 bg-[var(--accent)] text-black text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg hover:scale-105 transition-transform">
                                                                    Unlock Pathway
                                                                </button>
                                                                <p className="text-[8px] text-white/40 mt-2 uppercase tracking-tight">Premium Membership Required</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-white/5 flex justify-center">
                                                <button className="text-[9px] uppercase tracking-[0.2em] text-white/20 hover:text-[var(--accent)] transition-colors">
                                                    Dismiss Analysis
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div
                                    className={`relative max-w-[85%] px-4 py-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant'
                                        ? (msg.isIntervention ? 'bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)]' : 'bg-[var(--ai-bubble)]') + ' text-[var(--text-primary)] rounded-tl-sm'
                                        : 'bg-[var(--user-bubble)] text-[var(--text-primary)] rounded-tr-sm'
                                        } ${msg.isError ? 'border border-red-500/20' : ''}`}
                                >
                                    {msg.content}

                                    {/* Contrast Toggle for assistant messages */}
                                    {msg.role === 'assistant' && !msg.isMantra && !msg.isClarity && (
                                        <div className="mt-3 pt-3 border-t border-white/5">
                                            {!msg.genericReply && !msg.genericReplyLoading ? (
                                                <button
                                                    onClick={() => fetchGenericReply(i)}
                                                    className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-bold flex items-center gap-2"
                                                >
                                                    👉 Compare with standard AI
                                                </button>
                                            ) : msg.genericReplyLoading ? (
                                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] italic animate-pulse">
                                                    <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                                    Fetching standard response...
                                                </div>
                                            ) : (
                                                <div className="animate-in fade-in slide-in-from-top-1">
                                                    <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-1 font-bold">Standard AI Baseline:</span>
                                                    <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-white/5 text-[12px] text-[var(--text-secondary)] italic">
                                                        {msg.genericReply}
                                                    </div>
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

                    {/* Revised Pause Recovery Prompt */}
                    {showRecovery && !sealed && (
                        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 w-full max-w-sm p-6 bg-[var(--bg-card)] border border-[var(--accent)] border-opacity-40 rounded-[32px] shadow-2xl animate-in zoom-in-95 fade-in duration-500 z-50 backdrop-blur-xl">
                            <p className="text-sm font-semibold text-[var(--text-primary)] mb-5 text-center px-4">Want to refine this so the pattern becomes clearer?</p>
                            <div className="grid grid-cols-1 gap-2.5">
                                <button
                                    onClick={() => handleRefinedInteraction("Refine Chat")}
                                    className="py-3 px-4 bg-[var(--accent)] rounded-2xl text-[13px] font-bold text-white hover:scale-[1.02] transition-transform flex justify-between items-center group"
                                >
                                    <span>Refine Chat</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </button>
                                <button
                                    onClick={() => handleRefinedInteraction("Continue Discovering Patterns")}
                                    className="py-3 px-4 bg-[rgba(var(--accent-rgb),0.1)] border border-[rgba(var(--accent-rgb),0.2)] rounded-2xl text-[13px] font-semibold text-[var(--accent)] hover:bg-[rgba(var(--accent-rgb),0.15)] transition-all"
                                >
                                    Continue Discovering Patterns
                                </button>
                                <button
                                    onClick={() => setShowRecovery(false)}
                                    className="py-3 text-[11px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                >
                                    I'm done for now
                                </button>
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

