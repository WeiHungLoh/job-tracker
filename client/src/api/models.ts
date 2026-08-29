export type FieldType = 'formData' | 'path' | 'query';

export type EndpointConfigEntry = {
    url: string;
    verb: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
    fieldMap?: Record<string, FieldType>;
    keepalive?: boolean;
    retry?: boolean;
};

export type APIRequest = Record<string, unknown> | null;

export class JobTrackerAPIError extends Error {
    status: number;
    data?: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = 'JobTrackerAPIError';
        this.status = status;
        this.data = data;
    }
}

export class RetryableJobTrackerAPIError extends JobTrackerAPIError {}

export class RetryableNetworkError extends TypeError {
    constructor(error: TypeError) {
        super(error.message, { cause: error });
        this.name = error.name;
    }
}
