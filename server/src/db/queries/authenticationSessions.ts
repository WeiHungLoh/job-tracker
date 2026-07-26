import type { AuthenticationSession } from '../models.js';
import { pool } from '../connectDB.js';

export const insertAuthenticationSession = async (
    sessionId: string,
    userId: number,
    refreshTokenHash: string,
    expiresAt: Date
): Promise<void> => {
    await pool.query(
        `INSERT INTO authentication_sessions (session_id, user_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, userId, refreshTokenHash, expiresAt]
    );
};

export const findAuthenticationSessionById = async (sessionId: string): Promise<AuthenticationSession | undefined> => {
    const result = await pool.query<AuthenticationSession>(
        `SELECT session_id, user_id, refresh_token_hash, created_at, expires_at
         FROM authentication_sessions
         WHERE session_id = $1`,
        [sessionId]
    );

    return result.rows[0];
};

export const deleteAuthenticationSession = async (sessionId: string, userId: number): Promise<void> => {
    await pool.query(
        `DELETE FROM authentication_sessions
         WHERE session_id = $1
           AND user_id = $2`,
        [sessionId, userId]
    );
};

export const deleteExpiredAuthenticationSessionByHash = async (refreshTokenHash: string): Promise<void> => {
    await pool.query(
        `DELETE FROM authentication_sessions
         WHERE refresh_token_hash = $1
           AND expires_at <= CURRENT_TIMESTAMP`,
        [refreshTokenHash]
    );
};

export const deleteExpiredAuthenticationSessions = async (): Promise<void> => {
    try {
        await pool.query(
            `DELETE FROM authentication_sessions
             WHERE expires_at <= CURRENT_TIMESTAMP`
        );
    } catch {
        console.error('Unable to clean up expired authentication sessions.');
    }
};
