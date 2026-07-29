import { useState } from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OfferDecisionWorkspace from '../../pages/offerDecision/OfferDecisionWorkspace';
import formatDate, { parseDatetimeLocal, toDatetimeLocalInputValue } from '../../helper/dateFormatter';
import type {
    OfferDecisionWorkspaceData,
    OfferEvaluation,
    SaveOfferEvaluationRequest,
} from '../../pages/offerDecision/models';
import type { UserPreferences } from '../../components/userPreferences/models';
import { render, testPreferences } from '../renderWithProviders';
import offerEvaluationStyles from '../../pages/offerDecision/OfferEvaluation.module.css';
import { JobTrackerAPIError } from '../../api/models';

const mockConfirm = vi.hoisted(() => vi.fn());
const mockUseUnsavedChangesBlocker = vi.hoisted(() => vi.fn());

vi.mock('material-ui-confirm', () => ({ useConfirm: () => mockConfirm }));
vi.mock('../../hooks/useUnsavedChangesBlocker', () => ({
    useUnsavedChangesBlocker: mockUseUnsavedChangesBlocker,
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

const createEvaluation = (
    jobId: number,
    ratings = {
        career_growth: 5,
        company_culture_fit: 4,
        work_life_balance: 3,
        compensation: 4,
    },
    decisionDeadline = details.decision_deadline
): OfferEvaluation => ({
    job_id: jobId,
    ratings,
    details: { ...details, decision_deadline: decisionDeadline },
});

const activeData: OfferDecisionWorkspaceData = {
    applications: [
        {
            job_id: 11,
            company_name: 'Acme',
            job_title: 'Software Engineer',
            job_status: 'Offer',
            application_date: '2026-07-01T08:00:00.000Z',
            evaluation: createEvaluation(11),
        },
        {
            job_id: 12,
            company_name: 'Beta Labs',
            job_title: 'Platform Developer',
            job_status: 'Offer',
            application_date: '2026-07-02T08:00:00.000Z',
            evaluation: null,
        },
        {
            job_id: 13,
            company_name: 'Continuum',
            job_title: 'Product Engineer',
            job_status: 'Accepted',
            application_date: '2026-06-15T08:00:00.000Z',
            evaluation: createEvaluation(13),
        },
    ],
};

const robustnessData: OfferDecisionWorkspaceData = {
    applications: [
        {
            ...activeData.applications[0],
            evaluation: createEvaluation(
                11,
                {
                    career_growth: 5,
                    company_culture_fit: 4,
                    work_life_balance: 3,
                    compensation: 4,
                },
                '2099-08-15T10:00:00.000Z'
            ),
        },
        {
            ...activeData.applications[1],
            evaluation: createEvaluation(
                12,
                {
                    career_growth: 3,
                    company_culture_fit: 3,
                    work_life_balance: 5,
                    compensation: 5,
                },
                '2099-08-20T10:00:00.000Z'
            ),
        },
    ],
};

type HarnessProps = {
    initialData?: OfferDecisionWorkspaceData;
    onSave?: (jobId: number, request: SaveOfferEvaluationRequest) => Promise<void>;
};

const WorkspaceHarness = ({
    initialData = activeData,
    onSave = vi.fn().mockResolvedValue(undefined),
}: HarnessProps) => {
    const [data, setData] = useState(initialData);

    const saveEvaluation = async (jobId: number, request: SaveOfferEvaluationRequest) => {
        await onSave(jobId, request);
        setData((current) => ({
            applications: current.applications.map((application) =>
                application.job_id === jobId
                    ? {
                          ...application,
                          evaluation: {
                              job_id: jobId,
                              ratings: request.ratings,
                              details: request.details,
                          },
                      }
                    : application
            ),
        }));
    };

    return <OfferDecisionWorkspace data={data} onDelete={vi.fn()} onSave={saveEvaluation} readOnly={false} />;
};

describe('OfferDecisionWorkspace', () => {
    beforeEach(() => {
        mockConfirm.mockReset();
        mockConfirm.mockResolvedValue({ confirmed: true });
    });

    test('separates unevaluated, evaluated and previous offers without global importance or save controls', () => {
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />);

        expect(screen.getByRole('heading', { name: 'Offers to Evaluate' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Evaluated Offers' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(screen.queryByText('Set what matters')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Save comparisons' })).not.toBeInTheDocument();

        const unevaluatedSection = screen.getByRole('heading', { name: 'Offers to Evaluate' }).closest('section');
        const evaluatedSection = screen.getByRole('heading', { name: 'Evaluated Offers' }).closest('section');
        expect(unevaluatedSection).not.toBeNull();
        expect(evaluatedSection).not.toBeNull();
        expect(
            within(unevaluatedSection as HTMLElement).getByRole('article', { name: 'Beta Labs Platform Developer' })
        ).toBeInTheDocument();
        expect(
            within(evaluatedSection as HTMLElement).getByRole('article', { name: 'Acme Software Engineer' })
        ).toBeInTheDocument();
    });

    test('shows the allowed active status actions for evaluated, expired and previous offers', () => {
        const expiredOffer = {
            ...activeData.applications[0],
            job_id: 14,
            company_name: 'Expired Co',
            evaluation: createEvaluation(14, undefined, '2026-07-01T10:00:00.000Z'),
        };
        const declinedOffer = {
            ...activeData.applications[2],
            job_id: 15,
            company_name: 'Declined Co',
            job_status: 'Declined' as const,
            evaluation: createEvaluation(15),
        };
        render(
            <OfferDecisionWorkspace
                data={{ applications: [...activeData.applications, expiredOffer, declinedOffer] }}
                onDelete={vi.fn()}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn()}
                onSave={vi.fn()}
                onSaveCounterofferPlan={vi.fn()}
                onUpdateOfferStatus={vi.fn()}
                readOnly={false}
            />
        );

        expect(
            within(openOfferActions('Acme'))
                .getAllByRole('menuitem')
                .map((item) => item.textContent)
        ).toEqual(['Edit evaluation', 'Plan counteroffer', 'Accept offer', 'Decline offer']);
        expect(
            within(openOfferActions('Expired Co'))
                .getAllByRole('menuitem')
                .map((item) => item.textContent)
        ).toEqual(['Edit evaluation', 'Accept offer', 'Decline offer']);
        expect(
            within(openOfferActions('Continuum'))
                .getAllByRole('menuitem')
                .map((item) => item.textContent)
        ).toEqual(['Edit evaluation', 'Change to Offer', 'Change to Declined']);
        expect(
            within(openOfferActions('Declined Co'))
                .getAllByRole('menuitem')
                .map((item) => item.textContent)
        ).toEqual(['Edit evaluation', 'Change to Offer', 'Change to Accepted']);
        expect(screen.queryByRole('button', { name: 'Accept offer from Beta Labs' })).not.toBeInTheDocument();
    });

    test('keeps edit, status and counteroffer actions out of archived Offer Comparison', () => {
        render(
            <OfferDecisionWorkspace
                data={{
                    applications: [
                        {
                            ...activeData.applications[0],
                            has_counteroffer_plan: true,
                        },
                    ],
                }}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn()}
                onSaveCounterofferPlan={vi.fn()}
                onUpdateOfferStatus={vi.fn()}
                readOnly
            />
        );

        expect(screen.queryByRole('button', { name: 'Accept offer from Acme' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Decline offer from Acme' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Edit evaluation for Acme' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'View counteroffer plan for Acme' })).not.toBeInTheDocument();
    });

    test('confirms Accept and Decline with the exact application and button treatment', async () => {
        const onUpdateOfferStatus = vi.fn().mockResolvedValue(undefined);
        render(
            <OfferDecisionWorkspace
                data={{ applications: [activeData.applications[0]] }}
                onSave={vi.fn()}
                onUpdateOfferStatus={onUpdateOfferStatus}
                readOnly={false}
            />
        );

        fireEvent.click(within(openOfferActions('Acme')).getByRole('menuitem', { name: 'Accept offer from Acme' }));
        await waitFor(() =>
            expect(mockConfirm).toHaveBeenLastCalledWith({
                title: 'Accept this offer?',
                description: 'Acme — Software Engineer will be marked as Accepted.',
                confirmationText: 'Accept Offer',
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true },
            })
        );
        await waitFor(() => expect(onUpdateOfferStatus).toHaveBeenCalledWith(activeData.applications[0], 'Accepted'));

        fireEvent.click(within(openOfferActions('Acme')).getByRole('menuitem', { name: 'Decline offer from Acme' }));
        await waitFor(() =>
            expect(mockConfirm).toHaveBeenLastCalledWith({
                title: 'Decline this offer?',
                description: 'Acme — Software Engineer will be marked as Declined.',
                confirmationText: 'Decline Offer',
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true, color: 'error', variant: 'contained' },
            })
        );
        await waitFor(() => expect(onUpdateOfferStatus).toHaveBeenCalledWith(activeData.applications[0], 'Declined'));
    });

    test('confirms changing a previous evaluation back to Offer', async () => {
        const application = activeData.applications[2];
        const onUpdateOfferStatus = vi.fn().mockResolvedValue(undefined);
        render(
            <OfferDecisionWorkspace
                data={{ applications: [application] }}
                onUpdateOfferStatus={onUpdateOfferStatus}
                readOnly={false}
            />
        );

        fireEvent.click(
            within(openOfferActions('Continuum')).getByRole('menuitem', { name: 'Change to Offer for Continuum' })
        );

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenLastCalledWith({
                title: 'Change back to Offer?',
                description: 'Continuum — Product Engineer will be marked as Offer.',
                confirmationText: 'Change to Offer',
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true },
            })
        );
        await waitFor(() => expect(onUpdateOfferStatus).toHaveBeenCalledWith(application, 'Offer'));
    });

    test('does not update status when the confirmation is cancelled', async () => {
        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        const onUpdateOfferStatus = vi.fn();
        render(
            <OfferDecisionWorkspace
                data={{ applications: [activeData.applications[0]] }}
                onUpdateOfferStatus={onUpdateOfferStatus}
                readOnly={false}
            />
        );

        fireEvent.click(within(openOfferActions('Acme')).getByRole('menuitem', { name: 'Accept offer from Acme' }));

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
        expect(onUpdateOfferStatus).not.toHaveBeenCalled();
    });

    test('scrolls and highlights a saved status change only when the preference is enabled', async () => {
        const onUpdateOfferStatus = vi.fn().mockResolvedValue(undefined);
        const scrollIntoView = vi.fn();
        render(
            <OfferDecisionWorkspace
                data={{ applications: [activeData.applications[0]] }}
                onUpdateOfferStatus={onUpdateOfferStatus}
                readOnly={false}
            />,
            { initialPreferences: { application_enable_scroll: true } }
        );
        const card = screen.getByRole('article', { name: 'Acme Software Engineer' });
        card.scrollIntoView = scrollIntoView;

        fireEvent.click(within(openOfferActions('Acme')).getByRole('menuitem', { name: 'Accept offer from Acme' }));

        await waitFor(() => expect(onUpdateOfferStatus).toHaveBeenCalledOnce());
        await waitFor(() => expect(card.className).toContain('highlight'));
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    test('always scrolls and highlights a dashboard target once', async () => {
        const onTargetOfferProcessed = vi.fn();
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;

        const { rerender } = render(
            <OfferDecisionWorkspace
                data={activeData}
                onTargetOfferProcessed={onTargetOfferProcessed}
                readOnly={false}
                selectedFilters={['Evaluated Offers']}
                targetOfferJobId={11}
            />
        );

        await waitFor(() =>
            expect(scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start',
            })
        );
        expect(onTargetOfferProcessed).toHaveBeenCalledOnce();
        expect(screen.getByRole('article', { name: 'Acme Software Engineer' }).className).toContain('highlight');

        rerender(
            <OfferDecisionWorkspace
                data={activeData}
                onTargetOfferProcessed={onTargetOfferProcessed}
                readOnly={false}
                selectedFilters={['Evaluated Offers']}
                targetOfferJobId={undefined}
            />
        );
        expect(scrollIntoView).toHaveBeenCalledOnce();

        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    test('shows decision robustness only for two active current evaluated offers', () => {
        const { rerender } = render(
            <OfferDecisionWorkspace data={robustnessData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />
        );

        const evaluatedSection = screen.getByRole('heading', { name: 'Evaluated Offers' }).closest('section');
        const prioritiesButton = screen.getByRole('button', { name: 'Try priorities' });
        expect(evaluatedSection).not.toBeNull();
        expect(within(evaluatedSection as HTMLElement).getByRole('button', { name: 'Try priorities' })).toBe(
            prioritiesButton
        );

        rerender(<OfferDecisionWorkspace data={robustnessData} onDelete={vi.fn()} readOnly />);

        expect(screen.queryByRole('button', { name: 'Try priorities' })).not.toBeInTheDocument();
    });

    test('hides decision robustness when fewer than two current evaluations remain eligible', () => {
        const secondEvaluation = robustnessData.applications[1].evaluation;
        if (!secondEvaluation) {
            throw new Error('Robustness fixture requires a saved second evaluation.');
        }
        const expiredSecondOffer: OfferDecisionWorkspaceData = {
            applications: [
                robustnessData.applications[0],
                {
                    ...robustnessData.applications[1],
                    evaluation: createEvaluation(12, secondEvaluation.ratings, '2000-01-01T10:00:00.000Z'),
                },
            ],
        };

        render(
            <OfferDecisionWorkspace data={expiredSecondOffer} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />
        );

        expect(screen.queryByRole('button', { name: 'Try priorities' })).not.toBeInTheDocument();
    });

    test('hides decision robustness when Evaluated Offers is filtered out', () => {
        render(<OfferDecisionWorkspace data={robustnessData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />, {
            initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
        });

        expect(screen.queryByRole('button', { name: 'Try priorities' })).not.toBeInTheDocument();
    });

    test('disables decision priorities while an evaluation draft is open and restores them on cancel', () => {
        render(<OfferDecisionWorkspace data={robustnessData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />);

        fireEvent.click(screen.getByRole('button', { name: 'Try priorities' }));
        expect(screen.getByLabelText('Career Growth importance')).toBeEnabled();

        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        expect(screen.getByLabelText('Career Growth importance')).toBeDisabled();
        expect(
            screen.getByText('Save or cancel the open evaluation before trying different priorities.')
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Cancel evaluation for Acme' }));
        expect(screen.getByLabelText('Career Growth importance')).toBeEnabled();
    });

    test('keeps saved fit ratings and deadline-first card order unchanged while testing priorities', () => {
        render(<OfferDecisionWorkspace data={robustnessData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />);

        const evaluatedSection = screen.getByRole('heading', { name: 'Evaluated Offers' }).closest('section');
        const getCardNames = () =>
            within(evaluatedSection as HTMLElement)
                .getAllByRole('article')
                .map((article) => article.getAttribute('aria-label'));
        const acmeFitRating = screen.getByRole('progressbar', { name: 'Acme offer fit rating' });

        expect(getCardNames()).toEqual(['Acme Software Engineer', 'Beta Labs Platform Developer']);
        expect(acmeFitRating).toHaveAttribute('value', '80');

        fireEvent.click(screen.getByRole('button', { name: 'Try priorities' }));
        fireEvent.change(screen.getByLabelText('Career Growth importance'), { target: { value: '5' } });

        expect(getCardNames()).toEqual(['Acme Software Engineer', 'Beta Labs Platform Developer']);
        expect(acmeFitRating).toHaveAttribute('value', '80');
    });

    test('adds one SGD draft, saves it per application, moves it and relocks it', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));

        expect(screen.getByLabelText('Beta Labs currency')).toHaveValue('SGD');
        expect(screen.getByLabelText('Beta Labs monthly base salary')).toHaveValue(null);
        expect(screen.getByLabelText('Beta Labs work arrangement')).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Save evaluation for Beta Labs' })).toBeEnabled();
        expect(
            within(
                screen.getByRole('heading', { name: 'Offers to Evaluate' }).closest('section') as HTMLElement
            ).getByRole('article', { name: 'Beta Labs Platform Developer' })
        ).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Beta Labs decision deadline'), {
            target: { value: '2026-08-20T10:00' },
        });
        fireEvent.change(screen.getByLabelText('Beta Labs monthly base salary'), { target: { value: '9000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Beta Labs' }));

        await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
        expect(onSave).toHaveBeenCalledWith(12, {
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
        });

        const evaluatedSection = screen.getByRole('heading', { name: 'Evaluated Offers' }).closest('section');
        expect(
            await within(evaluatedSection as HTMLElement).findByRole('article', {
                name: 'Beta Labs Platform Developer',
            })
        ).toBeInTheDocument();
        expect(screen.queryByLabelText('Beta Labs currency')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit evaluation for Beta Labs' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Hide details for Beta Labs' })).toBeInTheDocument();
    });

    test('scrolls to and highlights a first saved evaluation when the preference is enabled', async () => {
        render(<WorkspaceHarness />, {
            initialPreferences: { application_enable_scroll: true },
        });
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;
        fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
        fireEvent.change(screen.getByLabelText('Beta Labs decision deadline'), {
            target: { value: '2026-08-20T10:00' },
        });
        fireEvent.change(screen.getByLabelText('Beta Labs monthly base salary'), { target: { value: '9000' } });

        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Beta Labs' }));

        await waitFor(() =>
            expect(screen.getByRole('article', { name: 'Beta Labs Platform Developer' }).className).toContain(
                'highlight'
            )
        );
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    test('does not scroll or highlight a first saved evaluation when the preference is disabled', async () => {
        render(<WorkspaceHarness />, {
            initialPreferences: { application_enable_scroll: false },
        });
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;
        fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
        fireEvent.change(screen.getByLabelText('Beta Labs decision deadline'), {
            target: { value: '2026-08-20T10:00' },
        });
        fireEvent.change(screen.getByLabelText('Beta Labs monthly base salary'), { target: { value: '9000' } });

        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Beta Labs' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Edit evaluation for Beta Labs' })).toBeInTheDocument()
        );
        expect(screen.getByRole('article', { name: 'Beta Labs Platform Developer' }).className).not.toContain(
            'highlight'
        );
        expect(scrollIntoView).not.toHaveBeenCalled();
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    test('uses native form submission and places offer terms before ratings', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
        const card = screen.getByRole('article', { name: 'Beta Labs Platform Developer' });
        const groups = within(card).getAllByRole('group');
        expect(groups.map((group) => group.querySelector('legend')?.textContent)).toEqual([
            'Decision timing',
            'Compensation and terms',
            'Fit ratings',
        ]);

        fireEvent.change(screen.getByLabelText('Beta Labs decision deadline'), {
            target: { value: '2026-08-20T10:00' },
        });
        fireEvent.change(screen.getByLabelText('Beta Labs monthly base salary'), { target: { value: '9000' } });
        const saveButton = screen.getByRole('button', { name: 'Save evaluation for Beta Labs' });
        expect(saveButton).toHaveAttribute('type', 'submit');
        fireEvent.submit(saveButton.closest('form') as HTMLFormElement);

        await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    });

    test('keeps Enter as a notes newline, saves with Shift+Enter and cancels with Escape', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const { rerender } = render(<WorkspaceHarness onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        const pros = screen.getByLabelText('Acme pros');
        await userEvent.type(pros, '{enter}Additional context');
        expect(pros).toHaveValue('Strong product ownership\nAdditional context');
        expect(onSave).not.toHaveBeenCalled();

        fireEvent.keyDown(pros, { key: 'Enter', shiftKey: true });
        await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
        expect(screen.queryByLabelText('Acme pros')).not.toBeInTheDocument();

        rerender(<WorkspaceHarness />);
        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        fireEvent.change(screen.getByLabelText('Acme bonus'), { target: { value: 'Changed' } });
        fireEvent.keyDown(screen.getByLabelText('Acme bonus'), { key: 'Escape' });

        expect(screen.queryByLabelText('Acme bonus')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Hide details for Acme' })).toBeInTheDocument();
    });

    test('cancels a new draft without affecting saved records', () => {
        render(<WorkspaceHarness />);

        fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
        fireEvent.change(screen.getByLabelText('Beta Labs bonus'), { target: { value: '20% target' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel evaluation for Beta Labs' }));

        expect(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' })).toBeInTheDocument();
        expect(screen.queryByLabelText('Beta Labs bonus')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit evaluation for Acme' })).toBeInTheDocument();
    });

    test('unlocks a saved evaluation only on edit and relocks it after a changed save', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        expect(screen.queryByLabelText('Acme monthly base salary')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));

        const saveButton = screen.getByRole('button', { name: 'Save evaluation for Acme' });
        expect(screen.getByLabelText('Acme monthly base salary')).toHaveValue(10000);
        expect(saveButton).toBeEnabled();

        fireEvent.change(screen.getByLabelText('Acme monthly base salary'), { target: { value: '11000' } });
        expect(saveButton).toBeEnabled();
        fireEvent.click(saveButton);

        await waitFor(() => expect(onSave).toHaveBeenCalledWith(11, expect.any(Object)));
        expect(screen.queryByLabelText('Acme monthly base salary')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit evaluation for Acme' })).toBeInTheDocument();
        expect(screen.getByText('SGD 11,000')).toBeInTheDocument();
    });

    test('confirms and retries when a lower evaluation requires deleting its counteroffer plan', async () => {
        const conflict = new JobTrackerAPIError('Conflict', 409, {
            code: 'OFFER_EVALUATION_BELOW_COUNTEROFFER',
            message:
                'This evaluation fit rating is lower than the saved counteroffer plan. Confirm deletion of the counteroffer plan before saving.',
        });
        const onSave = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValueOnce(undefined);
        const application = { ...activeData.applications[0], has_counteroffer_plan: true };
        render(
            <OfferDecisionWorkspace
                data={{ applications: [application] }}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn()}
                onSave={onSave}
                onSaveCounterofferPlan={vi.fn()}
                readOnly={false}
            />
        );

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme Career Growth rating'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Delete counteroffer plan?',
                    confirmationText: 'Delete and Save',
                    description: expect.stringContaining('lower fit rating than your saved counteroffer plan'),
                    confirmationButtonProps: { autoFocus: true },
                })
            )
        );
        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
        expect(onSave.mock.calls[1][1]).toEqual(expect.objectContaining({ deleteCounterofferPlan: true }));
        expect(screen.queryByLabelText('Acme Career Growth rating')).not.toBeInTheDocument();
        expect(
            within(openOfferActions('Acme')).getByRole('menuitem', {
                name: 'Plan counteroffer for Acme',
            })
        ).toBeInTheDocument();
    });

    test('keeps a lower edited evaluation open when counteroffer deletion is cancelled', async () => {
        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        const onSave = vi.fn().mockRejectedValueOnce(
            new JobTrackerAPIError('Conflict', 409, {
                code: 'OFFER_EVALUATION_BELOW_COUNTEROFFER',
                message:
                    'This evaluation fit rating is lower than the saved counteroffer plan. Confirm deletion of the counteroffer plan before saving.',
            })
        );
        render(
            <OfferDecisionWorkspace
                data={{ applications: [{ ...activeData.applications[0], has_counteroffer_plan: true }] }}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn()}
                onSave={onSave}
                onSaveCounterofferPlan={vi.fn()}
                readOnly={false}
            />
        );

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme Career Growth rating'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
        expect(onSave).toHaveBeenCalledOnce();
        expect(screen.getByLabelText('Acme Career Growth rating')).toHaveValue('1');
    });

    test('uses the shared date-time input format and formatted locked deadline', () => {
        render(<WorkspaceHarness />);

        fireEvent.click(screen.getByRole('button', { name: 'Show details for Acme' }));
        expect(screen.getAllByText(formatDate(details.decision_deadline).formattedDate)).not.toHaveLength(0);

        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        const deadlineInput = screen.getByLabelText('Acme decision deadline');
        expect(deadlineInput).toHaveAttribute('type', 'datetime-local');
        expect(deadlineInput).toHaveClass(offerEvaluationStyles.dateTimeInput);
        expect(deadlineInput).toHaveAttribute(
            'min',
            toDatetimeLocalInputValue(activeData.applications[0].application_date)
        );
        expect(deadlineInput).toHaveValue(toDatetimeLocalInputValue(details.decision_deadline));
    });

    test('cancels a saved edit and restores its locked values', () => {
        render(<WorkspaceHarness />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        fireEvent.change(screen.getByLabelText('Acme bonus'), { target: { value: 'Changed' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel evaluation for Acme' }));

        expect(screen.queryByLabelText('Acme bonus')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Hide details for Acme' })).toBeInTheDocument();
        expect(screen.getByText('15% target')).toBeInTheDocument();
        expect(screen.queryByText('Changed')).not.toBeInTheDocument();
    });

    test('scrolls after saving, cancelling an evaluation or hiding details', async () => {
        render(<WorkspaceHarness />);
        const acmeCard = screen.getByRole('article', { name: 'Acme Software Engineer' });
        const betaCard = screen.getByRole('article', { name: 'Beta Labs Platform Developer' });
        const acmeScrollIntoView = vi.fn();
        const betaScrollIntoView = vi.fn();
        acmeCard.scrollIntoView = acmeScrollIntoView;
        betaCard.scrollIntoView = betaScrollIntoView;

        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        expect(acmeScrollIntoView).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel evaluation for Acme' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Edit evaluation for Acme' })).toBeVisible());
        await waitFor(() => expect(acmeScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' }));

        acmeScrollIntoView.mockClear();
        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Edit evaluation for Acme' })).toBeVisible());
        await waitFor(() => expect(acmeScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' }));

        fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel evaluation for Beta Labs' }));
        await waitFor(() => expect(betaScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' }));

        acmeScrollIntoView.mockClear();
        fireEvent.click(screen.getByRole('button', { name: 'Hide details for Acme' }));
        await waitFor(() => expect(acmeScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' }));
        expect(betaScrollIntoView).toHaveBeenCalledOnce();
    });

    test('shows field validation and does not save invalid negative values or an earlier deadline', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        fireEvent.change(screen.getByLabelText('Acme monthly base salary'), { target: { value: '-1' } });
        fireEvent.change(screen.getByLabelText('Acme annual leave days'), { target: { value: '-1' } });
        fireEvent.change(screen.getByLabelText('Acme decision deadline'), {
            target: { value: '2026-06-30T10:00' },
        });
        const deadlineInput = screen.getByLabelText('Acme decision deadline');
        const scrollIntoView = vi.fn();
        deadlineInput.scrollIntoView = scrollIntoView;
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        expect(
            await screen.findByText('Monthly base salary must be a whole number from 0 to 1000000000.')
        ).toBeInTheDocument();
        expect(screen.getByText('Annual leave must be a whole number from 0 to 365.')).toBeInTheDocument();
        expect(screen.getByText('Decision deadline cannot be earlier than the application date.')).toBeInTheDocument();
        expect(deadlineInput).toHaveFocus();
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
        expect(onSave).not.toHaveBeenCalled();
    });

    test('scrolls to and focuses an invalid optional annual leave field', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        const annualLeaveInput = screen.getByLabelText('Acme annual leave days');
        const scrollIntoView = vi.fn();
        annualLeaveInput.scrollIntoView = scrollIntoView;
        fireEvent.change(annualLeaveInput, { target: { value: '-1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        expect(await screen.findByText('Annual leave must be a whole number from 0 to 365.')).toBeInTheDocument();
        expect(annualLeaveInput).toHaveFocus();
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
        expect(onSave).not.toHaveBeenCalled();
    });

    test('shows an inline error, focuses the field and does not save a partial decision deadline', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit evaluation for Acme' }));
        const deadlineInput = screen.getByLabelText('Acme decision deadline');
        fireEvent.change(deadlineInput, { target: { value: '' } });
        Object.defineProperty(deadlineInput, 'validity', {
            configurable: true,
            value: { badInput: true },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        expect(await screen.findByText('Please enter a valid decision deadline.')).toBeInTheDocument();
        expect(deadlineInput).toHaveFocus();
        expect(onSave).not.toHaveBeenCalled();
    });

    test('expands and collapses saved cards independently', () => {
        const data: OfferDecisionWorkspaceData = {
            applications: [
                activeData.applications[0],
                { ...activeData.applications[1], evaluation: createEvaluation(12) },
            ],
        };
        render(<OfferDecisionWorkspace data={data} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />);

        fireEvent.click(screen.getByRole('button', { name: 'Show details for Acme' }));
        expect(screen.getByRole('button', { name: 'Hide details for Acme' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Show details for Beta Labs' })).toBeInTheDocument();
        expect(screen.getAllByText('15% target')).toHaveLength(1);
        const acmeCard = screen.getByRole('article', { name: 'Acme Software Engineer' });
        const salaryLabel = within(acmeCard).getByText('Monthly Base Salary');
        const ratingLabel = within(acmeCard).getByText('Company/Culture Fit');
        expect(ratingLabel.compareDocumentPosition(salaryLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Hide details for Acme' }));
        expect(screen.queryByText('15% target')).not.toBeInTheDocument();
    });

    test('hides optional offer terms that were not added in the locked view', () => {
        const evaluation = createEvaluation(11);
        evaluation.details = {
            ...evaluation.details,
            bonus: '',
            annual_leave_days: null,
            work_arrangement: '',
            pros: '',
            concerns: '',
        };

        render(
            <OfferDecisionWorkspace
                data={{ applications: [{ ...activeData.applications[0], evaluation }] }}
                onDelete={vi.fn()}
                onSave={vi.fn()}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Show details for Acme' }));
        const card = screen.getByRole('article', { name: 'Acme Software Engineer' });

        expect(within(card).getByText('Monthly Base Salary')).toBeInTheDocument();
        expect(within(card).queryByText('Bonus')).not.toBeInTheDocument();
        expect(within(card).queryByText('Annual Leave')).not.toBeInTheDocument();
        expect(within(card).queryByText('Work Arrangement')).not.toBeInTheDocument();
        expect(within(card).queryByText('Pros')).not.toBeInTheDocument();
        expect(within(card).queryByText('Cons')).not.toBeInTheDocument();
    });

    test('sorts evaluated cards and exposes count-aware grid layouts', () => {
        const high = {
            career_growth: 5,
            company_culture_fit: 5,
            work_life_balance: 5,
            compensation: 5,
        } as const;
        const tied = {
            career_growth: 4,
            company_culture_fit: 4,
            work_life_balance: 4,
            compensation: 4,
        } as const;
        const applications = [
            {
                ...activeData.applications[0],
                job_id: 4,
                company_name: 'Fourth',
                evaluation: createEvaluation(4, tied, ''),
            },
            {
                ...activeData.applications[0],
                job_id: 3,
                company_name: 'Third',
                evaluation: createEvaluation(3, high, ''),
            },
            {
                ...activeData.applications[0],
                job_id: 2,
                company_name: 'Second',
                evaluation: createEvaluation(2, tied, '2026-08-01T10:00:00.000Z'),
            },
            {
                ...activeData.applications[0],
                job_id: 1,
                company_name: 'First',
                evaluation: createEvaluation(1, tied, '2026-08-01T10:00:00.000Z'),
            },
        ];

        const { rerender } = render(
            <OfferDecisionWorkspace data={{ applications }} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />
        );
        const evaluatedSection = screen.getByRole('heading', { name: 'Evaluated Offers' }).closest('section');
        expect(
            within(evaluatedSection as HTMLElement)
                .getAllByRole('article')
                .map((article) => article.getAttribute('aria-label'))
        ).toEqual([
            'First Software Engineer',
            'Second Software Engineer',
            'Third Software Engineer',
            'Fourth Software Engineer',
        ]);
        expect(within(evaluatedSection as HTMLElement).getByTestId('offer-evaluation-grid')).toHaveAttribute(
            'data-card-count',
            'many'
        );

        rerender(
            <OfferDecisionWorkspace
                data={{ applications: applications.slice(0, 2) }}
                onDelete={vi.fn()}
                onSave={vi.fn()}
                readOnly={false}
            />
        );
        expect(screen.getByTestId('offer-evaluation-grid')).toHaveAttribute('data-card-count', 'two');

        rerender(
            <OfferDecisionWorkspace
                data={{ applications: applications.slice(0, 1) }}
                onDelete={vi.fn()}
                onSave={vi.fn()}
                readOnly={false}
            />
        );
        expect(screen.getByTestId('offer-evaluation-grid')).toHaveAttribute('data-card-count', 'one');
    });

    test('keeps active previous evaluations deletable and archived evaluations review-only', async () => {
        const onDelete = vi.fn().mockResolvedValue(undefined);
        const { rerender } = render(
            <OfferDecisionWorkspace data={activeData} onDelete={onDelete} onSave={vi.fn()} readOnly={false} />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Delete evaluation for Continuum' }));
        await waitFor(() => expect(onDelete).toHaveBeenCalledWith(13));
        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Confirm Deletion', confirmationText: 'Delete' })
        );

        rerender(
            <OfferDecisionWorkspace
                data={{ applications: [activeData.applications[0]] }}
                onDelete={onDelete}
                readOnly
            />
        );
        expect(screen.getByRole('heading', { name: 'Archived Evaluated Offers' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Archived Offer Comparisons' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /edit evaluation/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete evaluation/i })).toBeInTheDocument();
    });

    test('warns that deleting an evaluation also deletes its counteroffer plan', async () => {
        const onDelete = vi.fn().mockResolvedValue(undefined);
        render(
            <OfferDecisionWorkspace
                data={{
                    applications: [{ ...activeData.applications[0], has_counteroffer_plan: true }],
                }}
                onDelete={onDelete}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Delete evaluation for Acme' }));

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                description: expect.stringContaining('offer evaluation and its counteroffer plan'),
            })
        );
        await waitFor(() => expect(onDelete).toHaveBeenCalledWith(11));
    });

    test('keeps expired current offers editable and expired badges out of previous evaluations', () => {
        const expiredDeadline = '2026-07-01T10:00:00.000Z';
        const expiredOffer = {
            ...activeData.applications[0],
            evaluation: createEvaluation(11, undefined, expiredDeadline),
        };
        const previousEvaluation = {
            ...activeData.applications[2],
            evaluation: createEvaluation(13, undefined, expiredDeadline),
        };

        render(
            <OfferDecisionWorkspace
                data={{ applications: [expiredOffer, previousEvaluation] }}
                onDelete={vi.fn()}
                onSave={vi.fn()}
                readOnly={false}
            />
        );

        const expiredSection = screen.getByRole('heading', { name: 'Expired Evaluated Offers' }).closest('section');
        const previousSection = screen.getByRole('heading', { name: 'Previous Evaluations' }).closest('section');
        expect(expiredSection).not.toBeNull();
        expect(previousSection).not.toBeNull();
        expect(within(expiredSection as HTMLElement).getByText('Expired')).toBeInTheDocument();
        expect(within(expiredSection as HTMLElement).getByRole('button', { name: /delete evaluation/i })).toBeEnabled();
        fireEvent.click(
            within(expiredSection as HTMLElement).getByRole('button', { name: 'Edit evaluation for Acme' })
        );
        expect(within(expiredSection as HTMLElement).getByLabelText('Acme monthly base salary')).toHaveValue(10000);
        expect(within(previousSection as HTMLElement).queryByText('Expired')).toBeNull();
    });

    test('uses archived sections without an unevaluated section or edit actions', () => {
        const expiredOffer = {
            ...activeData.applications[0],
            evaluation: createEvaluation(11, undefined, '2026-07-01T10:00:00.000Z'),
        };

        render(
            <OfferDecisionWorkspace
                data={{ applications: [expiredOffer, activeData.applications[2]] }}
                onDelete={vi.fn()}
                readOnly
            />
        );

        expect(screen.getByRole('heading', { name: 'Archived Expired Evaluated Offers' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Archived Previous Evaluations' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: /offers to evaluate/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /edit evaluation/i })).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /delete evaluation/i })).toHaveLength(2);
    });

    test('renders purpose-built empty states', () => {
        const { rerender } = render(<OfferDecisionWorkspace data={{ applications: [] }} readOnly={false} />);
        const activeEmptyState = screen.getByRole('heading', { name: 'No offers to compare' }).closest('section');
        expect(activeEmptyState?.className).toContain('followsControls');
        expect(
            screen.getByText(
                'Applications with Offer status appear here, along with saved evaluations that later move to Accepted or Declined.'
            )
        ).toBeInTheDocument();

        rerender(<OfferDecisionWorkspace data={{ applications: [] }} readOnly />);
        const archivedEmptyState = screen
            .getByRole('heading', { name: 'No archived offer comparisons' })
            .closest('section');
        expect(archivedEmptyState?.className).toContain('followsControls');
    });

    test('offers the active categories and filters locally without changing group order', async () => {
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />);

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getAllByRole('checkbox').map((checkbox) => checkbox.closest('label')?.textContent)).toEqual([
            'Show All',
            'Offers to Evaluate',
            'Evaluated Offers',
            'Expired Evaluated Offers',
            'Previous Evaluations',
        ]);

        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Previous Evaluations' }));

        expect(screen.getByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Offers to Evaluate' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Evaluated Offers' })).not.toBeInTheDocument();
    });

    test('delegates production filter changes without persisting them in the workspace', async () => {
        const onFilterSelectionChange = vi.fn().mockResolvedValue(true);
        const updatePreferences = vi.fn();
        render(
            <OfferDecisionWorkspace
                data={activeData}
                onFilterSelectionChange={onFilterSelectionChange}
                readOnly={false}
            />,
            { updatePreferences }
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offers to Evaluate' }));

        expect(onFilterSelectionChange).toHaveBeenCalledWith([
            'Evaluated Offers',
            'Expired Evaluated Offers',
            'Previous Evaluations',
        ]);
        expect(updatePreferences).not.toHaveBeenCalled();
    });

    test('shows the existing skeleton while filtering without disabling filter changes', async () => {
        render(<OfferDecisionWorkspace data={activeData} isFiltering readOnly={false} />);

        expect(screen.getByRole('status', { name: 'Loading offer comparisons' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Filter by' })).toBeEnabled();
    });

    test('uses the full production evaluation count for Delete All confirmation', async () => {
        const getDeleteAllEvaluationSummary = vi
            .fn()
            .mockResolvedValue({ evaluationCount: 7, counterofferPlanCount: 2 });
        render(
            <OfferDecisionWorkspace
                data={activeData}
                getDeleteAllEvaluationSummary={getDeleteAllEvaluationSummary}
                onDeleteAll={vi.fn().mockResolvedValue(undefined)}
                readOnly={false}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await userEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));

        await waitFor(() => expect(getDeleteAllEvaluationSummary).toHaveBeenCalledOnce());
        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                description: expect.stringMatching(/7 active offer evaluations.*2 corresponding counteroffer plans/),
            })
        );
    });

    test('restores active and archived filters independently without saving during hydration', () => {
        const updatePreferences = vi.fn();
        const { rerender } = render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} readOnly={false} />, {
            initialPreferences: {
                offer_decision_filters: ['Previous Evaluations'],
                archived_offer_decision_filters: ['Evaluated Offers'],
            },
            updatePreferences,
        });

        expect(screen.getByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Evaluated Offers' })).not.toBeInTheDocument();

        rerender(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} readOnly />);

        expect(screen.getByRole('heading', { name: 'Archived Evaluated Offers' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Archived Previous Evaluations' })).not.toBeInTheDocument();
        expect(updatePreferences).not.toHaveBeenCalled();
    });

    test('saves active filter changes and Show All through the preference provider', async () => {
        let savedPreferences: UserPreferences = {
            ...testPreferences,
            offer_decision_filters: ['Previous Evaluations'],
        };
        const updatePreferences = vi.fn(async (updates: Partial<UserPreferences>) => {
            savedPreferences = { ...savedPreferences, ...updates };
            return savedPreferences;
        });
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} readOnly={false} />, {
            initialPreferences: savedPreferences,
            updatePreferences,
        });

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await act(async () => {
            await userEvent.click(screen.getByRole('checkbox', { name: 'Evaluated Offers' }));
            await Promise.resolve();
        });
        await waitFor(() =>
            expect(updatePreferences).toHaveBeenLastCalledWith({
                offer_decision_filters: ['Previous Evaluations', 'Evaluated Offers'],
            })
        );

        await act(async () => {
            await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
            await Promise.resolve();
        });
        await waitFor(() =>
            expect(updatePreferences).toHaveBeenLastCalledWith({
                offer_decision_filters: [
                    'Offers to Evaluate',
                    'Evaluated Offers',
                    'Expired Evaluated Offers',
                    'Previous Evaluations',
                ],
            })
        );
    });

    test('saves archived filter changes without overwriting the active preference', async () => {
        let savedPreferences: UserPreferences = {
            ...testPreferences,
            offer_decision_filters: ['Offers to Evaluate'],
            archived_offer_decision_filters: ['Previous Evaluations'],
        };
        const updatePreferences = vi.fn(async (updates: Partial<UserPreferences>) => {
            savedPreferences = { ...savedPreferences, ...updates };
            return savedPreferences;
        });
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} readOnly />, {
            initialPreferences: savedPreferences,
            updatePreferences,
        });

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await act(async () => {
            await userEvent.click(screen.getByRole('checkbox', { name: 'Evaluated Offers' }));
            await Promise.resolve();
        });

        await waitFor(() =>
            expect(updatePreferences).toHaveBeenCalledWith({
                archived_offer_decision_filters: ['Previous Evaluations', 'Evaluated Offers'],
            })
        );
        expect(savedPreferences.offer_decision_filters).toEqual(['Offers to Evaluate']);
    });

    test('shows the standard error and restores saved filters when persistence fails', async () => {
        const updatePreferences = vi.fn().mockRejectedValue(new Error('offline'));
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} readOnly={false} />, {
            initialPreferences: { offer_decision_filters: ['Previous Evaluations'] },
            updatePreferences,
        });

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Evaluated Offers' }));

        expect(
            await screen.findByText('Unable to save offer comparison filters. Please try again.')
        ).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByRole('checkbox', { name: 'Previous Evaluations' })).toBeChecked();
            expect(screen.getByRole('checkbox', { name: 'Evaluated Offers' })).not.toBeChecked();
        });
    });

    test('omits Offers to Evaluate from archived filters', async () => {
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} readOnly />);

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.queryByRole('checkbox', { name: 'Offers to Evaluate' })).not.toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Evaluated Offers' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Expired Evaluated Offers' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Previous Evaluations' })).toBeInTheDocument();
    });

    test('hides More when only unevaluated offers are displayed', () => {
        render(
            <OfferDecisionWorkspace
                data={{ applications: [activeData.applications[1]] }}
                onDelete={vi.fn()}
                onDeleteAll={vi.fn()}
                onSave={vi.fn()}
                readOnly={false}
            />
        );

        expect(screen.queryByRole('button', { name: 'More...' })).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Offer comparison controls' }).children).toHaveLength(1);
    });

    test.each([
        ['Evaluated Offers', activeData.applications[0]],
        [
            'Expired Evaluated Offers',
            {
                ...activeData.applications[0],
                evaluation: createEvaluation(11, undefined, '2026-07-01T10:00:00.000Z'),
            },
        ],
        ['Previous Evaluations', activeData.applications[2]],
    ] as const)('shows More and its divider for a displayed %s record', (selectedFilter, application) => {
        render(
            <OfferDecisionWorkspace data={{ applications: [application] }} onDeleteAll={vi.fn()} readOnly={false} />,
            { initialPreferences: { offer_decision_filters: [selectedFilter] } }
        );

        expect(screen.getByRole('button', { name: 'More...' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Offer comparison controls' }).children).toHaveLength(2);
    });

    test('hides archived More and its divider when selected evaluations have no matches', () => {
        render(
            <OfferDecisionWorkspace
                data={{ applications: [activeData.applications[0]] }}
                onDeleteAll={vi.fn()}
                readOnly
            />,
            { initialPreferences: { archived_offer_decision_filters: ['Previous Evaluations'] } }
        );

        expect(screen.queryByRole('button', { name: 'More...' })).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Archived offer comparison controls' }).children).toHaveLength(1);
    });

    test('exports only selected evaluated groups with CSV section headers', async () => {
        render(
            <OfferDecisionWorkspace
                data={activeData}
                onDelete={vi.fn()}
                onDeleteAll={vi.fn()}
                onSave={vi.fn()}
                readOnly={false}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Evaluated Offers' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Previous Evaluations' }));
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));

        const exportLink = screen.getByRole('link', { name: 'Export as CSV' });
        const href = exportLink.getAttribute('href') ?? '';
        const encodedCsv = href.slice(href.indexOf(',') + 1).replace(/%(?![0-9a-f]{2})/gi, '%25');
        const csv = decodeURIComponent(encodedCsv).replace(/^\uFEFF/, '');
        expect(exportLink).toHaveAttribute('download', 'active_offer_evaluations.csv');
        expect(csv).toContain('Evaluated Offers');
        expect(csv).toContain('Previous Evaluations');
        expect(csv).toContain('Acme');
        expect(csv).toContain('Continuum');
        expect(csv).not.toContain('Beta Labs');
        expect(csv).toContain(`\n${Array.from({ length: 17 }, () => '""').join(',')}\n"Previous Evaluations"`);
    });

    test('downloads escaped CSV text and N/A values from the generated table', async () => {
        const application = {
            ...activeData.applications[0],
            company_name: 'Acme, "Global"\nLtd',
            evaluation: {
                ...createEvaluation(11),
                details: {
                    ...createEvaluation(11).details,
                    annual_leave_days: null,
                    bonus: 'Annual, "target"\nbonus',
                    work_arrangement: '' as const,
                },
            },
        };
        render(
            <OfferDecisionWorkspace data={{ applications: [application] }} onDeleteAll={vi.fn()} readOnly={false} />,
            { initialPreferences: { offer_decision_filters: ['Evaluated Offers'] } }
        );

        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        const href = screen.getByRole('link', { name: 'Export as CSV' }).getAttribute('href') ?? '';
        const encodedCsv = href.slice(href.indexOf(',') + 1).replace(/%(?![0-9a-f]{2})/gi, '%25');
        const csv = decodeURIComponent(encodedCsv).replace(/^\uFEFF/, '');

        expect(csv).toContain('Evaluated Offers');
        expect(csv).toContain('"Acme, ""Global""\nLtd"');
        expect(csv).toContain('"Annual, ""target""\nbonus"');
        expect(csv).toContain('N/A');
    });

    test('uses an explicit Enter-safe confirmation before deleting every evaluation', async () => {
        const onDeleteAll = vi.fn().mockResolvedValue(undefined);
        render(
            <OfferDecisionWorkspace
                data={activeData}
                onDelete={vi.fn()}
                onDeleteAll={onDeleteAll}
                onSave={vi.fn()}
                readOnly={false}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await userEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));

        await waitFor(() => expect(onDeleteAll).toHaveBeenCalledOnce());
        const options = mockConfirm.mock.calls[0][0];
        expect(options).toEqual(
            expect.objectContaining({
                title: 'Confirm Delete All',
                confirmationText: 'Delete All',
                description: expect.stringContaining('Applications and offers without evaluations are not deleted.'),
            })
        );
        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();
        options.confirmationButtonProps.onKeyDown({ key: 'Enter', preventDefault, stopPropagation });
        expect(preventDefault).toHaveBeenCalledOnce();
        expect(stopPropagation).toHaveBeenCalledOnce();
    });

    test('does not delete all evaluations when confirmation is cancelled', async () => {
        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        const onDeleteAll = vi.fn();
        render(
            <OfferDecisionWorkspace
                data={activeData}
                onDelete={vi.fn()}
                onDeleteAll={onDeleteAll}
                onSave={vi.fn()}
                readOnly={false}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));
        });
        await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
        await waitFor(() => expect(screen.getByRole('button', { name: 'Delete all evaluations' })).toBeEnabled());
        expect(onDeleteAll).not.toHaveBeenCalled();
    });

    test('guards against duplicate bulk deletion submissions', async () => {
        let resolveDelete!: () => void;
        const onDeleteAll = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveDelete = resolve;
                })
        );
        render(
            <OfferDecisionWorkspace
                data={activeData}
                onDelete={vi.fn()}
                onDeleteAll={onDeleteAll}
                onSave={vi.fn()}
                readOnly={false}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));
        await waitFor(() => expect(onDeleteAll).toHaveBeenCalledOnce());
        fireEvent.click(screen.getByRole('button', { name: 'Delete all evaluations' }));
        expect(onDeleteAll).toHaveBeenCalledOnce();

        await act(async () => resolveDelete());
    });

    test('uses Clear filters for empty evaluation filters and restores all groups', async () => {
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />);

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Expired Evaluated Offers' }));

        expect(screen.getByRole('heading', { name: 'No offer comparisons match your filters' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(screen.getByRole('heading', { name: 'Offers to Evaluate' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Evaluated Offers' })).toBeInTheDocument();
    });

    test('uses Clear filters for archived filters with no matches', async () => {
        render(
            <OfferDecisionWorkspace data={{ applications: [activeData.applications[0]] }} onDelete={vi.fn()} readOnly />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Previous Evaluations' }));

        expect(
            screen.getByRole('heading', { name: 'No archived offer comparisons match your filters' })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(screen.getByRole('heading', { name: 'Archived Evaluated Offers' })).toBeInTheDocument();
    });

    test('uses the standard filtered empty state when Offers to Evaluate has no results', async () => {
        render(
            <MemoryRouter>
                <OfferDecisionWorkspace
                    data={{ applications: [activeData.applications[0]] }}
                    onDelete={vi.fn()}
                    onSave={vi.fn()}
                    readOnly={false}
                />
            </MemoryRouter>
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offers to Evaluate' }));

        expect(screen.getByRole('heading', { name: 'No offer comparisons match your filters' })).toBeInTheDocument();
        expect(
            screen.getByText('Try showing all evaluation types to see every active offer comparison.')
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    });

    test('keeps controls visible and renders the shared card skeletons while loading', () => {
        render(<OfferDecisionWorkspace data={{ applications: [] }} isLoading readOnly={false} />);

        expect(screen.getByRole('region', { name: 'Offer comparison controls' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Filter by' })).toBeDisabled();
        expect(screen.getAllByTestId('offer-decision-skeleton')).toHaveLength(3);
        expect(screen.getByRole('status', { name: 'Loading offer comparisons' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'No offers to compare' })).not.toBeInTheDocument();
    });
});
