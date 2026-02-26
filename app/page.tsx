import Link from 'next/link';
import Typeflow from '@/components/landing/Typeflow';
import DemoChat from '@/components/landing/DemoChat';
import LandingReflection from '@/components/landing/LandingReflection';
import TimeoutNotice from '@/components/landing/TimeoutNotice';
import { Suspense } from 'react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-deep)] overflow-x-hidden transition-colors duration-500">
      <Suspense><TimeoutNotice /></Suspense>
      {/* Hero */}
      <section className="relative pt-24 pb-24 px-6 text-center max-w-4xl mx-auto">
        <div className="hero-orb left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 opacity-40 blur-[120px]" />
        <div className="relative z-10 space-y-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)] animate-in fade-in duration-1000">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Not therapy. Not journaling. Not advice.
            </div>
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[10px] sm:text-xs text-[var(--text-muted)] animate-in fade-in duration-1000 delay-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-50" />
                In today’s world, self-awareness is luxury — and this subscription lets you see yourself clearly.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[var(--text-primary)] leading-[1.1] tracking-tight mb-4 transition-all">
              The premium power of <br />
              <span className="text-[var(--accent)]">knowing YOURSELF CLEARLY</span>
            </h1>
            <Typeflow />
          </div>

          {/* Simplified Direct CTA */}
          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700 delay-300">
            <Link
              href="/chat"
              className="group relative px-10 py-5 bg-[var(--accent)] rounded-[24px] text-xl font-black text-white hover:scale-105 transition-all shadow-[0_20px_50px_rgba(var(--accent-rgb),0.3)] flex items-center gap-4 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              Begin Your Journey
              <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
            </Link>
            <p className="text-sm text-[var(--text-muted)] font-medium tracking-wide">
              Takes 5 minutes. Lasts all day.
            </p>
          </div>
        </div>
      </section>

      {/* Psychological Goal Section */}
      <section className="px-6 pb-24 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
        <div className="p-10 rounded-[32px] bg-[var(--bg-card)] border border-[var(--border)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)] opacity-[0.03] blur-[80px]" />
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-8 text-center sm:text-left">
            What changes when you see your pattern?
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              "You notice burnout days before it hits",
              "You understand why certain situations drain you",
              "You stop repeating emotional loops unknowingly",
              "Decisions feel clearer because triggers are visible"
            ].map((point, i) => (
              <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-[var(--bg-card-hover)]/30 border border-transparent hover:border-[var(--border)] transition-all">
                <div className="w-5 h-5 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 pb-24 text-center max-w-xl mx-auto space-y-3">
        {[
          '🔒  Private — your words never train any model',
          '🧠  Memory-driven — not generic AI responses',
          '🌙  5-minute daily ritual — not endless chat',
        ].map((t) => (
          <p key={t} className="text-sm text-[var(--text-secondary)]">{t}</p>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="px-6 pb-28 text-center">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-10 py-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] text-lg font-bold text-[var(--text-primary)] hover:border-[var(--border-active)] hover:bg-[var(--bg-card-hover)] transition-all shadow-xl"
        >
          Enter MindMantra →
        </Link>
      </section>
    </main>
  );
}
