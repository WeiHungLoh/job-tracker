import { JobTrackerAPIError } from '../../api/models';
import { makeAuthenticatedJobTrackerAPIRequest, makeJobTrackerAPIRequest } from '../../api/api';
import { endpointConfig } from '../../api/endpointConfig';

globalThis.fetch = vi.fn();

const response = (data: unknown = undefined, ok = true, status = 200, contentType?: string) => ({
    headers: new Headers(
        data === undefined
            ? undefined
            : { 'content-type': contentType ?? (typeof data === 'object' ? 'application/json' : 'text/plain') }
    ),
    json: async () => data,
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    text: async () => String(data),
    url: 'https://example.com/result',
});

describe('makeJobTrackerAPIRequest', () => {
    beforeEach(() => {
        fetch.mockReset();
        fetch.mockResolvedValue(response());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('opts read and absolute-update endpoints into retries without retrying state transitions', () => {
        expect(endpointConfig.application.listApplications.retry).toBe(true);
        expect(endpointConfig.application.updateNotes.retry).toBe(true);
        expect(endpointConfig.application.updateStatus.retry).toBe(true);
        expect(endpointConfig.userPreferences.update.retry).toBe(true);

        expect(endpointConfig.application.createApplication).not.toHaveProperty('retry');
        expect(endpointConfig.application.deleteApplication).not.toHaveProperty('retry');
        expect(endpointConfig.archivedApplication.archiveApplication).not.toHaveProperty('retry');
        expect(endpointConfig.archivedApplication.unarchiveApplication).not.toHaveProperty('retry');
        expect(endpointConfig.authentication.refresh).not.toHaveProperty('retry');
    });

    test('keeps note updates alive while the page is leaving', () => {
        expect(endpointConfig.application.updateNotes.keepalive).toBe(true);
        expect(endpointConfig.interview.updateNotes.keepalive).toBe(true);
    });

    test('declares active, archived, singular save, and delete offer comparison endpoints', () => {
        expect(endpointConfig.offerDecision).toEqual({
            getActive: {
                url: '/offer-decisions',
                verb: 'GET',
                fieldMap: { filters: 'query' },
                retry: true,
            },
            getArchived: {
                url: '/offer-decisions/archived',
                verb: 'GET',
                fieldMap: { filters: 'query' },
                retry: true,
            },
            deleteAllActiveEvaluations: { url: '/offer-decisions', verb: 'DELETE' },
            deleteAllArchivedEvaluations: { url: '/offer-decisions/archived', verb: 'DELETE' },
            saveEvaluation: {
                url: '/offer-decisions/:jobId',
                verb: 'PUT',
                fieldMap: { jobId: 'path' },
                retry: true,
            },
            deleteEvaluation: {
                url: '/offer-decisions/:jobId',
                verb: 'DELETE',
                fieldMap: { jobId: 'path' },
            },
            getCounterofferPlan: {
                url: '/offer-decisions/:jobId/counteroffer-plan',
                verb: 'GET',
                fieldMap: { jobId: 'path' },
                retry: true,
            },
            saveCounterofferPlan: {
                url: '/offer-decisions/:jobId/counteroffer-plan',
                verb: 'PUT',
                fieldMap: { jobId: 'path' },
                retry: true,
            },
            deleteCounterofferPlan: {
                url: '/offer-decisions/:jobId/counteroffer-plan',
                verb: 'DELETE',
                fieldMap: { jobId: 'path' },
            },
        });
    });

    test('declares active and archived interview list filters as query fields', () => {
        expect(endpointConfig.interview.listInterviews).toEqual({
            url: '/job-interviews',
            verb: 'GET',
            fieldMap: { timeFilters: 'query' },
            retry: true,
        });
        expect(endpointConfig.archivedInterview.listInterviews).toEqual({
            url: '/archived-job-interviews',
            verb: 'GET',
            fieldMap: { timeFilters: 'query' },
            retry: true,
        });
    });

    test('declares the dashboard week time zone as a query field', () => {
        expect(endpointConfig.application.listWeeklyApplications).toEqual({
            url: '/job-applications/weekly-counts',
            verb: 'GET',
            fieldMap: { timeZone: 'query' },
            retry: true,
        });
    });

    test('declares mark and undo endpoints for both follow-up resources', () => {
        expect(endpointConfig.application.markFollowUpSent).toEqual({
            url: '/job-applications/:jobId/follow-up',
            verb: 'PUT',
            fieldMap: { jobId: 'path' },
            retry: true,
        });
        expect(endpointConfig.application.undoFollowUp).toEqual({
            url: '/job-applications/:jobId/follow-up',
            verb: 'DELETE',
            fieldMap: { jobId: 'path' },
        });
        expect(endpointConfig.interview.markFollowUpSent).toEqual({
            url: '/job-interviews/:interviewId/follow-up',
            verb: 'PUT',
            fieldMap: { interviewId: 'path' },
            retry: true,
        });
        expect(endpointConfig.interview.undoFollowUp).toEqual({
            url: '/job-interviews/:interviewId/follow-up',
            verb: 'DELETE',
            fieldMap: { interviewId: 'path' },
        });
    });

    test('maps path and query fields while serializing remaining fields as JSON', async () => {
        await makeJobTrackerAPIRequest(
            {
                applicationId: 'id with spaces',
                includeArchived: true,
                notes: 'Updated',
            },
            {
                url: '/applications/:applicationId',
                verb: 'PATCH',
                fieldMap: {
                    applicationId: 'path',
                    includeArchived: 'query',
                },
            }
        );

        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/applications/id%20with%20spaces?includeArchived=true`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Updated' }),
                signal: expect.any(AbortSignal),
            }
        );
    });

    test('adds each array item as a repeated query parameter', async () => {
        await makeJobTrackerAPIRequest(
            { jobStatuses: ['Accepted', 'Offer'] },
            {
                url: '/job-applications',
                verb: 'GET',
                fieldMap: { jobStatuses: 'query' },
            }
        );

        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/job-applications?jobStatuses=Accepted&jobStatuses=Offer`,
            { method: 'GET', signal: expect.any(AbortSignal) }
        );
    });

    test('composes a caller abort signal with the request deadline', async () => {
        const controller = new AbortController();
        let requestSignal: AbortSignal | undefined;
        fetch.mockImplementationOnce((_url: string, init?: RequestInit) => {
            requestSignal = init?.signal ?? undefined;
            return new Promise<Response>((_resolve, reject) => {
                requestSignal?.addEventListener('abort', () => reject(requestSignal?.reason), { once: true });
            });
        });

        const request = makeJobTrackerAPIRequest(
            null,
            { url: '/job-applications', verb: 'GET' },
            { signal: controller.signal }
        );
        const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });

        expect(requestSignal).toBeInstanceOf(AbortSignal);
        expect(requestSignal).not.toBe(controller.signal);

        controller.abort();

        await rejection;
        expect(requestSignal?.aborted).toBe(true);
    });

    test('aborts a stalled request after the 30-second request deadline', async () => {
        vi.useFakeTimers();
        let requestSignal: AbortSignal | undefined;
        fetch.mockImplementationOnce((_url: string, init?: RequestInit) => {
            requestSignal = init?.signal ?? undefined;
            if (!requestSignal) {
                return new Promise<Response>(() => undefined);
            }

            return new Promise<Response>((_resolve, reject) => {
                requestSignal?.addEventListener(
                    'abort',
                    () => reject(new DOMException('The operation was aborted.', 'AbortError')),
                    { once: true }
                );
            });
        });

        const request = makeJobTrackerAPIRequest<null, never>(null, {
            url: '/job-applications',
            verb: 'GET',
        });
        expect(requestSignal).toBeInstanceOf(AbortSignal);

        const rejection = request.catch((error: unknown) => error);

        await vi.advanceTimersByTimeAsync(29_999);
        expect(requestSignal?.aborted).toBe(false);

        await vi.advanceTimersByTimeAsync(1);

        await expect(rejection).resolves.toMatchObject({
            message: 'The request timed out. Please try again.',
            name: 'TimeoutError',
        });
        expect(requestSignal?.aborted).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
    });

    test('preserves the timeout reason when a browser reports an aborted fetch as a network error', async () => {
        vi.useFakeTimers();
        fetch.mockImplementationOnce((_url: string, init?: RequestInit) => {
            return new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new TypeError('Load failed')), { once: true });
            });
        });

        const request = makeJobTrackerAPIRequest<null, never>(null, {
            url: '/job-applications',
            verb: 'GET',
            retry: true,
        });
        const rejection = request.catch((error: unknown) => error);

        await vi.advanceTimersByTimeAsync(30_000);

        await expect(rejection).resolves.toMatchObject({
            message: 'The request timed out. Please try again.',
            name: 'TimeoutError',
        });
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    test('adds keepalive only when the endpoint opts in', async () => {
        await makeJobTrackerAPIRequest(
            { jobId: 7, notes: 'Latest notes' },
            {
                url: '/job-applications/:jobId/notes',
                verb: 'PATCH',
                fieldMap: { jobId: 'path' },
                keepalive: true,
            }
        );

        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/7/notes`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: 'Latest notes' }),
            keepalive: true,
            signal: expect.any(AbortSignal),
        });
    });

    test('preserves an empty query selection', async () => {
        await makeJobTrackerAPIRequest(
            { jobStatuses: [] },
            {
                url: '/job-applications',
                verb: 'GET',
                fieldMap: { jobStatuses: 'query' },
            }
        );

        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications?jobStatuses=`, {
            method: 'GET',
            signal: expect.any(AbortSignal),
        });
    });

    test('creates FormData without adding a JSON content-type header', async () => {
        await makeJobTrackerAPIRequest(
            { fileName: 'resume.pdf' },
            {
                url: '/uploads',
                verb: 'POST',
                fieldMap: { fileName: 'formData' },
            }
        );

        const [, init] = fetch.mock.calls[0];
        expect(init).toMatchObject({ method: 'POST' });
        expect(init.headers).toBeUndefined();
        expect(init.body).toBeInstanceOf(FormData);
        expect((init.body as FormData).get('fileName')).toBe('resume.pdf');
    });

    test('returns parsed response data directly', async () => {
        fetch.mockResolvedValueOnce(response({ applications: 2 }));

        const result = await makeJobTrackerAPIRequest<null, { applications: number }>(null, {
            url: '/applications',
            verb: 'GET',
        });

        expect(result).toEqual({ applications: 2 });
    });

    test('retries an opted-in request up to three times after transient network failures', async () => {
        vi.useFakeTimers();
        fetch
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce(response({ applications: 2 }));

        const request = makeJobTrackerAPIRequest<null, { applications: number }>(null, {
            url: '/applications',
            verb: 'GET',
            retry: true,
        });

        await vi.advanceTimersByTimeAsync(2_999);
        expect(fetch).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1);
        expect(fetch).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(6_000);

        await expect(request).resolves.toEqual({ applications: 2 });
        expect(fetch).toHaveBeenCalledTimes(4);
    });

    test('cancels an opted-in request during its retry delay', async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        const request = makeJobTrackerAPIRequest<null, never>(
            null,
            { url: '/applications', verb: 'GET', retry: true },
            { signal: controller.signal }
        );
        const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
        await vi.advanceTimersByTimeAsync(0);

        controller.abort();
        await vi.runAllTimersAsync();

        await rejection;
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('retries opted-in requests after 408 and server-error responses', async () => {
        vi.useFakeTimers();
        fetch
            .mockResolvedValueOnce(response({ message: 'Request timed out.' }, false, 408))
            .mockResolvedValueOnce(response({ message: 'Service unavailable.' }, false, 503))
            .mockResolvedValueOnce(response({ applications: 2 }));

        const request = makeJobTrackerAPIRequest<null, { applications: number }>(null, {
            url: '/applications',
            verb: 'GET',
            retry: true,
        });

        await vi.advanceTimersByTimeAsync(6_000);

        await expect(request).resolves.toEqual({ applications: 2 });
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('retries an actual server-error response even when its JSON body is malformed', async () => {
        vi.useFakeTimers();
        fetch
            .mockResolvedValueOnce({
                ...response(undefined, false, 503),
                headers: new Headers({ 'content-type': 'application/json' }),
                json: async () => {
                    throw new SyntaxError('Unexpected token');
                },
            })
            .mockResolvedValueOnce(response({ applications: 2 }));

        const request = makeJobTrackerAPIRequest<null, { applications: number }>(null, {
            url: '/applications',
            verb: 'GET',
            retry: true,
        });
        const result = expect(request).resolves.toEqual({ applications: 2 });

        await vi.advanceTimersByTimeAsync(3_000);

        await result;
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('does not retry a TypeError thrown before the network request', async () => {
        vi.useFakeTimers();

        const request = makeJobTrackerAPIRequest(
            { value: 1n },
            {
                url: '/applications',
                verb: 'PATCH',
                retry: true,
            }
        );
        const rejection = expect(request).rejects.toBeInstanceOf(TypeError);

        await vi.advanceTimersByTimeAsync(0);
        const pendingTimerCount = vi.getTimerCount();
        await vi.runAllTimersAsync();

        await rejection;
        expect(pendingTimerCount).toBe(0);
        expect(fetch).not.toHaveBeenCalled();
    });

    test.each([400, 401, 409, 422, 429, 600])(
        'does not retry an opted-in request after a %i response',
        async (status) => {
            fetch.mockResolvedValueOnce(response({ message: 'Request rejected.' }, false, status));

            await expect(
                makeJobTrackerAPIRequest<null, never>(null, {
                    url: '/applications',
                    verb: 'GET',
                    retry: true,
                })
            ).rejects.toEqual(expect.objectContaining<JobTrackerAPIError>({ status }));
            expect(fetch).toHaveBeenCalledTimes(1);
        }
    );

    test('does not retry a transient failure unless the endpoint opts in', async () => {
        fetch.mockResolvedValueOnce(response({ message: 'Service unavailable.' }, false, 503));

        await expect(
            makeJobTrackerAPIRequest<null, never>(null, {
                url: '/applications',
                verb: 'GET',
            })
        ).rejects.toEqual(expect.objectContaining<JobTrackerAPIError>({ status: 503 }));
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('stops after three retries when a transient failure continues', async () => {
        vi.useFakeTimers();
        fetch.mockResolvedValue(response({ message: 'Service unavailable.' }, false, 503));

        const request = makeJobTrackerAPIRequest<null, never>(null, {
            url: '/applications',
            verb: 'GET',
            retry: true,
        });
        const rejection = expect(request).rejects.toEqual(expect.objectContaining<JobTrackerAPIError>({ status: 503 }));

        await vi.advanceTimersByTimeAsync(9_000);

        await rejection;
        expect(fetch).toHaveBeenCalledTimes(4);
    });

    test('retains the parsed structured body on a non-success response', async () => {
        const errorBody = {
            code: 'POSSIBLE_DUPLICATE_APPLICATION',
            message: 'Possible duplicate application found.',
            duplicate: {
                company_name: 'Morgan Stanley',
                job_title: 'Software Engineer',
                application_date: '2026-03-03T10:30:00.000Z',
            },
        };
        fetch.mockResolvedValueOnce(response(errorBody, false, 409));

        await expect(
            makeJobTrackerAPIRequest<null, typeof errorBody>(null, {
                url: '/applications',
                verb: 'GET',
            })
        ).rejects.toEqual(
            expect.objectContaining<JobTrackerAPIError>({
                data: errorBody,
                message: 'Possible duplicate application found.',
                status: 409,
            })
        );
    });

    test('preserves a plain-text backend error message', async () => {
        fetch.mockResolvedValueOnce(response('Invalid request', false, 400));

        await expect(
            makeJobTrackerAPIRequest<null, string>(null, {
                url: '/applications',
                verb: 'GET',
            })
        ).rejects.toEqual(
            expect.objectContaining<JobTrackerAPIError>({
                data: 'Invalid request',
                message: 'Invalid request',
                status: 400,
            })
        );
    });

    test('preserves JSON detail error-message selection', async () => {
        const errorBody = { detail: 'Application details are invalid.', field: 'companyName' };
        fetch.mockResolvedValueOnce(response(errorBody, false, 400));

        await expect(
            makeJobTrackerAPIRequest<null, typeof errorBody>(null, {
                url: '/applications',
                verb: 'GET',
            })
        ).rejects.toEqual(
            expect.objectContaining<JobTrackerAPIError>({
                data: errorBody,
                message: 'Application details are invalid.',
                status: 400,
            })
        );
    });

    test('uses the response fallback instead of serializing an unrecognized error body', async () => {
        const errorBody = { code: 'INVALID_UPSTREAM_RESPONSE', internal: { requestId: 'private-id' } };
        fetch.mockResolvedValueOnce(response(errorBody, false, 400));

        await expect(
            makeJobTrackerAPIRequest<null, typeof errorBody>(null, {
                url: '/applications',
                verb: 'GET',
            })
        ).rejects.toEqual(
            expect.objectContaining<JobTrackerAPIError>({
                data: errorBody,
                message: 'Bad Request',
                status: 400,
            })
        );
    });

    test('refreshes authentication and retries an authenticated request after a 401 response', async () => {
        fetch
            .mockResolvedValueOnce(response({ message: 'Access token expired.' }, false, 401))
            .mockResolvedValueOnce(response({ message: 'Access token refreshed.' }))
            .mockResolvedValueOnce(response({ applications: 2 }));

        const result = await makeAuthenticatedJobTrackerAPIRequest<null, { applications: number }>(null, {
            url: '/job-applications',
            verb: 'GET',
            retry: true,
        });

        expect(result).toEqual({ applications: 2 });
        expect(fetch.mock.calls).toEqual([
            [`${import.meta.env.VITE_API_URL}/job-applications`, { method: 'GET', signal: expect.any(AbortSignal) }],
            [
                `${import.meta.env.VITE_API_URL}/authentication/sessions/refresh`,
                { method: 'POST', signal: expect.any(AbortSignal) },
            ],
            [`${import.meta.env.VITE_API_URL}/job-applications`, { method: 'GET', signal: expect.any(AbortSignal) }],
        ]);
    });

    test('does not retry when the refresh endpoint returns 401', async () => {
        fetch
            .mockResolvedValueOnce(response({ message: 'Access token expired.' }, false, 401))
            .mockResolvedValueOnce(response({ message: 'Refresh token expired.' }, false, 401));

        await expect(
            makeAuthenticatedJobTrackerAPIRequest<null, never>(null, {
                url: '/job-applications',
                verb: 'GET',
            })
        ).rejects.toEqual(
            expect.objectContaining<JobTrackerAPIError>({
                message: 'Refresh token expired.',
                status: 401,
            })
        );
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('lets a caller handle an unauthenticated request without forcing a page redirect', async () => {
        const onUnauthenticated = vi.fn();
        fetch
            .mockResolvedValueOnce(response({ message: 'Access token expired.' }, false, 401))
            .mockResolvedValueOnce(response({ message: 'Refresh token expired.' }, false, 401));

        await expect(
            makeAuthenticatedJobTrackerAPIRequest<null, never>(
                null,
                {
                    url: '/authentication/sessions/current',
                    verb: 'GET',
                },
                { onUnauthenticated }
            )
        ).rejects.toEqual(
            expect.objectContaining<JobTrackerAPIError>({
                message: 'Refresh token expired.',
                status: 401,
            })
        );

        expect(onUnauthenticated).toHaveBeenCalledOnce();
    });

    test('shares one refresh request between concurrent authenticated requests', async () => {
        let protectedRequestCount = 0;
        let refreshRequestCount = 0;

        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/authentication/sessions/refresh')) {
                refreshRequestCount += 1;
                await new Promise((resolve) => setTimeout(resolve, 0));
                return response({ message: 'Access token refreshed.' });
            }

            protectedRequestCount += 1;
            if (protectedRequestCount <= 2) {
                return response({ message: 'Access token expired.' }, false, 401);
            }

            return response({ applications: 2 });
        });

        const requests = [
            makeAuthenticatedJobTrackerAPIRequest<null, { applications: number }>(null, {
                url: '/job-applications',
                verb: 'GET',
            }),
            makeAuthenticatedJobTrackerAPIRequest<null, { applications: number }>(null, {
                url: '/job-applications',
                verb: 'GET',
            }),
        ];

        await expect(Promise.all(requests)).resolves.toEqual([{ applications: 2 }, { applications: 2 }]);
        expect(refreshRequestCount).toBe(1);
        expect(protectedRequestCount).toBe(4);
    });

    test('returns null for a successful no-content response', async () => {
        fetch.mockResolvedValueOnce(response(undefined, true, 204));

        const result = await makeJobTrackerAPIRequest<null, null>(null, {
            url: '/authentication/sessions/current',
            verb: 'DELETE',
        });

        expect(result).toBeNull();
    });

    test('rejects an HTML fallback page returned as a successful API response', async () => {
        fetch.mockResolvedValueOnce(response('<!doctype html><html></html>', true, 200, 'text/html'));

        await expect(
            makeJobTrackerAPIRequest<null, unknown>(null, {
                url: '/applications',
                verb: 'GET',
                retry: true,
            })
        ).rejects.toEqual(
            expect.objectContaining<JobTrackerAPIError>({
                message: 'The API returned an unexpected HTML page.',
                status: 502,
            })
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
