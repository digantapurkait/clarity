'use client';

import { useState, useEffect } from 'react';

interface User {
    id: number;
    name: string | null;
    email: string;
    created_at: string;
    relationship_summary: string | null;
    personality_summary: string | null;
    last_phase: string | null;
    last_session: string | null;
    session_count: number;
}

interface UserDetail {
    personalitySummary: string;
    relationshipSummary: string;
    founderNotes: { id: number; note: string; scheduled_for: string; used: boolean }[];
    recentMessages: { role: string; content: string; created_at: string }[];
}

const ADMIN_KEY = typeof window !== 'undefined' ? localStorage.getItem('admin_key') || '' : '';

export default function AdminPage() {
    const [key, setKey] = useState('');
    const [authed, setAuthed] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [selected, setSelected] = useState<User | null>(null);
    const [detail, setDetail] = useState<UserDetail | null>(null);
    const [noteText, setNoteText] = useState('');
    const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [relSummary, setRelSummary] = useState('');
    const [persSummary, setPersSummary] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const headers = { 'Content-Type': 'application/json', 'x-admin-key': key };

    const loadUsers = async () => {
        const res = await fetch('/api/admin/users', { headers });
        if (!res.ok) { alert('Wrong admin key'); return; }
        const data = await res.json();
        setUsers(data.users || []);
        setAuthed(true);
        if (typeof window !== 'undefined') localStorage.setItem('admin_key', key);
    };

    const loadDetail = async (user: User) => {
        setSelected(user);
        setDetail(null);
        const res = await fetch(`/api/admin/memory?userId=${user.id}`, { headers });
        const data = await res.json();
        setDetail(data);
        setRelSummary(data.relationshipSummary || '');
        setPersSummary(data.personalitySummary || '');
        setNoteText('');
    };

    const saveNote = async () => {
        if (!selected || !noteText.trim()) return;
        setSaving(true);
        await fetch('/api/admin/memory', {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId: selected.id, type: 'note', content: noteText, scheduledFor: noteDate }),
        });
        setMessage('✓ Note scheduled');
        setNoteText('');
        setSaving(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const saveSummary = async (type: 'relationship_summary' | 'personality_summary', content: string) => {
        if (!selected) return;
        setSaving(true);
        await fetch('/api/admin/memory', {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId: selected.id, type, content }),
        });
        setMessage('✓ Saved');
        setSaving(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const phaseColor = (phase: string | null) => {
        if (!phase || phase === 'SEALED') return 'text-[var(--text-muted)]';
        if (phase === 'INSIGHT' || phase === 'CLOSURE') return 'text-amber-400';
        return 'text-[var(--accent)]';
    };

    if (!authed) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="w-full max-w-sm space-y-4">
                    <h1 className="text-xl font-semibold text-center text-[var(--text-primary)]">Founder Panel</h1>
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                        placeholder="Admin password"
                        className="input-glow w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                    <button onClick={loadUsers} className="w-full py-3 bg-[var(--accent)] rounded-xl text-sm font-medium">
                        Enter →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-semibold text-[var(--text-primary)]">Founder Panel</h1>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{users.length} users</p>
                </div>
                {message && <span className="text-sm text-emerald-400">{message}</span>}
            </div>

            <div className="grid md:grid-cols-[280px_1fr] gap-6">
                {/* User list */}
                <div className="space-y-2">
                    {users.map((u) => (
                        <button
                            key={u.id}
                            onClick={() => loadDetail(u)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === u.id
                                    ? 'border-[var(--border-active)] bg-[var(--accent-soft)]'
                                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-active)]'
                                }`}
                        >
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {u.name || u.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs ${phaseColor(u.last_phase)}`}>
                                    {u.last_phase || 'no sessions'}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">·</span>
                                <span className="text-xs text-[var(--text-muted)]">{u.session_count} sessions</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* User detail */}
                {selected && detail ? (
                    <div className="space-y-5">
                        {/* Relationship summary */}
                        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
                            <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Relationship Understanding</h3>
                            <textarea
                                value={relSummary}
                                onChange={(e) => setRelSummary(e.target.value)}
                                rows={3}
                                placeholder="How does this user process emotions? What do they respond well to?"
                                className="w-full bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                            />
                            <button
                                onClick={() => saveSummary('relationship_summary', relSummary)}
                                disabled={saving}
                                className="text-xs px-3 py-1.5 bg-[var(--accent-soft)] border border-[var(--border-active)] rounded-lg text-[var(--accent)] hover:opacity-80 transition-opacity"
                            >
                                Save
                            </button>
                        </div>

                        {/* Personality summary */}
                        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
                            <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Personality Notes</h3>
                            <textarea
                                value={persSummary}
                                onChange={(e) => setPersSummary(e.target.value)}
                                rows={2}
                                placeholder="Core personality context the AI should know..."
                                className="w-full bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                            />
                            <button
                                onClick={() => saveSummary('personality_summary', persSummary)}
                                disabled={saving}
                                className="text-xs px-3 py-1.5 bg-[var(--accent-soft)] border border-[var(--border-active)] rounded-lg text-[var(--accent)] hover:opacity-80 transition-opacity"
                            >
                                Save
                            </button>
                        </div>

                        {/* Founder note injection */}
                        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
                            <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Schedule a Note (Internal Context)</h3>
                            <p className="text-xs text-[var(--text-muted)]">
                                This will silently shape the AI&apos;s tone for the next session on the selected date. Never shown to the user.
                            </p>
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                rows={3}
                                placeholder="e.g. User mentioned last week they've been anxious about a job interview happening this week. Reference their courage, not anxiety."
                                className="w-full bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                            />
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={noteDate}
                                    onChange={(e) => setNoteDate(e.target.value)}
                                    className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)]"
                                />
                                <button
                                    onClick={saveNote}
                                    disabled={saving || !noteText.trim()}
                                    className="text-xs px-3 py-1.5 bg-[var(--accent)] rounded-lg font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                                >
                                    Schedule note →
                                </button>
                            </div>

                            {/* Past notes */}
                            {detail.founderNotes.length > 0 && (
                                <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                                    {detail.founderNotes.map((n) => (
                                        <div key={n.id} className="flex gap-3 text-xs">
                                            <span className="text-[var(--text-muted)] shrink-0">{n.scheduled_for}</span>
                                            <span className={`flex-1 ${n.used ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}`}>
                                                {n.note}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent messages */}
                        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
                            <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Recent Conversation</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {detail.recentMessages.map((m, i) => (
                                    <div key={i} className={`flex gap-2 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <span className={`max-w-[85%] px-3 py-2 rounded-xl leading-relaxed ${m.role === 'assistant'
                                                ? 'bg-[var(--bg-deep)] text-[var(--text-secondary)]'
                                                : 'bg-[var(--user-bubble)] text-[var(--text-primary)]'
                                            }`}>
                                            {m.content}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : selected ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="flex gap-1.5">
                            <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-40">
                        <p className="text-sm text-[var(--text-muted)]">Select a user to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
}
