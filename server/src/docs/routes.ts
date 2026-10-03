import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openapiDocument } from './openapi.js';

const router = express.Router();

type AuthDefinition = { has: (name: string) => boolean };
type AuthDefinitions = { filter: (predicate: (definition: AuthDefinition) => boolean) => AuthDefinitions };

// Keep cookie security in OpenAPI without offering unusable HttpOnly-cookie inputs.
const bearerAuthorizationPlugin = {
    statePlugins: {
        auth: {
            wrapSelectors: {
                definitionsToAuthorize: (original: () => AuthDefinitions) => () =>
                    original().filter((definition) => definition.has('HTTPBearer')),
            },
        },
    },
};

router.get(['/openapi.json', '/api-docs/openapi.json'], (_req, res) => {
    res.json(openapiDocument);
});

router.get('/api-docs', (req, res, next) => {
    if (!req.path.endsWith('/')) {
        // A relative redirect keeps the frontend proxy prefix when present.
        res.redirect('api-docs/');
        return;
    }
    next();
});

router.use(
    '/api-docs',
    helmet.contentSecurityPolicy({
        directives: { upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null },
    }),
    swaggerUi.serve,
    swaggerUi.setup(null, {
        customSiteTitle: 'Job Tracker API',
        customCss: '.swagger-ui .servers, .swagger-ui .servers-title { display: none; }',
        swaggerOptions: {
            url: './openapi.json',
            withCredentials: true,
            persistAuthorization: false,
            validatorUrl: null,
            docExpansion: 'none',
            plugins: [bearerAuthorizationPlugin],
        },
    })
);

export default router;
