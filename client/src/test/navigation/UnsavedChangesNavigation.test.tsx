import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from 'material-ui-confirm';
import { createMemoryRouter, RouterProvider, type InitialEntry, type RouteObject } from 'react-router-dom';
import { defaultConfirmOptions } from '../../components/confirmation/defaultConfirmOptions';
import AddApplication from '../../pages/application/jobApplication/addApplication/AddApplication';
import QuickCaptureProvider from '../../pages/application/jobApplication/QuickCaptureProvider';
import DemoAddApplication from '../../pages/demo/application/jobApplication/addApplication/DemoAddApplication';
import { DemoProvider } from '../../pages/demo/context/DemoContext';
import DemoAddInterview from '../../pages/demo/interview/jobInterview/addInterview/DemoAddInterview';
import AddInterview from '../../pages/interview/jobInterview/addInterview/AddInterview';
import OfferDecisionWorkspace from '../../pages/offerDecision/OfferDecisionWorkspace';
import type { OfferDecisionWorkspaceData } from '../../pages/offerDecision/models';
import { routes } from '../../routes';
import { render } from '../renderWithProviders';

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
vi.stubGlobal('fetch', vi.fn());

const click = async (element: HTMLElement) => {
    await act(async () => {
        userEvent.click(element);
    });
};

const editOfferEvaluation = async (companyName: string) => {
    await click(screen.getByRole('button', { name: `More actions for ${companyName}` }));
    await click(
        within(screen.getByRole('menu', { name: `More actions for ${companyName}` })).getByRole('menuitem', {
            name: `Edit evaluation for ${companyName}`,
        })
    );
};

const enterIncompleteDate = (input: HTMLInputElement) => {
    Object.defineProperty(input, 'validity', {
        configurable: true,
        value: { badInput: true },
    });
    fireEvent.blur(input);
};

const application = {
    job_id: 1,
    company_name: 'IRAS',
    job_title: 'Data Engineer',
    application_date: '2026-07-01T00:00:00.000Z',
    job_status: 'Interview' as const,
    job_location: 'Singapore',
    job_posting_url: '',
    notes: '',
};

const duplicateApplicationResponse = {
    ok: false,
    status: 409,
    statusText: 'Conflict',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({
        code: 'POSSIBLE_DUPLICATE_APPLICATION',
        message: 'A possible duplicate job application already exists.',
        duplicate: {
            company_name: 'OpenAI',
            job_title: 'Software Engineer',
            application_date: '2026-07-01T00:00:00.000Z',
        },
    }),
} as Response;

const interviewSchedulingConflictResponse = {
    ok: false,
    status: 409,
    statusText: 'Conflict',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({
        code: 'INTERVIEW_SCHEDULING_CONFLICT',
        message: 'This interview overlaps with an existing active interview.',
        conflicts: [
            {
                interview_id: 51,
                job_id: 2,
                company_name: 'Grab',
                job_title: 'Software Engineer',
                interview_date: '2030-08-03T06:00:00.000Z',
                interview_duration_minutes: 60,
                interview_type: 'Technical Interview',
            },
        ],
    }),
} as Response;

const interviewOfferDeadlineResponse = {
    ok: false,
    status: 409,
    statusText: 'Conflict',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({
        code: 'INTERVIEW_OFFER_DEADLINE_WARNING',
        message: 'This interview may finish after an active offer deadline.',
        warnings: [
            {
                job_id: 3,
                company_name: 'Stripe',
                job_title: 'Platform Engineer',
                decision_deadline: '2030-08-03T06:00:00.000Z',
            },
        ],
    }),
} as Response;

const successfulApplicationResponse = {
    ok: true,
    status: 201,
    headers: new Headers({ 'content-type': 'text/plain' }),
    text: async () => 'Successfully added a job application!',
} as Response;

const failedApplicationResponse = {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    headers: new Headers({ 'content-type': 'text/plain' }),
    text: async () => 'Failed to add a job application',
} as Response;

const renderRouter = (routeObjects: RouteObject[], initialEntries: InitialEntry[], demo = false) => {
    const router = createMemoryRouter(routeObjects, { initialEntries });
    const content = (
        <ConfirmProvider defaultOptions={defaultConfirmOptions}>
            <RouterProvider router={router} />
        </ConfirmProvider>
    );

    const renderResult = render(demo ? <DemoProvider>{content}</DemoProvider> : content);
    return { router, ...renderResult };
};

const renderPreviousHistory = (routeObjects: RouteObject[], currentEntry: InitialEntry) => {
    const router = createMemoryRouter(
        [
            {
                path: '/previous',
                element: <h1>Previous destination</h1>,
            },
            ...routeObjects,
        ],
        {
            initialEntries: ['/previous', currentEntry],
            initialIndex: 1,
        }
    );
    const renderResult = render(
        <ConfirmProvider defaultOptions={defaultConfirmOptions}>
            <RouterProvider router={router} />
        </ConfirmProvider>
    );
    return { router, ...renderResult };
};

const applicationRoutes: RouteObject[] = [
    {
        element: <QuickCaptureProvider />,
        children: [
            {
                path: routes.addApplication,
                element: <AddApplication />,
            },
            {
                path: routes.viewApplications,
                element: <h1>Applications destination</h1>,
            },
        ],
    },
];

const interviewRoutes: RouteObject[] = [
    {
        path: routes.addInterview,
        element: <AddInterview />,
    },
    {
        path: routes.viewInterviews,
        element: <h1>Interviews destination</h1>,
    },
    {
        path: routes.viewApplications,
        element: <h1>Applications destination</h1>,
    },
];

const offerDecisionData: OfferDecisionWorkspaceData = {
    applications: [
        {
            job_id: 41,
            company_name: 'Acme',
            job_title: 'Software Engineer',
            job_status: 'Offer',
            application_date: '2026-07-01T08:00:00.000Z',
            evaluation: {
                job_id: 41,
                ratings: {
                    career_growth: 5,
                    company_culture_fit: 4,
                    work_life_balance: 3,
                    compensation: 4,
                },
                details: {
                    currency: 'SGD',
                    monthly_base_salary: 10000,
                    bonus: '15% target',
                    annual_leave_days: 21,
                    work_arrangement: 'Hybrid',
                    decision_deadline: '2026-08-15T10:00:00.000Z',
                    pros: 'Strong product ownership',
                    concerns: 'Two office days each week',
                },
            },
        },
        {
            job_id: 42,
            company_name: 'Beta Labs',
            job_title: 'Platform Developer',
            job_status: 'Offer',
            application_date: '2026-07-02T08:00:00.000Z',
            evaluation: null,
        },
    ],
};

const offerDecisionRoutes: RouteObject[] = [
    {
        path: routes.offerDecisions,
        element: (
            <OfferDecisionWorkspace
                data={offerDecisionData}
                onDelete={vi.fn()}
                onSave={vi.fn().mockResolvedValue(undefined)}
                readOnly={false}
            />
        ),
    },
    {
        path: routes.viewApplications,
        element: <h1>Applications destination</h1>,
    },
];

describe('unsaved-changes route protection', () => {
    beforeEach(() => {
        vi.mocked(fetch).mockReset();
    });

    test('Add application stays clean at its normal defaults', async () => {
        renderRouter(applicationRoutes, [routes.addApplication]);

        await click(screen.getByRole('button', { name: 'View applications' }));
        expect(screen.getByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test.each([
        ['Company name', 'OpenAI', ''],
        ['Job title', 'Software Engineer', ''],
        ['Job status', 'Interview', 'Applied'],
        ['Application date (uses current date if left blank)', '2026-07-02T10:30', ''],
        ['Job location (optional)', 'Singapore', ''],
        ['Job posting URL (optional)', 'https://jobs.example.com/role', ''],
    ])(
        '%s activates the Add application blocker and reverting it removes the block',
        async (label, value, cleanValue) => {
            renderRouter(applicationRoutes, [routes.addApplication]);
            const field = screen.getByLabelText(label);

            fireEvent.change(field, { target: { value } });
            await click(screen.getByRole('button', { name: 'View applications' }));
            const dialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
            await click(within(dialog).getByRole('button', { name: 'Stay' }));

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            fireEvent.change(field, { target: { value: cleanValue } });
            await click(screen.getByRole('button', { name: 'View applications' }));

            expect(await screen.findByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();
        }
    );

    test('an incomplete Add application date activates the blocker', async () => {
        renderRouter(applicationRoutes, [routes.addApplication]);

        enterIncompleteDate(screen.getByLabelText('Application date (uses current date if left blank)'));
        await click(screen.getByRole('button', { name: 'View applications' }));

        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
    });

    test('Add evaluation blocks only after a non-default field changes and uses the shared Leave Page focus', async () => {
        const { router } = renderRouter(offerDecisionRoutes, [routes.offerDecisions]);
        await click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));

        await act(async () => {
            void router.navigate(routes.viewApplications);
        });
        expect(await screen.findByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();

        await act(async () => {
            void router.navigate(routes.offerDecisions);
        });
        await click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
        fireEvent.change(screen.getByLabelText('Beta Labs bonus'), { target: { value: '20% target' } });
        await act(async () => {
            void router.navigate(routes.viewApplications);
        });

        const dialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        const leavePageButton = within(dialog).getByRole('button', { name: 'Leave Page' });
        expect(leavePageButton).toHaveFocus();
        expect(leavePageButton).toHaveClass('MuiButton-colorError');
        await click(within(dialog).getByRole('button', { name: 'Stay' }));
        expect(screen.getByLabelText('Beta Labs bonus')).toHaveValue('20% target');
    });

    test('an incomplete Add evaluation decision deadline activates the blocker', async () => {
        const { router } = renderRouter(offerDecisionRoutes, [routes.offerDecisions]);
        await click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));

        enterIncompleteDate(screen.getByLabelText('Beta Labs decision deadline'));
        await act(async () => {
            void router.navigate(routes.viewApplications);
        });

        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
    });

    test('Edit evaluation blocks only while its draft differs from the saved evaluation', async () => {
        const { router } = renderRouter(offerDecisionRoutes, [routes.offerDecisions]);
        await editOfferEvaluation('Acme');

        await act(async () => {
            void router.navigate(routes.viewApplications);
        });
        expect(await screen.findByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();

        await act(async () => {
            void router.navigate(routes.offerDecisions);
        });
        await editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme bonus'), { target: { value: 'Changed' } });
        await act(async () => {
            void router.navigate(routes.viewApplications);
        });
        await click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Stay' }));

        fireEvent.change(screen.getByLabelText('Acme bonus'), { target: { value: '15% target' } });
        await act(async () => {
            void router.navigate(routes.viewApplications);
        });

        expect(await screen.findByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test.each([
        ['companyName', 'OpenAI'],
        ['jobTitle', 'Software Engineer'],
        ['jobLocation', 'Singapore'],
        ['jobURL', 'https://jobs.example.com/role'],
    ])('Quick Capture %s prefill blocks without manual editing', async (parameter, value) => {
        renderRouter(applicationRoutes, [`${routes.addApplication}?${parameter}=${encodeURIComponent(value)}`]);

        await click(screen.getByRole('button', { name: 'View applications' }));

        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
    });

    test('Quick Capture-prefilled application fields block immediately and Stay preserves them', async () => {
        renderRouter(applicationRoutes, [
            `${routes.addApplication}?companyName=Google&jobTitle=Software+Engineer&jobLocation=Singapore&jobURL=https%3A%2F%2Fjobs.example.com`,
        ]);

        const viewApplicationsButton = screen.getByRole('button', { name: 'View applications' });
        await click(viewApplicationsButton);

        const dialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        expect(dialog).toHaveTextContent('You have unsaved changes. If you leave now, your changes will be lost.');
        const leavePageButton = within(dialog).getByRole('button', { name: 'Leave Page' });
        expect(leavePageButton).toHaveFocus();
        expect(leavePageButton).toHaveClass('MuiButton-colorError');

        await click(within(dialog).getByRole('button', { name: 'Stay' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(() => expect(viewApplicationsButton).toHaveFocus());
        expect(screen.getByLabelText('Company name')).toHaveValue('Google');
        expect(screen.getByLabelText('Job title')).toHaveValue('Software Engineer');
        expect(screen.getByLabelText('Job location (optional)')).toHaveValue('Singapore');
        expect(screen.getByLabelText('Job posting URL (optional)')).toHaveValue('https://jobs.example.com');
    });

    test('clearing every Quick Capture form field restores the clean defaults', async () => {
        renderRouter(applicationRoutes, [
            `${routes.addApplication}?companyName=Google&jobTitle=Software+Engineer&jobLocation=Singapore&jobURL=https%3A%2F%2Fjobs.example.com`,
        ]);

        fireEvent.change(screen.getByLabelText('Company name'), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Job title'), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Job location (optional)'), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Job posting URL (optional)'), { target: { value: '' } });
        await click(screen.getByRole('button', { name: 'View applications' }));

        expect(await screen.findByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('captured page title and Quick Capture setup expansion do not make Add application dirty', async () => {
        const { unmount } = renderRouter(applicationRoutes, [
            `${routes.addApplication}?pageTitle=${encodeURIComponent('Software Engineer at Google')}`,
        ]);

        await click(screen.getByRole('button', { name: 'View applications' }));
        expect(await screen.findByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        unmount();

        renderRouter(applicationRoutes, [routes.addApplication]);
        await click(screen.getByRole('button', { name: 'Quick Capture' }));
        expect(screen.getByRole('region', { name: 'Quick Capture setup' })).toBeInTheDocument();
        await click(screen.getByRole('button', { name: 'View applications' }));

        expect(await screen.findByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test.each([
        ['Interview date', '2026-08-03T14:30', ''],
        ['Duration (minutes)', '90', '60'],
        ['Interview location', 'Zoom', ''],
        ['Interview type (optional)', 'Panel', ''],
        ['Meeting URL (optional)', 'https://meet.example.com/room', ''],
        ['Additional notes (optional)', 'Prepare examples', ''],
    ])(
        '%s activates the Add interview blocker and reverting it removes the block',
        async (label, value, cleanValue) => {
            renderRouter(interviewRoutes, [{ pathname: routes.addInterview, state: { app: application } }]);
            const field = screen.getByLabelText(label);

            fireEvent.change(field, { target: { value } });
            await click(screen.getByRole('button', { name: 'View interviews' }));
            const dialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
            await click(within(dialog).getByRole('button', { name: 'Stay' }));

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            fireEvent.change(field, { target: { value: cleanValue } });
            await click(screen.getByRole('button', { name: 'View interviews' }));

            expect(await screen.findByRole('heading', { name: 'Interviews destination' })).toBeInTheDocument();
        }
    );

    test('an incomplete Add interview date activates the blocker', async () => {
        renderRouter(interviewRoutes, [{ pathname: routes.addInterview, state: { app: application } }]);

        enterIncompleteDate(screen.getByLabelText('Interview date'));
        await click(screen.getByRole('button', { name: 'View interviews' }));

        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
    });

    test('Add interview application context and default duration are clean', async () => {
        renderRouter(interviewRoutes, [{ pathname: routes.addInterview, state: { app: application } }]);

        await click(screen.getByRole('button', { name: 'View interviews' }));

        expect(await screen.findByRole('heading', { name: 'Interviews destination' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('Add interview treats application context and default duration as clean, then preserves original navigation', async () => {
        renderRouter(interviewRoutes, [{ pathname: routes.addInterview, state: { app: application } }]);

        fireEvent.change(screen.getByLabelText('Interview date'), { target: { value: '2026-08-03T14:30' } });
        await click(screen.getByRole('button', { name: 'View interviews' }));

        const dialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        await click(within(dialog).getByRole('button', { name: 'Leave Page' }));

        expect(await screen.findByRole('heading', { name: 'Interviews destination' })).toBeInTheDocument();
    });

    test.each([
        [-1, 'Previous destination'],
        [1, 'Next destination'],
    ])('browser history navigation by %i is blocked and resumed exactly', async (delta, destination) => {
        const historyRoutes: RouteObject[] = [
            {
                path: '/previous',
                element: <h1>Previous destination</h1>,
            },
            ...applicationRoutes,
            {
                path: '/next',
                element: <h1>Next destination</h1>,
            },
        ];
        const router = createMemoryRouter(historyRoutes, {
            initialEntries: ['/previous', routes.addApplication, '/next'],
            initialIndex: 1,
        });
        render(
            <ConfirmProvider defaultOptions={defaultConfirmOptions}>
                <RouterProvider router={router} />
            </ConfirmProvider>
        );

        fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'OpenAI' } });
        act(() => {
            void router.navigate(delta);
        });

        const dialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        await click(within(dialog).getByRole('button', { name: 'Leave Page' }));

        expect(await screen.findByRole('heading', { name: destination })).toBeInTheDocument();
    });

    test('waits for the duplicate-application confirmation before showing the leave warning', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(duplicateApplicationResponse);
        const { router } = renderPreviousHistory(applicationRoutes, routes.addApplication);

        await userEvent.type(screen.getByLabelText('Company name'), 'OpenAI');
        await userEvent.type(screen.getByLabelText('Job title'), 'Software Engineer');
        await click(screen.getByRole('button', { name: 'Add application' }));
        const duplicateDialog = await screen.findByRole('dialog', { name: 'Possible duplicate application' });

        await act(async () => {
            void router.navigate(-1);
        });

        expect(duplicateDialog).toBeVisible();
        expect(screen.queryByRole('dialog', { name: 'Leave this page?' })).not.toBeInTheDocument();
        await click(within(duplicateDialog).getByRole('button', { name: 'Cancel' }));

        const leaveDialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        await click(within(leaveDialog).getByRole('button', { name: 'Stay' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Add application' })).not.toHaveAttribute('aria-busy')
        );
        expect(screen.getByLabelText('Company name')).toHaveValue('OpenAI');
    });

    test.each([
        ['scheduling-conflict', interviewSchedulingConflictResponse, 'Possible scheduling conflict'],
        ['offer-deadline', interviewOfferDeadlineResponse, 'Offer deadline warning'],
    ])('waits for the %s confirmation before showing the leave warning', async (_, response, dialogName) => {
        vi.mocked(fetch).mockResolvedValueOnce(response);
        const { router } = renderPreviousHistory(interviewRoutes, {
            pathname: routes.addInterview,
            state: { app: application },
        });

        fireEvent.change(screen.getByLabelText('Interview date'), { target: { value: '2030-08-03T14:30' } });
        await userEvent.type(screen.getByLabelText('Interview location'), 'Zoom');
        await click(screen.getByRole('button', { name: 'Add interview' }));
        const submissionDialog = await screen.findByRole('dialog', { name: dialogName });

        await act(async () => {
            void router.navigate(-1);
        });

        expect(submissionDialog).toBeVisible();
        expect(screen.queryByRole('dialog', { name: 'Leave this page?' })).not.toBeInTheDocument();
        await click(within(submissionDialog).getByRole('button', { name: 'Cancel' }));

        const leaveDialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        await click(within(leaveDialog).getByRole('button', { name: 'Stay' }));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Add interview' })).not.toBeDisabled());
        expect(screen.getByLabelText('Interview location')).toHaveValue('Zoom');
    });

    test('defers browser history while a duplicate check is pending, then queues the leave warning', async () => {
        let resolveRequest: (response: Response) => void = () => undefined;
        vi.mocked(fetch).mockReturnValueOnce(
            new Promise<Response>((resolve) => {
                resolveRequest = resolve;
            })
        );
        const { router } = renderPreviousHistory(applicationRoutes, routes.addApplication);

        await userEvent.type(screen.getByLabelText('Company name'), 'OpenAI');
        await userEvent.type(screen.getByLabelText('Job title'), 'Software Engineer');
        await click(screen.getByRole('button', { name: 'Add application' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

        await act(async () => {
            void router.navigate(-1);
        });

        expect(screen.queryByRole('dialog', { name: 'Leave this page?' })).not.toBeInTheDocument();
        await act(async () => resolveRequest(duplicateApplicationResponse));

        const duplicateDialog = await screen.findByRole('dialog', { name: 'Possible duplicate application' });
        await click(within(duplicateDialog).getByRole('button', { name: 'Cancel' }));
        const leaveDialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        await click(within(leaveDialog).getByRole('button', { name: 'Stay' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Add application' })).not.toHaveAttribute('aria-busy')
        );
    });

    test('completes queued browser history without a warning after a pending submission succeeds', async () => {
        let resolveRequest: (response: Response) => void = () => undefined;
        vi.mocked(fetch).mockReturnValueOnce(
            new Promise<Response>((resolve) => {
                resolveRequest = resolve;
            })
        );
        const { router } = renderPreviousHistory(applicationRoutes, routes.addApplication);

        await userEvent.type(screen.getByLabelText('Company name'), 'OpenAI');
        await userEvent.type(screen.getByLabelText('Job title'), 'Software Engineer');
        await click(screen.getByRole('button', { name: 'Add application' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        await act(async () => {
            void router.navigate(-1);
        });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await act(async () => resolveRequest(successfulApplicationResponse));

        expect(await screen.findByRole('heading', { name: 'Previous destination' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('preserves the first browser-history destination during a pending submission', async () => {
        let resolveRequest: (response: Response) => void = () => undefined;
        vi.mocked(fetch).mockReturnValueOnce(
            new Promise<Response>((resolve) => {
                resolveRequest = resolve;
            })
        );
        const historyRoutes: RouteObject[] = [
            {
                path: '/previous',
                element: <h1>Previous destination</h1>,
            },
            ...applicationRoutes,
            {
                path: '/next',
                element: <h1>Next destination</h1>,
            },
        ];
        const router = createMemoryRouter(historyRoutes, {
            initialEntries: ['/previous', routes.addApplication, '/next'],
            initialIndex: 1,
        });
        render(
            <ConfirmProvider defaultOptions={defaultConfirmOptions}>
                <RouterProvider router={router} />
            </ConfirmProvider>
        );

        await userEvent.type(screen.getByLabelText('Company name'), 'OpenAI');
        await userEvent.type(screen.getByLabelText('Job title'), 'Software Engineer');
        await click(screen.getByRole('button', { name: 'Add application' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        await act(async () => {
            void router.navigate(-1);
        });
        await act(async () => {
            void router.navigate(1);
        });

        await act(async () => resolveRequest(successfulApplicationResponse));

        expect(await screen.findByRole('heading', { name: 'Previous destination' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Next destination' })).not.toBeInTheDocument();
    });

    test('shows the queued leave warning after a pending submission fails', async () => {
        let resolveRequest: (response: Response) => void = () => undefined;
        vi.mocked(fetch).mockReturnValueOnce(
            new Promise<Response>((resolve) => {
                resolveRequest = resolve;
            })
        );
        const { router } = renderPreviousHistory(applicationRoutes, routes.addApplication);

        await userEvent.type(screen.getByLabelText('Company name'), 'OpenAI');
        await userEvent.type(screen.getByLabelText('Job title'), 'Software Engineer');
        await click(screen.getByRole('button', { name: 'Add application' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        await act(async () => {
            void router.navigate(-1);
        });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await act(async () => resolveRequest(failedApplicationResponse));

        const leaveDialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        expect(screen.getByText('Failed to add a job application')).toBeInTheDocument();
        await click(within(leaveDialog).getByRole('button', { name: 'Stay' }));
        expect(screen.getByLabelText('Company name')).toHaveValue('OpenAI');
    });

    test('defers browser history across chained interview confirmations', async () => {
        let resolveRetry: (response: Response) => void = () => undefined;
        vi.mocked(fetch)
            .mockResolvedValueOnce(interviewSchedulingConflictResponse)
            .mockReturnValueOnce(
                new Promise<Response>((resolve) => {
                    resolveRetry = resolve;
                })
            );
        const { router } = renderPreviousHistory(interviewRoutes, {
            pathname: routes.addInterview,
            state: { app: application },
        });

        fireEvent.change(screen.getByLabelText('Interview date'), { target: { value: '2030-08-03T14:30' } });
        await userEvent.type(screen.getByLabelText('Interview location'), 'Zoom');
        await click(screen.getByRole('button', { name: 'Add interview' }));
        await click(await screen.findByRole('button', { name: 'Add anyway' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        await act(async () => {
            void router.navigate(-1);
        });

        expect(screen.queryByRole('dialog', { name: 'Leave this page?' })).not.toBeInTheDocument();
        await act(async () => resolveRetry(interviewOfferDeadlineResponse));

        const deadlineDialog = await screen.findByRole('dialog', { name: 'Offer deadline warning' });
        await click(within(deadlineDialog).getByRole('button', { name: 'Cancel' }));
        const leaveDialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        await click(within(leaveDialog).getByRole('button', { name: 'Stay' }));
        expect(screen.getByLabelText('Interview location')).toHaveValue('Zoom');
    });

    test('missing Add interview application context redirects without a warning', async () => {
        renderRouter(interviewRoutes, [routes.addInterview]);

        expect(await screen.findByRole('heading', { name: 'Applications destination' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('successful Add application submission resets cleanly and later edits activate the blocker again', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'Successfully added a job application!',
        } as Response);
        renderRouter(applicationRoutes, [routes.addApplication]);

        await userEvent.type(screen.getByLabelText('Company name'), 'OpenAI');
        await userEvent.type(screen.getByLabelText('Job title'), 'Software Engineer');
        await click(screen.getByRole('button', { name: 'Add application' }));

        await waitFor(() => expect(screen.getByLabelText('Company name')).toHaveValue(''));
        expect(screen.getByLabelText('Job title')).toHaveValue('');
        await userEvent.type(screen.getByLabelText('Company name'), 'Another company');
        await click(screen.getByRole('button', { name: 'View applications' }));

        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
    });

    test('successful Add interview submission resets cleanly and later edits activate the blocker again', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'Successfully added an interview!',
        } as Response);
        renderRouter(interviewRoutes, [{ pathname: routes.addInterview, state: { app: application } }]);

        fireEvent.change(screen.getByLabelText('Interview date'), { target: { value: '2030-08-03T14:30' } });
        await userEvent.type(screen.getByLabelText('Interview location'), 'Zoom');
        await click(screen.getByRole('button', { name: 'Add interview' }));

        await waitFor(() => expect(screen.getByLabelText('Interview date')).toHaveValue(''));
        expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);
        expect(screen.getByLabelText('Interview location')).toHaveValue('');
        await userEvent.type(screen.getByLabelText('Additional notes (optional)'), 'Another interview');
        await click(screen.getByRole('button', { name: 'View interviews' }));

        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
    });

    test('Escape and backdrop dismissal stay on the dirty form without opening duplicate dialogs', async () => {
        renderRouter(interviewRoutes, [{ pathname: routes.addInterview, state: { app: application } }]);

        await userEvent.type(screen.getByLabelText('Interview location'), 'Zoom');
        await click(screen.getByRole('button', { name: 'View interviews' }));
        const dialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        expect(screen.getAllByRole('dialog')).toHaveLength(1);

        fireEvent.keyDown(dialog, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByLabelText('Interview location')).toHaveValue('Zoom');

        await click(screen.getByRole('button', { name: 'View interviews' }));
        const reopenedDialog = await screen.findByRole('dialog', { name: 'Leave this page?' });
        fireEvent.mouseDown(reopenedDialog.parentElement!);
        fireEvent.click(reopenedDialog.parentElement!);

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByLabelText('Interview location')).toHaveValue('Zoom');
    });

    test('Enter confirms leaving only while the warning dialog is open', async () => {
        renderRouter(interviewRoutes, [{ pathname: routes.addInterview, state: { app: application } }]);

        await userEvent.type(screen.getByLabelText('Interview location'), 'Zoom');
        await click(screen.getByRole('button', { name: 'View interviews' }));
        await screen.findByRole('dialog', { name: 'Leave this page?' });
        await act(async () => {
            userEvent.keyboard('{Enter}');
        });

        expect(await screen.findByRole('heading', { name: 'Interviews destination' })).toBeInTheDocument();
    });

    test('demo Add application and Add interview use the same warning lifecycle', async () => {
        const demoApplicationRoutes: RouteObject[] = [
            {
                path: routes.demoAddApplication,
                element: <DemoAddApplication />,
            },
            {
                path: routes.demoViewApplications,
                element: <h1>Demo applications destination</h1>,
            },
        ];
        const { unmount } = render(
            <DemoProvider>
                <ConfirmProvider defaultOptions={defaultConfirmOptions}>
                    <RouterProvider
                        router={createMemoryRouter(demoApplicationRoutes, {
                            initialEntries: [routes.demoAddApplication],
                        })}
                    />
                </ConfirmProvider>
            </DemoProvider>
        );

        await userEvent.type(screen.getByLabelText('Company name'), 'OpenAI');
        await click(screen.getByRole('button', { name: 'View applications' }));
        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
        await click(screen.getByRole('button', { name: 'Stay' }));
        unmount();

        const demoInterviewRoutes: RouteObject[] = [
            {
                path: routes.demoAddInterview,
                element: <DemoAddInterview />,
            },
            {
                path: routes.demoViewInterviews,
                element: <h1>Demo interviews destination</h1>,
            },
        ];
        renderRouter(demoInterviewRoutes, [{ pathname: routes.demoAddInterview, state: { app: application } }], true);

        await userEvent.type(screen.getByLabelText('Additional notes (optional)'), 'Prepare examples');
        await click(screen.getByRole('button', { name: 'View interviews' }));
        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
    });

    test('incomplete demo application and interview dates use the same blocker', async () => {
        const demoApplicationRoutes: RouteObject[] = [
            {
                path: routes.demoAddApplication,
                element: <DemoAddApplication />,
            },
            {
                path: routes.demoViewApplications,
                element: <h1>Demo applications destination</h1>,
            },
        ];
        const { unmount } = renderRouter(demoApplicationRoutes, [routes.demoAddApplication], true);

        enterIncompleteDate(screen.getByLabelText('Application date (uses current date if left blank)'));
        await click(screen.getByRole('button', { name: 'View applications' }));
        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
        unmount();

        const demoInterviewRoutes: RouteObject[] = [
            {
                path: routes.demoAddInterview,
                element: <DemoAddInterview />,
            },
            {
                path: routes.demoViewInterviews,
                element: <h1>Demo interviews destination</h1>,
            },
        ];
        renderRouter(demoInterviewRoutes, [{ pathname: routes.demoAddInterview, state: { app: application } }], true);

        enterIncompleteDate(screen.getByLabelText('Interview date'));
        await click(screen.getByRole('button', { name: 'View interviews' }));
        expect(await screen.findByRole('dialog', { name: 'Leave this page?' })).toBeInTheDocument();
    });
});
