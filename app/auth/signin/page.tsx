'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        await signIn('email', { email, callbackUrl: '/app/chat', redirect: false });
        setSent(true);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center px-6">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">M</div>
                    <span className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">MindMantra</span>
                </div>

                {sent ? (
                    <div className="text-center space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-[var(--accent-soft)] border border-[var(--border-active)] flex items-center justify-center text-2xl">
                            ✉️
                        </div>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Check your inbox</h2>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            We sent a magic link to <strong>{email}</strong>.
                            <br />Click it to begin your session.
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">No spam. No password. Ever.</p>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
                                Welcome back
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Enter your email and we&apos;ll send you a sign-in link.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                id="email-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                className="input-glow w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)]"
                            />
                            <button
                                id="send-link-btn"
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-[var(--accent)] rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                            >
                                {loading ? 'Sending...' : 'Send magic link →'}
                            </button>
                        </form>

                        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
                            <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">← Back to home</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
