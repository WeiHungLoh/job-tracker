import type { OpenAPIV3 } from 'openapi-types';
import {
    errorResponse,
    jsonBody,
    jsonResponse,
    noContent,
    protectedErrors,
    schemaRef,
    textResponse,
} from './common.js';

const tags = ['Authentication'];

export const authenticationPaths: OpenAPIV3.PathsObject = {
    '/authentication/users': {
        post: {
            tags,
            summary: 'Register an account',
            security: [],
            requestBody: jsonBody('Credentials'),
            description:
                'Creates an account with an email and password. Passwords must be 8–64 characters and at most 72 bytes.',
            responses: {
                201: textResponse('User successfully registered.'),
                409: errorResponse('An account with this email already exists.'),
                422: errorResponse('Invalid email or password.'),
                429: errorResponse('Hourly or daily sign-up limit exceeded.'),
                500: errorResponse('Unable to register the user.'),
            },
        },
    },
    '/authentication/sessions': {
        post: {
            tags,
            summary: 'Sign in',
            security: [],
            description: 'Signs in to your account and sets access and refresh cookies.',
            requestBody: jsonBody('Credentials'),
            responses: {
                200: jsonResponse('Successfully signed in. Cookies are set by the browser.', schemaRef('Message')),
                401: errorResponse('Invalid email or password.'),
                429: errorResponse('Sign-in rate limit exceeded.'),
                500: errorResponse('Unable to sign in.'),
                503: errorResponse('Authentication is temporarily unavailable.'),
            },
        },
    },
    '/authentication/sessions/current': {
        get: {
            tags,
            summary: 'Check sign-in status',
            description: 'Checks whether your access token is valid.',
            responses: { ...protectedErrors, 200: jsonResponse('Authenticated user.', schemaRef('Message')) },
        },
        delete: {
            tags,
            summary: 'Sign out',
            security: [{ refreshCookie: [] }, { accessCookie: [] }, {}],
            description: 'Revokes your cookie session and clears both authentication cookies.',
            responses: { 204: noContent, 500: errorResponse('Unable to sign out. Please try again.') },
        },
    },
    '/authentication/sessions/refresh': {
        post: {
            tags,
            summary: 'Refresh access token',
            security: [{ refreshCookie: [] }],
            description: 'Uses your refresh cookie to issue a new access cookie.',
            responses: {
                200: jsonResponse('Access token refreshed.', schemaRef('Message')),
                401: errorResponse('Missing, expired or revoked refresh token. Authentication cookies are cleared.'),
                500: errorResponse('Unable to refresh authentication.'),
                503: errorResponse('Authentication is temporarily unavailable.'),
            },
        },
    },
};

export const authenticationSchemas: Record<string, OpenAPIV3.SchemaObject> = {
    Credentials: {
        type: 'object',
        example: { email: 'you@example.com', password: 'replace-with-your-password' },
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email', maxLength: 254 },
            password: { type: 'string', format: 'password', maxLength: 64, writeOnly: true },
        },
    },
};
