
'use client';

import { useState, useEffect } from 'react';

export default function PIIScoreIndicator({ userId }: { userId: number | null }) {
    const [score, setScore] = useState(0);

    useEffect(() => {
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
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex items-center gap-3 group transition-all">
            <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle
                        cx="16"
                        cy="16"
                        r={radius}
                        fill="transparent"
                        stroke="var(--border)"
                        strokeWidth="2"
                        className="opacity-20"
                    />
                    <circle
                        cx="16"
                        cy="16"
                        r={radius}
                        fill="transparent"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeDasharray={circumference}
                        style={{ strokeDashoffset: offset }}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse" />
                </div>
            </div>
            <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--accent)] font-bold">PII Index</span>
                <span className="text-[10px] font-mono text-[var(--text-primary)] leading-none">{score}%</span>
            </div>
        </div>
    );
}
