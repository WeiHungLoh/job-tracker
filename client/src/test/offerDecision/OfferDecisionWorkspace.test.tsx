import { useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    decision_deadline: '2099-08-15T10:00:00.000Z',
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
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: undefined,
        });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: undefined });
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
            evaluation: createEvaluation(14, undefined, '2026-07-10T10:00:00.000Z'),
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
        ).toEqual([
            'Edit evaluation',
            'Plan counteroffer',
            'Add to Google Calendar',
            'Add to Apple Calendar / Outlook (.ics)',
            'Accept offer',
            'Decline offer',
        ]);
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

    test('edits and saves active evaluated, expired and previous evaluations in Cards mode', async () => {
        const expiredOffer = {
            ...activeData.applications[0],
            job_id: 14,
            company_name: 'Expired Co',
            evaluation: createEvaluation(14, undefined, '2026-07-10T10:00:00.000Z'),
        };
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(
            <WorkspaceHarness
                initialData={{ applications: [...activeData.applications, expiredOffer] }}
                onSave={onSave}
            />
        );

        for (const [companyName, jobId, salary] of [
            ['Acme', 11, '11001'],
            ['Expired Co', 14, '11002'],
            ['Continuum', 13, '11003'],
        ] as const) {
            const directEdit = screen.queryByRole('button', { name: `Edit evaluation for ${companyName}` });
            if (directEdit) {
                fireEvent.click(directEdit);
            } else {
                editOfferEvaluation(companyName);
            }
            fireEvent.change(screen.getByLabelText(`${companyName} monthly base salary`), {
                target: { value: salary },
            });
            fireEvent.click(screen.getByRole('button', { name: `Save evaluation for ${companyName}` }));

            await waitFor(() => expect(onSave).toHaveBeenCalledWith(jobId, expect.any(Object)));
            await waitFor(() =>
                expect(screen.queryByLabelText(`${companyName} monthly base salary`)).not.toBeInTheDocument()
            );
        }

        expect(onSave).toHaveBeenCalledTimes(3);
    });

    test('keeps edit and status actions out of archived Offer Comparison while exposing saved counteroffer plans', () => {
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
        expect(screen.getByRole('button', { name: 'View counteroffer plan for Acme' })).toBeVisible();
        expect(
            screen.queryByRole('button', { name: 'Add Acme offer deadline to Google Calendar' })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Add Acme offer deadline to Apple Calendar or Outlook' })
        ).not.toBeInTheDocument();
    });

    test('opens eligible saved offer deadlines from the existing More menu and closes after selection', async () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        render(
            <OfferDecisionWorkspace
                data={{ applications: [activeData.applications[0]] }}
                onSave={vi.fn()}
                onUpdateOfferStatus={vi.fn()}
                readOnly={false}
            />
        );

        const menu = openOfferActions('Acme');
        const googleAction = within(menu).getByRole('menuitem', {
            name: 'Add Acme offer deadline to Google Calendar',
        });
        expect(googleAction).toHaveTextContent('Add to Google Calendar');
        expect(
            within(menu).getByRole('menuitem', {
                name: 'Add Acme offer deadline to Apple Calendar or Outlook',
            })
        ).toHaveTextContent('Add to Apple Calendar / Outlook (.ics)');

        await userEvent.click(googleAction);

        expect(open).toHaveBeenCalledWith(
            expect.stringContaining('https://calendar.google.com/calendar/render?'),
            '_blank',
            'noopener,noreferrer'
        );
        expect(screen.queryByRole('menu', { name: 'More actions for Acme' })).not.toBeInTheDocument();
        expect(screen.queryByText('Compensation and terms')).not.toBeInTheDocument();
    });

    test('downloads an eligible offer deadline with a sanitized filename and shared error handling', async () => {
        const createObjectURL = vi.fn(() => 'blob:offer-deadline');
        const revokeObjectURL = vi.fn();
        let downloadedFilename = '';
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            downloadedFilename = this.download;
        });
        render(
            <OfferDecisionWorkspace
                data={{ applications: [activeData.applications[0]] }}
                onSave={vi.fn()}
                readOnly={false}
            />
        );

        await userEvent.click(
            within(openOfferActions('Acme')).getByRole('menuitem', {
                name: 'Add Acme offer deadline to Apple Calendar or Outlook',
            })
        );

        expect(downloadedFilename).toBe('Acme-Offer-Decision-Deadline.ics');
        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:offer-deadline');
        expect(screen.queryByRole('menu', { name: 'More actions for Acme' })).not.toBeInTheDocument();

        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: vi.fn(() => {
                throw new Error('Unable to create object URL');
            }),
        });
        await userEvent.click(
            within(openOfferActions('Acme')).getByRole('menuitem', {
                name: 'Add Acme offer deadline to Apple Calendar or Outlook',
            })
        );
        expect(await screen.findByText('Unable to create the calendar event. Please try again.')).toBeInTheDocument();
    });

    test('hides offer deadline actions while editing and outside eligible evaluated groups', () => {
        const expiredOffer = {
            ...activeData.applications[0],
            job_id: 14,
            company_name: 'Expired Co',
            evaluation: createEvaluation(14, undefined, '2026-07-10T10:00:00.000Z'),
        };
        render(
            <OfferDecisionWorkspace
                data={{ applications: [...activeData.applications, expiredOffer] }}
                onSave={vi.fn()}
                onUpdateOfferStatus={vi.fn()}
                readOnly={false}
            />
        );

        expect(
            within(openOfferActions('Expired Co')).queryByRole('menuitem', { name: /Calendar|calendar/ })
        ).not.toBeInTheDocument();
        expect(
            within(openOfferActions('Continuum')).queryByRole('menuitem', { name: /Calendar|calendar/ })
        ).not.toBeInTheDocument();

        editOfferEvaluation('Acme');
        expect(screen.queryByRole('button', { name: 'More actions for Acme' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save evaluation for Acme' })).toBeInTheDocument();
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

    test('restarts Table scroll and highlight when the same evaluation changes status repeatedly', async () => {
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;

        const StatusHarness = () => {
            const [application, setApplication] = useState(activeData.applications[0]);
            return (
                <OfferDecisionWorkspace
                    data={{ applications: [application] }}
                    onUpdateOfferStatus={async (_, status) =>
                        setApplication((current) => ({ ...current, job_status: status }))
                    }
                    readOnly={false}
                />
            );
        };

        render(<StatusHarness />, {
            initialPreferences: {
                application_enable_scroll: true,
                offer_decision_view_mode: 'table',
            },
        });

        fireEvent.click(within(openOfferActions('Acme')).getByRole('menuitem', { name: 'Decline offer from Acme' }));
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));

        fireEvent.click(within(openOfferActions('Acme')).getByRole('menuitem', { name: 'Change to Offer for Acme' }));
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
        expect(document.getElementById('offer-evaluation-11')?.className).toContain('highlight');

        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    test('does not carry a Table status highlight or auto-scroll into Cards after changing view mode', async () => {
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;

        const StatusHarness = () => {
            const [application, setApplication] = useState(activeData.applications[0]);
            return (
                <OfferDecisionWorkspace
                    data={{ applications: [application] }}
                    onUpdateOfferStatus={async (_, status) =>
                        setApplication((current) => ({ ...current, job_status: status }))
                    }
                    readOnly={false}
                />
            );
        };

        render(<StatusHarness />, {
            initialPreferences: {
                application_enable_scroll: true,
                offer_decision_view_mode: 'table',
            },
        });

        fireEvent.click(within(openOfferActions('Acme')).getByRole('menuitem', { name: 'Decline offer from Acme' }));
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
        expect(document.getElementById('offer-evaluation-11')?.className).toContain('highlight');

        fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
        const card = await screen.findByRole('article', { name: 'Acme Software Engineer' });
        expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true');
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(card.className).not.toContain('highlight');

        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
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

    test.each(['horizontal', 'vertical'] as const)(
        'scrolls to and highlights the complete dashboard target in %s Table mode',
        async (orientation) => {
            const onTargetOfferProcessed = vi.fn();
            const scrollIntoView = vi.fn();
            const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
            HTMLElement.prototype.scrollIntoView = scrollIntoView;

            render(
                <OfferDecisionWorkspace
                    data={activeData}
                    onTargetOfferProcessed={onTargetOfferProcessed}
                    readOnly={false}
                    selectedFilters={['Evaluated Offers']}
                    targetOfferJobId={11}
                />,
                {
                    initialPreferences: {
                        application_enable_scroll: false,
                        offer_decision_table_orientation: orientation,
                        offer_decision_view_mode: 'table',
                    },
                }
            );

            await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce());
            expect(onTargetOfferProcessed).toHaveBeenCalledOnce();
            if (orientation === 'horizontal') {
                expect(screen.getByRole('row', { name: /1 Acme Software Engineer/ }).className).toContain('highlight');
            } else {
                const highlightedCells = document.querySelectorAll('[data-offer-evaluation-job-id="11"]');
                expect(highlightedCells).toHaveLength(16);
                highlightedCells.forEach((cell) => expect(cell.className).toContain('highlight'));
            }

            HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
        }
    );

    test('does not repeat a pending dashboard target highlight when the view mode changes', async () => {
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;

        render(
            <OfferDecisionWorkspace
                data={activeData}
                onTargetOfferProcessed={vi.fn()}
                readOnly={false}
                selectedFilters={['Evaluated Offers']}
                targetOfferJobId={11}
            />,
            { initialPreferences: { offer_decision_view_mode: 'table' } }
        );

        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce());
        await userEvent.click(screen.getByRole('button', { name: 'Cards' }));

        await screen.findByRole('article', { name: 'Acme Software Engineer' });
        expect(scrollIntoView).toHaveBeenCalledOnce();
        expect(screen.getByRole('article', { name: 'Acme Software Engineer' }).className).not.toContain('highlight');

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

    test('keeps decision priorities enabled while an evaluation draft is open', () => {
        render(<OfferDecisionWorkspace data={robustnessData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />);

        fireEvent.click(screen.getByRole('button', { name: 'Try priorities' }));
        expect(screen.getByLabelText('Career Growth importance')).toBeEnabled();

        editOfferEvaluation('Acme');
        expect(screen.getByLabelText('Career Growth importance')).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Reset importance to balanced' })).toBeEnabled();

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
        expect(screen.getByRole('button', { name: 'More actions for Beta Labs' })).toBeInTheDocument();
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
            expect(screen.getByRole('button', { name: 'More actions for Beta Labs' })).toBeInTheDocument()
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
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

        editOfferEvaluation('Acme');
        const pros = screen.getByLabelText('Acme pros');
        await userEvent.type(pros, '{enter}Additional context');
        expect(pros).toHaveValue('Strong product ownership\nAdditional context');
        expect(onSave).not.toHaveBeenCalled();

        fireEvent.keyDown(pros, { key: 'Enter', shiftKey: true });
        await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
        expect(screen.queryByLabelText('Acme pros')).not.toBeInTheDocument();

        rerender(<WorkspaceHarness />);
        editOfferEvaluation('Acme');
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
        expect(screen.getByRole('button', { name: 'More actions for Acme' })).toBeInTheDocument();
    });

    test('unlocks a saved evaluation only on edit and relocks it after a changed save', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        expect(screen.queryByLabelText('Acme monthly base salary')).not.toBeInTheDocument();
        editOfferEvaluation('Acme');

        const saveButton = screen.getByRole('button', { name: 'Save evaluation for Acme' });
        expect(screen.getByLabelText('Acme monthly base salary')).toHaveValue(10000);
        expect(saveButton).toBeEnabled();

        fireEvent.change(screen.getByLabelText('Acme monthly base salary'), { target: { value: '11000' } });
        expect(saveButton).toBeEnabled();
        fireEvent.click(saveButton);

        await waitFor(() => expect(onSave).toHaveBeenCalledWith(11, expect.any(Object)));
        expect(screen.queryByLabelText('Acme monthly base salary')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'More actions for Acme' })).toBeInTheDocument();
        expect(screen.getByText('SGD 11,000')).toBeInTheDocument();
    });

    test('keeps an unchanged edited evaluation open and shows an error toast', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        editOfferEvaluation('Acme');
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        expect(await screen.findByText('Change at least one evaluation field before saving.')).toBeInTheDocument();
        expect(screen.getByLabelText('Acme monthly base salary')).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    test('keeps an untouched new evaluation open and shows inline validation errors without an unchanged toast', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Beta Labs' }));

        expect(await screen.findByText('Decision deadline is required.')).toBeInTheDocument();
        expect(screen.getByText('Monthly base salary is required.')).toBeInTheDocument();
        expect(screen.queryByText('Change at least one evaluation field before saving.')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Beta Labs decision deadline')).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    test('confirms and retries when a higher evaluation requires deleting its counteroffer plan', async () => {
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;
        const conflict = new JobTrackerAPIError('Conflict', 409, {
            code: 'OFFER_EVALUATION_ABOVE_COUNTEROFFER',
            message:
                'This evaluation fit rating is higher than the saved counteroffer plan. Confirm deletion of the counteroffer plan before saving.',
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
            />,
            { initialPreferences: { application_enable_scroll: true } }
        );

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme Work-Life Balance rating'), { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Delete counteroffer plan?',
                    confirmationText: 'Delete and Save',
                    description: expect.stringContaining('higher fit rating than your saved counteroffer plan'),
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
        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(screen.getByRole('article', { name: 'Acme Software Engineer' }).className).not.toContain('highlight');
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    test('keeps a higher edited evaluation open when counteroffer deletion is cancelled', async () => {
        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        const onSave = vi.fn().mockRejectedValueOnce(
            new JobTrackerAPIError('Conflict', 409, {
                code: 'OFFER_EVALUATION_ABOVE_COUNTEROFFER',
                message:
                    'This evaluation fit rating is higher than the saved counteroffer plan. Confirm deletion of the counteroffer plan before saving.',
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
        fireEvent.change(screen.getByLabelText('Acme Work-Life Balance rating'), { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
        expect(onSave).toHaveBeenCalledOnce();
        expect(screen.getByLabelText('Acme Work-Life Balance rating')).toHaveValue('5');
    });

    test('uses the shared date-time input format and formatted locked deadline', () => {
        render(<WorkspaceHarness />);

        fireEvent.click(screen.getByRole('button', { name: 'Show details for Acme' }));
        expect(screen.getAllByText(formatDate(details.decision_deadline).formattedDate)).not.toHaveLength(0);

        editOfferEvaluation('Acme');
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

        editOfferEvaluation('Acme');
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

        editOfferEvaluation('Acme');
        expect(acmeScrollIntoView).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel evaluation for Acme' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'More actions for Acme' })).toBeVisible());
        await waitFor(() => expect(acmeScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' }));

        acmeScrollIntoView.mockClear();
        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme bonus'), { target: { value: 'Updated target' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'More actions for Acme' })).toBeVisible());
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

        editOfferEvaluation('Acme');
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

        editOfferEvaluation('Acme');
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

        editOfferEvaluation('Acme');
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

    test('shows a valid-salary inline error for malformed monthly salary input', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />);

        editOfferEvaluation('Acme');
        const salaryInput = screen.getByLabelText('Acme monthly base salary');
        fireEvent.change(salaryInput, { target: { value: '' } });
        Object.defineProperty(salaryInput, 'validity', {
            configurable: true,
            value: { badInput: true },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        expect(await screen.findByText('Please enter a valid monthly base salary.')).toBeInTheDocument();
        expect(screen.queryByText('Monthly base salary is required.')).not.toBeInTheDocument();
        expect(salaryInput).toHaveFocus();
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
                evaluation: createEvaluation(2, tied, '2099-08-01T10:00:00.000Z'),
            },
            {
                ...activeData.applications[0],
                job_id: 1,
                company_name: 'First',
                evaluation: createEvaluation(1, tied, '2099-08-01T10:00:00.000Z'),
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
                description: expect.stringContaining('Offers without evaluations are not deleted.'),
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

    test('defaults to Cards and places the Cards/Table selector before Filter by', () => {
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />);

        const cardsButton = screen.getByRole('button', { name: 'Cards' });
        const tableButton = screen.getByRole('button', { name: 'Table' });
        const filterButton = screen.getByRole('button', { name: 'Filter by' });

        expect(cardsButton).toHaveAttribute('aria-pressed', 'true');
        expect(tableButton).toHaveAttribute('aria-pressed', 'false');
        expect(tableButton.compareDocumentPosition(filterButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getAllByRole('article')).toHaveLength(3);
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    test('switches Table mode between horizontal and vertical layouts', async () => {
        const initialPreferences = { ...testPreferences, offer_decision_view_mode: 'table' as const };
        const updatePreferences = vi.fn(async (updates: Partial<UserPreferences>) => ({
            ...initialPreferences,
            ...updates,
        }));
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />, {
            initialPreferences,
            updatePreferences,
        });

        const layoutButton = screen.getByRole('button', { name: 'Table layout' });
        expect(layoutButton).toHaveTextContent('Horizontal');
        await userEvent.click(layoutButton);
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Vertical' }));

        expect(screen.getByRole('button', { name: 'Table layout' })).toHaveTextContent('Vertical');
        expect(updatePreferences).toHaveBeenCalledWith({ offer_decision_table_orientation: 'vertical' });
        const evaluatedTable = screen.getByRole('table', { name: 'Evaluated Offers' });
        expect(within(evaluatedTable).queryAllByRole('columnheader')).toHaveLength(0);
        expect(
            within(evaluatedTable)
                .getAllByRole('rowheader')
                .map((header) => header.textContent)
        ).toEqual([
            'No.',
            'Company Name',
            'Position',
            'Decision Deadline',
            'Fit Rating',
            'Monthly Base Salary',
            'Bonus',
            'Annual Leave',
            'Work Arrangement',
            'Pros',
            'Cons',
            'Career Growth',
            'Company / Culture Fit',
            'Work-Life Balance',
            'Compensation Rating',
            'Actions',
        ]);
        expect(within(evaluatedTable).queryByText('Field')).not.toBeInTheDocument();

        openOfferActions('Acme');
        fireEvent.scroll(evaluatedTable.parentElement as HTMLElement);
        expect(screen.queryByRole('menu', { name: 'More actions for Acme' })).not.toBeInTheDocument();
    });

    test('restores the persisted Table layout when saving the new layout fails', async () => {
        const updatePreferences = vi.fn().mockRejectedValue(new Error('offline'));
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />, {
            initialPreferences: { ...testPreferences, offer_decision_view_mode: 'table' },
            updatePreferences,
        });

        await userEvent.click(screen.getByRole('button', { name: 'Table layout' }));
        await userEvent.click(screen.getByRole('menuitemradio', { name: 'Vertical' }));

        expect(
            await screen.findByText('Unable to save the offer comparison table layout. Please try again.')
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Table layout' })).toHaveTextContent('Horizontal');
        expect(
            within(screen.getByRole('table', { name: 'Evaluated Offers' })).getAllByRole('columnheader')
        ).not.toHaveLength(0);
    });

    test('persists Table mode and renders each selected active group as an independent semantic table', async () => {
        const updatePreferences = vi.fn(async (updates: Partial<UserPreferences>) => ({
            ...testPreferences,
            ...updates,
        }));
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />, {
            updatePreferences,
        });

        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Table' }));
        });

        expect(updatePreferences).toHaveBeenCalledWith({ offer_decision_view_mode: 'table' });
        await waitFor(() => expect(screen.getAllByRole('table')).toHaveLength(3));
        expect(screen.queryByRole('article')).not.toBeInTheDocument();

        const unevaluatedSection = screen.getByRole('heading', { name: 'Offers to Evaluate' }).closest('section');
        const evaluatedSection = screen.getByRole('heading', { name: 'Evaluated Offers' }).closest('section');
        const previousSection = screen.getByRole('heading', { name: 'Previous Evaluations' }).closest('section');

        expect(
            within(unevaluatedSection as HTMLElement)
                .getAllByRole('columnheader')
                .map((header) => header.textContent)
        ).toEqual(['No.', 'Company Name', 'Position', 'Actions']);
        expect(
            within(evaluatedSection as HTMLElement)
                .getAllByRole('columnheader')
                .map((header) => header.textContent)
        ).toEqual([
            'No.',
            'Company Name',
            'Position',
            'Decision Deadline',
            'Fit Rating',
            'Monthly Base Salary',
            'Bonus',
            'Annual Leave',
            'Work Arrangement',
            'Pros',
            'Cons',
            'Career Growth',
            'Company / Culture Fit',
            'Work-Life Balance',
            'Compensation Rating',
            'Actions',
        ]);
        expect(
            within(previousSection as HTMLElement)
                .getAllByRole('columnheader')
                .map((header) => header.textContent)
        ).toEqual([
            'No.',
            'Company Name',
            'Position',
            'Status',
            'Decision Deadline',
            'Fit Rating',
            'Monthly Base Salary',
            'Bonus',
            'Annual Leave',
            'Work Arrangement',
            'Pros',
            'Cons',
            'Career Growth',
            'Company / Culture Fit',
            'Work-Life Balance',
            'Compensation Rating',
            'Actions',
        ]);
        expect(within(evaluatedSection as HTMLElement).getByText('1')).toBeInTheDocument();
        expect(within(previousSection as HTMLElement).getByText('1')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /show details/i })).not.toBeInTheDocument();

        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Cards' }));
        });
        expect(updatePreferences).toHaveBeenLastCalledWith({ offer_decision_view_mode: 'cards' });
        await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3));
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    test('renders saved Table values directly and uses a dash for every missing optional value', () => {
        const application = {
            ...activeData.applications[0],
            evaluation: {
                ...createEvaluation(11),
                details: {
                    ...details,
                    bonus: '',
                    annual_leave_days: null,
                    work_arrangement: '' as const,
                    pros: '',
                    concerns: '',
                },
            },
        };
        render(
            <OfferDecisionWorkspace
                data={{ applications: [application] }}
                onDelete={vi.fn()}
                onSave={vi.fn()}
                readOnly={false}
            />,
            { initialPreferences: { offer_decision_view_mode: 'table' } }
        );

        const row = screen.getByRole('row', { name: /1 Acme Software Engineer/ });
        expect(within(row).getByText('80%')).toBeInTheDocument();
        expect(within(row).getByText('SGD 10,000')).toBeInTheDocument();
        expect(within(row).getAllByText('-')).toHaveLength(5);
        expect(within(row).getByText('5/5')).toBeInTheDocument();
        expect(within(row).getAllByText('4/5')).toHaveLength(2);
        expect(within(row).getByText('3/5')).toBeInTheDocument();
    });

    test('renders no more than four active and three archived Table sections while omitting empty groups', () => {
        const expiredOffer = {
            ...activeData.applications[0],
            job_id: 14,
            company_name: 'Expired Co',
            evaluation: createEvaluation(14, undefined, '2026-07-10T10:00:00.000Z'),
        };
        const tableData = { applications: [...activeData.applications, expiredOffer] };
        const activeRender = render(
            <OfferDecisionWorkspace data={tableData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />,
            { initialPreferences: { offer_decision_view_mode: 'table' } }
        );

        expect(screen.getAllByRole('table')).toHaveLength(4);
        expect(screen.getAllByRole('table').map((table) => table.getAttribute('aria-labelledby'))).toEqual([
            'offers-to-evaluate-heading',
            'evaluated-offers-heading',
            'expired-evaluated-offers-heading',
            'previous-evaluations-heading',
        ]);

        activeRender.unmount();
        render(<OfferDecisionWorkspace data={tableData} onDelete={vi.fn()} readOnly />, {
            initialPreferences: { archived_offer_decision_view_mode: 'table' },
        });
        expect(screen.getAllByRole('table')).toHaveLength(3);
        expect(screen.queryByRole('heading', { name: 'Archived Offers to Evaluate' })).not.toBeInTheDocument();
    });

    test('keeps each native table in its own keyboard-accessible two-axis scroll region with sticky opaque headers', () => {
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />, {
            initialPreferences: { offer_decision_view_mode: 'table' },
        });

        for (const table of screen.getAllByRole('table')) {
            expect(table.tagName).toBe('TABLE');
            expect(table.parentElement).toHaveAttribute('role', 'region');
            expect(table.parentElement).toHaveAttribute('tabindex', '0');
            for (const header of within(table).getAllByRole('columnheader')) {
                expect(header).toHaveAttribute('scope', 'col');
            }
        }

        const tableCss = readFileSync(
            resolve(process.cwd(), 'src/pages/offerDecision/offerEvaluationTable/OfferEvaluationTable.module.css'),
            'utf8'
        );
        expect(tableCss).toMatch(/\.tableScroll\s*\{[^}]*max-height:[^}]*overflow:\s*auto;/s);
        expect(tableCss).toMatch(/\.table thead th\s*\{[^}]*position:\s*sticky;[^}]*background-color:/s);
        expect(tableCss).toMatch(/\.table thead th\s*\{[^}]*z-index:\s*40;/s);
        expect(tableCss).toMatch(/\.table\.vertical tbody th\s*\{[^}]*z-index:\s*40;/s);
        expect(tableCss).toMatch(/\.table th,\s*\.table td\s*\{[^}]*text-align:\s*left;/s);
        expect(tableCss).toMatch(/\.actionDropdown\s*\{[^}]*width:\s*max-content;[^}]*\}/s);
        expect(tableCss).toMatch(/\.actionOption\s*\{[^}]*white-space:\s*nowrap;[^}]*\}/s);
        expect(tableCss).toMatch(/\.directAction\s*\{[^}]*width:\s*auto;[^}]*min-width:\s*104px;/s);
        expect(tableCss).not.toMatch(/@media/);
    });

    test('contains vertical wheel input when a table can scroll and forwards it when the table cannot scroll', () => {
        const scrollPage = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />, {
            initialPreferences: { offer_decision_view_mode: 'table' },
        });

        const tableRegion = screen.getByRole('table', { name: 'Evaluated Offers' }).parentElement as HTMLDivElement;
        const outerContainer = tableRegion.parentElement as HTMLElement;
        const handleOuterWheel = vi.fn();
        outerContainer.addEventListener('wheel', handleOuterWheel);
        Object.defineProperties(tableRegion, {
            clientHeight: { configurable: true, value: 300 },
            scrollHeight: { configurable: true, value: 900 },
            scrollTop: { configurable: true, value: 0, writable: true },
        });

        const upwardBoundaryWheel = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY: -100,
        });
        tableRegion.dispatchEvent(upwardBoundaryWheel);
        expect(upwardBoundaryWheel.defaultPrevented).toBe(true);
        expect(handleOuterWheel).not.toHaveBeenCalled();

        const downwardTableWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
        tableRegion.dispatchEvent(downwardTableWheel);
        expect(downwardTableWheel.defaultPrevented).toBe(false);
        expect(handleOuterWheel).not.toHaveBeenCalled();

        Object.defineProperty(tableRegion, 'scrollHeight', { configurable: true, value: 300 });
        const outerWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
        tableRegion.dispatchEvent(outerWheel);
        expect(outerWheel.defaultPrevented).toBe(true);
        expect(handleOuterWheel).not.toHaveBeenCalled();
        expect(scrollPage).toHaveBeenCalledWith(0, 100);
    });

    test('lets Vertical table up-and-down wheel input scroll the outer container', () => {
        const scrollPage = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
        render(<OfferDecisionWorkspace data={activeData} onDelete={vi.fn()} onSave={vi.fn()} readOnly={false} />, {
            initialPreferences: {
                offer_decision_table_orientation: 'vertical',
                offer_decision_view_mode: 'table',
            },
        });

        const tableRegion = screen.getByRole('table', { name: 'Evaluated Offers' }).parentElement as HTMLDivElement;
        const outerContainer = tableRegion.parentElement as HTMLElement;
        const handleOuterWheel = vi.fn();
        outerContainer.addEventListener('wheel', handleOuterWheel);
        Object.defineProperties(tableRegion, {
            clientHeight: { configurable: true, value: 300 },
            scrollHeight: { configurable: true, value: 900 },
        });

        const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
        tableRegion.dispatchEvent(wheel);

        expect(wheel.defaultPrevented).toBe(true);
        expect(handleOuterWheel).not.toHaveBeenCalled();
        expect(scrollPage).toHaveBeenCalledWith(0, 100);
    });

    test('uses Table More menus for multi-action rows and a direct Add evaluation button for unevaluated rows', async () => {
        render(
            <OfferDecisionWorkspace
                data={activeData}
                onDelete={vi.fn()}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn()}
                onSave={vi.fn()}
                onSaveCounterofferPlan={vi.fn()}
                onUpdateOfferStatus={vi.fn()}
                readOnly={false}
            />,
            { initialPreferences: { offer_decision_view_mode: 'table' } }
        );

        expect(
            within(openOfferActions('Acme'))
                .getAllByRole('menuitem')
                .map((item) => item.textContent)
        ).toEqual([
            'Edit evaluation',
            'Plan counteroffer',
            'Add to Google Calendar',
            'Add to Apple Calendar / Outlook (.ics)',
            'Accept offer',
            'Decline offer',
            'Delete evaluation',
        ]);
        expect(screen.getByRole('menu', { name: 'More actions for Acme' }).parentElement).toBe(document.body);
        fireEvent.scroll(screen.getByRole('table', { name: 'Evaluated Offers' }).parentElement as HTMLElement);
        expect(screen.queryByRole('menu', { name: 'More actions for Acme' })).not.toBeInTheDocument();

        expect(screen.queryByRole('button', { name: 'More actions for Beta Labs' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));

        const dialog = screen.getByRole('dialog', { name: 'Add Evaluation' });
        expect(within(dialog).getByRole('heading', { name: 'Add Evaluation' })).toBeInTheDocument();
        expect(within(dialog).getByRole('heading', { name: 'Beta Labs' })).toBeInTheDocument();
        expect(within(dialog).getByText('Platform Developer')).toBeInTheDocument();
        expect(within(dialog).getByText('Offer')).toBeInTheDocument();
        expect(within(dialog).getByText('Fit rating')).toBeInTheDocument();
        expect(within(dialog).getByRole('progressbar', { name: 'Beta Labs offer fit rating' })).toBeInTheDocument();
        expect(within(dialog).getByLabelText('Beta Labs decision deadline')).toBeInTheDocument();
        expect(within(dialog).getByLabelText('Beta Labs monthly base salary')).toBeInTheDocument();
        expect(within(dialog).getByLabelText('Beta Labs Career Growth rating')).toBeInTheDocument();

        await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel evaluation for Beta Labs' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('table', { name: 'Offers to Evaluate' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' })).toHaveFocus();
    });

    test('edits and saves active evaluated, expired and previous evaluations in Table mode', async () => {
        const expiredOffer = {
            ...activeData.applications[0],
            job_id: 14,
            company_name: 'Expired Co',
            evaluation: createEvaluation(14, undefined, '2026-07-10T10:00:00.000Z'),
        };
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(
            <WorkspaceHarness
                initialData={{ applications: [...activeData.applications, expiredOffer] }}
                onSave={onSave}
            />,
            {
                initialPreferences: { offer_decision_view_mode: 'table' },
            }
        );

        for (const [companyName, jobId, salary] of [
            ['Acme', 11, '11001'],
            ['Expired Co', 14, '11002'],
            ['Continuum', 13, '11003'],
        ] as const) {
            editOfferEvaluation(companyName);
            fireEvent.change(screen.getByLabelText(`${companyName} monthly base salary`), {
                target: { value: salary },
            });
            fireEvent.click(screen.getByRole('button', { name: `Save evaluation for ${companyName}` }));

            await waitFor(() => expect(onSave).toHaveBeenCalledWith(jobId, expect.any(Object)));
            await waitFor(() =>
                expect(screen.queryByRole('dialog', { name: 'Edit Evaluation' })).not.toBeInTheDocument()
            );
        }

        expect(onSave).toHaveBeenCalledTimes(3);
    });

    test.each(['horizontal', 'vertical'] as const)(
        'scrolls to and highlights an edited evaluation in %s Table mode when auto-scroll is enabled',
        async (orientation) => {
            const scrollIntoView = vi.fn();
            const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
            HTMLElement.prototype.scrollIntoView = scrollIntoView;
            render(<WorkspaceHarness />, {
                initialPreferences: {
                    application_enable_scroll: true,
                    offer_decision_table_orientation: orientation,
                    offer_decision_view_mode: 'table',
                },
            });

            editOfferEvaluation('Acme');
            fireEvent.change(screen.getByLabelText('Acme monthly base salary'), { target: { value: '11000' } });
            fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            const savedEvaluation = await waitFor(() => {
                const element = document.getElementById('offer-evaluation-11');
                expect(element?.className).toContain('highlight');
                return element as HTMLElement;
            });
            expect(savedEvaluation).toBeInTheDocument();
            if (orientation === 'horizontal') {
                expect(savedEvaluation.tagName).toBe('TR');
            } else {
                const highlightedColumn = document.querySelectorAll('[data-offer-evaluation-job-id="11"]');
                expect(highlightedColumn).toHaveLength(16);
                highlightedColumn.forEach((cell) => expect(cell.className).toContain('highlight'));
            }
            await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' }));
            HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
        }
    );

    test('does not scroll or highlight an edited evaluation in Table mode when auto-scroll is disabled', async () => {
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;
        render(<WorkspaceHarness />, {
            initialPreferences: {
                application_enable_scroll: false,
                offer_decision_view_mode: 'table',
            },
        });

        editOfferEvaluation('Acme');
        fireEvent.change(screen.getByLabelText('Acme monthly base salary'), { target: { value: '11000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(document.getElementById('offer-evaluation-11')?.className).not.toContain('highlight');
        expect(scrollIntoView).not.toHaveBeenCalled();
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    test.each(['horizontal', 'vertical'] as const)(
        'scrolls to and highlights a newly added evaluation in %s Table mode when auto-scroll is enabled',
        async (orientation) => {
            const scrollIntoView = vi.fn();
            const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
            HTMLElement.prototype.scrollIntoView = scrollIntoView;
            render(<WorkspaceHarness />, {
                initialPreferences: {
                    application_enable_scroll: true,
                    offer_decision_table_orientation: orientation,
                    offer_decision_view_mode: 'table',
                },
            });

            fireEvent.click(screen.getByRole('button', { name: 'Add evaluation for Beta Labs' }));
            fireEvent.change(screen.getByLabelText('Beta Labs decision deadline'), {
                target: { value: '2026-08-20T10:00' },
            });
            fireEvent.change(screen.getByLabelText('Beta Labs monthly base salary'), { target: { value: '9000' } });
            fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Beta Labs' }));

            const savedEvaluation = await waitFor(() => {
                const element = document.getElementById('offer-evaluation-12');
                expect(element?.className).toContain('highlight');
                return element as HTMLElement;
            });
            expect(savedEvaluation).toBeInTheDocument();
            if (orientation === 'horizontal') {
                expect(savedEvaluation.tagName).toBe('TR');
            } else {
                const highlightedColumn = document.querySelectorAll('[data-offer-evaluation-job-id="12"]');
                expect(highlightedColumn).toHaveLength(16);
                highlightedColumn.forEach((cell) => expect(cell.className).toContain('highlight'));
            }
            await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' }));
            HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
        }
    );

    test('keeps Table dialog validation and failed-save drafts open, then closes after a successful retry', async () => {
        const onSave = vi
            .fn<(jobId: number, request: SaveOfferEvaluationRequest) => Promise<void>>()
            .mockRejectedValueOnce(new Error('save failed'))
            .mockResolvedValueOnce(undefined);
        render(<WorkspaceHarness onSave={onSave} />, {
            initialPreferences: { offer_decision_view_mode: 'table' },
        });

        editOfferEvaluation('Acme');
        const dialog = screen.getByRole('dialog', { name: 'Edit Evaluation' });
        const deadlineInput = within(dialog).getByLabelText('Acme decision deadline');
        fireEvent.change(deadlineInput, { target: { value: '' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save evaluation for Acme' }));

        expect(await within(dialog).findByText('Decision deadline is required.')).toBeInTheDocument();
        expect(deadlineInput).toHaveFocus();
        expect(onSave).not.toHaveBeenCalled();

        fireEvent.change(deadlineInput, { target: { value: '2099-08-20T10:00' } });
        fireEvent.change(within(dialog).getByLabelText('Acme monthly base salary'), { target: { value: '11000' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save evaluation for Acme' }));

        await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
        expect(screen.getByRole('dialog', { name: 'Edit Evaluation' })).toBeInTheDocument();
        expect(screen.getByLabelText('Acme monthly base salary')).toHaveValue(11000);

        fireEvent.click(screen.getByRole('button', { name: 'Save evaluation for Acme' }));
        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('SGD 11,000')).toBeInTheDocument();
    });

    test('submits a Table evaluation dialog when Enter is pressed outside a form control', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<WorkspaceHarness onSave={onSave} />, {
            initialPreferences: { offer_decision_view_mode: 'table' },
        });

        editOfferEvaluation('Acme');
        const dialog = screen.getByRole('dialog', { name: 'Edit Evaluation' });
        fireEvent.change(within(dialog).getByLabelText('Acme monthly base salary'), { target: { value: '11000' } });
        fireEvent.keyDown(within(dialog).getByRole('heading', { name: 'Acme' }), { key: 'Enter' });

        await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    });

    test('uses archived Table More only for saved plans and a direct Delete when no plan exists', async () => {
        const onDelete = vi.fn().mockResolvedValue(undefined);
        const archivedData: OfferDecisionWorkspaceData = {
            applications: [
                {
                    ...activeData.applications[2],
                    company_name: 'Plan Co',
                    has_counteroffer_plan: true,
                },
                {
                    ...activeData.applications[2],
                    company_name: 'Delete Co',
                    job_id: 14,
                    evaluation: createEvaluation(14),
                    has_counteroffer_plan: false,
                },
            ],
        };
        render(
            <OfferDecisionWorkspace
                data={archivedData}
                onDelete={onDelete}
                onDeleteCounterofferPlan={vi.fn()}
                onGetCounterofferPlan={vi.fn().mockResolvedValue({
                    monthly_base_salary: 11000,
                    bonus: '',
                    annual_leave_days: 22,
                    work_arrangement: 'Hybrid',
                    ratings: {
                        career_growth: 5,
                        company_culture_fit: 4,
                        work_life_balance: 4,
                        compensation: 5,
                    },
                })}
                onSaveCounterofferPlan={vi.fn()}
                readOnly
            />,
            { initialPreferences: { archived_offer_decision_view_mode: 'table' } }
        );

        const planMenu = openOfferActions('Plan Co');
        expect(
            within(planMenu)
                .getAllByRole('menuitem')
                .map((item) => item.textContent)
        ).toEqual(['View counteroffer plan', 'Delete evaluation']);
        expect(screen.queryByRole('button', { name: 'Delete evaluation for Plan Co' })).not.toBeInTheDocument();
        await act(async () => {
            await userEvent.click(
                within(planMenu).getByRole('menuitem', { name: 'View counteroffer plan for Plan Co' })
            );
        });
        const counterofferDialog = await screen.findByRole('dialog', { name: 'Counteroffer Plan' });
        expect(within(counterofferDialog).getByText('Delete', { selector: 'button' })).toBeInTheDocument();
        expect(within(counterofferDialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
        expect(within(counterofferDialog).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
        expect(within(counterofferDialog).queryByRole('slider')).not.toBeInTheDocument();
        await act(async () => {
            await userEvent.click(within(counterofferDialog).getByRole('button', { name: 'Close' }));
        });

        expect(screen.queryByRole('button', { name: 'More actions for Delete Co' })).not.toBeInTheDocument();
        const directDelete = screen.getByRole('button', { name: 'Delete evaluation for Delete Co' });
        expect(directDelete).toHaveTextContent('Delete');
        await act(async () => {
            await userEvent.click(directDelete);
        });
        await waitFor(() => expect(onDelete).toHaveBeenCalledWith(14));

        expect(screen.queryByRole('menuitem', { name: /edit evaluation/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /calendar/i })).not.toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: /change to|accept offer|decline offer/i })
        ).not.toBeInTheDocument();
    });

    test('does not render archived Table actions when no action callbacks are available', () => {
        render(<OfferDecisionWorkspace data={{ applications: [activeData.applications[2]] }} readOnly />, {
            initialPreferences: { archived_offer_decision_view_mode: 'table' },
        });

        expect(screen.queryByRole('button', { name: 'More actions for Continuum' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete evaluation for Continuum' })).not.toBeInTheDocument();
    });
});
