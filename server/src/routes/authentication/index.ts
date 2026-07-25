import type {
    AuthenticationResponse,
    CredentialsRequest,
    EmptyResponse,
    RefreshAuthenticationResponse,
    SignUpResponse,
} from './models.js';
import type { Request, Response } from 'express';
import {
    ACCESS_TOKEN_COOKIE_NAME,
    ACCESS_TOKEN_COOKIE_OPTIONS,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_OPTIONS,
    getAuthenticationSecrets,
} from '../../config/auth.js';
import { clearAuthenticationCookies } from '../../auth/cookies.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../../auth/tokens.js';
import authenticateAccessToken from '../../middleware/authenticateAccessToken.js';
import {
    signInEmailIpRateLimiter,
    signInIpRateLimiter,
    signUpDailyIpRateLimiter,
    signUpHourlyIpRateLimiter,
} from '../../middleware/publicAuthRateLimiters.js';
import authenticatedApiRateLimiter from '../../middleware/authenticatedApiRateLimiter.js';
import { findUserInfo, insertUser } from '../../db/queries/users.js';
import { handleRouteError, sendError } from '../../http/responses.js';
import { getPasswordValidationError, isNonEmptyString, isValidEmail, normalizeEmail } from '../../http/validation.js';
import bcrypt from 'bcryptjs';
import express from 'express';

const router = express.Router();
const INVALID_PASSWORD_HASH = '$2b$10$vutiTM.IUgXcP281p9BfTeuBzw67GRJ1R55mZ.EBs23idcvgX6Dt.';

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
            const userCreated = await insertUser(email, await bcrypt.hash(password, 10));
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

        if (!isValidEmail(email) || !isNonEmptyString(password)) {
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
            const userInfo = await findUserInfo(email);
            const passwordMatches = await bcrypt.compare(password, userInfo?.hashed_password ?? INVALID_PASSWORD_HASH);
            if (!userInfo || !passwordMatches) {
                sendError(res, 401, 'Invalid email or password.');
                return;
            }

            const user = { id: userInfo.user_id, email: userInfo.email };
            const accessToken = createAccessToken(user, authenticationSecrets.accessTokenSecret);
            const refreshToken = createRefreshToken(user, authenticationSecrets.refreshTokenSecret);

            res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
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
    (
        req: Request<Record<string, never>, RefreshAuthenticationResponse>,
        res: Response<RefreshAuthenticationResponse>
    ): void => {
        const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME] as unknown;
        if (typeof refreshToken !== 'string' || !refreshToken) {
            clearAuthenticationCookies(res);
            sendError(res, 401, 'No refresh token found. Please sign in.');
            return;
        }

        const authenticationSecrets = getAuthenticationSecrets();
        if (!authenticationSecrets) {
            console.error('Authentication token secrets are missing or invalid.');
            sendError(res, 503, 'Authentication is temporarily unavailable.');
            return;
        }

        try {
            const user = verifyRefreshToken(refreshToken, authenticationSecrets.refreshTokenSecret);
            const accessToken = createAccessToken(user, authenticationSecrets.accessTokenSecret);

            res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
            res.status(200).send({ message: 'Access token refreshed.' });
        } catch (error: unknown) {
            console.warn('Refresh token verification failed.', error);
            clearAuthenticationCookies(res);
            sendError(res, 401, 'Invalid or expired refresh token. Please sign in.');
        }
    }
);

router.delete(
    '/sessions/current',
    (_req: Request<Record<string, never>, EmptyResponse>, res: Response<EmptyResponse>): void => {
        clearAuthenticationCookies(res);
        res.sendStatus(204);
    }
);

export default router;
