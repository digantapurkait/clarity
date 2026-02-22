import mysql from 'mysql2/promise';

const connectionConfig = process.env.DATABASE_URL || process.env.MYSQL_URL
    ? { uri: process.env.DATABASE_URL || process.env.MYSQL_URL }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: Number(process.env.DATABASE_PORT) || 3306,
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'mindmantra',
    };

const pool = mysql.createPool({
    ...connectionConfig,
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
