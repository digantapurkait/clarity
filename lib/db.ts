import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 3306,
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'mindmantra',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    ssl: process.env.DATABASE_SSL === 'true' ? {
        rejectUnauthorized: true
    } : undefined
});

export default pool;

export async function query<T = unknown>(sql: string, params?: any[]): Promise<T> {
    const [rows] = await pool.execute(sql, params || []);
    return rows as T;
}
