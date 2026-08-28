import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { act, screen, waitFor, within } from '@testing-library/react';
import { appRoutes } from '../App';
import { render } from './renderWithProviders';
import userEvent from '@testing-library/user-event';
import { JOB_STATUSES } from '../pages/application/models';
import { AUTH_FOCUSED_MODE_STORAGE_KEY } from '../components/authProductIntro/AuthProductIntro';
import { routes } from '../routes';
import { DEVICE_TIMEZONE_STORAGE_KEY } from '../components/deviceTimezoneNotice/DeviceTimezoneNotice';

globalThis.fetch = vi.fn();

class RouterRequest {
    headers: Headers;
    method: string;
    signal: AbortSignal | undefined;
    url: string;

    constructor(input: string, init: RequestInit = {}) {
        this.headers = new Headers(init.headers);
        this.method = init.method ?? 'GET';
        this.signal = init.signal ?? undefined;
        this.url = input;
    }
}

vi.stubGlobal('Request', RouterRequest);

const response = (ok = true, status = 200, data?: string, contentType?: string) => ({
    headers: new Headers(contentType ? { 'content-type': contentType } : undefined),
    ok,
    status,
    statusText: '',
    text: async () => data ?? '',
    url: '',
});

const jsonResponse = (data: unknown, status = 200) => ({
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: async () => JSON.stringify(data),
    url: '',
});

const mockPreferences = {
    application_job_statuses: [...JOB_STATUSES],
    application_show_notes: false,
    application_show_archive: false,
    application_enable_scroll: false,
    application_view_mode: 'list',
    application_list_sort_order: 'job_status',
    application_board_sort_order: 'application_date_desc',
    archived_application_job_statuses: [...JOB_STATUSES],
    archived_application_show_notes: false,
    archived_application_view_mode: 'list',
    archived_application_list_sort_order: 'job_status',
    archived_application_board_sort_order: 'application_date_desc',
    interview_view_mode: 'list',
    interview_show_notes: false,
    archived_interview_view_mode: 'list',
    archived_interview_show_notes: false,
    interview_time_filters: ['Upcoming Interviews', 'Past Interviews'],
    archived_interview_time_filters: ['Upcoming Interviews', 'Past Interviews'],
    offer_decision_filters: [
        'Offers to Evaluate',
        'Evaluated Offers',
        'Expired Evaluated Offers',
        'Previous Evaluations',
    ],
    archived_offer_decision_filters: ['Evaluated Offers', 'Expired Evaluated Offers', 'Previous Evaluations'],
};

const renderRoute = (path: string) => {
    const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
    render(<RouterProvider router={router} />);
};

describe('App routing and authentication behavior', () => {
    beforeEach(() => {
        fetch.mockReset();
        localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
        localStorage.removeItem('theme');
        localStorage.removeItem(DEVICE_TIMEZONE_STORAGE_KEY);
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/user-preferences')) {
                return jsonResponse(mockPreferences);
            }
            return response();
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
        localStorage.removeItem('theme');
        localStorage.removeItem(DEVICE_TIMEZONE_STORAGE_KEY);
    });

    test('renders SignIn at the root path', async () => {
        fetch.mockResolvedValueOnce(response(false, 401)); // access token is unavailable
        fetch.mockResolvedValueOnce(response(false, 401)); // refresh token is unavailable
        renderRoute('/');
        expect(await screen.findByText(/sign in to job tracker/i)).toBeInTheDocument();
    });

    test('redirects to SignIn when accessing protected route while unauthenticated', async () => {
        fetch.mockResolvedValueOnce(response(false, 401));
        fetch.mockResolvedValueOnce(response(false, 401));
        renderRoute('/application/add');

        await waitFor(() => expect(screen.getByText(/sign in to job tracker/i)).toBeInTheDocument());
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/sessions/current`, {
            method: 'GET',
        });
    });

    test('refreshes an expired access token before rendering a protected route', async () => {
        fetch.mockResolvedValueOnce(response(false, 401));
        fetch.mockResolvedValueOnce(jsonResponse({ message: 'Access token refreshed.' }));
        fetch.mockResolvedValueOnce(jsonResponse({ message: 'Authenticated user.' }));
        renderRoute('/application/add');

        await waitFor(() => expect(screen.getByText(/company name/i)).toBeInTheDocument());
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('heading', { level: 1, name: 'Job Tracker' })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/sessions/refresh`, {
            method: 'POST',
        });
    });

    test('scrubs Quick Capture data before authentication begins and retains it for the form', async () => {
        const replaceState = vi.spyOn(window.history, 'replaceState');
        let resolveAuthentication: (value: ReturnType<typeof jsonResponse>) => void = () => undefined;
        fetch.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveAuthentication = resolve;
                })
        );
        const captureParameters = new URLSearchParams({
            jobURL: 'https://example.com/jobs/private',
            pageTitle: 'Private captured title',
            companyName: 'Private Company',
            jobTitle: 'Private Role',
            jobLocation: 'Private Location',
        });

        renderRoute(`/application/add#${captureParameters.toString()}`);

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        expect(replaceState).toHaveBeenCalledWith(window.history.state, '', '/application/add');
        expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(fetch.mock.invocationCallOrder[0]);
        expect(window.location.href).not.toContain('Private%20Company');
        expect(window.location.href).not.toContain('Private%20Role');
        expect(window.location.href).not.toContain('Private%20Location');

        await act(async () => resolveAuthentication(jsonResponse({ message: 'Authenticated user.' })));

        expect(await screen.findByLabelText(/job posting url/i)).toHaveValue('https://example.com/jobs/private');
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        expect(
            fetch.mock.calls.filter(
                ([url, init]) =>
                    url === `${import.meta.env.VITE_API_URL}/authentication/sessions/current` && init?.method === 'GET'
            )
        ).toHaveLength(1);
        expect(
            fetch.mock.calls.filter(
                ([url, init]) => url === `${import.meta.env.VITE_API_URL}/user-preferences` && init?.method === 'GET'
            )
        ).toHaveLength(1);
        replaceState.mockRestore();
    });

    test('scrubs legacy Quick Capture query data before authentication and preserves unrelated parameters', async () => {
        const replaceState = vi.spyOn(window.history, 'replaceState');
        let resolveAuthentication: (value: ReturnType<typeof jsonResponse>) => void = () => undefined;
        fetch.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveAuthentication = resolve;
                })
        );
        const query = new URLSearchParams({
            jobURL: 'https://example.com/jobs/legacy',
            pageTitle: 'Legacy bookmark',
            source: 'bookmark',
        });

        renderRoute(`/application/add?${query.toString()}`);

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        expect(replaceState).toHaveBeenCalledWith(window.history.state, '', '/application/add?source=bookmark');
        expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(fetch.mock.invocationCallOrder[0]);

        await act(async () => resolveAuthentication(jsonResponse({ message: 'Authenticated user.' })));

        expect(await screen.findByLabelText(/job posting url/i)).toHaveValue('https://example.com/jobs/legacy');
        expect(screen.getByText('Legacy bookmark')).toBeVisible();
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        expect(
            fetch.mock.calls.filter(
                ([url, init]) =>
                    url === `${import.meta.env.VITE_API_URL}/authentication/sessions/current` && init?.method === 'GET'
            )
        ).toHaveLength(1);
        expect(
            fetch.mock.calls.filter(
                ([url, init]) => url === `${import.meta.env.VITE_API_URL}/user-preferences` && init?.method === 'GET'
            )
        ).toHaveLength(1);
        replaceState.mockRestore();
    });

    test('redirects to SignIn when authentication receives the Vite HTML fallback', async () => {
        fetch.mockResolvedValueOnce(response(true, 200, '<!doctype html><html></html>', 'text/html'));
        renderRoute('/application/view');

        await waitFor(() => expect(screen.getByText(/sign in to job tracker/i)).toBeInTheDocument());
        expect(screen.queryByText(/unexpected application error/i)).not.toBeInTheDocument();
    });

    test('shows a retry state when authentication is temporarily unavailable', async () => {
        fetch.mockResolvedValue({
            ...response(false, 503),
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Authentication is temporarily unavailable.' }),
        });
        vi.useFakeTimers();
        renderRoute('/application/view');
        await act(async () => vi.advanceTimersByTimeAsync(9_000));
        vi.useRealTimers();

        await waitFor(() =>
            expect(screen.getByRole('heading', { name: /We couldn’t confirm your session/i })).toBeInTheDocument()
        );
        expect(screen.getByText(/Try again to continue to Job Tracker./i)).toBeInTheDocument();
        expect(screen.queryByText(/sign in to job tracker/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(screen.getByText('Authentication is temporarily unavailable')).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledTimes(4);
    });

    test('renders only the fallback screen while authentication is pending', () => {
        fetch.mockReturnValueOnce(new Promise(() => undefined));
        renderRoute('/application/view');

        expect(screen.getByRole('heading', { name: /checking your session/i })).toBeInTheDocument();
        expect(screen.getByText(/This should only take a moment./i)).toBeInTheDocument();
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(screen.queryByText(/job application viewer/i)).not.toBeInTheDocument();
    });

    test('renders AddApplication page when user is authenticated', async () => {
        renderRoute('/application/add');

        await waitFor(() => expect(screen.getByText(/company name/i)).toBeInTheDocument());
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/sessions/current`, {
            method: 'GET',
        });
    });

    test('shows the timezone notice only after the authenticated layout renders', async () => {
        renderRoute('/application/add');

        await screen.findByText(/company name/i);
        expect(await screen.findByRole('status')).toHaveTextContent(/Timezone:/);
        expect(screen.queryByRole('region', { name: 'Device time and timezone' })).not.toBeInTheDocument();
    });

    test.each(['/application/view', '/application/archive', '/interview/archive'])(
        'renders navigation bar on authenticated route %s',
        async (route) => {
            renderRoute(route);
            await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
        }
    );

    test('persists a visible Sort by choice through the production preference provider and reorders cards', async () => {
        let preferences = { ...mockPreferences };
        const applications = [
            {
                application_date: '2025-06-20T00:00:00Z',
                company_name: 'Alpha Applied',
                job_id: 1,
                job_location: '',
                job_posting_url: '',
                job_status: 'Applied',
                job_title: 'Engineer',
                notes: '',
            },
            {
                application_date: '2025-06-19T00:00:00Z',
                company_name: 'Zulu Offer',
                job_id: 2,
                job_location: '',
                job_posting_url: '',
                job_status: 'Offer',
                job_title: 'Engineer',
                notes: '',
            },
        ];
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                if (init?.method === 'PATCH' && init.body) {
                    preferences = { ...preferences, ...JSON.parse(String(init.body)) };
                }
                return jsonResponse(preferences);
            }
            if (url.endsWith('/job-applications/summary')) {
                return jsonResponse({ application_count: 2, related_interview_count: 0 });
            }
            if (url.endsWith('/job-interviews')) {
                return jsonResponse([]);
            }
            if (url.includes('/job-applications?')) {
                return jsonResponse(applications);
            }
            return response();
        });

        renderRoute(routes.viewApplications);

        expect(await screen.findByRole('heading', { level: 2, name: '1. Zulu Offer' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        await userEvent.click(screen.getByText('Company A–Z'));

        expect(await screen.findByRole('heading', { level: 2, name: '1. Alpha Applied' })).toBeInTheDocument();
        const sortPreferenceRequest = fetch.mock.calls.find(
            ([url, init]) => String(url).endsWith('/user-preferences') && init?.method === 'PATCH'
        );
        expect(sortPreferenceRequest?.[1]).toMatchObject({
            body: JSON.stringify({ application_list_sort_order: 'company_name_asc' }),
        });
    });

    test('serializes preference updates so an older retry cannot overwrite a newer choice', async () => {
        let preferences = { ...mockPreferences };
        let preferenceUpdateCount = 0;
        let resolveFirstPreferenceUpdate: (value: ReturnType<typeof jsonResponse>) => void = () => undefined;
        const applications = [
            {
                application_date: '2025-06-20T00:00:00Z',
                company_name: 'ABC Pte Ltd',
                job_id: 1,
                job_location: '',
                job_posting_url: '',
                job_status: 'Applied',
                job_title: 'Engineer',
                notes: '',
            },
        ];
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                if (init?.method !== 'PATCH' || !init.body) {
                    return jsonResponse(preferences);
                }

                preferenceUpdateCount += 1;
                const updatedPreferences = JSON.parse(String(init.body));
                if (preferenceUpdateCount === 1) {
                    return new Promise((resolve) => {
                        resolveFirstPreferenceUpdate = resolve;
                    });
                }

                preferences = { ...preferences, ...updatedPreferences };
                return jsonResponse(preferences);
            }
            if (url.endsWith('/job-interviews')) {
                return jsonResponse([]);
            }
            if (url.includes('/job-applications?')) {
                return jsonResponse(applications);
            }
            return response();
        });

        renderRoute(routes.viewApplications);

        expect(await screen.findByRole('heading', { level: 2, name: '1. ABC Pte Ltd' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        await userEvent.click(screen.getByRole('switch', { name: 'Show notes' }));
        await userEvent.click(screen.getByRole('switch', { name: 'Show archive' }));

        expect(preferenceUpdateCount).toBe(1);

        preferences = { ...preferences, application_show_notes: true };
        await act(async () => resolveFirstPreferenceUpdate(jsonResponse(preferences)));

        await waitFor(() => expect(preferenceUpdateCount).toBe(2));
        expect(screen.getByRole('switch', { name: 'Show notes' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('switch', { name: 'Show archive' })).toHaveAttribute('aria-checked', 'true');
    });

    test('navigates between active and archived applications from the navbar toggle', async () => {
        renderRoute(routes.addApplication);

        await screen.findByLabelText(/company name/i);
        expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'New Application' })).toHaveAttribute('aria-current', 'page');

        await userEvent.click(screen.getByRole('button', { name: 'Show archived' }));
        expect(await screen.findByRole('link', { name: 'Archived Applications' })).toHaveAttribute(
            'aria-current',
            'page'
        );
        expect(screen.queryByRole('link', { name: 'New Application' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Show active' }));
        expect(await screen.findByRole('link', { name: 'Applications' })).toHaveAttribute('aria-current', 'page');
    });

    test('renders active Offer Comparison from the permanent active navbar entry', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/user-preferences')) {
                return jsonResponse(mockPreferences);
            }
            if (url.includes('/offer-decisions?')) {
                return jsonResponse({
                    applications: [],
                });
            }
            return response();
        });

        renderRoute('/offer-decisions');

        expect(await screen.findByRole('heading', { name: 'No offers to compare' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Offer Comparison' })).toHaveAttribute('aria-current', 'page');
        expect(fetch.mock.calls.filter(([url]) => String(url).includes('/offer-decisions?'))).toHaveLength(1);
    });

    test('keeps archived Offer Comparisons review-only and pairs the archive toggle', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/user-preferences')) {
                return jsonResponse(mockPreferences);
            }
            if (url.includes('/offer-decisions')) {
                return jsonResponse({
                    applications: [],
                });
            }
            return response();
        });

        renderRoute('/offer-decisions/archive');

        expect(await screen.findByRole('heading', { name: 'No archived offer comparisons' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Archived Offer Comparison' })).toHaveAttribute('aria-current', 'page');
        expect(screen.queryByRole('button', { name: /save evaluation/i })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Show active' }));
        expect(await screen.findByRole('link', { name: 'Offer Comparison' })).toHaveAttribute('aria-current', 'page');
    });

    test('labels the production theme action with the theme it will switch to', async () => {
        renderRoute(routes.addApplication);

        await screen.findByLabelText(/company name/i);
        const switchToDark = screen.getByRole('button', { name: 'Switch to dark mode' });
        await userEvent.click(switchToDark);

        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
        expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    test('hides navigation bar on public routes like "/sign-up"', async () => {
        fetch.mockResolvedValueOnce(response(false, 401));
        renderRoute('/sign-up');

        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Device time and timezone' })).not.toBeInTheDocument();
        expect(screen.queryByText(/^Timezone:/)).not.toBeInTheDocument();
    });

    test('preserves focused mode when navigating from SignIn to SignUp', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/authentication/sessions/current') || url.endsWith('/authentication/sessions/refresh')) {
                return response(false, 401);
            }
            return response();
        });
        renderRoute('/');

        await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
        await userEvent.click(screen.getByRole('link', { name: /create one/i }));

        expect(await screen.findByRole('heading', { name: /create your account/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back to product/i })).toBeInTheDocument();
        expect(document.querySelector('#auth-account-panel')).not.toHaveAttribute('inert');
        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBe('true');
    });

    test('preserves focused mode when navigating from SignUp to SignIn', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/authentication/sessions/current') || url.endsWith('/authentication/sessions/refresh')) {
                return response(false, 401);
            }
            return response();
        });
        renderRoute('/sign-up');

        await userEvent.click(await screen.findByRole('button', { name: 'Create account' }));
        await userEvent.click(screen.getByRole('link', { name: /already have an account/i }));

        expect(await screen.findByRole('heading', { name: /sign in to job tracker/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back to product/i })).toBeInTheDocument();
        expect(document.querySelector('#auth-account-panel')).not.toHaveAttribute('inert');
        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBe('true');
    });

    test('renders the user guide without checking authentication', async () => {
        renderRoute('/user-guide');

        expect(await screen.findByRole('heading', { name: /job tracker user guide/i })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: /checking authentication/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Device time and timezone' })).not.toBeInTheDocument();
        expect(screen.queryByText(/^Timezone:/)).not.toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('redirects /demo to the demo application viewer without checking authentication', async () => {
        renderRoute(routes.demoRoot);

        expect(await screen.findByText(/HorizonAI Labs/i, {}, { timeout: 5000 })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('heading', { level: 1, name: 'Job Tracker Demo' })).toBeInTheDocument();
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /demo guide/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/^Timezone:/)).not.toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    test.each([
        [routes.demoAddApplication, /company name/i],
        [routes.demoViewApplications, /HorizonAI Labs/i],
        [routes.demoAddInterview, /HorizonAI Labs/i],
        [routes.demoViewInterviews, /Quantum Ledger/i],
        [routes.demoArchivedApplications, /Riverlane Studio/i],
        [routes.demoArchivedInterviews, /Riverlane Studio/i],
        [routes.demoOfferDecisions, /DevOps UI Engineer/i],
        [routes.demoArchivedOfferDecisions, /^Software Engineer$/i],
    ])('renders public demo route %s without authentication', async (route, expectedText) => {
        renderRoute(route);

        expect(await screen.findByText(expectedText, {}, { timeout: 5000 })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('heading', { level: 1, name: 'Job Tracker Demo' })).toBeInTheDocument();
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Device time and timezone' })).not.toBeInTheDocument();
        expect(screen.queryByText(/^Timezone:/)).not.toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('shows demo recovery actions instead of redirecting an unknown demo route', async () => {
        renderRoute(`${routes.demoRoot}${routes.userGuide}`);

        expect(await screen.findByRole('heading', { name: /This page isn’t on the route/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back to Demo' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('demo application state survives navigation between demo routes', async () => {
        renderRoute(routes.demoAddApplication);

        await screen.findByText(/company name/i);
        await userEvent.type(screen.getByLabelText(/company name/i), 'Demo Navigation Company');
        await userEvent.type(screen.getByLabelText(/job title/i), 'Demo Navigation Engineer');
        await userEvent.click(screen.getByRole('button', { name: /^add application$/i }));

        expect(await screen.findByText('Successfully added a job application')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /view applications/i }));
        expect(await screen.findByText(/Demo Navigation Company/i)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('link', { name: /^interviews$/i }));
        expect(await screen.findByText(/Quantum Ledger/i)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('link', { name: /^applications$/i }));
        expect(await screen.findByText(/Demo Navigation Company/i)).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('demo interview application links highlight the corresponding application', async () => {
        renderRoute(routes.demoViewInterviews);

        const [atlasCard] = await screen.findAllByRole('article', { name: 'Atlas RecruitTech interview' });

        await userEvent.click(
            within(atlasCard).getByRole('link', {
                name: /view application/i,
            })
        );

        expect(await screen.findByText(/Software Engineer, Platform/i)).toBeInTheDocument();
        await waitFor(() => expect(document.getElementById('108')?.className).toContain('highlighted'));
        expect(fetch).not.toHaveBeenCalled();
    });

    test('Exit Demo navigates to sign in without logout or authentication verification', async () => {
        renderRoute(routes.demoViewApplications);

        expect(await screen.findByText(/HorizonAI Labs/i)).toBeInTheDocument();
        fetch.mockClear();

        await userEvent.click(screen.getByRole('link', { name: /exit demo/i }));

        expect(await screen.findByText(/Sign in to job tracker/i)).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('gives the demo navbar the same accessible theme behavior', async () => {
        renderRoute(routes.demoViewApplications);

        expect(await screen.findByText(/HorizonAI Labs/i)).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: 'Demo navigation' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
        expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    });

    test('navigates between active and archived demo applications from the navbar toggle', async () => {
        renderRoute(routes.demoViewApplications);

        expect(await screen.findByText(/HorizonAI Labs/i)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Show archived' }));

        expect(await screen.findByRole('link', { name: 'Archived Applications' })).toHaveAttribute(
            'aria-current',
            'page'
        );

        await userEvent.click(screen.getByRole('button', { name: 'Show active' }));
        expect(await screen.findByRole('link', { name: 'Applications' })).toHaveAttribute('aria-current', 'page');
        expect(fetch).not.toHaveBeenCalled();
    });

    test('pairs active and archived Offer Comparisons in the demo navbar', async () => {
        renderRoute(routes.demoOfferDecisions);

        expect(await screen.findByRole('link', { name: 'Offer Comparison' })).toHaveAttribute('aria-current', 'page');
        await userEvent.click(screen.getByRole('button', { name: 'Show archived' }));

        expect(await screen.findByRole('link', { name: 'Archived Offer Comparison' })).toHaveAttribute(
            'aria-current',
            'page'
        );
        expect(screen.queryByRole('button', { name: /save evaluation/i })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Show active' }));
        expect(await screen.findByRole('link', { name: 'Offer Comparison' })).toHaveAttribute('aria-current', 'page');
        expect(fetch).not.toHaveBeenCalled();
    });

    test('gives signed-out visitors a public recovery path from unknown routes', async () => {
        fetch.mockResolvedValueOnce(response(false, 401));
        fetch.mockResolvedValueOnce(response(false, 401));
        renderRoute('/addassignment');

        expect(screen.getByRole('heading', { name: /This page isn’t on the route/i })).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'Back to Job Tracker' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(document.title).toBe('Job Tracker');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('gives authenticated visitors a direct applications recovery path from unknown routes', async () => {
        renderRoute('/addassignment');

        expect(await screen.findByRole('button', { name: 'View applications' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/sessions/current`, {
            method: 'GET',
        });
    });

    test('displays the route-loading fallback when a route throws an error', async () => {
        const router = createMemoryRouter(
            [
                {
                    element: <div>Broken route</div>,
                    errorElement: appRoutes[0].errorElement,
                    path: '/route-error',
                    loader: () => {
                        throw new Error('Route failed');
                    },
                },
            ],
            { initialEntries: ['/route-error'] }
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByRole('heading', { name: /We couldn’t load this page/i })).toBeInTheDocument();
        expect(screen.getByText(/Reload the page to try again./i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    test('displays active navigation bar when on dashboard page', async () => {
        renderRoute('/dashboard');
        await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('heading', { level: 1, name: 'Job Tracker' })).toBeInTheDocument();

        await waitFor(() => {
            const requestedUrls = fetch.mock.calls.map(([url]) => String(url));
            expect(requestedUrls.filter((url) => url.endsWith('/job-applications/status-counts'))).toHaveLength(1);
            expect(requestedUrls.filter((url) => url.endsWith('/job-interviews'))).toHaveLength(1);
            expect(requestedUrls.filter((url) => url.endsWith('/job-applications/weekly-counts'))).toHaveLength(1);
            expect(
                requestedUrls.filter((url) =>
                    url.endsWith('/job-applications?jobStatuses=Applied&jobStatuses=Interview&jobStatuses=Offer')
                )
            ).toHaveLength(1);
        });
    });

    test('displays sign in page after clicking sign out', async () => {
        renderRoute('/interview/view');
        await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
        await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
        await waitFor(() => expect(screen.getByText(/Sign in to job tracker/i)).toBeInTheDocument());
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/sessions/current`, {
            method: 'DELETE',
        });
    });

    test('keeps the current page visible and shows the backend message when logout fails', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return jsonResponse(mockPreferences);
            }
            if (url.endsWith('/authentication/sessions/current') && init?.method === 'DELETE') {
                return jsonResponse({ message: 'Sign out is temporarily unavailable.' }, 503);
            }
            return response();
        });
        renderRoute(routes.addApplication);

        await screen.findByLabelText(/company name/i);
        await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

        expect(await screen.findByText('Sign out is temporarily unavailable')).toBeInTheDocument();
        expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    });
});
