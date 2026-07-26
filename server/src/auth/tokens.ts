import type { AuthenticatedUser } from './models.js';
import { ACCESS_TOKEN_DURATION_SECONDS, REFRESH_TOKEN_DURATION_SECONDS } from '../config/auth.js';
import jwt from 'jsonwebtoken';

const AUTHENTICATION_TOKEN_ALGORITHM = 'HS256';
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthenticationTokenType = 'access' | 'refresh';

const isValidAuthenticatedUser = (user: {
    id: unknown;
    email: unknown;
    sessionId: unknown;
}): user is AuthenticatedUser => {
    return (
        typeof user.id === 'number' &&
        Number.isInteger(user.id) &&
        user.id > 0 &&
        typeof user.email === 'string' &&
        user.email.length > 0 &&
        typeof user.sessionId === 'string' &&
        SESSION_ID_PATTERN.test(user.sessionId)
    );
};

const createAuthenticationToken = (
    user: AuthenticatedUser,
    secret: string,
    tokenType: AuthenticationTokenType,
    expiresIn: number
): string => {
    if (!isValidAuthenticatedUser(user)) {
        throw new jwt.JsonWebTokenError('Authentication session payload is invalid');
    }

    return jwt.sign({ ...user, tokenType }, secret, {
        algorithm: AUTHENTICATION_TOKEN_ALGORITHM,
        expiresIn,
    });
};

const verifyAuthenticationToken = (
    token: string,
    secret: string,
    expectedTokenType: AuthenticationTokenType
): AuthenticatedUser => {
    const payload = jwt.verify(token, secret, {
        algorithms: [AUTHENTICATION_TOKEN_ALGORITHM],
    });

    if (
        typeof payload === 'string' ||
        payload.tokenType !== expectedTokenType ||
        !isValidAuthenticatedUser({
            id: payload.id,
            email: payload.email,
            sessionId: payload.sessionId,
        })
    ) {
        throw new jwt.JsonWebTokenError('Token payload is invalid');
    }

    return { id: payload.id, email: payload.email, sessionId: payload.sessionId };
};

export const createAccessToken = (user: AuthenticatedUser, secret: string): string => {
    return createAuthenticationToken(user, secret, 'access', ACCESS_TOKEN_DURATION_SECONDS);
};

export const createRefreshToken = (user: AuthenticatedUser, secret: string): string => {
    return createAuthenticationToken(user, secret, 'refresh', REFRESH_TOKEN_DURATION_SECONDS);
};

export const verifyAccessToken = (token: string, secret: string): AuthenticatedUser => {
    return verifyAuthenticationToken(token, secret, 'access');
};

export const verifyRefreshToken = (token: string, secret: string): AuthenticatedUser => {
    return verifyAuthenticationToken(token, secret, 'refresh');
};
