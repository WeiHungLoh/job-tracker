import { pool } from '../../shared/db/connectDB.js';
import { initializeUserPreferences } from '../userPreferences/api.js';
import type { User } from './models.js';

export const insertUser = async (email: string, hashedPassword: string): Promise<boolean> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await client.query<{ user_id: number }>(
            `INSERT INTO users (email, hashed_password)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING
             RETURNING user_id`,
            [email, hashedPassword]
        );
        const createdUser = result.rows[0];
        if (createdUser) {
            await initializeUserPreferences(createdUser.user_id, client);
        }
        await client.query('COMMIT');
        return Boolean(createdUser);
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const findUserInfo = async (email: string): Promise<User | undefined> => {
    const result = await pool.query<User>(
        `SELECT user_id, email, hashed_password
         FROM users
         WHERE email = $1`,
        [email]
    );

    return result.rows[0];
};
