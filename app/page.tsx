import Link from 'next/link';
import Typeflow from '@/components/landing/Typeflow';
import ThemeToggle from '@/components/landing/ThemeToggle';
import DemoChat from '@/components/landing/DemoChat';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-deep)] overflow-x-hidden transition-colors duration-500">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center border-b border-[var(--border)] bg-[rgba(var(--bg-card-rgb),0.8)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">M</div>
          <span className="font-semibold text-[var(--text-primary)] tracking-tight">MindMantra</span>
        </div>
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <Link
            href="/auth/signin"
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wider"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 text-center max-w-4xl mx-auto">
        <div className="hero-orb left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 opacity-40 blur-[120px]" />
        <div className="relative z-10 space-y-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)] mb-8 animate-in fade-in duration-1000">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Not therapy. Not journaling. Not advice.
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl lg:text-7xl font-black text-[var(--text-primary)] leading-[0.95] tracking-tight mb-4 transition-all">
              “Patterns repeat until wisdom <br />
              <span className="text-[var(--accent)] drop-shadow-[0_0_20px_var(--accent-glow)]">turns them into Rhythm”</span>
            </h1>
            <Typeflow />
          </div>
          <div className="pt-0 space-y-4">
            <Link
              id="get-started-cta"
              href="/onboarding"
              className="inline-flex items-center gap-2 px-12 py-6 bg-[var(--accent)] rounded-2xl text-[18px] font-black text-white hover:opacity-90 transition-all hover:scale-[1.05] shadow-[0_20px_40px_rgba(var(--accent-rgb),0.4)] group"
            >
              Start first reflection
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <div className="space-y-2">
              <p className="text-[13px] text-[var(--text-muted)] font-semibold tracking-wide">
                Most users recognize their first pattern within 3-5 minutes.
              </p>
            </div>
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

      {/* Interactive Demo */}
      <section className="px-6 pb-28 max-w-lg mx-auto opacity-80 hover:opacity-100 transition-opacity">
        <p className="text-center text-[10px] text-[var(--text-muted)] uppercase tracking-[0.3em] mb-8 font-bold">
          Experience the reflection
        </p>
        <DemoChat />
      </section>

      {/* How it's different */}
      <section className="px-6 pb-24 max-w-3xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: '◯',
              title: 'It remembers you',
              body: 'Every conversation builds on the last. Your words, your patterns, your language.',
            },
            {
              icon: '◎',
              title: 'No advice. Just clarity.',
              body: 'MindMantra reflects, not prescribes. You arrive at insight — it doesn\'t hand it to you.',
            },
            {
              icon: '●',
              title: 'Ends with intention',
              body: 'Each session closes with a small personal mantra. Completion creates safety.',
            },
          ].map((card) => (
            <div key={card.title} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-active)] transition-colors">
              <div className="text-[var(--accent)] text-xl mb-3">{card.icon}</div>
              <h3 className="font-medium text-[var(--text-primary)] mb-2 text-sm">{card.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{card.body}</p>
            </div>
          ))}
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
          href="/auth/signin"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[15px] font-medium text-[var(--text-primary)] hover:border-[var(--border-active)] transition-all"
        >
          Begin your journey →
        </Link>
      </section>
    </main>
  );
}
