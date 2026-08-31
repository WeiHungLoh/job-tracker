import { useCallback, useMemo, useRef } from 'react';

type FilterRequest = {
    requestId: number;
    mutationRevision: number;
};

type SavedFilterResult<Result> = {
    requestId: number;
    mutationRevision: number;
    result: Result;
};

const useFilterRequest = <Result>() => {
    const latestRequestId = useRef(0);
    const failedRequestId = useRef<number | null>(null);
    const mutationRevision = useRef(0);
    const latestSavedResult = useRef<SavedFilterResult<Result> | null>(null);

    const startRequest = useCallback((): FilterRequest => {
        latestRequestId.current += 1;
        failedRequestId.current = null;
        return {
            requestId: latestRequestId.current,
            mutationRevision: mutationRevision.current,
        };
    }, []);

    const isLatestRequest = useCallback((request: FilterRequest): boolean => {
        return request.requestId === latestRequestId.current;
    }, []);

    const isRequestEligible = useCallback(
        (request: FilterRequest): boolean => {
            const latestRequestFailed = failedRequestId.current === latestRequestId.current;
            return isLatestRequest(request) || latestRequestFailed;
        },
        [isLatestRequest]
    );

    const shouldRefresh = useCallback(
        (request: FilterRequest): boolean => {
            return request.mutationRevision !== mutationRevision.current && isRequestEligible(request);
        },
        [isRequestEligible]
    );

    const saveResult = useCallback(
        (request: FilterRequest, result: Result): Result | undefined => {
            if (request.mutationRevision !== mutationRevision.current) {
                return undefined;
            }

            if (!latestSavedResult.current || request.requestId > latestSavedResult.current.requestId) {
                latestSavedResult.current = {
                    requestId: request.requestId,
                    mutationRevision: request.mutationRevision,
                    result,
                };
            }

            // An older preference save can finish after the newest filter request fails.
            if (!isRequestEligible(request)) {
                return undefined;
            }

            return latestSavedResult.current.result;
        },
        [isRequestEligible]
    );

    const failRequest = useCallback(
        (request: FilterRequest): Result | undefined => {
            if (!isLatestRequest(request)) {
                return undefined;
            }

            failedRequestId.current = request.requestId;

            if (latestSavedResult.current?.mutationRevision !== mutationRevision.current) {
                return undefined;
            }

            return latestSavedResult.current.result;
        },
        [isLatestRequest]
    );

    const markMutationCommitted = useCallback((): void => {
        mutationRevision.current += 1;
        latestSavedResult.current = null;
    }, []);

    return useMemo(
        () => ({
            failRequest,
            isLatestRequest,
            markMutationCommitted,
            saveResult,
            shouldRefresh,
            startRequest,
        }),
        [failRequest, isLatestRequest, markMutationCommitted, saveResult, shouldRefresh, startRequest]
    );
};

export default useFilterRequest;
