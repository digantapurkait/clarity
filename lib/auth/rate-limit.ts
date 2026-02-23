import { NextRequest } from 'next/server';

const ipCache = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 10; // 10 requests
const WINDOW = 60 * 1000; // per 1 minute

/**
 * Basic in-memory rate limiter for API routes.
 */
export function isRateLimited(req: NextRequest): boolean {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const entry = ipCache.get(ip);

    if (!entry || (now - entry.lastReset) > WINDOW) {
        ipCache.set(ip, { count: 1, lastReset: now });
        return false;
    }

    if (entry.count >= LIMIT) {
        return true;
    }

    entry.count += 1;
    return false;
}
