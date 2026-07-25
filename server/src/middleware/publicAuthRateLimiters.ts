import type { Request } from 'express';
import {
    SIGN_IN_EMAIL_IP_LIMIT,
    SIGN_IN_IP_LIMIT,
    SIGN_IN_RATE_LIMIT_WINDOW_MS,
    SIGN_UP_DAILY_IP_LIMIT,
    SIGN_UP_DAILY_RATE_LIMIT_WINDOW_MS,
    SIGN_UP_HOURLY_IP_LIMIT,
    SIGN_UP_HOURLY_RATE_LIMIT_WINDOW_MS,
} from '../config/server.js';
import rateLimit from 'express-rate-limit';
import { normalizeEmail } from '../http/validation.js';

const SIGN_IN_RATE_LIMIT_MESSAGE = { message: 'Too many authentication attempts. Please try again later.' };
const SIGN_UP_RATE_LIMIT_MESSAGE = { message: 'Too many sign-up attempts. Please try again later.' };

const getSignInEmailIpKey = (req: Request): string => {
    const email = normalizeEmail(req.body?.email) || 'invalid-email';
    return `${req.ip}:${email}`;
};

export const signInIpRateLimiter = rateLimit({
    windowMs: SIGN_IN_RATE_LIMIT_WINDOW_MS,
    limit: SIGN_IN_IP_LIMIT,
    statusCode: 429,
    message: SIGN_IN_RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
});

export const signInEmailIpRateLimiter = rateLimit({
    windowMs: SIGN_IN_RATE_LIMIT_WINDOW_MS,
    limit: SIGN_IN_EMAIL_IP_LIMIT,
    keyGenerator: getSignInEmailIpKey,
    statusCode: 429,
    message: SIGN_IN_RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
});

export const signUpHourlyIpRateLimiter = rateLimit({
    windowMs: SIGN_UP_HOURLY_RATE_LIMIT_WINDOW_MS,
    limit: SIGN_UP_HOURLY_IP_LIMIT,
    statusCode: 429,
    message: SIGN_UP_RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
});

export const signUpDailyIpRateLimiter = rateLimit({
    windowMs: SIGN_UP_DAILY_RATE_LIMIT_WINDOW_MS,
    limit: SIGN_UP_DAILY_IP_LIMIT,
    statusCode: 429,
    message: SIGN_UP_RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
});
