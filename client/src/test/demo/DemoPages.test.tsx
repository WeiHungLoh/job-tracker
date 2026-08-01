import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import DemoAddApplication from '../../pages/demo/application/jobApplication/addApplication/DemoAddApplication';
import DemoAddInterview from '../../pages/demo/interview/jobInterview/addInterview/DemoAddInterview';
import { DemoProvider, useDemo } from '../../pages/demo/context/DemoContext';
import DemoDashboard from '../../pages/demo/dashboard/DemoDashboard';
import DemoViewApplication from '../../pages/demo/application/jobApplication/viewApplication/DemoViewApplication';
import DemoViewArchivedApplication from '../../pages/demo/application/archivedApplication/viewArchivedApplication/DemoViewArchivedApplication';
import DemoViewInterview from '../../pages/demo/interview/jobInterview/viewInterview/DemoViewInterview';
import DemoViewArchivedInterview from '../../pages/demo/interview/archivedInterview/viewArchivedInterview/DemoViewArchivedInterview';
import DemoOfferDecisionPage from '../../pages/demo/offerDecision/DemoOfferDecisionPage';
import { UserPreferencesProvider } from '../../components/userPreferences/UserPreferencesProvider';
import { createDemoInitialState } from '../../pages/demo/state/demoInitialState';
import { daysFromNow, toDateTimeString } from '../../pages/demo/state/demoDates';
import { render } from '../renderWithProviders';
import { routes } from '../../routes';
import userEvent from '@testing-library/user-event';
import DemoRoutes from '../../pages/demo/components/demoLayout/DemoRoutes';
import * as highlightElement from '../../helper/highlightElement';
import type { ChartData, ChartOptions } from 'chart.js';

const calendarMocks = vi.hoisted(() => ({
    downloadBulkIcsEvents: vi.fn(),
}));
const mockConfirm = vi.fn();

vi.mock('material-ui-confirm', () => ({
    useConfirm: () => mockConfirm,
}));

vi.mock('../../helper/calendarEvent', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../helper/calendarEvent')>()),
    downloadBulkIcsEvents: calendarMocks.downloadBulkIcsEvents,
}));

vi.mock('../../hooks/useUnsavedChangesBlocker', () => ({
    useUnsavedChangesBlocker: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
    Bar: ({ data, options }: { data: ChartData<'bar'>; options?: ChartOptions<'bar'> }) => (
        <div>
            <span>Demo bar chart</span>
            {data.labels?.map((label, index) => (
                <button
                    key={String(label)}
                    onClick={() => options?.onClick?.({} as never, [{ index }] as never, { data } as never)}
                    type='button'
                >
                    View {String(label)} bar
                </button>
            ))}
        </div>
    ),
    Line: () => <div>Demo line chart</div>,
}));

const DemoPreferenceBridge = ({ children }: { children: ReactNode }) => {
    const { state, updatePreferences } = useDemo();

    return (
        <UserPreferencesProvider preferences={state.preferences} updatePreferences={updatePreferences}>
            {children}
        </UserPreferencesProvider>
    );
};

type DemoInitialEntry = string | { pathname: string; state?: unknown };

const renderDemo = (children: ReactNode, initialEntries: DemoInitialEntry[] = [routes.demoViewApplications]) => {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <DemoProvider>
                <DemoPreferenceBridge>{children}</DemoPreferenceBridge>
            </DemoProvider>
        </MemoryRouter>
    );
};

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

const DemoRecordCounts = () => {
    const { state } = useDemo();

    return (
        <>
            <output data-testid='demo-application-count'>{state.applications.length}</output>
            <output data-testid='demo-active-application-companies'>
                {state.applications.map((application) => application.company_name).join(',')}
            </output>
            <output data-testid='demo-archived-application-companies'>
                {state.archivedApplications.map((application) => application.company_name).join(',')}
            </output>
            <output data-testid='demo-interview-count'>{state.interviews.length}</output>
            <output data-testid='demo-last-interview-duration'>
                {state.interviews[state.interviews.length - 1]?.interview_duration_minutes ?? ''}
            </output>
        </>
    );
};

const clickConfirmedAction = async (button: HTMLElement) => {
    await act(async () => {
        await userEvent.click(button);
    });
};

const getExportCsvText = (): string => {
    const href = screen.getByRole('link', { name: 'Export as CSV' }).getAttribute('href') ?? '';
    const csvStart = href.indexOf(',');
    return decodeURIComponent(csvStart === -1 ? href : href.slice(csvStart + 1)).replace(/^\uFEFF/, '');
};

const SetCollectionViewMode = ({ archived = false }: { archived?: boolean }) => {
    const { updatePreferences } = useDemo();

    return (
        <button
            onClick={() =>
                void updatePreferences(
                    archived ? { archived_application_view_mode: 'board' } : { application_view_mode: 'board' }
                )
            }
            type='button'
        >
            Set application Board mode
        </button>
    );
};

const DemoRouteHarness = () => (
    <Routes>
        <Route path={`${routes.demoRoot}/*`} element={<DemoRoutes />} />
    </Routes>
);

const PrepareUnscheduledDemoInterview = () => {
    const { dispatch } = useDemo();

    useEffect(() => {
        dispatch({ type: 'DELETE_ALL_INTERVIEWS' });
        dispatch({
            type: 'UPDATE_APPLICATION_STATUS',
            payload: { jobId: 102, jobStatus: 'Interview' },
        });
    }, [dispatch]);

    return null;
};

const PrepareUnevaluatedDemoOffer = () => {
    const { dispatch, state } = useDemo();

    useEffect(() => {
        if (state.offerEvaluations[112]) {
            dispatch({ type: 'DELETE_OFFER_EVALUATION', payload: { jobId: 112 } });
        }
    }, [dispatch, state.offerEvaluations]);

    return null;
};

const PrepareDueDemoOffer = () => {
    const { dispatch, state } = useDemo();
    const evaluation = state.offerEvaluations[111];

    useEffect(() => {
        if (!evaluation || Date.parse(evaluation.details.decision_deadline) - Date.now() <= 3 * 24 * 60 * 60 * 1000) {
            return;
        }

        dispatch({
            type: 'SAVE_OFFER_EVALUATION',
            payload: {
                jobId: 111,
                request: {
                    ratings: evaluation.ratings,
                    details: {
                        ...evaluation.details,
                        decision_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                },
            },
        });
    }, [dispatch, evaluation]);

    return null;
};

const SetInterviewBoardMode = () => {
    const { updatePreferences } = useDemo();

    return (
        <button onClick={() => void updatePreferences({ interview_view_mode: 'board' })} type='button'>
            Set interview Board mode
        </button>
    );
};

const SetInterviewPastFilter = () => {
    const { updatePreferences } = useDemo();

    return (
        <button onClick={() => void updatePreferences({ interview_time_filters: ['Past Interviews'] })} type='button'>
            Set interview Past filter
        </button>
    );
};

const SetApplicationCsvFilter = ({ archived = false }: { archived?: boolean }) => {
    const { updatePreferences } = useDemo();

    return (
        <button
            onClick={() =>
                void updatePreferences(
                    archived
                        ? { archived_application_job_statuses: ['Offer'] }
                        : { application_job_statuses: ['Offer'] }
                )
            }
            type='button'
        >
            Filter {archived ? 'archived' : 'active'} CSV to Offer
        </button>
    );
};

const SetEmptyApplicationFilter = ({ archived = false }: { archived?: boolean }) => {
    const { updatePreferences } = useDemo();

    return (
        <button
            onClick={() =>
                void updatePreferences(
                    archived ? { archived_application_job_statuses: ['Applied'] } : { application_job_statuses: [] }
                )
            }
            type='button'
        >
            Hide {archived ? 'archived' : 'active'} applications
        </button>
    );
};

describe('demo page interactions', () => {
    beforeEach(() => {
        mockConfirm.mockReset();
        calendarMocks.downloadBulkIcsEvents.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('switches active and archived demo offer comparisons between Cards and Table without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const activeRender = renderDemo(<DemoOfferDecisionPage archived={false} />, [routes.demoOfferDecisions]);

        expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(screen.getByRole('button', { name: 'Table' }));
        expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
        await userEvent.click(screen.getByRole('button', { name: 'Cards' }));
        expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
        expect(fetchSpy).not.toHaveBeenCalled();

        activeRender.unmount();
        renderDemo(<DemoOfferDecisionPage archived />, [routes.demoArchivedOfferDecisions]);
        await userEvent.click(screen.getByRole('button', { name: 'Table' }));
        expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
        expect(screen.queryByRole('table', { name: 'Archived Offers to Evaluate' })).not.toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('edits and saves one offer evaluation in demo state without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        mockConfirm.mockResolvedValue({ confirmed: true });
        renderDemo(<DemoOfferDecisionPage archived={false} />, [routes.demoOfferDecisions]);

        expect(screen.getByRole('heading', { name: 'Evaluated Offers' })).toBeInTheDocument();
        editOfferEvaluation('Greenhouse CloudOps');
        expect(screen.getByLabelText('Greenhouse CloudOps Company/Culture Fit rating')).toHaveValue('5');
        fireEvent.change(screen.getByLabelText('Greenhouse CloudOps Company/Culture Fit rating'), {
            target: { value: '4' },
        });
        fireEvent.change(screen.getByLabelText('Greenhouse CloudOps monthly base salary'), {
            target: { value: '10500' },
        });
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Save evaluation for Greenhouse CloudOps' }));
        });

        expect(await screen.findByText('Offer evaluation saved.')).toBeInTheDocument();
        expect(screen.queryByText('Offer evaluation added.')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Greenhouse CloudOps Company/Culture Fit rating')).not.toBeInTheDocument();
        expect(screen.getByText('SGD 10,500')).toBeInTheDocument();
        expect(
            within(openOfferActions('Greenhouse CloudOps')).getByRole('menuitem', {
                name: 'Edit evaluation for Greenhouse CloudOps',
            })
        ).toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('records an evaluated offer decision in demo state without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        mockConfirm.mockResolvedValue({ confirmed: true });
        renderDemo(<DemoOfferDecisionPage archived={false} />, [routes.demoOfferDecisions]);

        fireEvent.click(
            within(openOfferActions('Greenhouse CloudOps')).getByRole('menuitem', {
                name: 'Accept offer from Greenhouse CloudOps',
            })
        );

        expect(await screen.findByText('Offer marked as Accepted.')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Previous Evaluations' })).toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Greenhouse CloudOps DevOps UI Engineer' })).toBeInTheDocument();

        fireEvent.click(
            within(openOfferActions('Greenhouse CloudOps')).getByRole('menuitem', {
                name: 'Change to Offer for Greenhouse CloudOps',
            })
        );

        expect(await screen.findByText('Application marked as Offer.')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Evaluated Offers' })).toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Greenhouse CloudOps DevOps UI Engineer' })).toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('tests offer decision robustness in active demo without fetching and omits it from archived demo', () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const { unmount } = renderDemo(<DemoOfferDecisionPage archived={false} />, [routes.demoOfferDecisions]);

        fireEvent.click(screen.getByRole('button', { name: 'Try priorities' }));
        fireEvent.change(screen.getByLabelText('Career Growth importance'), {
            target: { value: '5' },
        });

        expect(screen.getByRole('list', { name: 'Offer results' })).toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();

        unmount();
        renderDemo(<DemoOfferDecisionPage archived />, [routes.demoArchivedOfferDecisions]);

        expect(screen.queryByRole('button', { name: 'Try priorities' })).not.toBeInTheDocument();
        fetchSpy.mockRestore();
    });

    test('exports eligible demo offer deadlines without backend requests or archived actions', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        const { unmount } = renderDemo(<DemoOfferDecisionPage archived={false} />, [routes.demoOfferDecisions]);

        const offerMenu = openOfferActions('Greenhouse CloudOps');
        expect(
            within(offerMenu).getByRole('menuitem', {
                name: 'Add Greenhouse CloudOps offer deadline to Google Calendar',
            })
        ).toHaveTextContent('Add to Google Calendar');
        expect(
            within(offerMenu).getByRole('menuitem', {
                name: 'Add Greenhouse CloudOps offer deadline to Apple Calendar or Outlook',
            })
        ).toHaveTextContent('Add to Apple Calendar / Outlook (.ics)');

        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(
            screen.getByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' })
        );
        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Export all active evaluated offer deadlines?' })
        );
        expect(calendarMocks.downloadBulkIcsEvents).toHaveBeenCalledWith(
            [
                expect.objectContaining({ uid: 'offer-decision-111@jobtracker.weihungloh.com' }),
                expect.objectContaining({ uid: 'offer-decision-112@jobtracker.weihungloh.com' }),
            ],
            'job-tracker-active-offer-deadlines.ics'
        );
        expect(fetchSpy).not.toHaveBeenCalled();

        unmount();
        renderDemo(<DemoOfferDecisionPage archived />, [routes.demoArchivedOfferDecisions]);
        expect(
            screen.queryByRole('button', { name: 'Export all active evaluated offer deadlines (.ics)' })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /offer deadline to Google Calendar/i })).not.toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('shows success toasts when an offer evaluation is deleted or added', async () => {
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        renderDemo(<DemoOfferDecisionPage archived={false} />, [routes.demoOfferDecisions]);

        await clickConfirmedAction(screen.getByRole('button', { name: 'Delete evaluation for Greenhouse CloudOps' }));
        expect(
            await screen.findByRole('button', { name: 'Add evaluation for Greenhouse CloudOps' })
        ).toBeInTheDocument();
        expect(await screen.findByText('Offer evaluation deleted.')).toBeInTheDocument();

        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Add evaluation for Greenhouse CloudOps' }));
            fireEvent.change(screen.getByLabelText('Greenhouse CloudOps decision deadline'), {
                target: { value: '2026-08-20T10:00' },
            });
            fireEvent.change(screen.getByLabelText('Greenhouse CloudOps monthly base salary'), {
                target: { value: '10000' },
            });
            await userEvent.click(screen.getByRole('button', { name: 'Save evaluation for Greenhouse CloudOps' }));
        });

        expect(await screen.findByText('Offer evaluation added.')).toBeInTheDocument();
    });

    test('renders archived demo offer comparisons as review-only snapshots', () => {
        renderDemo(<DemoOfferDecisionPage archived />, [routes.demoArchivedOfferDecisions]);

        expect(screen.getByRole('heading', { name: 'Archived Expired Evaluated Offers' })).toBeInTheDocument();
        expect(screen.getByText('Keppel Digital')).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /edit evaluation/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /save evaluation/i })).not.toBeInTheDocument();
    });

    test('updates application notes and status with auto-scroll highlighting', async () => {
        renderDemo(<DemoViewApplication />);

        expect(screen.getByText(/HorizonAI Labs/i)).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /click here to head to job application url/i })
        ).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        expect(screen.getByRole('switch', { name: 'Show notes' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('switch', { name: 'Show archive' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('switch', { name: 'Auto-scroll and highlight updates' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
        const firstApplicationCard = screen.getAllByRole('button', { name: 'Edit Status' })[0].closest('[id]');
        const firstApplicationId = firstApplicationCard?.id;
        expect(firstApplicationId).toBeTruthy();
        const firstNotesField = screen.getAllByPlaceholderText('Add your notes here')[0];
        fireEvent.change(firstNotesField, {
            target: { value: 'Demo note update' },
        });
        expect(firstNotesField).toHaveValue('Demo note update');
        expect(screen.getAllByText('Saving…').length).toBeGreaterThan(0);

        await userEvent.click(screen.getAllByRole('button', { name: 'Edit Status' })[0]);
        fireEvent.change(screen.getByRole('listbox'), { target: { value: 'Offer' } });
        await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
        expect(screen.getAllByText(/Job Status: Offer/i).length).toBeGreaterThan(0);
        await waitFor(() =>
            expect(document.getElementById(firstApplicationId || '')?.className).toContain('highlighted')
        );
    });

    test('does not auto-scroll after a status change when list sorting is not Job Status', async () => {
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        renderDemo(<DemoViewApplication />);

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        await userEvent.click(screen.getByRole('radio', { name: /Company A/ }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Sort by' })).toBeEnabled());

        await userEvent.click(screen.getAllByRole('button', { name: 'Edit Status' })[0]);
        fireEvent.change(screen.getByRole('listbox'), { target: { value: 'Interview' } });
        await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 150));
        });

        expect(scrollAndHighlight).not.toHaveBeenCalled();
    });

    test('shows success feedback for board status changes and archiving', async () => {
        renderDemo(<DemoViewApplication />);

        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        const board = screen.getByRole('region', { name: 'Application board' });
        const statusSelect = within(board).getByRole('combobox', { name: /Move HorizonAI Labs to status/i });
        const card = statusSelect.closest('article');
        if (!card) {
            throw new Error('Expected HorizonAI Labs board card.');
        }
        expect(within(card).getByRole('button', { name: /Drag HorizonAI Labs .+ application/ })).toBeInTheDocument();
        expect(statusSelect).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/Move HorizonAI Labs to status/i), {
            target: { value: 'Rejected' },
        });
        expect(await screen.findByText('Job application status updated.')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'List' }));
        expect(screen.getAllByText(/Job Status: Rejected/i).length).toBeGreaterThan(0);

        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        await clickConfirmedAction(screen.getAllByRole('button', { name: 'Archive' })[0]);
        expect(await screen.findByText('Job application archived.')).toBeInTheDocument();
    });

    test('unarchives an application from the archived board into active demo state without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(
            <>
                <SetCollectionViewMode archived />
                <DemoRecordCounts />
                <DemoViewArchivedApplication />
            </>,
            [routes.demoArchivedApplications]
        );

        await userEvent.click(screen.getByRole('button', { name: 'Set application Board mode' }));
        const board = await screen.findByRole('region', { name: 'Archived application board' });
        const application = within(board).getByRole('article', {
            name: 'Riverlane Studio Frontend Developer',
        });

        await userEvent.click(within(application).getByText('Actions'));
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        await clickConfirmedAction(within(application).getByRole('button', { name: 'Unarchive' }));

        expect(
            within(board).queryByRole('article', { name: 'Riverlane Studio Frontend Developer' })
        ).not.toBeInTheDocument();
        expect(screen.getByTestId('demo-archived-application-companies')).not.toHaveTextContent('Riverlane Studio');
        expect(screen.getByTestId('demo-active-application-companies')).toHaveTextContent('Riverlane Studio');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('keeps independent list and board sorting preferences in the demo', async () => {
        renderDemo(<DemoViewApplication />);

        expect(await screen.findByRole('heading', { name: '1. Cedar FinTech' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        fireEvent.click(screen.getByRole('radio', { name: /Company A/ }));
        expect(await screen.findByRole('heading', { name: '1. Aster Security' })).toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole('button', { name: 'Sort by' })).toBeEnabled());

        fireEvent.click(screen.getByRole('button', { name: 'Board' }));
        fireEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        expect(screen.getByRole('radio', { name: 'Newest Application' })).toBeChecked();
        fireEvent.click(screen.getByRole('radio', { name: 'Oldest Application' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Sort by' })).toBeEnabled());

        const appliedColumn = screen.getByRole('heading', { name: 'Applied 6' }).closest('section');
        if (!appliedColumn) {
            throw new Error('Expected the Applied board column.');
        }
        expect(appliedColumn.querySelector('article')).toHaveAccessibleName(/Northstar Mobility/);

        fireEvent.click(screen.getByRole('button', { name: 'List' }));
        fireEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        expect(screen.getByRole('radio', { name: /Company A/ })).toBeChecked();
        expect(screen.getByRole('heading', { name: '1. Aster Security' })).toBeInTheDocument();
    }, 20_000);

    test('shows success feedback when restoring and deleting archived applications', async () => {
        renderDemo(<DemoViewArchivedApplication />, [routes.demoArchivedApplications]);

        expect(screen.getByText(/Riverlane Studio/i)).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /click here to head to job application url/i })
        ).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        expect(screen.getByRole('switch', { name: 'Show notes' })).toHaveAttribute('aria-checked', 'true');

        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        await clickConfirmedAction(screen.getAllByRole('button', { name: 'Unarchive' })[0]);
        expect(await screen.findByText('Job application unarchived.')).toBeInTheDocument();

        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(screen.getByRole('button', { name: /delete all archived applications/i }));
        expect(await screen.findByText('Job applications deleted.')).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'No archived applications yet' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View active applications' })).toHaveAttribute(
            'href',
            routes.demoViewApplications
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));
        expect(
            await screen.findByRole('heading', { name: 'No archived applications match your filters' })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(await screen.findByRole('heading', { name: 'No archived applications yet' })).toBeInTheDocument();
    });

    test.each([
        ['active', false, 'demo_job_applications.csv'],
        ['archived', true, 'demo_archived_job_applications.csv'],
    ] as const)(
        'keeps the %s demo application CSV aligned with the filtered display',
        async (_label, archived, filename) => {
            renderDemo(
                <>
                    <SetApplicationCsvFilter archived={archived} />
                    {archived ? <DemoViewArchivedApplication /> : <DemoViewApplication />}
                </>
            );

            await userEvent.click(
                screen.getByRole('button', { name: `Filter ${archived ? 'archived' : 'active'} CSV to Offer` })
            );
            const displayedCompanies = await screen.findAllByRole('heading', { level: 2 });
            const displayedCompanyNames = displayedCompanies.map((heading) =>
                (heading.textContent ?? '').replace(/^\d+\.\s*/, '')
            );
            expect(displayedCompanyNames.length).toBeGreaterThan(0);

            await userEvent.click(screen.getByRole('button', { name: 'More...' }));
            const csv = getExportCsvText();
            let previousCompanyIndex = -1;
            for (const companyName of displayedCompanyNames) {
                const companyIndex = csv.indexOf(companyName);
                expect(companyIndex).toBeGreaterThan(previousCompanyIndex);
                previousCompanyIndex = companyIndex;
            }
            expect(csv).not.toContain('HorizonAI Labs');
            expect(screen.getByRole('link', { name: 'Export as CSV' })).toHaveAttribute('download', filename);
        }
    );

    test.each([
        ['active', false, 'Demo application view and management controls', 'No applications match your filters'],
        [
            'archived',
            true,
            'Demo archived application view and management controls',
            'No archived applications match your filters',
        ],
    ] as const)(
        'hides demo %s application actions when the filter has no matches',
        async (_, archived, label, title) => {
            renderDemo(
                <>
                    <SetEmptyApplicationFilter archived={archived} />
                    {archived ? <DemoViewArchivedApplication /> : <DemoViewApplication />}
                </>
            );

            await userEvent.click(
                screen.getByRole('button', { name: `Hide ${archived ? 'archived' : 'active'} applications` })
            );

            expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'More...' })).not.toBeInTheDocument();
            expect(screen.getByRole('region', { name: label }).children).toHaveLength(1);
        }
    );

    test('shows accessible demo application errors and clears only the edited field error without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(<DemoAddApplication />, [routes.demoAddApplication]);

        await userEvent.click(screen.getByRole('button', { name: /^add job application$/i }));

        const companyNameInput = screen.getByLabelText(/company name/i);
        const jobTitleInput = screen.getByLabelText(/job title/i);
        const companyNameError = screen.getByText('Please enter a company name.');
        const jobTitleError = screen.getByText('Please enter a job title.');
        expect(companyNameInput).toHaveAttribute('aria-invalid', 'true');
        expect(companyNameInput).toHaveAttribute('aria-describedby', companyNameError.id);
        expect(jobTitleInput).toHaveAttribute('aria-invalid', 'true');
        expect(jobTitleInput).toHaveAttribute('aria-describedby', jobTitleError.id);
        expect(document.activeElement).toBe(companyNameInput);

        await userEvent.type(companyNameInput, 'Demo Form Company');
        expect(screen.queryByText('Please enter a company name.')).not.toBeInTheDocument();
        expect(screen.getByText('Please enter a job title.')).toBeInTheDocument();
        expect(companyNameInput).not.toHaveAttribute('aria-invalid');
        expect(companyNameInput).toHaveValue('Demo Form Company');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('validates and creates demo applications without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(
            <>
                <DemoAddApplication />
                <DemoRecordCounts />
            </>,
            [routes.demoAddApplication]
        );
        const initialApplicationCount = Number(screen.getByTestId('demo-application-count').textContent);

        expect(screen.queryByRole('heading', { name: 'Add Job Application' })).not.toBeInTheDocument();
        await userEvent.type(screen.getByLabelText(/company name/i), 'Demo Form Company');
        await userEvent.type(screen.getByLabelText(/job title/i), 'Demo Form Engineer');
        await userEvent.type(screen.getByLabelText(/job posting url/i), 'not-a-url');
        await userEvent.click(screen.getByRole('button', { name: /^add job application$/i }));
        const jobURLInput = screen.getByLabelText(/job posting url/i);
        const jobURLError = screen.getByText('URL must be in a valid format.');
        expect(jobURLInput).toHaveAttribute('aria-invalid', 'true');
        expect(jobURLInput).toHaveAttribute('aria-describedby', jobURLError.id);
        expect(document.activeElement).toBe(jobURLInput);

        fireEvent.change(jobURLInput, {
            target: { value: 'https://jobs.example.com/demo-form-engineer' },
        });
        await userEvent.type(screen.getByLabelText(/job title/i), '{enter}');
        expect(screen.getByText('Successfully added a job application!')).toBeInTheDocument();
        expect(screen.getByTestId('demo-application-count')).toHaveTextContent(String(initialApplicationCount + 1));
        expect(screen.getByLabelText(/company name/i)).toHaveValue('');
        expect(screen.getByLabelText(/job title/i)).toHaveValue('');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('demo application navigation does not create a record', async () => {
        renderDemo(
            <>
                <DemoAddApplication />
                <DemoRecordCounts />
            </>,
            [routes.demoAddApplication]
        );
        const initialApplicationCount = screen.getByTestId('demo-application-count').textContent;
        const viewApplicationsButton = screen.getByRole('button', { name: 'View Job Applications' });

        expect(viewApplicationsButton).toHaveAttribute('type', 'button');
        await userEvent.click(viewApplicationsButton);

        expect(screen.getByTestId('demo-application-count')).toHaveTextContent(initialApplicationCount || '');
    });

    test('shows accessible demo interview errors and textarea notes without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const app = createDemoInitialState().applications.find((application) => application.job_id === 107);
        if (!app) {
            throw new Error('Expected demo application fixture.');
        }

        renderDemo(<DemoAddInterview />, [{ pathname: routes.demoAddInterview, state: { app } }]);

        const notesInput = screen.getByLabelText('Additional Notes (optional)');
        expect(notesInput.tagName).toBe('TEXTAREA');
        expect(notesInput).toHaveAttribute('maxlength', '3000');
        await userEvent.click(screen.getByRole('button', { name: /^add interview$/i }));

        const dateInput = screen.getByLabelText('Interview Date');
        const locationInput = screen.getByLabelText('Interview Location');
        const dateError = screen.getByText('Please enter an interview date.');
        const locationError = screen.getByText('Please enter an interview location.');
        expect(dateInput).toHaveAttribute('aria-invalid', 'true');
        expect(dateInput).toHaveAttribute('aria-describedby', dateError.id);
        expect(locationInput).toHaveAttribute('aria-invalid', 'true');
        expect(locationInput).toHaveAttribute('aria-describedby', locationError.id);
        expect(document.activeElement).toBe(dateInput);

        fireEvent.change(dateInput, {
            target: { value: toDateTimeString(daysFromNow(new Date(), 4, 10)) },
        });
        expect(screen.queryByText('Please enter an interview date.')).not.toBeInTheDocument();
        expect(screen.getByText('Please enter an interview location.')).toBeInTheDocument();
        expect(dateInput).not.toHaveAttribute('aria-invalid');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('validates and creates demo interviews without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const app = createDemoInitialState().applications.find((application) => application.job_id === 107);
        if (!app) {
            throw new Error('Expected demo application fixture.');
        }

        renderDemo(
            <>
                <DemoAddInterview />
                <DemoRecordCounts />
            </>,
            [{ pathname: routes.demoAddInterview, state: { app } }]
        );
        const initialInterviewCount = Number(screen.getByTestId('demo-interview-count').textContent);
        expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);

        await userEvent.click(screen.getByRole('button', { name: /^add interview$/i }));
        expect(screen.getByText('Please enter an interview date.')).toBeInTheDocument();
        expect(screen.getByText('Please enter an interview location.')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/interview date/i), {
            target: { value: toDateTimeString(daysFromNow(new Date(), 4, 10)) },
        });
        await userEvent.type(screen.getByLabelText(/interview location/i), 'Zoom');
        await userEvent.type(screen.getByLabelText(/interview type/i), 'Technical interview');

        fireEvent.change(screen.getByLabelText('Duration (minutes)'), { target: { value: '1441' } });
        await userEvent.click(screen.getByRole('button', { name: /^add interview$/i }));
        const durationInput = screen.getByLabelText('Duration (minutes)');
        const durationError = screen.getByText('Please enter a duration between 1 and 1440 minutes');
        expect(durationInput).toHaveAttribute('aria-invalid', 'true');
        expect(durationInput).toHaveAttribute('aria-describedby', durationError.id);
        expect(document.activeElement).toBe(durationInput);

        fireEvent.change(durationInput, { target: { value: '75' } });
        await userEvent.type(screen.getByLabelText(/interview location/i), '{enter}');

        expect(screen.getByText('Successfully added an interview!')).toBeInTheDocument();
        expect(screen.getByTestId('demo-interview-count')).toHaveTextContent(String(initialInterviewCount + 1));
        expect(screen.getByTestId('demo-last-interview-duration')).toHaveTextContent('75');
        expect(screen.getByLabelText(/interview location/i)).toHaveValue('');
        expect(screen.getByLabelText(/interview type/i)).toHaveValue('');
        expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('demo interview navigation does not create a record', async () => {
        const app = createDemoInitialState().applications.find((application) => application.job_id === 107);
        if (!app) {
            throw new Error('Expected demo application fixture.');
        }

        const renderInterviewForm = () =>
            renderDemo(
                <>
                    <DemoAddInterview />
                    <DemoRecordCounts />
                </>,
                [{ pathname: routes.demoAddInterview, state: { app } }]
            );

        const firstRender = renderInterviewForm();
        const initialInterviewCount = screen.getByTestId('demo-interview-count').textContent;
        const viewInterviewsButton = screen.getByRole('button', { name: 'View Interviews' });
        const backButton = screen.getByRole('button', { name: 'Back' });

        expect(viewInterviewsButton).toHaveAttribute('type', 'button');
        expect(backButton).toHaveAttribute('type', 'button');
        await userEvent.click(viewInterviewsButton);
        expect(screen.getByTestId('demo-interview-count')).toHaveTextContent(initialInterviewCount || '');

        firstRender.unmount();
        renderInterviewForm();
        await userEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByTestId('demo-interview-count')).toHaveTextContent(initialInterviewCount || '');
    });

    test('shows success feedback when deleting interviews', async () => {
        renderDemo(<DemoViewInterview />, [routes.demoViewInterviews]);

        expect(within(screen.getByRole('region', { name: 'Active interviews' })).getAllByRole('article')).toHaveLength(
            10
        );

        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(screen.getByRole('button', { name: /delete all interviews/i }));
        await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
        expect(await screen.findByText('Interviews deleted.')).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'No interviews yet' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View applications' })).toHaveAttribute(
            'href',
            routes.demoViewApplications
        );
        expect(screen.queryByRole('link', { name: 'Add interview' })).not.toBeInTheDocument();
    });

    test('switches demo interviews to the responsive Board without changing their order', async () => {
        renderDemo(<DemoViewInterview />, [routes.demoViewInterviews]);

        const interviews = screen.getByRole('region', { name: 'Active interviews' });
        const listOrder = within(interviews)
            .getAllByRole('article')
            .map((card) => card.getAttribute('aria-label'));
        await userEvent.click(
            within(screen.getByRole('group', { name: 'Interview view' })).getByRole('button', { name: 'Board' })
        );

        expect(interviews).toHaveAttribute('data-layout', 'board');
        expect(
            within(interviews)
                .getAllByRole('article')
                .map((card) => card.getAttribute('aria-label'))
        ).toEqual(listOrder);
        expect(within(interviews).queryByText(/time left/i)).not.toBeInTheDocument();
        expect(within(interviews).queryByText(/notes:/i)).not.toBeInTheDocument();
        expect(
            within(interviews).queryByRole('link', { name: /review corresponding job application/i })
        ).not.toBeInTheDocument();
        expect(within(interviews).getAllByText('Actions').length).toBeGreaterThan(0);
    });

    test('pins and unpins demo interviews locally with ordering, highlighting and success feedback', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(<DemoViewInterview />, [routes.demoViewInterviews]);

        const interviews = screen.getByRole('region', { name: 'Active interviews' });
        await userEvent.click(screen.getByRole('button', { name: 'Pin Summit Talent interview' }));

        expect(within(interviews).getAllByRole('article')[0]).toHaveAccessibleName('Summit Talent interview');
        expect(screen.getByRole('button', { name: 'Unpin Summit Talent interview' })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        expect(await screen.findByText('Interview pinned.')).toBeInTheDocument();
        await waitFor(() => expect(document.getElementById('410')?.className).toContain('highlighted'));

        await userEvent.click(screen.getByRole('button', { name: 'Unpin Summit Talent interview' }));

        expect(await screen.findByText('Interview unpinned.')).toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('renders active demo interviews in the production date order in List and Board views', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 7, 12, 0, 0, 0));

        try {
            renderDemo(<DemoViewInterview />, [routes.demoViewInterviews]);
            const interviews = screen.getByRole('region', { name: 'Active interviews' });
            const expectedOrder = [
                'Merlion Cloud interview',
                'Atlas RecruitTech interview',
                'Harbour Analytics interview',
                'NovaStack interview',
                'Atlas RecruitTech interview',
                'Harbour Analytics interview',
                'NovaStack interview',
                'Summit Talent interview',
                'Quantum Ledger interview',
                'Merlion Cloud interview',
            ];

            expect(
                within(interviews)
                    .getAllByRole('article')
                    .map((card) => card.getAttribute('aria-label'))
            ).toEqual(expectedOrder);

            fireEvent.click(
                within(screen.getByRole('group', { name: 'Interview view' })).getByRole('button', { name: 'Board' })
            );
            expect(
                within(interviews)
                    .getAllByRole('article')
                    .map((card) => card.getAttribute('aria-label'))
            ).toEqual(expectedOrder);
        } finally {
            vi.useRealTimers();
        }
    });

    test('renders archived demo interviews in the production date order', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 7, 12, 0, 0, 0));

        try {
            renderDemo(<DemoViewArchivedInterview />, [routes.demoArchivedInterviews]);

            expect(
                within(screen.getByRole('region', { name: 'Archived interviews' }))
                    .getAllByRole('article')
                    .map((card) => card.getAttribute('aria-label'))
            ).toEqual([
                'OrbitPay interview',
                'Keppel Digital interview',
                'SilverRail Labs interview',
                'Riverlane Studio interview',
            ]);
        } finally {
            vi.useRealTimers();
        }
    });

    test('opens a corresponding demo application in List view while preserving existing filters', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(
            <>
                <SetCollectionViewMode />
                <SetApplicationCsvFilter />
                <DemoRouteHarness />
            </>,
            [routes.demoViewInterviews]
        );

        await userEvent.click(screen.getByRole('button', { name: 'Set application Board mode' }));
        await userEvent.click(screen.getByRole('button', { name: 'Filter active CSV to Offer' }));
        const link = screen.getAllByRole('link', { name: /review corresponding job application/i })[0];
        const targetId = link.getAttribute('href')?.split('#')[1];
        await userEvent.click(link);

        expect(await screen.findByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() => expect(document.getElementById(targetId ?? '')?.className).toContain('highlighted'));
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Offer' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Interview' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Applied' })).not.toBeChecked();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('uses demo-only links for archived interview empty state', async () => {
        renderDemo(<DemoViewArchivedInterview />, [routes.demoArchivedInterviews]);

        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(screen.getByRole('button', { name: /delete all archived interviews/i }));

        expect(await screen.findByRole('heading', { name: 'No archived interviews yet' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View active interviews' })).toHaveAttribute(
            'href',
            routes.demoViewInterviews
        );
        expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    });

    test('supports archived demo interview Board mode and opens its corresponding application consistently', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(
            <>
                <SetCollectionViewMode archived />
                <SetApplicationCsvFilter archived />
                <DemoRouteHarness />
            </>,
            [routes.demoArchivedInterviews]
        );

        await userEvent.click(
            within(screen.getByRole('group', { name: 'Archived interview view' })).getByRole('button', {
                name: 'Board',
            })
        );
        expect(screen.getByRole('region', { name: 'Archived interviews' })).toHaveAttribute('data-layout', 'board');
        expect(screen.queryByText(/time left/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/notes:/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /review corresponding job application/i })).not.toBeInTheDocument();

        await userEvent.click(
            within(screen.getByRole('group', { name: 'Archived interview view' })).getByRole('button', {
                name: 'List',
            })
        );
        await userEvent.click(screen.getByRole('button', { name: 'Set application Board mode' }));
        await userEvent.click(screen.getByRole('button', { name: 'Filter archived CSV to Offer' }));
        const link = screen.getAllByRole('link', { name: /review corresponding job application/i })[0];
        const targetId = link.getAttribute('href')?.split('#')[1];
        await userEvent.click(link);

        expect(await screen.findByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() => expect(document.getElementById(targetId ?? '')?.className).toContain('highlighted'));
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Offer' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Accepted' })).toBeChecked();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('keeps demo interview CSV filtered while bulk calendar and Delete All use the complete active collection', async () => {
        renderDemo(<DemoViewInterview />, [routes.demoViewInterviews]);
        await screen.findByRole('region', { name: 'Active interviews' });

        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Upcoming Interviews' }));
        await waitFor(() =>
            expect(
                within(screen.getByRole('region', { name: 'Active interviews' })).getAllByRole('article')
            ).toHaveLength(3)
        );
        fireEvent.click(
            within(screen.getByRole('group', { name: 'Interview view' })).getByRole('button', { name: 'Board' })
        );
        expect(screen.getByRole('region', { name: 'Active interviews' })).toHaveAttribute('data-layout', 'board');

        fireEvent.click(screen.getByRole('button', { name: 'More...' }));
        const csv = getExportCsvText();
        expect(csv).toContain('Recruiter follow-up');
        expect(csv).not.toContain('System design interview');
        expect(screen.getByRole('link', { name: 'Export as CSV' })).toHaveAttribute(
            'download',
            'demo_job_interviews.csv'
        );

        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        await clickConfirmedAction(
            screen.getByRole('button', { name: 'Export all upcoming active interviews (.ics)' })
        );
        expect(mockConfirm).toHaveBeenLastCalledWith(
            expect.objectContaining({
                description:
                    'This will download one .ics file containing all 7 upcoming active interviews from the active Interview collection, including interviews you may already have added to your calendar. Importing the file again may create duplicate calendar events.',
            })
        );

        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        await clickConfirmedAction(screen.getByRole('button', { name: 'Delete all interviews' }));
        expect(mockConfirm).toHaveBeenLastCalledWith(
            expect.objectContaining({
                description:
                    'Delete all 10 active interviews you own? This affects every active interview in your account. This action is permanent and cannot be undone.',
            })
        );
    });

    test('uses archived demo filters for display and CSV with a filtered empty-state reset', async () => {
        renderDemo(<DemoViewArchivedInterview />, [routes.demoArchivedInterviews]);

        fireEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Past Interviews' }));

        expect(await screen.findByRole('heading', { name: 'No interviews match your filters' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'More...' })).not.toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Demo archived interview view and management controls' }).children
        ).toHaveLength(1);
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

        expect(await screen.findByRole('region', { name: 'Archived interviews' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        expect(getExportCsvText()).toContain('Archived with rejected application.');
        expect(screen.getByRole('link', { name: 'Export as CSV' })).toHaveAttribute(
            'download',
            'demo_archived_job_interviews.csv'
        );
        expect(
            screen.queryByRole('button', { name: 'Export all upcoming active interviews (.ics)' })
        ).not.toBeInTheDocument();
    });

    test('clears demo application filters in reducer state without backend calls', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(<DemoViewApplication />);

        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(screen.getByRole('button', { name: /delete all applications/i }));
        expect(await screen.findByRole('heading', { name: 'No active applications yet' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Declined' }));

        expect(await screen.findByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

        expect(await screen.findByRole('heading', { name: 'No active applications yet' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Show All' })).toBeChecked();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('keeps demo application empty-state actions inside demo routes in board view', async () => {
        renderDemo(<DemoViewApplication />);

        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(screen.getByRole('button', { name: /delete all applications/i }));

        expect(await screen.findByRole('heading', { name: 'No active applications yet' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Add application' })).toHaveAttribute(
            'href',
            routes.demoAddApplication
        );
        expect(screen.queryByRole('region', { name: 'Application board' })).not.toBeInTheDocument();
    });

    test('renders dashboard from demo selectors', () => {
        renderDemo(<DemoDashboard />, [routes.demoDashboard]);

        expect(screen.getByText('Total Active Applications')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Needs Attention' })).toBeInTheDocument();
        expect(
            within(screen.getByRole('list', { name: 'Applications needing attention' })).getAllByRole('listitem')
        ).toHaveLength(6);
        expect(screen.queryByText('Quantum Ledger')).not.toBeInTheDocument();
        expect(screen.getByText('Northstar Mobility')).toBeInTheDocument();
        expect(screen.getByText('Demo line chart')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Upcoming Interviews' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Application Pipeline' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Closed Outcomes' })).toBeInTheDocument();
        expect(screen.getAllByText('Demo bar chart')).toHaveLength(2);
    });

    test('marks and undoes a demo application follow-up in local state without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(
            <>
                <DemoDashboard />
                <DemoViewApplication />
            </>,
            [routes.demoDashboard]
        );

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Draft application follow-up for Product Engineer at Northstar Mobility',
            })
        );
        await act(async () => {
            await userEvent.click(
                screen.getByRole('button', {
                    name: 'Mark application follow-up as sent for Product Engineer at Northstar Mobility',
                })
            );
        });

        await waitFor(() =>
            expect(
                within(screen.getByRole('list', { name: 'Applications needing attention' })).queryByText(
                    'Northstar Mobility'
                )
            ).not.toBeInTheDocument()
        );
        const applicationCard = document.getElementById('106');
        expect(applicationCard).not.toBeNull();
        const undo = within(applicationCard!).getByRole('button', {
            name: 'Undo follow-up for Product Engineer at Northstar Mobility',
        });
        await userEvent.click(undo);

        expect(
            within(screen.getByRole('list', { name: 'Applications needing attention' })).getByText('Northstar Mobility')
        ).toBeInTheDocument();
        expect(within(applicationCard!).queryByRole('button', { name: /undo follow-up/i })).not.toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('navigates from a demo dashboard status to the matching application filter without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(<DemoRouteHarness />, [routes.demoDashboard]);

        await userEvent.click(screen.getByRole('button', { name: 'View Offer bar' }));

        expect(await screen.findByRole('heading', { name: /Greenhouse CloudOps/ })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Quantum Ledger/ })).toBeInTheDocument();
        expect(screen.queryByText('HorizonAI Labs')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Offer' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Applied' })).not.toBeChecked();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('keeps Add Interview attention navigation inside demo mode with the selected application', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(
            <>
                <PrepareUnscheduledDemoInterview />
                <DemoRouteHarness />
            </>,
            [routes.demoDashboard]
        );

        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Add interview for Full Stack Developer at ByteForge Systems',
            })
        );

        expect(await screen.findByRole('heading', { name: 'You are adding an interview for:' })).toBeInTheDocument();
        expect(screen.getByText('ByteForge Systems')).toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('keeps Evaluate offer attention navigation on active demo Offer Comparison', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(
            <>
                <PrepareUnevaluatedDemoOffer />
                <DemoRouteHarness />
            </>,
            [routes.demoDashboard]
        );

        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Evaluate offer for Frontend Infrastructure Engineer at Quantum Ledger',
            })
        );

        expect(await screen.findByRole('heading', { name: 'Offers to Evaluate' })).toBeInTheDocument();
        expect(screen.getByText('Quantum Ledger')).toBeInTheDocument();
        await waitFor(() =>
            expect(
                screen.getByRole('article', { name: 'Quantum Ledger Frontend Infrastructure Engineer' }).className
            ).toContain('highlight')
        );
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('opens, scrolls to and highlights the exact due demo offer in Offer Comparison', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        const scrollIntoView = vi.fn();
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = scrollIntoView;
        renderDemo(
            <>
                <PrepareDueDemoOffer />
                <DemoRouteHarness />
            </>,
            [routes.demoDashboard]
        );

        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Record offer decision for DevOps UI Engineer at Greenhouse CloudOps',
            })
        );

        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' }));
        expect(screen.getByRole('article', { name: 'Greenhouse CloudOps DevOps UI Engineer' })).toBeInTheDocument();
        expect(scrollAndHighlight).toHaveBeenCalledWith(
            'offer-evaluation-111',
            expect.any(String),
            expect.anything(),
            'start'
        );
        expect(fetchSpy).not.toHaveBeenCalled();
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
        scrollAndHighlight.mockRestore();
        fetchSpy.mockRestore();
    });

    test('opens the exact demo dashboard interview in List view and highlights it without fetching', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        renderDemo(
            <>
                <SetInterviewBoardMode />
                <SetInterviewPastFilter />
                <DemoRouteHarness />
            </>,
            [routes.demoDashboard]
        );

        await userEvent.click(screen.getByRole('button', { name: 'Set interview Board mode' }));
        await userEvent.click(screen.getByRole('button', { name: 'Set interview Past filter' }));
        await userEvent.click(screen.getByRole('button', { name: 'View Merlion Cloud interview' }));

        expect(await screen.findByRole('region', { name: 'Active interviews' })).toHaveAttribute('data-layout', 'list');
        await waitFor(() => expect(document.getElementById('401')?.className).toContain('highlighted'));
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Upcoming Interviews' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Past Interviews' })).toBeChecked();
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });

    test('uses empty job URLs for built-in demo application data', () => {
        const state = createDemoInitialState();
        const activeJobUrls = state.applications.map((application) => application.job_posting_url);
        const archivedJobUrls = state.archivedApplications.map((application) => application.job_posting_url);

        expect(activeJobUrls.every((jobURL) => jobURL === '')).toBe(true);
        expect(archivedJobUrls.every((jobURL) => jobURL === '')).toBe(true);
    });
});
