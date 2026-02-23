import Link from 'next/link';
import DemoChat from '@/components/landing/DemoChat';
import Typewriter from '@/components/landing/Typewriter';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-deep)] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center border-b border-[var(--border)] bg-[rgba(10,10,15,0.8)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">M</div>
          <span className="font-semibold text-[var(--text-primary)] tracking-tight">MindMantra</span>
        </div>
        <Link
          href="/auth/signin"
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wider"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 text-center max-w-3xl mx-auto">
        {/* Ambient orb */}
        <div className="hero-orb left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 opacity-60" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Not therapy. Not journaling. Something more personal.
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-3xl font-semibold text-[var(--text-primary)] leading-[1.15] tracking-tight mb-6">
            Your mind has patterns. <br />
            <span className="block text-[var(--accent)] mt-1">Most tools never notice them.</span>
          </h1>

          <div className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto mb-12 min-h-[5rem] sm:min-h-[3.5rem]">
            <Typewriter
              typingSpeed={60}
              erasingSpeed={10}
              phrases={[
                "You don't need more advice. You need deeper understanding.",
                "Finally see what keeps repeating beneath your days."
              ]}
            />
          </div>

          <div className="space-y-4">
            <Link
              id="get-started-cta"
              href="/onboarding"
              className="inline-flex items-center gap-2 px-7 py-4 bg-[var(--accent)] rounded-2xl text-[15px] font-medium hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-[var(--accent-glow)]"
            >
              Start first reflection
              <span>→</span>
            </Link>

            <div className="flex flex-col items-center gap-3">
              <p className="text-[13px] text-[var(--text-muted)] italic opacity-80">
                “Last week you mentioned feeling drained after meetings…”
              </p>

              <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] font-medium">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Free
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Private by default
                </span>
                <span>5 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="px-6 pb-24 max-w-lg mx-auto">
        <p className="text-center text-xs text-[var(--text-muted)] uppercase tracking-widest mb-6">
          Try it now — no sign-in needed
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
            <div
              key={card.title}
              className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-active)] transition-colors"
            >
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
