'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import PIIScoreIndicator from '@/components/chat/PIIScoreIndicator';
import ThemeToggle from '@/components/landing/ThemeToggle';

interface DashboardData {
    patterns: any[];
    metrics: {
        pii: number;
        clarity: number;
        reflections: number;
        sessions: number;
    };
    trends: {
        energy: number[];
        load: number[];
    };
}

export default function PatternMapPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            const guestId = localStorage.getItem('guest_id');
            const res = await fetch(`/api/user/dashboard${guestId ? `?guestId=${guestId}` : ''}`);
            if (res.ok) {
                setData(await res.json());
            }
            setLoading(false);
        };
        fetchDashboard();
    }, []);

    const name = session?.user?.name || 'Explorer';
    const userId = (session?.user as any)?.id || null;

    if (loading) return (
        <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center">
            <div className="typing-dot" />
        </div>
    );

    return (
        <main className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] pb-20">
            {/* Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center border-b border-[var(--border)] bg-[rgba(var(--bg-card-rgb),0.8)] backdrop-blur-md">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">M</div>
                    <span className="font-semibold tracking-tight">MindMantra</span>
                </Link>
                <div className="flex items-center gap-6">
                    <PIIScoreIndicator userId={userId} />
                    <ThemeToggle />
                </div>
            </nav>

            <div className="pt-28 px-6 max-w-5xl mx-auto space-y-12">
                {/* Hero Header */}
                <header className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tight">{name}'s Pattern Map</h1>
                    <p className="text-[var(--text-muted)] max-w-xl">
                        This summary evolves every time you reflect or talk.
                        Every signal builds the same intelligence.
                    </p>
                </header>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'PII Index', value: data?.metrics.pii || 0, unit: '%' },
                        { label: 'Pattern Clarity', value: data?.metrics.clarity || 0, unit: '%' },
                        { label: 'Reflections', value: data?.metrics.reflections || 0, unit: '' },
                        { label: 'Conversations', value: data?.metrics.sessions || 0, unit: '' },
                    ].map((m) => (
                        <div key={m.label} className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] space-y-2">
                            <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">{m.label}</span>
                            <div className="text-3xl font-mono font-black">{m.value}{m.unit}</div>
                        </div>
                    ))}
                </div>

                {/* Main Content Layout */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Patterns & Triggers */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="space-y-4">
                            <h2 className="text-sm uppercase tracking-[0.3em] text-[var(--accent)] font-bold">Active Patterns</h2>
                            <div className="space-y-4">
                                {data?.patterns.map((p, i) => (
                                    <div key={i} className="p-6 rounded-[32px] bg-[var(--bg-card)] border border-[var(--border)] relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-[0.03] blur-[60px]" />
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-3 py-1 rounded-full bg-[rgba(var(--accent-rgb),0.1)] text-[10px] text-[var(--accent)] font-bold uppercase tracking-wider">
                                                {p.type || 'Behavioral Loop'}
                                            </span>
                                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{new Date(p.detected_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{p.summary}</h3>
                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{p.prevention}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right: Trends & HUD */}
                    <div className="space-y-8">
                        <section className="p-8 rounded-[32px] bg-[var(--bg-card)] border border-[var(--border)] space-y-6">
                            <h2 className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Emotional Rhythm</h2>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] uppercase tracking-widest">
                                        <span>Energy Trend</span>
                                        <span>High</span>
                                    </div>
                                    <div className="flex items-end gap-1 h-20">
                                        {(data?.trends.energy || [4, 6, 3, 8, 5, 7, 4]).map((v, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 bg-[rgba(16,185,129,0.2)] rounded-t-sm hover:bg-[rgba(16,185,129,0.5)] transition-colors"
                                                style={{ height: `${v * 10}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] uppercase tracking-widest">
                                        <span>Cognitive Load</span>
                                        <span>Heavy</span>
                                    </div>
                                    <div className="flex items-end gap-1 h-20">
                                        {(data?.trends.load || [2, 5, 8, 4, 3, 6, 9]).map((v, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 bg-[rgba(245,158,11,0.2)] rounded-t-sm hover:bg-[rgba(245,158,11,0.5)] transition-colors"
                                                style={{ height: `${v * 10}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic border-t border-white/5 pt-4">
                                Nothing is separate. Your blueprints form with every interaction.
                            </p>
                        </section>

                        <Link
                            href="/chat"
                            className="block p-8 rounded-[32px] bg-[var(--accent)] text-white text-center font-bold hover:scale-[1.02] transition-transform shadow-[0_20px_40px_rgba(var(--accent-rgb),0.3)] group"
                        >
                            Return to Growth
                            <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
