import type { APIRequest, EndpointConfigEntry } from './models';
import type { RefreshAuthenticationRequest, RefreshAuthenticationResponse } from '../pages/authentication/models';
import { JobTrackerAPIError, RetryableJobTrackerAPIError, RetryableNetworkError } from './models';
import { endpointConfig } from './endpointConfig';
import { routes } from '../routes';

const apiUrl = import.meta.env.VITE_API_URL;
const PUBLIC_ROUTES = new Set<string>([routes.signIn, routes.signUp, routes.userGuide]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
let activeRefreshRequest: Promise<RefreshAuthenticationResponse> | undefined;

type RequestDetails = {
    init: RequestInit;
    url: string;
};

export type RequestOptions = {
    signal?: AbortSignal;
};

export type AuthenticatedRequestOptions = RequestOptions & {
    onUnauthenticated?: () => void;
};

const appendQueryValue = (query: URLSearchParams, field: string, value: unknown): void => {
    if (!Array.isArray(value)) {
        query.append(field, String(value));
        return;
    }

    if (value.length === 0) {
        query.append(field, '');
        return;
    }

    value.forEach((item) => query.append(field, String(item)));
};

const buildRequest = (request: APIRequest, config: EndpointConfigEntry, options: RequestOptions): RequestDetails => {
    let url = `${apiUrl.replace(/\/$/, '')}/${config.url.replace(/^\//, '')}`;
    const body: Record<string, unknown> = {};
    const query = new URLSearchParams();
    let formData: FormData | undefined;

    Object.entries(request ?? {}).forEach(([field, value]) => {
        const fieldType = config.fieldMap?.[field];

        if (fieldType === 'path') {
            url = url.replace(`:${field}`, encodeURIComponent(String(value)));
        } else if (fieldType === 'query') {
            appendQueryValue(query, field, value);
        } else if (fieldType === 'formData') {
            formData ??= new FormData();
            formData.append(field, value instanceof Blob ? value : String(value));
        } else {
            body[field] = value;
        }
    });

    const queryString = query.toString();
    if (queryString) {
        url += `${url.includes('?') ? '&' : '?'}${queryString}`;
    }

    const init: RequestInit = { method: config.verb };
    if (config.keepalive) {
        init.keepalive = true;
    }
    if (options.signal) {
        init.signal = options.signal;
    }
    if (formData) {
        init.body = formData;
    } else if (Object.keys(body).length > 0) {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify(body);
    }

    return { init, url };
};

const parseResponse = async <T>(response: Response): Promise<T> => {
    if (response.status === 204) {
        return null as T;
    }

    const contentType = response.headers?.get('content-type');
    if (!contentType) {
        return null as T;
    }
    if (contentType.includes('application/json')) {
        return (await response.json()) as T;
    }
    return (await response.text()) as T;
};

const getErrorMessage = (data: unknown, fallback: string): string => {
    if (typeof data === 'string') {
        return data;
    }
    if (!data || typeof data !== 'object') {
        return fallback;
    }

    const errorBody = data as { detail?: unknown; message?: unknown };
    if (typeof errorBody.message === 'string') {
        return errorBody.message;
    }
    if (typeof errorBody.detail === 'string') {
        return errorBody.detail;
    }

    return fallback;
};

const isRetryableResponseStatus = (status: number): boolean => {
    return status === 408 || (status >= 500 && status < 600);
};

const fetchResponse = async (url: string, init: RequestInit): Promise<Response> => {
    try {
        return await fetch(url, init);
    } catch (error) {
        if (isAbortError(error)) {
            throw error;
        }
        if (error instanceof TypeError) {
            throw new RetryableNetworkError(error);
        }

        throw error;
    }
};

const sendRequest = async <TResponse>({ init, url }: RequestDetails): Promise<TResponse> => {
    const response = await fetchResponse(url, init);
    let data: TResponse;
    try {
        data = await parseResponse<TResponse>(response);
    } catch (error) {
        if (!isRetryableResponseStatus(response.status)) {
            throw error;
        }

        data = null as TResponse;
    }
    const contentType = response.headers?.get('content-type') ?? '';

    if (
        response.ok &&
        contentType.includes('text/html') &&
        typeof data === 'string' &&
        /<!doctype html|<html[\s>]/i.test(data)
    ) {
        throw new JobTrackerAPIError('The API returned an unexpected HTML page.', 502);
    }

    if (!response.ok) {
        const message = getErrorMessage(data, response.statusText || 'Unknown error');
        const APIError = isRetryableResponseStatus(response.status) ? RetryableJobTrackerAPIError : JobTrackerAPIError;
        throw new APIError(message, response.status, data);
    }

    return data;
};

const isRetryableRequestError = (error: unknown): boolean => {
    return error instanceof RetryableNetworkError || error instanceof RetryableJobTrackerAPIError;
};

export const isAbortError = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';

const createAbortError = (): DOMException => new DOMException('The request was aborted.', 'AbortError');

const throwIfAborted = (signal?: AbortSignal): void => {
    if (signal?.aborted) {
        throw createAbortError();
    }
};

const wait = (delay: number, signal?: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }

        const timeout = setTimeout(() => {
            signal?.removeEventListener('abort', handleAbort);
            resolve();
        }, delay);
        const handleAbort = () => {
            clearTimeout(timeout);
            reject(createAbortError());
        };
        signal?.addEventListener('abort', handleAbort, { once: true });
    });
};

export const makeJobTrackerAPIRequest = async <TRequest extends APIRequest, TResponse>(
    request: TRequest,
    config: EndpointConfigEntry,
    options: RequestOptions = {}
): Promise<TResponse> => {
    const requestDetails = buildRequest(request, config, options);
    let retriesRemaining = config.retry ? MAX_RETRIES : 0;

    while (true) {
        throwIfAborted(options.signal);
        try {
            return await sendRequest<TResponse>(requestDetails);
        } catch (error) {
            if (retriesRemaining === 0 || !isRetryableRequestError(error)) {
                throw error;
            }

            retriesRemaining -= 1;
            await wait(RETRY_DELAY_MS, options.signal);
        }
    }
};

const refreshAuthentication = async (): Promise<void> => {
    if (activeRefreshRequest) {
        await activeRefreshRequest;
        return;
    }

    activeRefreshRequest = makeJobTrackerAPIRequest<RefreshAuthenticationRequest, RefreshAuthenticationResponse>(
        null,
        endpointConfig.authentication.refresh
    );

    try {
        await activeRefreshRequest;
    } finally {
        activeRefreshRequest = undefined;
    }
};

const redirectToSignIn = (): void => {
    if (!PUBLIC_ROUTES.has(window.location.pathname)) {
        window.location.replace(routes.signIn);
    }
};

const isUnauthorizedError = (error: unknown): error is JobTrackerAPIError => {
    return error instanceof JobTrackerAPIError && error.status === 401;
};

export const makeAuthenticatedJobTrackerAPIRequest = async <TRequest extends APIRequest, TResponse>(
    request: TRequest,
    config: EndpointConfigEntry,
    options: AuthenticatedRequestOptions = {}
): Promise<TResponse> => {
    try {
        return await makeJobTrackerAPIRequest<TRequest, TResponse>(request, config, { signal: options.signal });
    } catch (error) {
        if (!isUnauthorizedError(error)) {
            throw error;
        }
    }

    try {
        await refreshAuthentication();
    } catch (error) {
        if (isUnauthorizedError(error)) {
            (options.onUnauthenticated ?? redirectToSignIn)();
        }
        throw error;
    }

    try {
        return await makeJobTrackerAPIRequest<TRequest, TResponse>(request, config, { signal: options.signal });
    } catch (error) {
        if (isUnauthorizedError(error)) {
            (options.onUnauthenticated ?? redirectToSignIn)();
        }
        throw error;
    }
};
