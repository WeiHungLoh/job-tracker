import type { OpenAPIV3 } from 'openapi-types';
import { applicationPaths, applicationSchemas } from './applications.js';
import { authenticationPaths, authenticationSchemas } from './authentication.js';
import { commonSchemas } from './common.js';
import { interviewPaths, interviewSchemas } from './interviews.js';
import { offerPaths, offerSchemas } from './offers.js';
import { userPreferencePaths, userPreferenceSchemas } from './userPreferences.js';

export const openapiDocument: OpenAPIV3.Document = {
    openapi: '3.0.3',
    info: {
        title: 'Job Tracker API',
        version: '1.0.0',
    },
    servers: [{ url: '/api', description: 'Job Tracker API' }],
    security: [{ HTTPBearer: [] }, { accessCookie: [] }],
    tags: [
        { name: 'Authentication' },
        { name: 'Applications' },
        { name: 'Interviews' },
        { name: 'Offers' },
        { name: 'User preferences' },
    ],
    paths: { ...authenticationPaths, ...applicationPaths, ...interviewPaths, ...offerPaths, ...userPreferencePaths },
    components: {
        securitySchemes: {
            HTTPBearer: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            accessCookie: {
                type: 'apiKey',
                in: 'cookie',
                name: 'access_token',
                description:
                    'Browser-managed HttpOnly cookie. Leave this field empty. Sign in through the frontend /api proxy.',
            },
            refreshCookie: {
                type: 'apiKey',
                in: 'cookie',
                name: 'refresh_token',
                description:
                    'Browser-managed HttpOnly refresh cookie. Leave this field empty. Only used for refresh and sign-out.',
            },
        },
        schemas: {
            ...commonSchemas,
            ...authenticationSchemas,
            ...applicationSchemas,
            ...interviewSchemas,
            ...offerSchemas,
            ...userPreferenceSchemas,
        },
    },
};
