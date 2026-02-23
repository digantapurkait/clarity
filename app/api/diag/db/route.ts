import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    const start = Date.now();
    try {
        // Try a very simple query
        const result = await query('SELECT 1 as connection_test');
        return NextResponse.json({
            status: 'connected',
            time: `${Date.now() - start}ms`,
            result,
            env: {
                has_db_url: !!process.env.DATABASE_URL,
                has_mysql_url: !!process.env.MYSQL_URL,
                ssl: process.env.DATABASE_SSL,
                // Mask host for safety
                host: (process.env.DATABASE_URL || '').split('@')[1]?.split(':')[0] || 'not detected'
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'failed',
            error: error.message,
            code: error.code,
            time: `${Date.now() - start}ms`,
            env: {
                has_db_url: !!process.env.DATABASE_URL,
                has_mysql_url: !!process.env.MYSQL_URL,
                ssl: process.env.DATABASE_SSL,
                host: (process.env.DATABASE_URL || '').split('@')[1]?.split(':')[0] || 'not detected'
            }
        }, { status: 500 });
    }
}
