// Preserve CORS initialization before domain modules load dotenv.
import { isAllowedOrigin } from './shared/config/server.js';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import documentationRoute from './docs/routes.js';
import archivedApplicationRoute from './modules/applications/archivedRoutes.js';
import applicationRoute from './modules/applications/routes.js';
import { authenticateAccessToken } from './modules/authentication/api.js';
import authRoute from './modules/authentication/routes.js';
import archivedInterviewRoute from './modules/interviews/archivedRoutes.js';
import interviewRoute from './modules/interviews/routes.js';
import offerDecisionRoute from './modules/offers/routes.js';
import userPreferencesRoute from './modules/userPreferences/routes.js';
import authenticatedApiRateLimiter from './shared/middleware/authenticatedApiRateLimiter.js';
import type { MiddlewareError } from './shared/middleware/errorHandlers.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandlers.js';

export const createApp = (): express.Express => {
    const app = express();
    app.set('trust proxy', 1);
    app.disable('x-powered-by');
    app.use(helmet());

    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin || isAllowedOrigin(origin)) {
                    callback(null, true);
                    return;
                }

                const error = new Error('Origin is not allowed.') as MiddlewareError;
                error.status = 403;
                callback(error);
            },
            credentials: true,
        })
    );
    app.use(express.json());
    app.use(cookieParser());

    app.use('/authentication', authRoute);
    app.use('/job-applications', authenticateAccessToken, authenticatedApiRateLimiter, applicationRoute);
    app.use('/job-interviews', authenticateAccessToken, authenticatedApiRateLimiter, interviewRoute);
    app.use(
        '/archived-job-applications',
        authenticateAccessToken,
        authenticatedApiRateLimiter,
        archivedApplicationRoute
    );
    app.use('/archived-job-interviews', authenticateAccessToken, authenticatedApiRateLimiter, archivedInterviewRoute);
    app.use('/offer-decisions', authenticateAccessToken, authenticatedApiRateLimiter, offerDecisionRoute);
    app.use('/user-preferences', authenticateAccessToken, authenticatedApiRateLimiter, userPreferencesRoute);

    app.use(documentationRoute);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};
