import type { NextFunction, Request, Response } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { AUTHENTICATED_API_RATE_LIMIT, AUTHENTICATED_API_RATE_LIMIT_WINDOW_MS } from '../config/server.js';
import type { ErrorResponse } from '../http/models.js';
import { sendError } from '../http/responses.js';

const RATE_LIMIT_MESSAGE = { message: 'Too many requests. Please try again later.' };

const hasAuthenticatedUser = (req: Request): boolean => {
    return typeof req.user?.id === 'number';
};

const getAuthenticatedUserKey = (req: Request): string => {
    return `user:${req.user.id}`;
};

const userRateLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: AUTHENTICATED_API_RATE_LIMIT_WINDOW_MS,
    limit: AUTHENTICATED_API_RATE_LIMIT,
    keyGenerator: getAuthenticatedUserKey,
    statusCode: 429,
    message: RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
});

const authenticatedApiRateLimiter = (req: Request, res: Response<ErrorResponse>, next: NextFunction): void => {
    if (!hasAuthenticatedUser(req)) {
        sendError(res, 401, 'No authentication token found. Please sign in.');
        return;
    }

    userRateLimiter(req, res, next);
};

export default authenticatedApiRateLimiter;
