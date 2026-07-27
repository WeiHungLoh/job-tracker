export type MessageResponse = {
    message: string;
};

export type ErrorResponse = MessageResponse;

export type CodedErrorResponse = ErrorResponse & {
    code: string;
};

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503;

export type EmptyResponse = undefined | ErrorResponse;
