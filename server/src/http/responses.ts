import type { CodedErrorResponse, ErrorResponse, ErrorStatus } from './models.js';
import type { Response } from 'express';

export const sendError = <T>(res: Response<T | ErrorResponse>, status: ErrorStatus, message: string): void => {
    res.status(status).send({ message });
};

export const sendCodedError = <T>(
    res: Response<T | CodedErrorResponse>,
    status: ErrorStatus,
    code: string,
    message: string
): void => {
    res.status(status).send({ code, message });
};

export const handleRouteError = <T>(
    res: Response<T | ErrorResponse>,
    error: unknown,
    fallbackMessage: string
): void => {
    console.error(fallbackMessage, error);
    sendError(res, 500, fallbackMessage);
};

export const handleCodedRouteError = <T>(
    res: Response<T | CodedErrorResponse>,
    error: unknown,
    code: string,
    fallbackMessage: string
): void => {
    console.error(fallbackMessage, error);
    sendCodedError(res, 500, code, fallbackMessage);
};
