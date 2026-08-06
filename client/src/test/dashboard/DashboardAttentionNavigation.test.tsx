import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import Dashboard from '../../pages/dashboard/Dashboard';
import type { JobApplication } from '../../pages/application/models';
import { routes } from '../../routes';
import { render } from '../renderWithProviders';
import { ConfirmProvider } from 'material-ui-confirm';
import { defaultConfirmOptions } from '../../components/confirmation/defaultConfirmOptions';
import * as highlightElement from '../../helper/highlightElement';

const apiMocks = vi.hoisted(() => ({
    listApplications: vi.fn(),
    listInterviews: vi.fn(),
    getDashboardApplicationSummary: vi.fn(),
    listWeeklyApplications: vi.fn(),
    getActiveOfferDecisions: vi.fn(),
    updateApplicationStatus: vi.fn(),
}));

vi.mock('../../api/useJobTrackerAPI', () => ({
    useJobTrackerAPI: () => ({
        application: {
            listApplications: apiMocks.listApplications,
            getDashboardApplicationSummary: apiMocks.getDashboardApplicationSummary,
            listWeeklyApplications: apiMocks.listWeeklyApplications,
            updateStatus: apiMocks.updateApplicationStatus,
        },
        interview: {
            listInterviews: apiMocks.listInterviews,
        },
        offerDecision: {
            getActive: apiMocks.getActiveOfferDecisions,
        },
    }),
}));

vi.mock('react-chartjs-2', () => ({
    Bar: () => <div>Bar chart</div>,
    Line: () => <div>Line chart</div>,
}));

const application = (jobStatus: JobApplication['job_status']): JobApplication => ({
    job_id: 42,
    company_name: 'Acme',
    job_title: 'Software Engineer',
    application_date: '2020-07-01T09:00:00.000Z',
    job_status: jobStatus,
    job_location: '',
    job_posting_url: '',
    notes: '',
});

const AddInterviewDestination = () => {
    const location = useLocation() as Location<{ app?: JobApplication; origin?: unknown }>;

    return (
        <>
            <p>Add Interview destination for {location.state?.app?.company_name ?? 'missing application'}</p>
            <output data-testid='add-interview-state'>{JSON.stringify(location.state)}</output>
        </>
    );
};

const OfferComparisonDestination = () => {
    const location = useLocation();
    return <output data-testid='offer-comparison-state'>{JSON.stringify(location.state)}</output>;
};

const LocationStateProbe = () => {
    const location = useLocation();
    return <output data-testid='dashboard-location-state'>{JSON.stringify(location.state)}</output>;
};

const renderDashboardRoutes = (initialEntry: string | { pathname: string; state?: unknown } = routes.dashboard) =>
    render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <ConfirmProvider defaultOptions={defaultConfirmOptions}>
                <LocationStateProbe />
                <Routes>
                    <Route path={routes.dashboard} element={<Dashboard />} />
                    <Route path={routes.addInterview} element={<AddInterviewDestination />} />
                    <Route path={routes.offerDecisions} element={<OfferComparisonDestination />} />
                    <Route path={routes.viewApplications} element={<ApplicationListDestination />} />
                </Routes>
            </ConfirmProvider>
        </MemoryRouter>
    );

const ApplicationListDestination = () => {
    const location = useLocation();
    return <output data-testid='application-list-state'>{JSON.stringify(location.state)}</output>;
};

describe('signed-in dashboard attention navigation', () => {
    beforeEach(() => {
        apiMocks.listInterviews.mockResolvedValue([]);
        apiMocks.getDashboardApplicationSummary.mockResolvedValue({
            statusCounts: [],
            interviewedApplicationCount: 0,
        });
        apiMocks.listWeeklyApplications.mockResolvedValue([]);
        apiMocks.getActiveOfferDecisions.mockResolvedValue({ applications: [] });
        apiMocks.updateApplicationStatus.mockResolvedValue(null);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    test('opens Add Interview with the selected application in route state', async () => {
        apiMocks.listApplications.mockResolvedValue([application('Interview')]);
        renderDashboardRoutes();

        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Add interview for Software Engineer at Acme',
            })
        );

        expect(await screen.findByText('Add Interview destination for Acme')).toBeInTheDocument();
        expect(screen.getByTestId('add-interview-state')).toHaveTextContent(
            JSON.stringify({
                app: application('Interview'),
                origin: { kind: 'dashboard-needs-attention', category: 'interview-unscheduled' },
            })
        );
    });

    test('highlights and consumes the exact Needs Attention return target after dashboard data loads', async () => {
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        apiMocks.listApplications.mockResolvedValue([application('Interview')]);
        renderDashboardRoutes({
            pathname: routes.dashboard,
            state: {
                dashboardAttentionTarget: { jobId: 42, category: 'interview-unscheduled' },
            },
        });

        await waitFor(() =>
            expect(scrollAndHighlight).toHaveBeenCalledWith(
                'needs-attention-interview-unscheduled-42',
                expect.any(String),
                expect.anything()
            )
        );
        await waitFor(() => expect(screen.getByTestId('dashboard-location-state')).toHaveTextContent('null'));
    });

    test('opens active Offer Comparison for an unevaluated offer action', async () => {
        apiMocks.listApplications.mockResolvedValue([{ ...application('Offer'), has_offer_evaluation: false }]);
        renderDashboardRoutes();

        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Evaluate offer for Software Engineer at Acme',
            })
        );

        expect(await screen.findByTestId('offer-comparison-state')).toHaveTextContent(
            JSON.stringify({
                dashboardOfferDecisionJobId: 42,
                dashboardOfferDecisionFilter: 'Offers to Evaluate',
            })
        );
    });

    test('opens the exact evaluated offer in Offer Comparison for a due decision', async () => {
        apiMocks.listApplications.mockResolvedValue([{ ...application('Offer'), has_offer_evaluation: true }]);
        apiMocks.getActiveOfferDecisions.mockResolvedValue({
            applications: [
                {
                    ...application('Offer'),
                    evaluation: {
                        job_id: 42,
                        ratings: {
                            career_growth: 3,
                            company_culture_fit: 3,
                            work_life_balance: 3,
                            compensation: 3,
                        },
                        details: {
                            currency: 'SGD',
                            monthly_base_salary: 8000,
                            bonus: '',
                            annual_leave_days: 18,
                            work_arrangement: 'Hybrid',
                            decision_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                            pros: '',
                            concerns: '',
                        },
                    },
                },
            ],
        });
        renderDashboardRoutes();

        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Record offer decision for Software Engineer at Acme',
            })
        );

        expect(await screen.findByTestId('offer-comparison-state')).toHaveTextContent(
            JSON.stringify({
                dashboardOfferDecisionJobId: 42,
                dashboardOfferDecisionFilter: 'Evaluated Offers',
            })
        );
        expect(screen.queryByTestId('application-list-state')).not.toBeInTheDocument();
        expect(apiMocks.getActiveOfferDecisions).toHaveBeenCalledWith({
            filters: ['Evaluated Offers', 'Expired Evaluated Offers'],
        });
    });

    test('opens the exact expired evaluated offer in Offer Comparison for a recent overdue decision', async () => {
        apiMocks.listApplications.mockResolvedValue([{ ...application('Offer'), has_offer_evaluation: true }]);
        apiMocks.getActiveOfferDecisions.mockResolvedValue({
            applications: [
                {
                    ...application('Offer'),
                    evaluation: {
                        job_id: 42,
                        ratings: {
                            career_growth: 3,
                            company_culture_fit: 3,
                            work_life_balance: 3,
                            compensation: 3,
                        },
                        details: {
                            currency: 'SGD',
                            monthly_base_salary: 8000,
                            bonus: '',
                            annual_leave_days: 18,
                            work_arrangement: 'Hybrid',
                            decision_deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                            pros: '',
                            concerns: '',
                        },
                    },
                },
            ],
        });
        renderDashboardRoutes();

        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Record offer decision for Software Engineer at Acme',
            })
        );

        expect(await screen.findByTestId('offer-comparison-state')).toHaveTextContent(
            JSON.stringify({
                dashboardOfferDecisionJobId: 42,
                dashboardOfferDecisionFilter: 'Expired Evaluated Offers',
            })
        );
    });

    test('marks a stale sent-follow-up application as Ghosted through the existing status endpoint', async () => {
        apiMocks.listApplications.mockResolvedValue([
            {
                ...application('Applied'),
                application_follow_up_sent_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            },
        ]);
        apiMocks.getDashboardApplicationSummary.mockResolvedValue({
            statusCounts: [
                { job_status: 'Applied', count: '1' },
                { job_status: 'Ghosted', count: '0' },
            ],
            interviewedApplicationCount: 0,
        });
        renderDashboardRoutes();

        await userEvent.click(
            await screen.findByRole('button', { name: 'Mark as Ghosted for Software Engineer at Acme' })
        );
        await userEvent.click(await screen.findByRole('button', { name: 'Mark as Ghosted' }));

        expect(apiMocks.updateApplicationStatus).toHaveBeenCalledWith({ jobId: 42, jobStatus: 'Ghosted' });
        expect(await screen.findByText('Application marked as Ghosted')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mark as Ghosted?' })).not.toBeInTheDocument());
        expect(screen.queryByRole('button', { name: /Mark as Ghosted for/i })).not.toBeInTheDocument();
        expect(screen.getByText('No applications in the pipeline yet.')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Closed outcomes. Ghosted: 1' })).toBeInTheDocument();
    });

    test('keeps the stale application unchanged and shows an error toast when Mark as Ghosted fails', async () => {
        apiMocks.listApplications.mockResolvedValue([
            {
                ...application('Applied'),
                application_follow_up_sent_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            },
        ]);
        apiMocks.getDashboardApplicationSummary.mockResolvedValue({
            statusCounts: [
                { job_status: 'Applied', count: '1' },
                { job_status: 'Ghosted', count: '0' },
            ],
            interviewedApplicationCount: 0,
        });
        apiMocks.updateApplicationStatus.mockRejectedValueOnce(new Error('Database unavailable'));
        renderDashboardRoutes();

        const action = await screen.findByRole('button', {
            name: 'Mark as Ghosted for Software Engineer at Acme',
        });
        await userEvent.click(action);
        await userEvent.click(await screen.findByRole('button', { name: 'Mark as Ghosted' }));

        expect(
            await screen.findByText('Unable to mark the application as Ghosted. Please try again')
        ).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mark as Ghosted?' })).not.toBeInTheDocument());
        expect(action).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Application pipeline. Applied: 1' })).toBeInTheDocument();
        expect(screen.getByText('No closed outcomes yet.')).toBeInTheDocument();
    });

    test('marks an unanswered post-interview follow-up as Ghosted through the existing status endpoint', async () => {
        apiMocks.listApplications.mockResolvedValue([application('Interview')]);
        apiMocks.listInterviews.mockResolvedValue([
            {
                interview_id: 9,
                job_id: 42,
                company_name: 'Acme',
                job_title: 'Software Engineer',
                interview_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
                interview_duration_minutes: 60,
                interview_location: '',
                interview_type: 'Technical',
                interview_notes: '',
                follow_up_sent_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            },
        ]);
        apiMocks.getDashboardApplicationSummary.mockResolvedValue({
            statusCounts: [
                { job_status: 'Interview', count: '1' },
                { job_status: 'Ghosted', count: '0' },
            ],
            interviewedApplicationCount: 1,
        });
        renderDashboardRoutes();

        await userEvent.click(
            await screen.findByRole('button', { name: 'Mark as Ghosted for Software Engineer at Acme' })
        );
        await userEvent.click(await screen.findByRole('button', { name: 'Mark as Ghosted' }));

        expect(apiMocks.updateApplicationStatus).toHaveBeenCalledWith({ jobId: 42, jobStatus: 'Ghosted' });
        expect(await screen.findByText('Application marked as Ghosted')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mark as Ghosted?' })).not.toBeInTheDocument());
        expect(screen.queryByRole('button', { name: /Mark as Ghosted for/i })).not.toBeInTheDocument();
        expect(screen.getByText('No applications in the pipeline yet.')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Closed outcomes. Ghosted: 1' })).toBeInTheDocument();
    });
});
