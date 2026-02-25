
'use client';

import { useState, useEffect } from 'react';

export default function PIIScoreIndicator({ userId }: { userId: number | null }) {
    const [score, setScore] = useState(0);

    useEffect(() => {
        // Load initial score if present from onboarding
        const initial = localStorage.getItem('initial_pii_score');
        if (initial) {
            setScore(parseInt(initial));
            localStorage.removeItem('initial_pii_score'); // Clean up after first load
        }

        const fetchScore = async () => {
            const guestId = localStorage.getItem('guest_id');
            const res = await fetch(`/api/user/pii${guestId ? `?guestId=${guestId}` : ''}`);
            if (res.ok) {
                const data = await res.json();
                setScore(data.pii_score || 0);
            }
        };

        fetchScore();
        const interval = setInterval(fetchScore, 10000); // Update every 10s
        return () => clearInterval(interval);
    }, [userId]);

    // Calculate percentage (clamped at 100 for visual)
    const percentage = Math.min(score, 100);
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex items-center gap-4 group cursor-help relative p-2 px-3 rounded-xl hover:bg-white/5 transition-all">
            <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.2)]">
                    <circle
                        cx="20"
                        cy="20"
                        r={radius}
                        fill="transparent"
                        stroke="var(--border)"
                        strokeWidth="3"
                        className="opacity-30"
                    />
                    <circle
                        cx="20"
                        cy="20"
                        r={radius}
                        fill="transparent"
                        stroke="var(--accent)"
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        style={{ strokeDashoffset: offset }}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-1.5 h-1.5 rounded-full bg-[var(--accent)] ${score < 100 ? 'animate-pulse' : 'shadow-[0_0_10px_var(--accent)]'}`} />
                </div>
            </div>
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--accent)] font-black">Pattern Clarity</span>
                    {score >= 100 && (
                        <span className="text-[8px] bg-[var(--accent)] text-black px-1 rounded font-bold animate-bounce">Unlocked</span>
                    )}
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-[14px] font-mono font-bold text-[var(--text-primary)] leading-none">{score}%</span>
                    <span className="text-[9px] text-[var(--text-muted)] font-medium">/ 100%</span>
                </div>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-[#0A0A0F] border border-[var(--border)] p-3 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all z-50">
                <p className="text-[10px] text-[var(--text-primary)] leading-relaxed">
                    <strong className="text-[var(--accent)] block mb-1 uppercase tracking-tighter">Path to Blueprint</strong>
                    Your Pattern Intelligence Index tracks how clearly MindMantra sees your internal architecture. At 100%, your full <strong>Pattern Map</strong> is revealed.
                </p>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)] opacity-50" style={{ width: `${score}%` }} />
                </div>
            </div>
        </div>
    );
}
