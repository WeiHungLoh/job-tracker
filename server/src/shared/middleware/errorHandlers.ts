import type { ErrorRequestHandler, RequestHandler } from 'express';
import { sendError } from '../http/responses.js';

export type MiddlewareError = Error & {
    status?: number;
    type?: string;
};

export const notFoundHandler: RequestHandler = (_req, res) => {
    sendError(res, 404, 'Route not found.');
};

export const errorHandler: ErrorRequestHandler = (error: MiddlewareError, _req, res, _next) => {
    if (error.status === 403) {
        sendError(res, 403, 'Origin is not allowed.');
        return;
    }

    if (error.type === 'entity.too.large') {
        sendError(res, 413, 'Request body is too large.');
        return;
    }

    if (error.type === 'entity.parse.failed') {
        sendError(res, 400, 'Request body contains invalid JSON.');
        return;
    }

    console.error('Unhandled request error.', error);
    sendError(res, 500, 'An unexpected server error occurred.');
};
