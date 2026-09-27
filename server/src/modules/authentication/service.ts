import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { REFRESH_TOKEN_DURATION_SECONDS } from './config.js';
import type { AuthenticatedUser, AuthenticationSecrets, AuthenticationTokens } from './models.js';
import { hashRefreshToken, refreshTokenHashesMatch } from './refreshTokenHash.js';
import {
    deleteAuthenticationSession,
    deleteExpiredAuthenticationSessionByHash,
    findAuthenticationSessionById,
    insertAuthenticationSession,
} from './sessionsRepository.js';
import { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken } from './tokens.js';
import { findUserInfo, insertUser } from './usersRepository.js';

const INVALID_PASSWORD_HASH = '$2b$10$vutiTM.IUgXcP281p9BfTeuBzw67GRJ1R55mZ.EBs23idcvgX6Dt.';

export const registerUser = async (email: string, password: string): Promise<boolean> => {
    return insertUser(email, await bcrypt.hash(password, 10));
};

export const createSession = async (
    email: string,
    password: string,
    authenticationSecrets: AuthenticationSecrets
): Promise<AuthenticationTokens | undefined> => {
    const userInfo = await findUserInfo(email);
    const passwordMatches = await bcrypt.compare(password, userInfo?.hashed_password ?? INVALID_PASSWORD_HASH);
    if (!userInfo || !passwordMatches) {
        return undefined;
    }

    const sessionId = crypto.randomUUID();
    const user = { id: userInfo.user_id, email: userInfo.email, sessionId };
    const accessToken = createAccessToken(user, authenticationSecrets.accessTokenSecret);
    const refreshToken = createRefreshToken(user, authenticationSecrets.refreshTokenSecret);
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION_SECONDS * 1000);

    await insertAuthenticationSession(sessionId, user.id, refreshTokenHash, expiresAt);
    return { accessToken, refreshToken };
};

const deletePresentedExpiredSession = async (refreshToken: string): Promise<void> => {
    try {
        await deleteExpiredAuthenticationSessionByHash(hashRefreshToken(refreshToken));
    } catch {
        console.error('Unable to clean up an expired authentication session.');
    }
};

export const refreshAccessToken = async (
    refreshToken: string,
    authenticationSecrets: AuthenticationSecrets
): Promise<string | undefined> => {
    let user: AuthenticatedUser;
    try {
        user = verifyRefreshToken(refreshToken, authenticationSecrets.refreshTokenSecret);
    } catch (error: unknown) {
        console.warn('Refresh token verification failed.');
        if (error instanceof jwt.TokenExpiredError) {
            await deletePresentedExpiredSession(refreshToken);
        }
        return undefined;
    }

    const session = await findAuthenticationSessionById(user.sessionId);
    const receivedRefreshTokenHash = hashRefreshToken(refreshToken);
    const sessionExpiresAt = session?.expires_at;
    const sessionIsValid =
        session?.user_id === user.id &&
        refreshTokenHashesMatch(receivedRefreshTokenHash, session.refresh_token_hash) &&
        sessionExpiresAt instanceof Date &&
        Number.isFinite(sessionExpiresAt.getTime()) &&
        sessionExpiresAt.getTime() > Date.now();

    if (!sessionIsValid) {
        await deletePresentedExpiredSession(refreshToken);
        return undefined;
    }

    return createAccessToken(user, authenticationSecrets.accessTokenSecret);
};

export const revokeSession = async (
    refreshToken: unknown,
    accessToken: unknown,
    authenticationSecrets: AuthenticationSecrets
): Promise<void> => {
    let user: AuthenticatedUser | undefined;
    if (typeof refreshToken === 'string' && refreshToken) {
        try {
            user = verifyRefreshToken(refreshToken, authenticationSecrets.refreshTokenSecret);
        } catch {
            user = undefined;
        }
    }

    if (!user && typeof accessToken === 'string' && accessToken) {
        try {
            user = verifyAccessToken(accessToken, authenticationSecrets.accessTokenSecret);
        } catch {
            user = undefined;
        }
    }

    if (user) {
        await deleteAuthenticationSession(user.sessionId, user.id);
    }
};
