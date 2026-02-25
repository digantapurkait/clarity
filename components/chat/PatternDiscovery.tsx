
'use client';

import { useState, useEffect } from 'react';

interface Pattern {
    id: number;
    summary_text: string;
    prevention_suggestion: string;
    pattern_type: string;
}

interface Diagnostics {
    energy: number;
    load: number;
}

export default function PatternDiscovery({ userId }: { userId: number | null }) {
    const [pattern, setPattern] = useState<Pattern | null>(null);
    const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        const checkPatterns = async () => {
            const guestId = localStorage.getItem('guest_id');
            const res = await fetch(`/api/patterns/latest${guestId ? `?guestId=${guestId}` : ''}`);
            if (res.ok) {
                const data = await res.json();
                if (data.pattern) {
                    setPattern(data.pattern);
                    setDiagnostics(data.diagnostics);
                    setIsPremium(data.subscription_status === 'premium');
                }
            }
        };

        if (userId) {
            checkPatterns();
            const interval = setInterval(checkPatterns, 30000); // Check every 30s
            return () => clearInterval(interval);
        }
    }, [userId]);

    if (!pattern) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="relative group flex flex-col items-center gap-1"
            >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--accent)] border-opacity-30 shadow-[0_0_15px_rgba(251,191,36,0.2)] animate-pulse group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                    </svg>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-[var(--accent)] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Reveal Pattern
                </span>
            </button>

            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-[var(--bg-deep)] bg-opacity-80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-5 blur-[60px]" />

                        <div className="space-y-2">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] font-bold">
                                {pattern.pattern_type === 'initial_reflection' ? 'Your Starting Reflection' : 'Mental Blueprint Detected'}
                            </span>
                            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                                {pattern.pattern_type === 'initial_reflection'
                                    ? "Here's the snapshot from your first check-in."
                                    : "There's something forming beneath your thoughts."}
                            </h3>
                        </div>

                        <div className="p-5 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border)] space-y-4">
                            {/* Diagnostic HUD */}
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest">Energy</span>
                                        <span className="text-[10px] text-[var(--text-primary)] font-mono">{diagnostics?.energy.toFixed(1) || '5.0'}</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-1000"
                                            style={{ width: `${(diagnostics?.energy || 5) * 10}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest">Cognitive Load</span>
                                        <span className="text-[10px] text-[var(--text-primary)] font-mono">{((diagnostics?.load || 0.5) * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 transition-all duration-1000"
                                            style={{ width: `${(diagnostics?.load || 0.5) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Observed Pattern</span>
                                <p className="text-[var(--text-primary)] text-sm">{pattern.summary_text}</p>
                                <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
                                    This insight is built from your reflections and conversations.
                                </p>
                            </div>

                            <div className={`space-y-4 transition-all relative ${!isPremium ? 'overflow-hidden' : ''}`}>
                                <div className={`space-y-4 ${!isPremium ? 'blur-[6px] select-none' : ''}`}>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Prevention Insight</span>
                                        <p className="text-[var(--text-primary)] text-sm">{pattern.prevention_suggestion}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Projected Recurrence</span>
                                        <p className="text-[var(--text-primary)] text-sm font-mono">Next 48-72 hours if cognitive load remains high.</p>
                                    </div>
                                </div>

                                {!isPremium && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-t from-[var(--bg-deep)] to-transparent">
                                        <p className="text-xs text-[var(--text-primary)] font-semibold mb-1">Pattern depth improves with more reflections.</p>
                                        <p className="text-[10px] text-[var(--text-muted)] max-w-[200px]">Unlock full longitudinal analysis to see recurrence triggers.</p>
                                    </div>
                                )}
                            </div>

                            {!isPremium && (
                                <div className="pt-4 text-center">
                                    <button className="w-full py-3 bg-[var(--accent)] rounded-xl text-xs font-bold text-white hover:scale-105 transition-transform shadow-lg shadow-[var(--accent-glow)]">
                                        Upgrade for Deep Intelligence
                                    </button>
                                    <p className="text-[9px] text-[var(--text-muted)] mt-3">
                                        Pattern awareness creates emotional advantage.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowModal(false)}
                            className="w-full py-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        >
                            Back to reflection
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
