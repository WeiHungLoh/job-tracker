import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

export const pool = new Pool({
    connectionString: process.env.PG_URI,
    max: Number(process.env.PG_POOL_MAX) || 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
});

export const connectDB = async (): Promise<void> => {
    const client = await pool.connect();
    console.log('Connected to pool');
    client.release();
};
