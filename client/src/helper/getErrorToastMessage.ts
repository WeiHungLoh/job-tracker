import { JobTrackerAPIError } from '../api/models';

export const isJobTrackerAPIError = (error: unknown): error is JobTrackerAPIError => {
    return error instanceof JobTrackerAPIError;
};

const isTimeoutError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'TimeoutError';

export const getErrorToastMessage = (
    error: unknown,
    fallback: string,
    timeoutFallback = 'The request took too long. Please try again.'
): string => {
    if (isJobTrackerAPIError(error)) {
        return error.message;
    }
    return isTimeoutError(error) ? timeoutFallback : fallback;
};
