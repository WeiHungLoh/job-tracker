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

router.get(['/openapi.json', '/api-docs/openapi.json'], (req, res) => {
    res.json(
        req.query.proxy === 'true'
            ? { ...openapiDocument, servers: [{ url: '/api', description: 'Job Tracker API' }] }
            : openapiDocument
    );
});

const documentationHtml = swaggerUi
    .generateHTML(undefined, {
        customSiteTitle: 'Job Tracker API',
        customCss: '.swagger-ui .servers, .swagger-ui .servers-title { display: none; }',
        swaggerOptions: {
            url: '/api-docs/openapi.json',
            withCredentials: true,
            persistAuthorization: false,
            validatorUrl: null,
            docExpansion: 'none',
            plugins: [bearerAuthorizationPlugin],
        },
    })
    // Netlify treats both slash variants as the same path, so assets need a fixed base.
    .replace('<head>', '<head>\n<base href="/api-docs/">');

router.use(
    '/api-docs',
    helmet.contentSecurityPolicy({
        directives: { upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null },
    })
);

router.get('/api-docs', (_req, res) => {
    res.send(documentationHtml);
});

router.use('/api-docs', swaggerUi.serve);

export default router;
