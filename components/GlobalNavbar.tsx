'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { t, languages } from '@/lib/i18n';

export default function GlobalNavbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [lang, setLang] = useState('en');
    const [showLangMenu, setShowLangMenu] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        const savedLang = localStorage.getItem('pref_lang') || 'en';
        setLang(savedLang);

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLanguageChange = (newLang: string) => {
        setLang(newLang);
        localStorage.setItem('pref_lang', newLang);
        setShowLangMenu(false);
        window.location.reload(); // Simple way to re-trigger i18n across the app
    };

    const isChat = pathname === '/chat';

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-3 bg-[var(--bg-deep)]/80 backdrop-blur-xl border-b border-white/5 shadow-lg' : 'py-6 bg-transparent'
            }`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                        M
                    </div>
                    <span className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                        MindMantra
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm uppercase font-bold text-[var(--text-muted)]"
                        >
                            {lang}
                        </button>
                        {showLangMenu && (
                            <div className="absolute right-0 mt-2 w-32 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
                                {languages.map(l => (
                                    <button
                                        key={l.code}
                                        onClick={() => handleLanguageChange(l.code)}
                                        className={`w-full text-left px-4 py-2 rounded-xl text-xs transition-colors ${lang === l.code ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-white/5'
                                            }`}
                                    >
                                        {l.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    {session ? (
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] hidden md:block">
                                {session.user?.email?.split('@')[0]}
                            </span>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="px-5 py-2.5 bg-[rgba(239,68,68,0.1)] border border-red-500/20 text-red-500 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[rgba(239,68,68,0.15)] transition-all"
                            >
                                Leave
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/auth/signin"
                            className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:scale-[1.05] shadow-lg transition-all"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
