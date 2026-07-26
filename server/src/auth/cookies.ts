import type { Response } from 'express';
import {
    ACCESS_TOKEN_COOKIE_NAME,
    CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS,
    CLEAR_REFRESH_TOKEN_COOKIE_OPTIONS,
    REFRESH_TOKEN_COOKIE_NAME,
} from '../config/auth.js';

export const clearAccessTokenCookie = <T>(res: Response<T>): void => {
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS);
};

export const clearRefreshTokenCookie = <T>(res: Response<T>): void => {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CLEAR_REFRESH_TOKEN_COOKIE_OPTIONS);
}

export const clearAuthenticationCookies = <T>(res: Response<T>): void => {
    clearAccessTokenCookie(res);
    clearRefreshTokenCookie(res);
};
