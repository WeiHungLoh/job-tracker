import type { NextFunction, Request, Response } from 'express';
import type { ErrorResponse } from '../../shared/http/models.js';
import { sendError } from '../../shared/http/responses.js';
import { ACCESS_TOKEN_COOKIE_NAME, getAccessTokenSecret } from './config.js';
import { clearAccessTokenCookie } from './cookies.js';
import { verifyAccessToken } from './tokens.js';

const authenticateAccessToken = (req: Request, res: Response<ErrorResponse>, next: NextFunction): void => {
    const accessToken = req.cookies[ACCESS_TOKEN_COOKIE_NAME] as unknown;
    if (typeof accessToken !== 'string' || !accessToken) {
        clearAccessTokenCookie(res);
        sendError(res, 401, 'No authentication token found. Please sign in.');
        return;
    }

    const accessTokenSecret = getAccessTokenSecret();
    if (!accessTokenSecret) {
        console.error('ACCESS_TOKEN_SECRET is not configured.');
        sendError(res, 503, 'Authentication is temporarily unavailable.');
        return;
    }

    try {
        req.user = verifyAccessToken(accessToken, accessTokenSecret);
        next();
    } catch (error: unknown) {
        console.warn('Access token verification failed.', error);
        clearAccessTokenCookie(res);
        sendError(res, 401, 'Invalid or expired token. Please sign in.');
    }
};

export default authenticateAccessToken;
