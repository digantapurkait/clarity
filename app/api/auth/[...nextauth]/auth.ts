import NextAuth, { AuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { query } from '@/lib/db';

export const authOptions: AuthOptions = {
    providers: [
        EmailProvider({
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: Number(process.env.EMAIL_SERVER_PORT),
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            },
            from: process.env.EMAIL_FROM,
        }),
    ],
    adapter: {
        async createUser(data: { email: string; name?: string | null; emailVerified?: Date | null }) {
            const result = await query<{ insertId: number }>(
                'INSERT INTO users (email, name) VALUES (?, ?)',
                [data.email, data.name || null]
            );
            const id = (result as unknown as { insertId: number }).insertId;
            return { id: String(id), email: data.email, name: data.name || null, emailVerified: null };
        },
        async getUser(id: string) {
            const rows = await query<{ id: number; email: string; name: string | null }[]>(
                'SELECT id, email, name FROM users WHERE id = ?', [id]
            );
            const u = Array.isArray(rows) ? rows[0] : null;
            if (!u) return null;
            return { id: String(u.id), email: u.email, name: u.name, emailVerified: null };
        },
        async getUserByEmail(email: string) {
            const rows = await query<{ id: number; email: string; name: string | null }[]>(
                'SELECT id, email, name FROM users WHERE email = ?', [email]
            );
            const u = Array.isArray(rows) ? rows[0] : null;
            if (!u) return null;
            return { id: String(u.id), email: u.email, name: u.name, emailVerified: null };
        },
        async getUserByAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
            const rows = await query<{ user_id: number; email: string; name: string | null }[]>(
                `SELECT u.id as user_id, u.email, u.name FROM accounts a
         JOIN users u ON a.user_id = u.id
         WHERE a.provider = ? AND a.provider_account_id = ?`,
                [provider, providerAccountId]
            );
            const u = Array.isArray(rows) ? rows[0] : null;
            if (!u) return null;
            return { id: String(u.user_id), email: u.email, name: u.name, emailVerified: null };
        },
        async updateUser(data: { id: string; name?: string | null; email?: string }) {
            if (data.name) await query('UPDATE users SET name = ? WHERE id = ?', [data.name, data.id]);
            const rows = await query<{ id: number; email: string; name: string | null }[]>(
                'SELECT id, email, name FROM users WHERE id = ?', [data.id]
            );
            const u = Array.isArray(rows) ? rows[0] : { id: Number(data.id), email: data.email || '', name: data.name || null };
            return { id: String(u.id), email: (u as { email: string }).email, name: (u as { name: string | null }).name, emailVerified: null };
        },
        async linkAccount(account: Record<string, unknown>) {
            const id = `${account.provider}-${account.providerAccountId}`;
            await query(
                `INSERT IGNORE INTO accounts (id, user_id, type, provider, provider_account_id, access_token, expires_at, token_type, scope, id_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, account.userId, account.type, account.provider, account.providerAccountId,
                    account.access_token || null, account.expires_at || null,
                    account.token_type || null, account.scope || null, account.id_token || null]
            );
            return account;
        },
        async createSession(data: { sessionToken: string; userId: string; expires: Date }) {
            await query(
                'INSERT INTO sessions_auth (id, session_token, user_id, expires) VALUES (?, ?, ?, ?)',
                [data.sessionToken, data.sessionToken, data.userId, data.expires]
            );
            return data;
        },
        async getSessionAndUser(sessionToken: string) {
            const rows = await query<{ session_token: string; user_id: number; expires: Date; email: string; name: string | null }[]>(
                `SELECT s.session_token, s.user_id, s.expires, u.email, u.name
         FROM sessions_auth s JOIN users u ON s.user_id = u.id
         WHERE s.session_token = ?`,
                [sessionToken]
            );
            const r = Array.isArray(rows) ? rows[0] : null;
            if (!r) return null;
            return {
                session: { sessionToken: r.session_token, userId: String(r.user_id), expires: r.expires },
                user: { id: String(r.user_id), email: r.email, name: r.name, emailVerified: null },
            };
        },
        async updateSession(data: { sessionToken: string; expires?: Date }) {
            if (data.expires) {
                await query('UPDATE sessions_auth SET expires = ? WHERE session_token = ?', [data.expires, data.sessionToken]);
            }
            const rows = await query<{ session_token: string; user_id: number; expires: Date }[]>(
                'SELECT session_token, user_id, expires FROM sessions_auth WHERE session_token = ?',
                [data.sessionToken]
            );
            const r = Array.isArray(rows) ? rows[0] : null;
            if (!r) return null;
            return { sessionToken: r.session_token, userId: String(r.user_id), expires: r.expires };
        },
        async deleteSession(sessionToken: string) {
            await query('DELETE FROM sessions_auth WHERE session_token = ?', [sessionToken]);
        },
        async createVerificationToken(data: { identifier: string; token: string; expires: Date }) {
            await query(
                'INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)',
                [data.identifier, data.token, data.expires]
            );
            return data;
        },
        async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
            const rows = await query<{ identifier: string; token: string; expires: Date }[]>(
                'SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?',
                [identifier, token]
            );
            const r = Array.isArray(rows) ? rows[0] : null;
            if (!r) return null;
            await query('DELETE FROM verification_tokens WHERE identifier = ? AND token = ?', [identifier, token]);
            return r;
        },
    },
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            return true;
        },
        async session({ session, user }) {
            if (session.user && user) {
                (session.user as { id?: string }).id = user.id;

                // Merge guest sessions if applicable
                // Note: We'd ideally pass guestId from the client via headers or a cookie
                // For this MVP, we'll assume the client calls a separate 'merge' endpoint after sign-in
                // or we rely on the client passing guestId during the signin flow.
            }
            return session;
        },
    },
    session: { strategy: 'database' },
};

export default authOptions;
