import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { JobTrackerAPIError } from '../../api/models';
import RoutedOfferDecisionPage from '../../pages/offerDecision/OfferDecisionPage';
import type { OfferDecisionWorkspaceData, OfferEvaluation } from '../../pages/offerDecision/models';
import { parseDatetimeLocal } from '../../helper/dateFormatter';
import type { UpdateUserPreferencesRequest } from '../../components/userPreferences/models';
import { render, testPreferences } from '../renderWithProviders';

const mocks = vi.hoisted(() => ({
    confirm: vi.fn(),
    deleteAllActiveEvaluations: vi.fn(),
    deleteAllArchivedEvaluations: vi.fn(),
    deleteEvaluation: vi.fn(),
    deleteCounterofferPlan: vi.fn(),
    getActiveApplicationSummary: vi.fn(),
    getArchivedApplicationSummary: vi.fn(),
    getActive: vi.fn(),
    getArchived: vi.fn(),
    getCounterofferPlan: vi.fn(),
    saveCounterofferPlan: vi.fn(),
    saveEvaluation: vi.fn(),
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
    updateStatus: vi.fn(),
    downloadBulkIcsEvents: vi.fn(),
}));

vi.mock('material-ui-confirm', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('../../hooks/useUnsavedChangesBlocker', () => ({
    useUnsavedChangesBlocker: vi.fn(),
}));
vi.mock('../../helper/calendarEvent', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../helper/calendarEvent')>()),
    downloadBulkIcsEvents: mocks.downloadBulkIcsEvents,
}));

const openOfferActions = (companyName: string) => {
    fireEvent.click(screen.getByRole('button', { name: `More actions for ${companyName}` }));
    return screen.getByRole('menu', { name: `More actions for ${companyName}` });
};

const editOfferEvaluation = (companyName: string) => {
    fireEvent.click(
        within(openOfferActions(companyName)).getByRole('menuitem', {
            name: `Edit evaluation for ${companyName}`,
        })
    );
};

vi.mock('../../api/useJobTrackerAPI', () => ({
    useJobTrackerAPI: () => ({
        application: {
            getSummary: mocks.getActiveApplicationSummary,
            updateStatus: mocks.updateStatus,
        },
        archivedApplication: {
            getSummary: mocks.getArchivedApplicationSummary,
        },
        offerDecision: {
            deleteAllActiveEvaluations: mocks.deleteAllActiveEvaluations,
            deleteAllArchivedEvaluations: mocks.deleteAllArchivedEvaluations,
            deleteEvaluation: mocks.deleteEvaluation,
            deleteCounterofferPlan: mocks.deleteCounterofferPlan,
            getActive: mocks.getActive,
            getArchived: mocks.getArchived,
            getCounterofferPlan: mocks.getCounterofferPlan,
            saveCounterofferPlan: mocks.saveCounterofferPlan,
            saveEvaluation: mocks.saveEvaluation,
        },
    }),
}));

vi.mock('../../components/toast/ToastProvider', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../components/toast/ToastProvider')>()),
    useToast: () => ({
        showErrorToast: mocks.showErrorToast,
        showSuccessToast: mocks.showSuccessToast,
    }),
}));

const details = {
    currency: 'SGD',
    monthly_base_salary: 10000,
    bonus: '15% target',
    annual_leave_days: 21,
    work_arrangement: 'Hybrid' as const,
    decision_deadline: '2099-08-15T10:00:00.000Z',
    pros: 'Strong product ownership',
    concerns: 'Two office days each week',
};

const ratings = {
    career_growth: 4,
    company_culture_fit: 4,
    work_life_balance: 4,
    compensation: 4,
};

const createEvaluation = (jobId: number): OfferEvaluation => ({
    job_id: jobId,
    ratings,
    details,
});

const workspaceData: OfferDecisionWorkspaceData = {
    applications: [
        {
            job_id: 11,
            company_name: 'Acme',
            job_title: 'Engineer',
            job_status: 'Offer',
            application_date: '2026-07-01T08:00:00.000Z',
            evaluation: createEvaluation(11),
        },
        {
            job_id: 12,
            company_name: 'Past Co',
            job_title: 'Developer',
            job_status: 'Declined',
            application_date: '2026-06-01T08:00:00.000Z',
            evaluation: createEvaluation(12),
        },
        {
            job_id: 13,
            company_name: 'Beta Labs',
            job_title: 'Platform Developer',
            job_status: 'Offer',
            application_date: '2026-07-10T08:00:00.000Z',
            evaluation: null,
        },
    ],
};

const waitForActiveWorkspace = () => screen.findByRole('heading', { name: 'Evaluated Offers' });

const OfferDecisionPage = ({ archived }: { archived: boolean }) => (
    <MemoryRouter>
        <RoutedOfferDecisionPage archived={archived} />
    </MemoryRouter>
);

describe('OfferDecisionPage', () => {
    beforeEach(() => {
        Object.values(mocks).forEach((mock) => mock.mockReset());
        mocks.confirm.mockResolvedValue({ confirmed: true });
        mocks.deleteAllActiveEvaluations.mockResolvedValue(null);
        mocks.deleteAllArchivedEvaluations.mockResolvedValue(null);
        mocks.deleteEvaluation.mockResolvedValue(null);
        mocks.deleteCounterofferPlan.mockResolvedValue(null);
        mocks.getActiveApplicationSummary.mockResolvedValue({
            offer_evaluation_count: 2,
            counteroffer_plan_count: 1,
        });
        mocks.getArchivedApplicationSummary.mockResolvedValue({
            offer_evaluation_count: 2,
            counteroffer_plan_count: 1,
        });
        mocks.getActive.mockResolvedValue(workspaceData);
        mocks.getArchived.mockResolvedValue(workspaceData);
        mocks.getCounterofferPlan.mockResolvedValue({
            monthly_base_salary: 11000,
            bonus: '',
            annual_leave_days: 20,
            work_arrangement: 'Hybrid',
            ratings: {
                career_growth: 4,
                company_culture_fit: 4,
                work_life_balance: 4,
                compensation: 5,
            },
        });
        mocks.saveCounterofferPlan.mockResolvedValue(null);
        mocks.saveEvaluation.mockResolvedValue(null);
        mocks.updateStatus.mockResolvedValue(null);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('requests the saved active filters initially', async () => {
        render(<OfferDecisionPage archived={false} />, {
            initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
        });

        expect(await screen.findByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(mocks.getActive).toHaveBeenCalledWith({ filters: ['Previous Evaluations'] });
    });

    test('moves a loaded evaluated offer into the expired view when its deadline passes', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2030-01-01T10:00:00.000Z'));
        const endingOffer = {
            ...workspaceData.applications[0],
            company_name: 'Deadline Boundary',
            evaluation: {
                ...createEvaluation(11),
                details: {
                    ...details,
                    decision_deadline: '2030-01-01T10:00:20.000Z',
                },
            },
        };
        mocks.getActive.mockImplementation(async ({ filters }: { filters: string[] }) => ({
            applications:
                filters.includes('Evaluated Offers') && filters.includes('Expired Evaluated Offers')
                    ? [endingOffer]
                    : [],
        }));

        render(<OfferDecisionPage archived={false} />, {
            initialPreferences: { offer_decision_filters: ['Expired Evaluated Offers'] },
        });
        await act(async () => vi.advanceTimersByTimeAsync(0));

        expect(screen.queryByRole('article', { name: 'Deadline Boundary Engineer' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'No offer comparisons match your filters' })).toBeInTheDocument();

        await act(async () => vi.advanceTimersByTimeAsync(30_000));

        expect(screen.getByRole('heading', { name: 'Expired Evaluated Offers' })).toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Deadline Boundary Engineer' })).toBeInTheDocument();
    });

    test('persists active and archived Table modes without refetching either workspace', async () => {
        const updatePreferences = vi.fn(async (updates: UpdateUserPreferencesRequest) => ({
            ...testPreferences,
            ...updates,
        }));
        const activeRender = render(<OfferDecisionPage archived={false} />, { updatePreferences });
        await waitForActiveWorkspace();

        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Table' }));
        });
        expect(updatePreferences).toHaveBeenCalledWith({ offer_decision_view_mode: 'table' });
        expect(screen.getByRole('table', { name: 'Evaluated Offers' })).toBeInTheDocument();
        expect(mocks.getActive).toHaveBeenCalledOnce();

        activeRender.unmount();
        render(<OfferDecisionPage archived />, { updatePreferences });
        await screen.findByRole('heading', { name: 'Archived Evaluated Offers' });
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Table' }));
        });
        expect(updatePreferences).toHaveBeenCalledWith({ archived_offer_decision_view_mode: 'table' });
        expect(screen.getByRole('table', { name: 'Archived Evaluated Offers' })).toBeInTheDocument();
        expect(mocks.getArchived).toHaveBeenCalledOnce();
    });

    test('reuses the complete loaded Evaluated Offers group for bulk deadline export', async () => {
        mocks.confirm.mockResolvedValueOnce({ confirmed: false });
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' }));

        await waitFor(() =>
            expect(mocks.confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Export all active evaluated offer deadlines?',
                    description:
                        'This will download one .ics file containing all 1 active evaluated offer deadline, including offers you may already have added to your calendar. Importing the file again may create duplicate calendar events.',
                    confirmationText: 'Export all',
                })
            )
        );
        expect(mocks.getActive).toHaveBeenCalledOnce();
        expect(mocks.downloadBulkIcsEvents).not.toHaveBeenCalled();
    });

    test('downloads every eligible deadline in deadline order while excluding other offer groups', async () => {
        mocks.getActive.mockResolvedValue({
            applications: [
                ...workspaceData.applications,
                {
                    ...workspaceData.applications[0],
                    job_id: 14,
                    company_name: 'Earlier Co',
                    evaluation: {
                        ...createEvaluation(14),
                        details: { ...details, decision_deadline: '2099-08-10T10:00:00.000Z' },
                    },
                },
                {
                    ...workspaceData.applications[0],
                    job_id: 15,
                    company_name: 'Expired Co',
                    evaluation: {
                        ...createEvaluation(15),
                        details: { ...details, decision_deadline: '2000-07-01T10:00:00.000Z' },
                    },
                },
                {
                    ...workspaceData.applications[0],
                    job_id: 16,
                    company_name: 'Accepted Co',
                    job_status: 'Accepted',
                    evaluation: createEvaluation(16),
                },
            ],
        });
        mocks.confirm.mockResolvedValueOnce({ confirmed: true });
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' }));

        await waitFor(() => expect(mocks.downloadBulkIcsEvents).toHaveBeenCalledOnce());
        expect(mocks.downloadBulkIcsEvents).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    title: 'Offer decision deadline — Earlier Co',
                    uid: 'offer-decision-14@jobtracker.weihungloh.com',
                }),
                expect.objectContaining({
                    title: 'Offer decision deadline — Acme',
                    uid: 'offer-decision-11@jobtracker.weihungloh.com',
                }),
            ],
            'job-tracker-active-offer-deadlines.ics'
        );
        const [exportedEvents] = mocks.downloadBulkIcsEvents.mock.calls[0];
        expect(exportedEvents).toHaveLength(2);
        expect(exportedEvents.map(({ uid }: { uid: string }) => uid)).not.toEqual(
            expect.arrayContaining([
                'offer-decision-12@jobtracker.weihungloh.com',
                'offer-decision-15@jobtracker.weihungloh.com',
                'offer-decision-16@jobtracker.weihungloh.com',
            ])
        );
        expect(mocks.getActive).toHaveBeenCalledOnce();
    });

    test('loads Evaluated Offers once for bulk export without changing the visible filters', async () => {
        mocks.confirm.mockResolvedValueOnce({ confirmed: false });
        render(<OfferDecisionPage archived={false} />, {
            initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
        });
        await screen.findByRole('heading', { name: 'Previous Evaluations' });

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' }));

        await waitFor(() => expect(mocks.getActive).toHaveBeenCalledTimes(2));
        expect(mocks.getActive).toHaveBeenNthCalledWith(1, { filters: ['Previous Evaluations'] });
        expect(mocks.getActive).toHaveBeenNthCalledWith(2, { filters: ['Evaluated Offers'] });
        expect(screen.getByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Evaluated Offers' })).not.toBeInTheDocument();
        expect(mocks.downloadBulkIcsEvents).not.toHaveBeenCalled();
    });

    test('does not confirm or download when an on-demand Evaluated Offers request returns no deadlines', async () => {
        mocks.getActive
            .mockResolvedValueOnce({ applications: [workspaceData.applications[1]] })
            .mockResolvedValueOnce({ applications: [] });
        render(<OfferDecisionPage archived={false} />, {
            initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
        });
        await screen.findByRole('heading', { name: 'Previous Evaluations' });

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' }));

        await waitFor(() => expect(mocks.getActive).toHaveBeenCalledTimes(2));
        expect(mocks.confirm).not.toHaveBeenCalled();
        expect(mocks.downloadBulkIcsEvents).not.toHaveBeenCalled();
    });

    test('shows the API error and restores bulk export after an on-demand request fails', async () => {
        mocks.getActive
            .mockResolvedValueOnce({ applications: [workspaceData.applications[1]] })
            .mockRejectedValueOnce(new JobTrackerAPIError('Unable to load deadlines.', 500));
        render(<OfferDecisionPage archived={false} />, {
            initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
        });
        await screen.findByRole('heading', { name: 'Previous Evaluations' });

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' }));

        await waitFor(() => expect(mocks.showErrorToast).toHaveBeenCalledWith('Unable to load deadlines.'));
        expect(mocks.confirm).not.toHaveBeenCalled();
        expect(mocks.downloadBulkIcsEvents).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' })
        ).toBeEnabled();
    });

    test('prevents duplicate on-demand Evaluated Offers requests during one bulk export action', async () => {
        let resolveEvaluatedOffers!: (data: OfferDecisionWorkspaceData) => void;
        mocks.getActive.mockResolvedValueOnce({ applications: [workspaceData.applications[1]] }).mockImplementationOnce(
            () =>
                new Promise<OfferDecisionWorkspaceData>((resolve) => {
                    resolveEvaluatedOffers = resolve;
                })
        );
        render(<OfferDecisionPage archived={false} />, {
            initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
        });
        await screen.findByRole('heading', { name: 'Previous Evaluations' });

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        const exportAction = screen.getByRole('button', {
            name: 'Export all active evaluated offer deadlines (.ics)',
        });
        fireEvent.click(exportAction);
        fireEvent.click(exportAction);

        expect(mocks.getActive).toHaveBeenCalledTimes(2);
        await act(async () => resolveEvaluatedOffers({ applications: [] }));
        expect(mocks.confirm).not.toHaveBeenCalled();
    });

    test('never exposes bulk offer deadline export in archived Offer Comparison', async () => {
        render(<OfferDecisionPage archived />);
        await screen.findByRole('heading', { name: 'Archived Evaluated Offers' });

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));

        expect(
            screen.queryByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' })
        ).not.toBeInTheDocument();
        expect(mocks.getActive).not.toHaveBeenCalled();
    });

    test('shows, scrolls to and highlights a dashboard-targeted evaluated offer', async () => {
        const updatePreferences = vi.fn(async (updates: UpdateUserPreferencesRequest) => ({
            ...testPreferences,
            ...updates,
        }));
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;

        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: '/offer-comparison',
                        state: {
                            dashboardOfferDecisionJobId: 11,
                            dashboardOfferDecisionFilter: 'Evaluated Offers',
                        },
                    },
                ]}
            >
                <RoutedOfferDecisionPage archived={false} />
            </MemoryRouter>,
            {
                initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
                updatePreferences,
            }
        );

        await waitFor(() =>
            expect(mocks.getActive).toHaveBeenCalledWith({
                filters: ['Previous Evaluations', 'Evaluated Offers', 'Expired Evaluated Offers'],
            })
        );
        await waitFor(() =>
            expect(scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start',
            })
        );
        expect(updatePreferences).toHaveBeenCalledWith({
            offer_decision_filters: ['Previous Evaluations', 'Evaluated Offers'],
        });
        expect(screen.getByRole('article', { name: 'Acme Engineer' }).className).toContain('highlight');

        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    test('forces Offers to Evaluate for a dashboard evaluate-offer target', async () => {
        const updatePreferences = vi.fn(async (updates: UpdateUserPreferencesRequest) => ({
            ...testPreferences,
            ...updates,
        }));

        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: '/offer-comparison',
                        state: {
                            dashboardOfferDecisionJobId: 13,
                            dashboardOfferDecisionFilter: 'Offers to Evaluate',
                        },
                    },
                ]}
            >
                <RoutedOfferDecisionPage archived={false} />
            </MemoryRouter>,
            {
                initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
                updatePreferences,
            }
        );

        await waitFor(() =>
            expect(mocks.getActive).toHaveBeenCalledWith({
                filters: ['Previous Evaluations', 'Offers to Evaluate'],
            })
        );
        await waitFor(() =>
            expect(screen.getByRole('article', { name: 'Beta Labs Platform Developer' }).className).toContain(
                'highlight'
            )
        );
        expect(updatePreferences).toHaveBeenCalledWith({
            offer_decision_filters: ['Previous Evaluations', 'Offers to Evaluate'],
        });
    });

    test('fetches active offer filters before saving the changed selection', async () => {
        const requestOrder: string[] = [];
        const updatePreferences = vi.fn(async (updates: UpdateUserPreferencesRequest) => {
            requestOrder.push('preference');
            return { ...testPreferences, ...updates };
        });
        mocks.getActive.mockImplementation(async ({ filters }: { filters: string[] }) => {
            if (filters.length === 1 && filters[0] === 'Previous Evaluations') {
                requestOrder.push('filtered-get');
                return { applications: [workspaceData.applications[1]] };
            }
            return workspaceData;
        });

        render(<OfferDecisionPage archived={false} />, { updatePreferences });
        await waitForActiveWorkspace();
        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Previous Evaluations' }));

        expect(await screen.findByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(requestOrder).toEqual(['filtered-get', 'preference']);
        expect(updatePreferences).toHaveBeenCalledWith({ offer_decision_filters: ['Previous Evaluations'] });
    });

    test('shows Clear filters when an active server-side filter returns no offers', async () => {
        mocks.getActive.mockImplementation(async ({ filters }: { filters: string[] }) =>
            filters.length === 1 ? { applications: [] } : workspaceData
        );

        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();
        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Previous Evaluations' }));

        expect(
            await screen.findByRole('heading', { name: 'No offer comparisons match your filters' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Try showing all evaluation types to see every active offer comparison.')
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(await screen.findByRole('heading', { name: 'Evaluated Offers' })).toBeInTheDocument();
        expect(mocks.getActive).toHaveBeenLastCalledWith({
            filters: ['Offers to Evaluate', 'Evaluated Offers', 'Expired Evaluated Offers', 'Previous Evaluations'],
        });
    });

    test('requests archived filters from the server and saves only the archived preference', async () => {
        const updatePreferences = vi.fn(async (updates: UpdateUserPreferencesRequest) => ({
            ...testPreferences,
            ...updates,
        }));
        mocks.getArchived.mockResolvedValue({ applications: [workspaceData.applications[1]] });

        render(<OfferDecisionPage archived />, {
            initialPreferences: { archived_offer_decision_filters: ['Previous Evaluations'] },
            updatePreferences,
        });

        expect(await screen.findByRole('heading', { name: 'Archived Previous Evaluations' })).toBeInTheDocument();
        expect(mocks.getArchived).toHaveBeenCalledWith({ filters: ['Previous Evaluations'] });
        expect(updatePreferences).not.toHaveBeenCalled();
    });

    test('fetches archived offer filters before saving the changed selection', async () => {
        const requestOrder: string[] = [];
        const updatePreferences = vi.fn(async (updates: UpdateUserPreferencesRequest) => {
            requestOrder.push('preference');
            return { ...testPreferences, ...updates };
        });
        mocks.getArchived.mockImplementation(async ({ filters }: { filters: string[] }) => {
            if (filters.length === 1 && filters[0] === 'Previous Evaluations') {
                requestOrder.push('filtered-get');
                return { applications: [workspaceData.applications[1]] };
            }
            return workspaceData;
        });

        render(<OfferDecisionPage archived />, { updatePreferences });
        await screen.findByRole('heading', { name: 'Archived Evaluated Offers' });
        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Previous Evaluations' }));

        expect(await screen.findByRole('heading', { name: 'Archived Previous Evaluations' })).toBeInTheDocument();
        expect(requestOrder).toEqual(['filtered-get', 'preference']);
        expect(updatePreferences).toHaveBeenCalledWith({
            archived_offer_decision_filters: ['Previous Evaluations'],
        });
    });

    test('shows Clear filters when an archived server-side filter returns no offers', async () => {
        mocks.getArchived.mockImplementation(async ({ filters }: { filters: string[] }) =>
            filters.length === 1 ? { applications: [] } : workspaceData
        );

        render(<OfferDecisionPage archived />);
        await screen.findByRole('heading', { name: 'Archived Evaluated Offers' });
        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Previous Evaluations' }));

        expect(
            await screen.findByRole('heading', { name: 'No archived offer comparisons match your filters' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Try showing all evaluation types to see every archived offer comparison.')
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(await screen.findByRole('heading', { name: 'Archived Evaluated Offers' })).toBeInTheDocument();
        expect(mocks.getArchived).toHaveBeenLastCalledWith({
            filters: ['Evaluated Offers', 'Expired Evaluated Offers', 'Previous Evaluations'],
        });
    });

    test('ignores an older offer filter response after a newer selection finishes', async () => {
        let resolveOlderFilter: (value: OfferDecisionWorkspaceData) => void = () => undefined;
        const olderApplication = {
            ...workspaceData.applications[1],
            company_name: 'Older Offer Result',
        };
        const latestApplication = {
            ...workspaceData.applications[1],
            company_name: 'Latest Offer Result',
        };
        let requestCount = 0;
        mocks.getActive.mockImplementation(async () => {
            requestCount += 1;
            if (requestCount === 2) {
                return new Promise((resolve) => {
                    resolveOlderFilter = resolve;
                });
            }
            if (requestCount === 3) {
                return { applications: [latestApplication] };
            }
            return workspaceData;
        });

        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();
        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Offers to Evaluate' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Evaluated Offers' }));

        expect(await screen.findByRole('article', { name: 'Latest Offer Result Developer' })).toBeInTheDocument();
        await act(async () => resolveOlderFilter({ applications: [olderApplication] }));
        expect(screen.queryByRole('article', { name: 'Older Offer Result Developer' })).not.toBeInTheDocument();
    });

    test('refetches a filter that started before an offer status update committed', async () => {
        let resolveStatusUpdate: () => void = () => undefined;
        let resolveStaleFilter: (value: OfferDecisionWorkspaceData) => void = () => undefined;
        let workspaceRequestCount = 0;
        const updatedWorkspace = {
            applications: workspaceData.applications.map((application) =>
                application.job_id === 11 ? { ...application, job_status: 'Accepted' } : application
            ),
        } satisfies OfferDecisionWorkspaceData;

        mocks.updateStatus.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveStatusUpdate = resolve;
                })
        );
        mocks.getActive.mockImplementation(async () => {
            workspaceRequestCount += 1;
            if (workspaceRequestCount === 2) {
                return new Promise((resolve) => {
                    resolveStaleFilter = resolve;
                });
            }
            return workspaceRequestCount === 3 ? updatedWorkspace : workspaceData;
        });

        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(
            within(openOfferActions('Acme')).getByRole('menuitem', {
                name: 'Accept offer from Acme',
            })
        );
        await waitFor(() => expect(mocks.updateStatus).toHaveBeenCalledOnce());

        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Offers to Evaluate' }));
        await waitFor(() => expect(workspaceRequestCount).toBe(2));

        await act(async () => resolveStatusUpdate());
        await act(async () => resolveStaleFilter(workspaceData));

        await waitFor(() => expect(workspaceRequestCount).toBe(3));
        expect(
            within(openOfferActions('Acme')).getByRole('menuitem', {
                name: 'Change to Offer for Acme',
            })
        ).toBeInTheDocument();
    });

    test('restores saved offer filters when the filtered GET fails', async () => {
        mocks.getActive.mockImplementation(async ({ filters }: { filters: string[] }) => {
            if (filters.length === 3) {
                throw new Error('offline');
            }
            return workspaceData;
        });

        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();
        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Offers to Evaluate' }));

        await waitFor(() =>
            expect(mocks.showErrorToast).toHaveBeenCalledWith('Unable to filter offer comparisons. Please try again.')
        );
        expect(screen.getByRole('checkbox', { name: 'Offers to Evaluate' })).toBeChecked();
        expect(screen.getByRole('heading', { name: 'Offers to Evaluate' })).toBeInTheDocument();
    });

    test('restores saved offer filters when preference persistence fails after the GET', async () => {
        mocks.getActive.mockImplementation(async ({ filters }: { filters: string[] }) =>
            filters.length === 1 ? { applications: [workspaceData.applications[1]] } : workspaceData
        );
        const updatePreferences = vi.fn().mockRejectedValue(new Error('save failed'));

        render(<OfferDecisionPage archived={false} />, { updatePreferences });
        await waitForActiveWorkspace();
        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Previous Evaluations' }));

        await waitFor(() =>
            expect(mocks.showErrorToast).toHaveBeenCalledWith('Unable to filter offer comparisons. Please try again.')
        );
        expect(screen.getByRole('checkbox', { name: 'Offers to Evaluate' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Evaluated Offers' })).toBeChecked();
        expect(screen.getByRole('heading', { name: 'Offers to Evaluate' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Evaluated Offers' })).toBeInTheDocument();
    });

    test('saves one new evaluation, moves it locally and does not refetch', async () => {
        render(<OfferDecisionPage archived={false} />);

        expect(await waitForActiveWorkspace()).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Offer Comparison' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
        fireEvent.change(screen.getByLabelText('Beta Labs decision deadline'), {
            target: { value: '2026-08-20T10:00' },
        });
        fireEvent.change(screen.getByLabelText('Beta Labs monthly base salary'), { target: { value: '9000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Beta Labs' }));

        await waitFor(() =>
            expect(mocks.saveEvaluation).toHaveBeenCalledWith({
                jobId: 13,
                ratings: {
                    career_growth: 3,
                    company_culture_fit: 3,
                    work_life_balance: 3,
                    compensation: 3,
                },
                details: {
                    currency: 'SGD',
                    monthly_base_salary: 9000,
                    bonus: '',
                    annual_leave_days: null,
                    work_arrangement: '',
                    decision_deadline: parseDatetimeLocal('2026-08-20T10:00').toISOString(),
                    pros: '',
                    concerns: '',
                },
            })
        );
        expect(mocks.getActive).toHaveBeenCalledOnce();
        expect(mocks.getArchived).not.toHaveBeenCalled();
        expect(
            within(openOfferActions('Beta Labs')).getByRole('menuitem', {
                name: 'Edit evaluation for Beta Labs',
            })
        ).toBeInTheDocument();
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Offer evaluation added.');
    });

    test('shows a success toast when a saved evaluation is updated', async () => {
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme bonus'), { target: { value: '20% target' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() => expect(mocks.saveEvaluation).toHaveBeenCalledOnce());
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Offer evaluation saved.');
    });

    test('updates an evaluated offer status locally and shows its offer-decision success toast', async () => {
        mocks.getActive.mockResolvedValue({
            applications: [
                { ...workspaceData.applications[0], has_counteroffer_plan: true },
                ...workspaceData.applications.slice(1),
            ],
        });
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(
            within(openOfferActions('Acme')).getByRole('menuitem', {
                name: 'Accept offer from Acme',
            })
        );

        await waitFor(() =>
            expect(mocks.updateStatus).toHaveBeenCalledWith({
                jobId: 11,
                jobStatus: 'Accepted',
            })
        );
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Offer marked as Accepted.');
        expect(screen.getByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Acme Engineer' })).toBeInTheDocument();
        expect(
            within(openOfferActions('Acme')).getByRole('menuitem', { name: 'View counteroffer plan for Acme' })
        ).toBeInTheDocument();
    });

    test('changes a previous evaluation back to Offer without losing the evaluation', async () => {
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(
            within(openOfferActions('Past Co')).getByRole('menuitem', {
                name: 'Change to Offer for Past Co',
            })
        );

        await waitFor(() =>
            expect(mocks.updateStatus).toHaveBeenCalledWith({
                jobId: 12,
                jobStatus: 'Offer',
            })
        );
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Application marked as Offer.');
        expect(screen.getByRole('heading', { name: 'Evaluated Offers' })).toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Past Co Developer' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Add evaluation for Past Co' })).not.toBeInTheDocument();
    });

    test('keeps an evaluated offer active and shows the backend message when its status update fails', async () => {
        mocks.updateStatus.mockRejectedValueOnce(new JobTrackerAPIError('Status update failed.', 422));
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(
            within(openOfferActions('Acme')).getByRole('menuitem', {
                name: 'Decline offer from Acme',
            })
        );

        await waitFor(() => expect(mocks.showErrorToast).toHaveBeenCalledWith('Status update failed.'));
        expect(screen.getByRole('heading', { name: 'Evaluated Offers' })).toBeInTheDocument();
        expect(mocks.showSuccessToast).not.toHaveBeenCalledWith('Offer marked as Declined.');
    });

    test('confirms counteroffer deletion before saving a higher edited evaluation without an error toast', async () => {
        mocks.getActive.mockResolvedValue({
            applications: [{ ...workspaceData.applications[0], has_counteroffer_plan: true }],
        });
        mocks.saveEvaluation
            .mockRejectedValueOnce(
                new JobTrackerAPIError('Conflict', 409, {
                    code: 'OFFER_EVALUATION_ABOVE_COUNTEROFFER',
                    message:
                        'This evaluation fit rating is higher than the saved counteroffer plan. Confirm deletion of the counteroffer plan before saving.',
                })
            )
            .mockResolvedValueOnce(null);

        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme Career Growth rating'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Acme Company/Culture Fit rating'), { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() =>
            expect(mocks.confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Delete counteroffer plan?',
                    confirmationText: 'Delete and save',
                    confirmationButtonProps: { autoFocus: true, color: 'error', variant: 'contained' },
                })
            )
        );
        await waitFor(() => expect(mocks.saveEvaluation).toHaveBeenCalledTimes(2));
        expect(mocks.saveEvaluation.mock.calls[1][0]).toEqual(
            expect.objectContaining({ jobId: 11, deleteCounterofferPlan: true })
        );
        expect(mocks.showErrorToast).not.toHaveBeenCalled();
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Offer evaluation saved.');
        expect(
            within(openOfferActions('Acme')).getByRole('menuitem', {
                name: 'Plan counteroffer for Acme',
            })
        ).toBeInTheDocument();
    });

    test('shows inline validation without a duplicate toast for an earlier decision deadline', async () => {
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme decision deadline'), {
            target: { value: '2026-06-30T10:00' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        expect(screen.getByText('Decision deadline cannot be earlier than the application date.')).toBeInTheDocument();
        expect(screen.getByLabelText('Acme decision deadline')).toHaveFocus();
        expect(mocks.showErrorToast).not.toHaveBeenCalled();
        expect(mocks.saveEvaluation).not.toHaveBeenCalled();
    });

    test('uses the backend save message and preserves the editable draft after failure', async () => {
        mocks.saveEvaluation.mockRejectedValueOnce(
            new JobTrackerAPIError('Decision deadline cannot be earlier than the application date.', 422)
        );
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme bonus'), { target: { value: '20% target' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() =>
            expect(mocks.showErrorToast).toHaveBeenCalledWith(
                'Decision deadline cannot be earlier than the application date.'
            )
        );
        expect(screen.getByLabelText('Acme bonus')).toHaveValue('20% target');
        expect(mocks.showSuccessToast).not.toHaveBeenCalled();
    });

    test('deletes an Offer evaluation locally and keeps its application ready to evaluate again', async () => {
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(screen.getByRole('button', { name: 'Delete evaluation for Acme' }));

        await waitFor(() => expect(mocks.deleteEvaluation).toHaveBeenCalledWith({ jobId: 11 }));
        expect(await screen.findByRole('button', { name: 'Add evaluation for Acme' })).toBeInTheDocument();
        expect(mocks.getActive).toHaveBeenCalledOnce();
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Offer evaluation deleted.');
    });

    test('removes deleted previous history locally without deleting the application', async () => {
        render(<OfferDecisionPage archived={false} />);
        await screen.findByRole('heading', { name: 'Previous Evaluations' });

        fireEvent.click(screen.getByRole('button', { name: 'Delete evaluation for Past Co' }));

        await waitFor(() => expect(mocks.deleteEvaluation).toHaveBeenCalledWith({ jobId: 12 }));
        await waitFor(() => {
            expect(screen.queryByRole('article', { name: 'Past Co Developer' })).not.toBeInTheDocument();
        });
        expect(mocks.getActive).toHaveBeenCalledOnce();
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Offer evaluation deleted.');
    });

    test('loads archived comparisons as read-only but keeps deletion available', async () => {
        render(<OfferDecisionPage archived />);

        expect(await screen.findByRole('heading', { name: 'Archived Evaluated Offers' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Archived Offer Comparisons' })).not.toBeInTheDocument();
        expect(mocks.getArchived).toHaveBeenCalledOnce();
        expect(mocks.getActive).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: /edit evaluation/i })).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /delete evaluation/i })).not.toHaveLength(0);
        expect(screen.queryByRole('button', { name: /save evaluation/i })).not.toBeInTheDocument();
    });

    test('shows the standard load error and retries only on request', async () => {
        mocks.getActive.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(workspaceData);
        render(<OfferDecisionPage archived={false} />);

        expect(await screen.findByRole('heading', { name: 'Offer comparisons are unavailable' })).toBeInTheDocument();
        expect(mocks.showErrorToast).toHaveBeenCalledWith('Unable to load offer comparisons. Please try again.');
        expect(mocks.getActive).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(await waitForActiveWorkspace()).toBeInTheDocument();
        expect(mocks.getActive).toHaveBeenCalledTimes(2);
    });

    test('uses the backend delete message and preserves the evaluation after failure', async () => {
        mocks.deleteEvaluation.mockRejectedValueOnce(new JobTrackerAPIError('Evaluation no longer exists.', 404));
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(screen.getByRole('button', { name: 'Delete evaluation for Acme' }));

        await waitFor(() => expect(mocks.showErrorToast).toHaveBeenCalledWith('Evaluation no longer exists.'));
        expect(screen.getByRole('button', { name: 'Delete evaluation for Acme' })).toBeInTheDocument();
        expect(mocks.showSuccessToast).not.toHaveBeenCalled();
    });

    test('deletes only active evaluations in bulk and keeps current offers', async () => {
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));

        await waitFor(() => expect(mocks.deleteAllActiveEvaluations).toHaveBeenCalledOnce());
        expect(mocks.getActiveApplicationSummary).toHaveBeenCalledOnce();
        expect(mocks.getArchivedApplicationSummary).not.toHaveBeenCalled();
        expect(mocks.deleteAllArchivedEvaluations).not.toHaveBeenCalled();
        expect(await screen.findByRole('button', { name: 'Add evaluation for Acme' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' })).toBeInTheDocument();
        expect(screen.queryByRole('article', { name: 'Past Co Developer' })).not.toBeInTheDocument();
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Active offer evaluations deleted.');
        expect(mocks.getActive).toHaveBeenCalledOnce();
    });

    test('uses the archived bulk endpoint and clears archived evaluation snapshots', async () => {
        render(<OfferDecisionPage archived />);
        await screen.findByRole('heading', { name: 'Archived Evaluated Offers' });

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));

        await waitFor(() => expect(mocks.deleteAllArchivedEvaluations).toHaveBeenCalledOnce());
        expect(mocks.getArchivedApplicationSummary).toHaveBeenCalledOnce();
        expect(mocks.getActiveApplicationSummary).not.toHaveBeenCalled();
        expect(mocks.deleteAllActiveEvaluations).not.toHaveBeenCalled();
        expect(await screen.findByRole('heading', { name: 'No archived offer comparisons' })).toBeInTheDocument();
        expect(mocks.showSuccessToast).toHaveBeenCalledWith('Archived offer evaluations deleted.');
        expect(mocks.getArchived).toHaveBeenCalledOnce();
    });

    test('shows the bulk deletion error and preserves evaluations', async () => {
        mocks.deleteAllActiveEvaluations.mockRejectedValueOnce(
            new JobTrackerAPIError('Unable to delete these evaluations.', 500)
        );
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        fireEvent.click(screen.getByRole('button', { name: 'More…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));

        await waitFor(() => expect(mocks.showErrorToast).toHaveBeenCalledWith('Unable to delete these evaluations.'));
        expect(screen.getByRole('button', { name: 'Delete evaluation for Acme' })).toBeInTheDocument();
        expect(mocks.showSuccessToast).not.toHaveBeenCalled();
    });
});
