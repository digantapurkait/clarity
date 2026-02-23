
'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (saved) {
            setTheme(saved);
            document.body.classList.toggle('light', saved === 'light');
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            setTheme('light');
            document.body.classList.add('light');
        }
    }, []);

    const toggle = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.body.classList.toggle('light', newTheme === 'light');
    };

    return (
        <button
            onClick={toggle}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-active)] transition-all"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? (
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                </svg>
            ) : (
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    );
}
