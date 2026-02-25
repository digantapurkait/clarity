'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingReflection() {
    const [input, setInput] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [progress, setProgress] = useState(5);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        localStorage.setItem('landing_reflection', input);
        setIsSubmitted(true);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 18) {
                    clearInterval(interval);
                    localStorage.setItem('initial_pii_score', '18');
                    return 18;
                }
                return prev + 1;
            });
        }, 50);
    };

    if (isSubmitted) {
        return (
            <div className="space-y-6 animate-in fade-in zoom-in duration-500 max-w-md mx-auto">
                <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] font-bold">Pattern thread started</span>
                        <span className="text-xl font-mono text-[var(--text-primary)]">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--accent)] transition-all duration-500 shadow-[0_0_15px_var(--accent-glow)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">Reflection recorded. Each session improves pattern accuracy.</p>
                </div>

                <button
                    onClick={() => router.push('/chat?bridge=true')}
                    className="w-full py-5 bg-[var(--accent)] rounded-2xl text-[18px] font-black text-white hover:opacity-90 transition-all hover:scale-[1.05] shadow-[0_20px_40px_rgba(var(--accent-rgb),0.3)] flex items-center justify-center gap-3 group"
                >
                    Continue in MindMantra
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-lg mx-auto space-y-4 flex flex-col items-center">
            <div className="relative w-full group">
                <textarea
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e as any);
                        }
                    }}
                    placeholder="Tell me one thing on your mind..."
                    className="w-full pl-6 pr-44 py-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] text-base sm:text-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(var(--accent-rgb),0.1)] transition-all outline-none shadow-xl resize-none leading-relaxed overflow-y-auto break-words"
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-auto px-4 py-2.5 bg-gradient-to-br from-[#A78BFA] to-[var(--accent)] rounded-xl flex items-center justify-center text-white text-[12px] font-bold hover:scale-105 transition-all disabled:opacity-0 disabled:scale-95 shadow-lg z-20 whitespace-nowrap"
                >
                    Start reflection →
                </button>
            </div>
            <p className="text-[13px] text-[var(--text-muted)] font-medium tracking-wide">
                Most users recognize their first pattern within 3-5 minutes.
            </p>
        </form>
    );
}
