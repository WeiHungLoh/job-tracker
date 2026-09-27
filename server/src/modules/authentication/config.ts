import dotenv from 'dotenv';
import type { CookieOptions } from 'express';
import type { AuthenticationSecrets } from './models.js';

dotenv.config();

export const ACCESS_TOKEN_DURATION_SECONDS = 15 * 60;

export const REFRESH_TOKEN_DURATION_SECONDS = 7 * 24 * 60 * 60;

export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';

export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
    maxAge: ACCESS_TOKEN_DURATION_SECONDS * 1000,
};

export const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/authentication',
    maxAge: REFRESH_TOKEN_DURATION_SECONDS * 1000,
};

export const CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: ACCESS_TOKEN_COOKIE_OPTIONS.httpOnly,
    secure: ACCESS_TOKEN_COOKIE_OPTIONS.secure,
    sameSite: ACCESS_TOKEN_COOKIE_OPTIONS.sameSite,
    path: ACCESS_TOKEN_COOKIE_OPTIONS.path,
};

export const CLEAR_REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: REFRESH_TOKEN_COOKIE_OPTIONS.httpOnly,
    secure: REFRESH_TOKEN_COOKIE_OPTIONS.secure,
    sameSite: REFRESH_TOKEN_COOKIE_OPTIONS.sameSite,
    path: REFRESH_TOKEN_COOKIE_OPTIONS.path,
};

export const getAccessTokenSecret = (): string | undefined => {
    return process.env.ACCESS_TOKEN_SECRET;
};

const getRefreshTokenSecret = (): string | undefined => {
    return process.env.REFRESH_TOKEN_SECRET;
};

export const getAuthenticationSecrets = (): AuthenticationSecrets | undefined => {
    const accessTokenSecret = getAccessTokenSecret();
    const refreshTokenSecret = getRefreshTokenSecret();

    if (!accessTokenSecret || !refreshTokenSecret || accessTokenSecret === refreshTokenSecret) {
        return undefined;
    }

    return { accessTokenSecret, refreshTokenSecret };
};

export const SIGN_IN_EMAIL_IP_LIMIT = 10;

export const SIGN_IN_IP_LIMIT = 50;

export const SIGN_IN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const SIGN_UP_HOURLY_IP_LIMIT = 5;

export const SIGN_UP_HOURLY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const SIGN_UP_DAILY_IP_LIMIT = 10;

export const SIGN_UP_DAILY_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_MAX_LENGTH = 64;

export const PASSWORD_MAX_BYTES = 72;

export const EMAIL_MAX_LENGTH = 254;
