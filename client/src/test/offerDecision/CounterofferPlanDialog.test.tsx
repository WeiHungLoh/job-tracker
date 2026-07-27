import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import CounterofferPlanDialog from '../../pages/offerDecision/counteroffer/CounterofferPlanDialog';
import primaryButtonStyles from '../../components/button/PrimaryButton.module.css';
import type {
    CounterofferPlan,
    OfferDecisionApplication,
    OfferEvaluation,
    SaveCounterofferPlanRequest,
} from '../../pages/offerDecision/models';
import { render } from '../renderWithProviders';

const mockConfirm = vi.hoisted(() => vi.fn());

vi.mock('material-ui-confirm', () => ({ useConfirm: () => mockConfirm }));

const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await act(async () => {
        await Promise.resolve();
    });
};

const evaluation: OfferEvaluation = {
    job_id: 11,
    ratings: {
        career_growth: 4,
        company_culture_fit: 4,
        work_life_balance: 3,
        compensation: 4,
    },
    details: {
        currency: 'SGD',
        monthly_base_salary: 10000,
        bonus: '10% target',
        annual_leave_days: 20,
        work_arrangement: 'Hybrid',
        decision_deadline: '2099-08-15T10:00:00.000Z',
        pros: 'Strong ownership',
        concerns: 'Two office days',
    },
};

const application: OfferDecisionApplication = {
    job_id: 11,
    company_name: 'Acme',
    job_title: 'Senior Software Engineer',
    job_status: 'Offer',
    application_date: '2026-07-01T10:00:00.000Z',
    evaluation,
    has_counteroffer_plan: false,
};

const savedPlan: CounterofferPlan = {
    monthly_base_salary: 11500,
    bonus: '15% target',
    annual_leave_days: 22,
    work_arrangement: 'Hybrid',
    ratings: {
        career_growth: 4,
        company_culture_fit: 4,
        work_life_balance: 4,
        compensation: 5,
    },
};

type DialogProps = {
    application?: OfferDecisionApplication;
    hasPlan?: boolean;
    onClose?: () => void;
    onDelete?: (jobId: number) => Promise<void>;
    onGet?: (jobId: number) => Promise<CounterofferPlan>;
    onPlanAvailabilityChange?: (jobId: number, hasPlan: boolean) => void;
    onSave?: (jobId: number, request: SaveCounterofferPlanRequest) => Promise<void>;
    readOnly?: boolean;
};

const renderDialog = ({
    application: selectedApplication = application,
    hasPlan = false,
    onClose = vi.fn(),
    onDelete = vi.fn().mockResolvedValue(undefined),
    onGet = vi.fn().mockResolvedValue(savedPlan),
    onPlanAvailabilityChange = vi.fn(),
    onSave = vi.fn().mockResolvedValue(undefined),
    readOnly = false,
}: DialogProps = {}) =>
    render(
        <CounterofferPlanDialog
            application={selectedApplication}
            applications={[application]}
            hasPlan={hasPlan}
            onClose={onClose}
            onDelete={onDelete}
            onGet={onGet}
            onPlanAvailabilityChange={onPlanAvailabilityChange}
            onSave={onSave}
            readOnly={readOnly}
        />
    );

describe('CounterofferPlanDialog', () => {
    beforeEach(() => {
        mockConfirm.mockReset();
        mockConfirm.mockResolvedValue({ confirmed: true });
    });

    test('shows Current offer above one prefilled Ideal offer without tabs or optional packages', () => {
        renderDialog();

        expect(screen.getByRole('dialog', { name: 'Plan counteroffer' })).toBeInTheDocument();
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Current offer' })).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Ideal offer' })).toBeVisible();
        expect(screen.getByText('SGD 10,000')).toBeInTheDocument();
        expect(screen.getByText('Current Fit rating')).toBeInTheDocument();
        expect(screen.getByText('Ideal Fit rating')).toBeInTheDocument();

        expect(screen.getByLabelText('Acme Ideal offer currency')).toHaveValue('SGD');
        expect(screen.getByLabelText('Acme Ideal offer currency')).toHaveAttribute('readonly');
        expect(screen.getByLabelText('Acme Ideal offer monthly base salary')).toHaveValue(10000);
        expect(screen.getByLabelText('Acme Ideal offer Career Growth rating')).toHaveValue('4');
        expect(screen.getByLabelText('Acme Ideal offer Company/Culture Fit rating')).toHaveValue('4');
        expect(screen.getByLabelText('Acme Ideal offer Work-Life Balance rating')).toHaveValue('3');
        expect(screen.getByLabelText('Acme Ideal offer Compensation rating')).toHaveValue('4');
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    test('changes Ideal terms without automatically changing its ratings', () => {
        renderDialog();

        const compensationRating = screen.getByLabelText('Acme Ideal offer Compensation rating');
        expect(compensationRating).toHaveValue('4');
        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '15000' },
        });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer work arrangement'), {
            target: { value: 'Remote' },
        });

        expect(compensationRating).toHaveValue('4');
        expect(screen.getByLabelText('Acme Ideal offer Work-Life Balance rating')).toHaveValue('3');
    });

    test('loads a saved plan once in view mode, then edits and restores saved values on cancel', async () => {
        const onGet = vi.fn().mockResolvedValue(savedPlan);
        renderDialog({ hasPlan: true, onGet });

        expect(screen.getByRole('progressbar', { name: 'Loading counteroffer plan' })).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument();
        expect(onGet).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', { name: 'Delete counteroffer plan' })).toHaveClass(
            primaryButtonStyles.destructive
        );
        expect(screen.getByRole('button', { name: 'Close' })).toHaveClass(primaryButtonStyles.secondary);
        expect(screen.getByRole('button', { name: 'Edit' })).toHaveClass(primaryButtonStyles.primary);

        await click(screen.getByRole('button', { name: 'Edit' }));
        expect(screen.getByRole('heading', { name: 'Edit counteroffer plan' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel changes' })).toHaveClass(primaryButtonStyles.secondary);
        expect(screen.getByRole('button', { name: 'Save' })).toHaveClass(primaryButtonStyles.primary);
        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '14000' },
        });
        await click(screen.getByRole('button', { name: 'Cancel changes' }));

        expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Discard counteroffer changes?' }));
        expect(await screen.findByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument();
        await click(screen.getByRole('button', { name: 'Edit' }));
        expect(screen.getByLabelText('Acme Ideal offer monthly base salary')).toHaveValue(11500);
    });

    test('keeps saved rating rows focused on the Ideal value and its change', async () => {
        renderDialog({ hasPlan: true });

        await screen.findByRole('heading', { name: 'Ideal ratings' });
        const comparison = screen.getByLabelText('Ideal offer rating changes');
        expect(within(comparison).queryByText('Current')).not.toBeInTheDocument();
        expect(within(comparison).getByText('Work-Life Balance')).toBeInTheDocument();
        expect(within(comparison).getAllByText('4/5').length).toBeGreaterThan(0);
        for (const change of within(comparison).getAllByText('+1 rating point')) {
            expect(change).toHaveAttribute('data-direction', 'positive');
        }
        for (const change of within(comparison).getAllByText('No change')) {
            expect(change).toHaveAttribute('data-direction', 'neutral');
        }
    });

    test('shows rating-point changes and live Fit-rating percentage-point changes', () => {
        renderDialog();

        fireEvent.change(screen.getByLabelText('Acme Ideal offer Work-Life Balance rating'), {
            target: { value: '5' },
        });

        expect(screen.getByText('+2 rating points')).toBeInTheDocument();
        expect(screen.getByText('Ideal Fit rating')).toBeInTheDocument();
        expect(screen.getAllByText('85%')).not.toHaveLength(0);
        expect(screen.getByText('+10 percentage points')).toHaveAttribute('data-direction', 'positive');
        expect(screen.queryByText(/(?<!rating |percentage )points/)).not.toBeInTheDocument();
    });

    test('blocks a lower Fit rating, focuses its error and shows one toast', async () => {
        const onSave = vi.fn();
        renderDialog({ onSave });
        for (const category of ['Career Growth', 'Company/Culture Fit', 'Work-Life Balance', 'Compensation']) {
            fireEvent.change(screen.getByLabelText(`Acme Ideal offer ${category} rating`), {
                target: { value: '3' },
            });
        }

        expect(
            screen.getByText(
                'Your Ideal offer has a lower fit rating than your current offer. Adjust the ratings before saving. Current offer: 75%. Ideal offer: 60%.'
            )
        ).toBeInTheDocument();
        await click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(screen.getByLabelText('Ideal offer fit rating error')).toHaveFocus());
        expect(
            screen.getByText(
                'The Ideal offer has a lower fit rating than the current offer. Review the highlighted ratings before saving.'
            )
        ).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    test('saves an equal-Fit trade-off with an individually lower rating', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const onPlanAvailabilityChange = vi.fn();
        renderDialog({ onPlanAvailabilityChange, onSave });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer Work-Life Balance rating'), {
            target: { value: '5' },
        });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer Compensation rating'), {
            target: { value: '2' },
        });

        await click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith(
                11,
                expect.objectContaining({
                    ratings: {
                        career_growth: 4,
                        company_culture_fit: 4,
                        work_life_balance: 5,
                        compensation: 2,
                    },
                })
            )
        );
        expect(onPlanAvailabilityChange).toHaveBeenCalledWith(11, true);
        expect(screen.getByText('Counteroffer plan saved.')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument();
    });

    test('preserves form input after a server save failure', async () => {
        const onSave = vi.fn().mockRejectedValue(new Error('offline'));
        renderDialog({ onSave });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '12500' },
        });
        await click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Unable to save the counteroffer plan. Please try again.')).toBeInTheDocument();
        expect(screen.getByLabelText('Acme Ideal offer monthly base salary')).toHaveValue(12500);
        expect(screen.getByRole('heading', { name: 'Plan counteroffer' })).toBeInTheDocument();
    });

    test('confirms and deletes a saved plan without changing the evaluation', async () => {
        const onClose = vi.fn();
        const onDelete = vi.fn().mockResolvedValue(undefined);
        const onPlanAvailabilityChange = vi.fn();
        renderDialog({ hasPlan: true, onClose, onDelete, onPlanAvailabilityChange });
        await screen.findByRole('heading', { name: 'Counteroffer plan' });

        await click(screen.getByRole('button', { name: 'Delete counteroffer plan' }));

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Delete counteroffer plan?',
                description: 'This removes the Ideal offer. The original offer evaluation will not be changed.',
                confirmationText: 'Delete',
                confirmationButtonProps: { autoFocus: true },
            })
        );
        expect(onDelete).toHaveBeenCalledWith(11);
        await waitFor(() => expect(onPlanAvailabilityChange).toHaveBeenCalledWith(11, false));
        expect(onClose).toHaveBeenCalled();
        expect(screen.queryByText('Counteroffer plan deleted.')).not.toBeInTheDocument();
    });

    test('confirms closing meaningful unsaved changes', async () => {
        const onClose = vi.fn();
        renderDialog({ onClose });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer bonus'), {
            target: { value: '20% target' },
        });

        await click(screen.getByRole('button', { name: 'Cancel' }));

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Discard counteroffer changes?',
                confirmationText: 'Discard changes',
            })
        );
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    test('keeps a saved plan read-only when the application is archived or no longer eligible', async () => {
        renderDialog({
            application: { ...application, job_status: 'Accepted', has_counteroffer_plan: true },
            hasPlan: true,
            readOnly: true,
        });

        await screen.findByRole('heading', { name: 'Counteroffer plan' });
        expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete counteroffer plan' })).toHaveClass(
            primaryButtonStyles.destructive
        );
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    test('recovers a stale plan flag after GET returns 404 and allows eligible creation', async () => {
        const { JobTrackerAPIError } = await import('../../api/models');
        const onGet = vi.fn().mockRejectedValue(new JobTrackerAPIError('Not found', 404));
        const onPlanAvailabilityChange = vi.fn();
        renderDialog({ hasPlan: true, onGet, onPlanAvailabilityChange });

        expect(await screen.findByRole('heading', { name: 'Plan counteroffer' })).toBeInTheDocument();
        expect(onPlanAvailabilityChange).toHaveBeenCalledWith(11, false);
        expect(screen.getByLabelText('Acme Ideal offer monthly base salary')).toHaveValue(10000);
    });

    test('clears a stale read-only plan flag and closes when creation is not eligible', async () => {
        const { JobTrackerAPIError } = await import('../../api/models');
        const onClose = vi.fn();
        const onGet = vi.fn().mockRejectedValue(new JobTrackerAPIError('Not found', 404));
        const onPlanAvailabilityChange = vi.fn();
        renderDialog({
            application: { ...application, job_status: 'Accepted', has_counteroffer_plan: true },
            hasPlan: true,
            onClose,
            onGet,
            onPlanAvailabilityChange,
            readOnly: true,
        });

        await waitFor(() => expect(onPlanAvailabilityChange).toHaveBeenCalledWith(11, false));
        expect(onClose).toHaveBeenCalledOnce();
        expect(screen.getByText('Counteroffer plan was not found.')).toBeInTheDocument();
    });

    test('shows a recoverable loading error without dropping the dialog', async () => {
        const onGet = vi.fn().mockRejectedValue(new Error('offline'));
        renderDialog({ hasPlan: true, onGet });

        expect(await screen.findAllByText('Unable to load the counteroffer plan. Please try again.')).not.toHaveLength(
            0
        );
        expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
});
