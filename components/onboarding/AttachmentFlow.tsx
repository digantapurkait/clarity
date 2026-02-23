
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AttachmentFlow() {
    const [step, setStep] = useState(1);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const router = useRouter();

    const nextStep = () => setStep(s => s + 1);

    const handleInitialReflection = async () => {
        setLoading(true);
        try {
            let guestId = localStorage.getItem('guest_id');
            if (!guestId) {
                guestId = crypto.randomUUID();
                localStorage.setItem('guest_id', guestId);
            }

            const res = await fetch('/api/onboarding/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, guestId })
            });
            const data = await res.json();
            setAnalysis(data);
            setStep(3);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto px-6 py-20 min-h-[80vh] flex flex-col justify-center">
            {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="space-y-4">
                        <h1 className="text-4xl sm:text-5xl font-semibold text-[var(--text-primary)] leading-tight">
                            Your mind has patterns. <br />
                            <span className="text-[var(--accent)]">Most tools never notice them.</span>
                        </h1>
                        <p className="text-lg text-[var(--text-secondary)] opacity-80">
                            You don't need more advice. You need deeper understanding.
                            Finally see what keeps repeating beneath your days.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] uppercase tracking-widest font-medium">
                            <span>Not therapy</span>
                            <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                            <span>Not motivation</span>
                            <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                            <span>Pattern Intelligence</span>
                        </div>
                        <button
                            onClick={nextStep}
                            className="w-full sm:w-max px-8 py-4 bg-[var(--accent)] rounded-2xl text-[15px] font-medium hover:scale-[1.02] transition-all shadow-lg shadow-[var(--accent-glow)]"
                        >
                            Start first reflection →
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                        <label className="text-xl text-[var(--text-primary)] font-medium">
                            What has been mentally heavy lately?
                        </label>
                        <p className="text-sm text-[var(--text-muted)]">
                            Don't worry about formatting. Just name what keeps returning to your thoughts.
                        </p>
                    </div>
                    <textarea
                        autoFocus
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type here..."
                        className="w-full h-40 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text-primary)] focus:border-[var(--accent)] outline-none transition-colors resize-none"
                    />
                    <button
                        disabled={!input.trim() || loading}
                        onClick={handleInitialReflection}
                        className="w-full sm:w-max px-8 py-4 bg-[var(--accent)] rounded-2xl text-[15px] font-medium disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Observing patterns...' : 'Continue'}
                    </button>
                </div>
            )}

            {step === 3 && analysis && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent)] border-opacity-30">
                        <p className="text-[var(--text-primary)] text-lg leading-relaxed italic">
                            "{analysis.mirror}"
                        </p>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[var(--text-secondary)]">
                            {analysis.patternHook}
                        </p>
                        <button
                            onClick={nextStep}
                            className="w-full sm:w-max px-8 py-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[15px] font-medium hover:border-[var(--accent)] transition-all"
                        >
                            See the difference →
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && analysis && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Intelligence vs. Understanding</h2>

                    <div className="grid gap-4">
                        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] opacity-60 grayscale">
                            <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">Generic AI Response</span>
                            <p className="text-sm text-[var(--text-secondary)]">{analysis.genericReply}</p>
                        </div>

                        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent)] border-opacity-50">
                            <span className="text-[10px] uppercase tracking-widest text-[var(--accent)] block mb-2 font-bold">MindMantra Pattern Insight</span>
                            <p className="text-[var(--text-primary)]">{analysis.personalizedReply}</p>
                        </div>
                    </div>

                    <button
                        onClick={nextStep}
                        className="w-full sm:w-max px-8 py-4 bg-[var(--accent)] rounded-2xl text-[15px] font-medium hover:scale-[1.02] transition-all"
                    >
                        Keep this pattern thread →
                    </button>
                </div>
            )}

            {step === 5 && (
                <div className="space-y-8 text-center animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-20 h-20 bg-[var(--accent)] rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-[var(--accent-glow)] animate-pulse">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-semibold text-[var(--text-primary)]">Pattern thread recorded.</h2>
                        <p className="text-[var(--text-secondary)] max-w-sm mx-auto">
                            Your emotional rhythm is emerging. Insight will become visible after a few more reflections.
                        </p>
                    </div>

                    <div className="w-full bg-[var(--bg-card)] rounded-full h-2 max-w-xs mx-auto overflow-hidden">
                        <div className="bg-[var(--accent)] h-full animate-progress-grow" style={{ width: '20%' }} />
                    </div>

                    <button
                        onClick={() => router.push('/chat')}
                        className="w-full sm:w-max px-10 py-4 bg-[var(--text-primary)] text-[var(--bg-deep)] rounded-2xl text-[15px] font-bold hover:opacity-90 transition-all"
                    >
                        Go to your mental map
                    </button>
                </div>
            )}
        </div>
    );
}
