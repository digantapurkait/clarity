
'use client';

import { useState, useEffect } from 'react';

interface Pattern {
    id: number;
    summary_text: string;
    prevention_suggestion: string;
    pattern_type: string;
}

export default function PatternDiscovery({ userId }: { userId: number | null }) {
    const [pattern, setPattern] = useState<Pattern | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        const checkPatterns = async () => {
            const res = await fetch('/api/patterns/latest');
            if (res.ok) {
                const data = await res.json();
                if (data.pattern) {
                    setPattern(data.pattern);
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
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] font-bold">Mental Blueprint Detected</span>
                            <h3 className="text-xl font-semibold text-[var(--text-primary)]">There's something forming beneath your thoughts.</h3>
                        </div>

                        <div className="p-5 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border)] space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Observed Pattern</span>
                                <p className="text-[var(--text-primary)] text-sm">{pattern.summary_text}</p>
                            </div>

                            <div className={`space-y-4 transition-all ${!isPremium ? 'blur-sm select-none' : ''}`}>
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
                                <div className="pt-4 text-center">
                                    <p className="text-xs text-[var(--text-secondary)] mb-4">You've reached the edge of your current mental map.</p>
                                    <button className="w-full py-3 bg-[var(--accent)] rounded-xl text-xs font-bold text-white hover:scale-105 transition-transform shadow-lg shadow-[var(--accent-glow)]">
                                        Unlock Full Pattern Map
                                    </button>
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
