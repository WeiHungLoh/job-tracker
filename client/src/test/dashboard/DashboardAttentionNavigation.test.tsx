import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import Dashboard from '../../pages/dashboard/Dashboard';
import type { JobApplication } from '../../pages/application/models';
import { routes } from '../../routes';
import { render } from '../renderWithProviders';

const apiMocks = vi.hoisted(() => ({
    listApplications: vi.fn(),
    listInterviews: vi.fn(),
    listJobStatusCounts: vi.fn(),
    listWeeklyApplications: vi.fn(),
    getActiveOfferDecisions: vi.fn(),
}));

vi.mock('../../api/useJobTrackerAPI', () => ({
    useJobTrackerAPI: () => ({
        application: {
            listApplications: apiMocks.listApplications,
            listJobStatusCounts: apiMocks.listJobStatusCounts,
            listWeeklyApplications: apiMocks.listWeeklyApplications,
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
    const location = useLocation() as Location<{ app?: JobApplication }>;

    return <p>Add Interview destination for {location.state?.app?.company_name ?? 'missing application'}</p>;
};

const OfferComparisonDestination = () => {
    const location = useLocation();
    return <output data-testid='offer-comparison-state'>{JSON.stringify(location.state)}</output>;
};

const renderDashboardRoutes = () =>
    render(
        <MemoryRouter initialEntries={[routes.dashboard]}>
            <Routes>
                <Route path={routes.dashboard} element={<Dashboard />} />
                <Route path={routes.addInterview} element={<AddInterviewDestination />} />
                <Route path={routes.offerDecisions} element={<OfferComparisonDestination />} />
                <Route path={routes.viewApplications} element={<ApplicationListDestination />} />
            </Routes>
        </MemoryRouter>
    );

const ApplicationListDestination = () => {
    const location = useLocation();
    return <output data-testid='application-list-state'>{JSON.stringify(location.state)}</output>;
};

describe('signed-in dashboard attention navigation', () => {
    beforeEach(() => {
        apiMocks.listInterviews.mockResolvedValue([]);
        apiMocks.listJobStatusCounts.mockResolvedValue([]);
        apiMocks.listWeeklyApplications.mockResolvedValue([]);
        apiMocks.getActiveOfferDecisions.mockResolvedValue({ applications: [] });
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
    });
});
