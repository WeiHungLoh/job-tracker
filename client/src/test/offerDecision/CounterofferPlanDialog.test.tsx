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
const scrollIntoView = vi.fn();

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
        scrollIntoView.mockReset();
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoView,
        });
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
        const workArrangement = screen.getByLabelText('Acme Ideal offer work arrangement') as HTMLSelectElement;
        expect(workArrangement.options[0]?.value).toBe('');
        expect(workArrangement.options[0]?.textContent).toBe('');
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

    test('updates Requested changes live and removes restored offer fields', () => {
        renderDialog();

        const requestedChanges = screen.getByRole('region', { name: 'Requested changes' });
        expect(within(requestedChanges).getByText('No requested changes yet.')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '11500' },
        });
        const salaryChange = within(requestedChanges).getByRole('article', { name: 'Monthly base salary' });
        expect(within(salaryChange).getByText('Current')).toBeInTheDocument();
        expect(within(salaryChange).getByText('Ideal')).toBeInTheDocument();
        expect(within(salaryChange).getByText('SGD 10,000')).toBeInTheDocument();
        expect(within(salaryChange).getByText('SGD 11,500')).toBeInTheDocument();
        expect(within(salaryChange).queryByText(/Change:/)).not.toBeInTheDocument();
        expect(salaryChange.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '10000' },
        });
        expect(
            within(requestedChanges).queryByRole('article', { name: 'Monthly base salary' })
        ).not.toBeInTheDocument();

        const longBonus = 'Performance-based-bonus-with-an-unusually-long-unbroken-value';
        fireEvent.change(screen.getByLabelText('Acme Ideal offer bonus'), {
            target: { value: longBonus },
        });
        const bonusChange = within(requestedChanges).getByRole('article', { name: 'Bonus' });
        expect(within(bonusChange).getByText(longBonus)).toBeInTheDocument();
        expect(within(bonusChange).queryByText(/\+5%/)).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Acme Ideal offer work arrangement'), {
            target: { value: 'Remote' },
        });
        expect(within(requestedChanges).getByRole('article', { name: 'Work arrangement' })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Acme Ideal offer bonus'), {
            target: { value: '10% target' },
        });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer work arrangement'), {
            target: { value: 'Hybrid' },
        });
        expect(within(requestedChanges).getByText('No requested changes yet.')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Acme Ideal offer Career Growth rating'), {
            target: { value: '5' },
        });
        expect(
            within(requestedChanges).getByText('No changes in offer fields (only ratings changed).')
        ).toBeInTheDocument();
    });

    test('shows saved Requested changes in view mode without presenting rating differences as requested terms', async () => {
        renderDialog({
            hasPlan: true,
            onGet: vi.fn().mockResolvedValue({ ...savedPlan, work_arrangement: 'Remote' }),
        });

        const requestedChanges = await screen.findByRole('region', { name: 'Requested changes' });
        for (const label of ['Monthly base salary', 'Bonus', 'Annual leave', 'Work arrangement']) {
            expect(within(requestedChanges).getByRole('article', { name: label })).toBeInTheDocument();
        }
        expect(within(requestedChanges).getAllByText('Current')).toHaveLength(4);
        expect(within(requestedChanges).getAllByText('Ideal')).toHaveLength(4);
        expect(within(requestedChanges).queryByText('Career Growth')).not.toBeInTheDocument();
        expect(within(requestedChanges).queryByText('Current Fit rating')).not.toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    test('blocks an unchanged Ideal offer and shows an error toast', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        renderDialog({ onSave });

        await click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Change at least one term or rating for the Ideal offer')).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.queryByText('Review the highlighted Ideal offer fields before saving.')).not.toBeInTheDocument();
    });

    test('submits with Enter from the dialog and shows the shared loading spinner without replacing the Save label', async () => {
        let resolveSave: (() => void) | undefined;
        const onSave = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveSave = resolve;
                })
        );
        renderDialog({ onSave });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '10500' },
        });

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });

        await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
        const saveButton = screen.getByRole('button', { name: 'Save' });
        expect(saveButton).toHaveAttribute('type', 'submit');
        expect(saveButton).toHaveAttribute('aria-busy', 'true');
        expect(within(saveButton).getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
        expect(within(saveButton).getByText('Save')).toHaveClass(primaryButtonStyles.hiddenContent);
        expect(within(saveButton).queryByText('Saving…')).not.toBeInTheDocument();

        resolveSave?.();
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument());
    });

    test('keeps non-fit validation inline, focuses and scrolls to it without showing an error toast', async () => {
        const onSave = vi.fn();
        renderDialog({ onSave });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '-1' },
        });

        await click(screen.getByRole('button', { name: 'Save' }));

        const salaryInput = screen.getByLabelText('Acme Ideal offer monthly base salary');
        expect(
            screen.getByText('Monthly base salary must be a whole number from 0 to 1000000000.')
        ).toBeInTheDocument();
        await waitFor(() => expect(salaryInput).toHaveFocus());
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
        expect(screen.queryByText('Review the highlighted Ideal offer fields before saving.')).not.toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    test('keeps Requested changes below the conclusion without an inline Fit-rating error', () => {
        renderDialog();

        for (const category of ['Career Growth', 'Company/Culture Fit', 'Work-Life Balance', 'Compensation']) {
            fireEvent.change(screen.getByLabelText(`Acme Ideal offer ${category} rating`), {
                target: { value: '3' },
            });
        }

        const conclusion = screen.getByText(/Your Ideal offer has the same fit rating|Your Ideal offer would/);
        const requestedChanges = screen.getByRole('region', { name: 'Requested changes' });
        expect(conclusion.compareDocumentPosition(requestedChanges) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(
            screen.queryByText(
                'Your Ideal offer has a lower fit rating than your current offer. Adjust the ratings before saving. Current offer: 75%. Ideal offer: 60%.'
            )
        ).not.toBeInTheDocument();
    });

    test('loads a saved plan once in view mode, then edits and restores saved values on cancel', async () => {
        const onGet = vi.fn().mockResolvedValue(savedPlan);
        renderDialog({ hasPlan: true, onGet });

        expect(screen.getByRole('progressbar', { name: 'Loading counteroffer plan' })).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument();
        expect(onGet).toHaveBeenCalledOnce();
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

        expect(mockConfirm).not.toHaveBeenCalled();
        expect(await screen.findByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument();
        await click(screen.getByRole('button', { name: 'Edit' }));
        expect(screen.getByLabelText('Acme Ideal offer monthly base salary')).toHaveValue(11500);
    });

    test('keeps an unchanged saved-plan edit open and shows an error toast', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        renderDialog({ hasPlan: true, onSave });

        await click(await screen.findByRole('button', { name: 'Edit' }));
        await click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Change at least one term or rating for the Ideal offer')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Edit counteroffer plan' })).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    test('treats whitespace-only saved-plan edits as unchanged without calling the API', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        renderDialog({ hasPlan: true, onSave });

        await click(await screen.findByRole('button', { name: 'Edit' }));
        fireEvent.change(screen.getByLabelText('Acme Ideal offer bonus'), {
            target: { value: `${savedPlan.bonus} ` },
        });
        await click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Change at least one term or rating for the Ideal offer')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Edit counteroffer plan' })).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
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

    test('blocks a lower Fit rating without rendering its error beneath Requested changes', async () => {
        const onSave = vi.fn();
        renderDialog({ onSave });
        for (const category of ['Career Growth', 'Company/Culture Fit', 'Work-Life Balance', 'Compensation']) {
            fireEvent.change(screen.getByLabelText(`Acme Ideal offer ${category} rating`), {
                target: { value: '3' },
            });
        }

        expect(
            screen.queryByText(
                'Your Ideal offer has a lower fit rating than your current offer. Adjust the ratings before saving. Current offer: 75%. Ideal offer: 60%.'
            )
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Review the Ideal offer')).not.toBeInTheDocument();
        await click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(screen.getByLabelText('Acme Ideal offer Career Growth rating')).toHaveFocus());
        expect(
            screen.getByText('The Ideal offer cannot have a lower fit rating than the current offer')
        ).toBeInTheDocument();
        expect(screen.queryByText('Review the Ideal offer')).not.toBeInTheDocument();
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
        expect(screen.getByText('Counteroffer plan saved')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument();
    });

    test('preserves form input after a server save failure', async () => {
        const onSave = vi.fn().mockRejectedValue(new Error('offline'));
        renderDialog({ onSave });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer monthly base salary'), {
            target: { value: '12500' },
        });
        await click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Unable to save the counteroffer plan. Please try again')).toBeInTheDocument();
        expect(screen.getByLabelText('Acme Ideal offer monthly base salary')).toHaveValue(12500);
        expect(screen.getByRole('heading', { name: 'Plan counteroffer' })).toBeInTheDocument();
    });

    test('confirms and deletes a saved plan without changing the evaluation', async () => {
        const onClose = vi.fn();
        const onDelete = vi.fn().mockResolvedValue(undefined);
        const onPlanAvailabilityChange = vi.fn();
        renderDialog({ hasPlan: true, onClose, onDelete, onPlanAvailabilityChange });
        await screen.findByRole('button', { name: 'Delete counteroffer plan' });

        await click(within(screen.getByRole('dialog')).getByText('Delete', { selector: 'button' }));

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Delete counteroffer plan?',
                description: 'This removes the Ideal offer. The original offer evaluation will not be changed.',
                confirmationText: 'Delete',
                confirmationButtonProps: { autoFocus: true, color: 'error', variant: 'contained' },
            })
        );
        expect(onDelete).toHaveBeenCalledWith(11);
        await waitFor(() => expect(onPlanAvailabilityChange).toHaveBeenCalledWith(11, false));
        expect(onClose).toHaveBeenCalled();
        expect(screen.getByText('Counteroffer plan deleted')).toBeInTheDocument();
    });

    test('dismisses meaningful unsaved changes without a confirmation', async () => {
        const onClose = vi.fn();
        renderDialog({ onClose });
        fireEvent.change(screen.getByLabelText('Acme Ideal offer bonus'), {
            target: { value: '20% target' },
        });

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(mockConfirm).not.toHaveBeenCalled();
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    test('cancels saved plan edits immediately without a discard confirmation', async () => {
        renderDialog({ hasPlan: true });
        await screen.findByRole('button', { name: 'Edit' });
        await click(screen.getByRole('button', { name: 'Edit' }));
        fireEvent.change(screen.getByLabelText('Acme Ideal offer bonus'), {
            target: { value: 'Changed bonus' },
        });

        await click(screen.getByRole('button', { name: 'Cancel changes' }));

        expect(mockConfirm).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument();
        expect(screen.getAllByText('15% target')).not.toHaveLength(0);
        expect(screen.queryByLabelText('Acme Ideal offer bonus')).not.toBeInTheDocument();
    });

    test('Escape in a saved plan field cancels edits and returns to view mode', async () => {
        const onClose = vi.fn();
        const onGet = vi.fn(
            () =>
                new Promise<CounterofferPlan>((resolve) => {
                    window.setTimeout(() => resolve(savedPlan), 25);
                })
        );
        renderDialog({ hasPlan: true, onClose, onGet });
        await screen.findByRole('heading', { name: 'Counteroffer plan' });
        await click(await screen.findByRole('button', { name: 'Edit' }));
        const bonusInput = screen.getByLabelText('Acme Ideal offer bonus');
        fireEvent.change(bonusInput, { target: { value: 'Changed bonus' } });

        fireEvent.keyDown(bonusInput, { key: 'Escape' });

        expect(screen.getByRole('heading', { name: 'Counteroffer plan' })).toBeInTheDocument();
        expect(screen.queryByLabelText('Acme Ideal offer bonus')).not.toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        expect(mockConfirm).not.toHaveBeenCalled();
    });

    test('keeps a saved plan read-only when the application is archived or no longer eligible', async () => {
        renderDialog({
            application: { ...application, job_status: 'Accepted', has_counteroffer_plan: true },
            hasPlan: true,
            readOnly: true,
        });

        await screen.findByRole('heading', { name: 'Counteroffer plan' });
        const deleteButton = await within(screen.getByRole('dialog')).findByText('Delete', { selector: 'button' });
        expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
        expect(deleteButton).toHaveClass(primaryButtonStyles.destructive);
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
        expect(screen.getByText('Counteroffer plan was not found')).toBeInTheDocument();
    });

    test('shows a recoverable loading error without dropping the dialog', async () => {
        const onGet = vi.fn().mockRejectedValue(new Error('offline'));
        renderDialog({ hasPlan: true, onGet });

        expect(await screen.findAllByText('Unable to load the counteroffer plan. Please try again.')).toHaveLength(1);
        expect(screen.getByText('Unable to load the counteroffer plan. Please try again')).toBeInTheDocument();
        expect(screen.getByTestId('toast')).toHaveTextContent('Unable to load the counteroffer plan. Please try again');
        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Try again' })).toHaveClass(primaryButtonStyles.primary);
        expect(screen.getByRole('button', { name: 'Close' })).toHaveClass(primaryButtonStyles.secondary);
    });
});
