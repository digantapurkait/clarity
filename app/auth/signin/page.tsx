'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function SignInPage() {
    const [identifier, setIdentifier] = useState('');
    const [type, setType] = useState<'email' | 'phone'>('email');
    const [step, setStep] = useState<'request' | 'verify'>('request');
    const [code, setCode] = useState('');
    const [userId, setUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [canFallback, setCanFallback] = useState(false);
    const [deviceHash, setDeviceHash] = useState('');

    // 1. Simple Device Fingerprinting
    useEffect(() => {
        const hash = [
            navigator.userAgent,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset(),
            navigator.language
        ].join('|');
        // Basic unique string for the device
        setDeviceHash(btoa(hash).substring(0, 32));
    }, []);

    // Countdown for fallback
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (step === 'verify' && type === 'email' && !canFallback) {
            setCanFallback(true);
        }
    }, [countdown, step, type, canFallback]);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/otp/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: type === 'email' ? identifier : undefined,
                    phone: type === 'phone' ? identifier : undefined,
                    deviceHash,
                    browserInfo: navigator.userAgent
                }),
            });

            const data = await res.json();

            if (data.status === 'bypass') {
                // Trust bypass: Sign in immediately
                await signIn('credentials', { userId: data.userId, callbackUrl: '/app/chat' });
            } else if (data.status === 'pending_email' || data.status === 'pending_sms') {
                setUserId(data.userId);
                setStep('verify');
                setCountdown(data.retryAfter || 60);
            } else {
                setError(data.error || 'Failed to request code');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    code,
                    deviceHash,
                    browserInfo: navigator.userAgent
                }),
            });

            const data = await res.json();

            if (data.status === 'verified') {
                await signIn('credentials', { userId: data.userId, callbackUrl: '/app/chat' });
            } else {
                setError(data.error || 'Invalid code');
            }
        } catch (err) {
            setError('Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const triggerFallback = async () => {
        if (!userId) return;
        const phone = prompt("Enter your phone number for SMS fallback:");
        if (!phone) return;

        setLoading(true);
        try {
            const res = await fetch('/api/auth/otp/fallback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, phone }),
            });
            const data = await res.json();
            if (data.status === 'pending_sms') {
                setType('phone');
                setCountdown(60);
                setCanFallback(false);
                alert("Code sent via SMS!");
            }
        } catch (err) {
            setError('SMS fallback failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center px-6">
            <div className="w-full max-w-sm">
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">M</div>
                    <span className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">MindMantra</span>
                </div>

                {step === 'request' ? (
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Welcome back</h2>
                            <div className="flex justify-center gap-4 mt-4">
                                <button
                                    onClick={() => setType('email')}
                                    className={`text-xs px-3 py-1 rounded-full transition-colors ${type === 'email' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}
                                >Email</button>
                                <button
                                    onClick={() => setType('phone')}
                                    className={`text-xs px-3 py-1 rounded-full transition-colors ${type === 'phone' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}
                                >Phone</button>
                            </div>
                        </div>

                        <form onSubmit={handleRequest} className="space-y-4">
                            <input
                                type={type === 'email' ? 'email' : 'tel'}
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder={type === 'email' ? 'your@email.com' : '+1 234 567 890'}
                                required
                                className="input-glow w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm"
                            />
                            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-[var(--accent)] rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                            >
                                {loading ? 'Sending...' : 'Continue →'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="w-14 h-14 mx-auto rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-2xl">🗝️</div>
                        <div>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Enter Code</h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">We sent a 6-digit code to your {type}.</p>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-4">
                            <input
                                type="text"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full text-center text-2xl tracking-[10px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-bold"
                            />
                            {error && <p className="text-xs text-red-400">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full py-3 bg-[var(--accent)] rounded-xl text-sm font-medium disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Verify & Login'}
                            </button>
                        </form>

                        {countdown > 0 ? (
                            <p className="text-xs text-[var(--text-muted)]">Resend in {countdown}s</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setStep('request')} className="text-xs text-[var(--accent)] hover:underline">Resend code</button>
                                {canFallback && (
                                    <button onClick={triggerFallback} className="text-xs text-[var(--text-secondary)] hover:underline">No email? Try SMS fallback</button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <p className="text-center text-xs text-[var(--text-muted)] mt-10">
                    <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">← Back to home</Link>
                </p>
            </div>
        </div>
    );
}
