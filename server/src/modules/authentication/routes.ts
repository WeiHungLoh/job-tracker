import type { Request, Response } from 'express';
import express from 'express';
import type { EmptyResponse } from '../../shared/http/models.js';
import { handleRouteError, sendError } from '../../shared/http/responses.js';
import { isNonEmptyString } from '../../shared/http/validation.js';
import authenticatedApiRateLimiter from '../../shared/middleware/authenticatedApiRateLimiter.js';
import {
    ACCESS_TOKEN_COOKIE_NAME,
    ACCESS_TOKEN_COOKIE_OPTIONS,
    getAuthenticationSecrets,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_OPTIONS,
} from './config.js';
import { clearAuthenticationCookies } from './cookies.js';
import authenticateAccessToken from './middleware.js';
import type {
    AuthenticationResponse,
    CredentialsRequest,
    RefreshAuthenticationResponse,
    SignUpResponse,
} from './models.js';
import {
    signInEmailIpRateLimiter,
    signInIpRateLimiter,
    signUpDailyIpRateLimiter,
    signUpHourlyIpRateLimiter,
} from './rateLimiters.js';
import { createSession, refreshAccessToken, registerUser, revokeSession } from './service.js';
import {
    getPasswordMaximumValidationError,
    getPasswordValidationError,
    isValidEmail,
    normalizeEmail,
} from './validation.js';

const router = express.Router();

const sendInvalidRefreshResponse = (
    res: Response<RefreshAuthenticationResponse>,
    message = 'Invalid or expired refresh token. Please sign in.'
): void => {
    clearAuthenticationCookies(res);
    sendError(res, 401, message);
};

router.post(
    '/users',
    signUpHourlyIpRateLimiter,
    signUpDailyIpRateLimiter,
    async (
        req: Request<Record<string, never>, SignUpResponse, CredentialsRequest>,
        res: Response<SignUpResponse>
    ): Promise<void> => {
        const email = normalizeEmail(req.body.email);
        const { password } = req.body;

        if (!isValidEmail(email)) {
            sendError(res, 422, 'A valid email is required.');
            return;
        }

        const passwordValidationError = getPasswordValidationError(password);
        if (passwordValidationError) {
            sendError(res, 422, passwordValidationError);
            return;
        }

        try {
            const userCreated = await registerUser(email, password);
            if (!userCreated) {
                sendError(res, 409, 'An account with this email already exists.');
                return;
            }
            res.status(201).send('User successfully registered.');
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to register the user.');
        }
    }
);

router.post(
    '/sessions',
    signInIpRateLimiter,
    signInEmailIpRateLimiter,
    async (
        req: Request<Record<string, never>, AuthenticationResponse, CredentialsRequest>,
        res: Response<AuthenticationResponse>
    ): Promise<void> => {
        const email = normalizeEmail(req.body.email);
        const { password } = req.body;

        if (!isValidEmail(email) || !isNonEmptyString(password) || getPasswordMaximumValidationError(password)) {
            sendError(res, 401, 'Invalid email or password.');
            return;
        }

        const authenticationSecrets = getAuthenticationSecrets();
        if (!authenticationSecrets) {
            console.error('Authentication token secrets are missing or invalid.');
            sendError(res, 503, 'Authentication is temporarily unavailable.');
            return;
        }

        try {
            const tokens = await createSession(email, password, authenticationSecrets);
            if (!tokens) {
                sendError(res, 401, 'Invalid email or password.');
                return;
            }

            res.cookie(ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
            res.status(200).send({ message: 'Successfully signed in.' });
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to sign in.');
        }
    }
);

router.get(
    '/sessions/current',
    authenticateAccessToken,
    authenticatedApiRateLimiter,
    (_req: Request<Record<string, never>, AuthenticationResponse>, res: Response<AuthenticationResponse>): void => {
        res.status(200).send({ message: 'Authenticated user.' });
    }
);

router.post(
    '/sessions/refresh',
    async (
        req: Request<Record<string, never>, RefreshAuthenticationResponse>,
        res: Response<RefreshAuthenticationResponse>
    ): Promise<void> => {
        const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME] as unknown;
        if (typeof refreshToken !== 'string' || !refreshToken) {
            sendInvalidRefreshResponse(res, 'No refresh token found. Please sign in.');
            return;
        }

        const authenticationSecrets = getAuthenticationSecrets();
        if (!authenticationSecrets) {
            console.error('Authentication token secrets are missing or invalid.');
            sendError(res, 503, 'Authentication is temporarily unavailable.');
            return;
        }

        try {
            const accessToken = await refreshAccessToken(refreshToken, authenticationSecrets);
            if (!accessToken) {
                sendInvalidRefreshResponse(res);
                return;
            }

            res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
            res.status(200).send({ message: 'Access token refreshed.' });
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to refresh authentication.');
        }
    }
);

router.delete(
    '/sessions/current',
    async (req: Request<Record<string, never>, EmptyResponse>, res: Response<EmptyResponse>): Promise<void> => {
        const authenticationSecrets = getAuthenticationSecrets();
        const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME] as unknown;
        const accessToken = req.cookies[ACCESS_TOKEN_COOKIE_NAME] as unknown;

        if (authenticationSecrets) {
            try {
                await revokeSession(refreshToken, accessToken, authenticationSecrets);
            } catch (error: unknown) {
                handleRouteError(res, error, 'Unable to sign out. Please try again.');
                return;
            }
        }

        clearAuthenticationCookies(res);
        res.sendStatus(204);
    }
);

export default router;
