'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TimeoutNotice() {
    const searchParams = useSearchParams();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (searchParams.get('timeout') === 'true') {
            setShow(true);
            const timer = setTimeout(() => setShow(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    if (!show) return null;

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="px-6 py-3 bg-[var(--bg-card)] border border-amber-500/30 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-xl">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
                    Session Timed Out for Security
                </span>
            </div>
        </div>
    );
}
