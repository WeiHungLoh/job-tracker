import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../pages/dashboard/Dashboard';
import { render } from '../renderWithProviders';

const apiMocks = vi.hoisted(() => ({
    listApplications: vi.fn(),
    listInterviews: vi.fn(),
    getDashboardApplicationSummary: vi.fn(),
    listWeeklyApplications: vi.fn(),
    getActiveOfferDecisions: vi.fn(),
}));

vi.mock('../../api/useJobTrackerAPI', () => ({
    useJobTrackerAPI: () => ({
        application: {
            listApplications: apiMocks.listApplications,
            getDashboardApplicationSummary: apiMocks.getDashboardApplicationSummary,
            listWeeklyApplications: apiMocks.listWeeklyApplications,
        },
        interview: { listInterviews: apiMocks.listInterviews },
        offerDecision: { getActive: apiMocks.getActiveOfferDecisions },
    }),
}));

vi.mock('react-chartjs-2', () => ({
    Line: () => <div>Line chart</div>,
}));

const renderDashboard = (initialPreferences = {}) =>
    render(
        <MemoryRouter>
            <Dashboard />
        </MemoryRouter>,
        { initialPreferences }
    );

describe('Dashboard independent loading', () => {
    beforeEach(() => {
        apiMocks.listApplications.mockResolvedValue([]);
        apiMocks.listInterviews.mockResolvedValue([]);
        apiMocks.getDashboardApplicationSummary.mockResolvedValue({
            statusCounts: [{ job_status: 'Applied', count: '2' }],
            interviewedApplicationCount: 1,
        });
        apiMocks.listWeeklyApplications.mockResolvedValue([{ start_of_week: '2026-07-27', applications_count: '3' }]);
        apiMocks.getActiveOfferDecisions.mockResolvedValue({ applications: [] });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    test('keeps successful sections visible when status summary fails and retries only that request', async () => {
        apiMocks.getDashboardApplicationSummary
            .mockRejectedValueOnce(new Error('status unavailable'))
            .mockResolvedValueOnce({
                statusCounts: [{ job_status: 'Applied', count: '2' }],
                interviewedApplicationCount: 1,
            });

        renderDashboard();

        expect(await screen.findByText('Some dashboard sections could not be loaded')).toBeInTheDocument();
        expect(screen.getByText('Applied this week').parentElement).toHaveTextContent('3');
        expect(screen.getByRole('heading', { name: 'No upcoming interviews' })).toBeInTheDocument();
        expect(screen.getByText("You're all caught up")).toBeInTheDocument();
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);

        const roadmap = screen.getByRole('article', { name: 'Job Search Roadmap' });
        expect(within(roadmap).getByText('Unable to load application statistics.')).toBeInTheDocument();
        await userEvent.click(within(roadmap).getByRole('button', { name: 'Try again' }));

        expect(
            await within(roadmap).findByRole('list', {
                name: 'Application pipeline. Applied: 2, Interview: 0, Offer: 0, Accepted: 0',
            })
        ).toBeInTheDocument();
        expect(apiMocks.getDashboardApplicationSummary).toHaveBeenCalledTimes(2);
        expect(apiMocks.listApplications).toHaveBeenCalledTimes(1);
        expect(apiMocks.listInterviews).toHaveBeenCalledTimes(1);
        expect(apiMocks.listWeeklyApplications).toHaveBeenCalledTimes(1);
        expect(apiMocks.getActiveOfferDecisions).toHaveBeenCalledTimes(1);
    });

    test('coalesces multiple initial failures into one error toast and exposes section retry', async () => {
        apiMocks.getDashboardApplicationSummary.mockRejectedValue(new Error('status unavailable'));
        apiMocks.listWeeklyApplications.mockRejectedValue(new Error('weekly unavailable'));

        renderDashboard();

        await screen.findByText('Unable to load application trends.');
        expect(screen.getAllByText('Some dashboard sections could not be loaded')).toHaveLength(1);
        const dashboardStatistics = within(screen.getByRole('region', { name: 'Dashboard statistics' }));
        expect(dashboardStatistics.getByText('Upcoming interviews').parentElement).toHaveTextContent('0');
        expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });

    test('does not request offer evaluations or block unrelated reminders when deadline categories are disabled', async () => {
        renderDashboard({
            needs_attention_categories: ['application-follow-up'],
        });

        await waitFor(() => expect(apiMocks.listApplications).toHaveBeenCalledTimes(1));
        expect(apiMocks.getActiveOfferDecisions).not.toHaveBeenCalled();
        expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
        expect(screen.queryByText('Unable to load Needs Attention.')).not.toBeInTheDocument();
    });

    test('opening settings makes no dashboard request and saving loads only newly required offer data', async () => {
        renderDashboard({
            needs_attention_categories: ['application-follow-up'],
        });

        await waitFor(() => expect(apiMocks.listApplications).toHaveBeenCalledTimes(1));
        expect(apiMocks.getActiveOfferDecisions).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'Customise dashboard reminders' }));
        expect(apiMocks.getDashboardApplicationSummary).toHaveBeenCalledTimes(1);
        expect(apiMocks.listApplications).toHaveBeenCalledTimes(1);
        expect(apiMocks.listInterviews).toHaveBeenCalledTimes(1);
        expect(apiMocks.listWeeklyApplications).toHaveBeenCalledTimes(1);
        expect(apiMocks.getActiveOfferDecisions).not.toHaveBeenCalled();

        await userEvent.click(screen.getByText('Evaluated offers before their decision deadline.'));
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(apiMocks.getActiveOfferDecisions).toHaveBeenCalledTimes(1));
        expect(apiMocks.getDashboardApplicationSummary).toHaveBeenCalledTimes(1);
        expect(apiMocks.listApplications).toHaveBeenCalledTimes(1);
        expect(apiMocks.listInterviews).toHaveBeenCalledTimes(1);
        expect(apiMocks.listWeeklyApplications).toHaveBeenCalledTimes(1);
    });

    test('skips Needs Attention-only requests and shows the distinct disabled state when all categories are disabled', async () => {
        renderDashboard({ needs_attention_categories: [] });

        expect(await screen.findByText('No Needs Attention reminders are enabled.')).toBeInTheDocument();
        expect(screen.queryByText("You're all caught up")).not.toBeInTheDocument();
        expect(apiMocks.listApplications).not.toHaveBeenCalled();
        expect(apiMocks.getActiveOfferDecisions).not.toHaveBeenCalled();
    });
});
