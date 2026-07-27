import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { JobTrackerAPIError } from '../../api/models';
import OfferDecisionPage from '../../pages/offerDecision/OfferDecisionPage';
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
}));

vi.mock('material-ui-confirm', () => ({ useConfirm: () => mocks.confirm }));

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
    decision_deadline: '2026-08-15T10:00:00.000Z',
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

describe('OfferDecisionPage', () => {
    beforeEach(() => {
        Object.values(mocks).forEach((mock) => mock.mockReset());
        mocks.confirm.mockResolvedValue({ confirmed: true });
        mocks.deleteAllActiveEvaluations.mockResolvedValue(null);
        mocks.deleteAllArchivedEvaluations.mockResolvedValue(null);
        mocks.deleteEvaluation.mockResolvedValue(null);
        mocks.deleteCounterofferPlan.mockResolvedValue(null);
        mocks.getActiveApplicationSummary.mockResolvedValue({ offer_evaluation_count: 2 });
        mocks.getArchivedApplicationSummary.mockResolvedValue({ offer_evaluation_count: 2 });
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
    });

    test('requests the saved active filters initially', async () => {
        render(<OfferDecisionPage archived={false} />, {
            initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
        });

        expect(await screen.findByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(mocks.getActive).toHaveBeenCalledWith({ filters: ['Previous Evaluations'] });
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
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
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
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
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
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
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
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
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
        mocks.getActive.mockImplementation(async ({ filters }: { filters: string[] }) => {
            if (filters.length === 3 && !filters.includes('Offers to Evaluate')) {
                return new Promise((resolve) => {
                    resolveOlderFilter = resolve;
                });
            }
            if (filters.length === 2) {
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
        fireEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
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

    test('does not show a success toast when a saved evaluation is updated', async () => {
        render(<OfferDecisionPage archived={false} />);
        await waitForActiveWorkspace();

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme bonus'), { target: { value: '20% target' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() => expect(mocks.saveEvaluation).toHaveBeenCalledOnce());
        expect(mocks.showSuccessToast).not.toHaveBeenCalled();
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
        expect(mocks.showSuccessToast).not.toHaveBeenCalled();
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
        expect(mocks.showSuccessToast).not.toHaveBeenCalled();
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

        fireEvent.click(screen.getByRole('button', { name: 'More...' }));
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

        fireEvent.click(screen.getByRole('button', { name: 'More...' }));
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

        fireEvent.click(screen.getByRole('button', { name: 'More...' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));

        await waitFor(() => expect(mocks.showErrorToast).toHaveBeenCalledWith('Unable to delete these evaluations.'));
        expect(screen.getByRole('button', { name: 'Delete evaluation for Acme' })).toBeInTheDocument();
        expect(mocks.showSuccessToast).not.toHaveBeenCalled();
    });
});
