import { act, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ViewArchivedInterview from '../../../pages/interview/archivedInterview/viewArchivedInterview/ViewArchivedInterview';
import type { UpdateUserPreferencesRequest, UserPreferences } from '../../../components/userPreferences/models';
import { render, testPreferences } from '../../renderWithProviders';
import userEvent from '@testing-library/user-event';

const LocationStateProbe = () => {
    const location = useLocation();
    return <output data-testid='location-state'>{JSON.stringify(location.state)}</output>;
};

globalThis.fetch = vi.fn();

const mockInterview = {
    archived_job_id: 1,
    archived_interview_id: 1,
    company_name: 'ABC Pte Ltd',
    job_title: 'Software Engineer',
    job_status: 'Applied',
    interview_location: 'Changi Business Park',
    interview_type: 'HR',
    interview_notes: 'Bring resume',
    interview_date: '2025-06-20T00:00:00Z',
    interview_duration_minutes: 60,
    is_pinned: false,
};

const response = (data?: unknown, status = 200) => ({
    headers: new Headers(data === undefined ? undefined : { 'content-type': 'application/json' }),
    json: async () => data,
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: async () => '',
    url: '',
});

const getTimeFilters = (url: string): string[] => new URLSearchParams(url.split('?')[1] ?? '').getAll('timeFilters');

const mockConfirm = vi.fn();
vi.mock('material-ui-confirm', () => ({
    useConfirm: () => mockConfirm,
}));

const clickConfirmedAction = async (button: HTMLElement) => {
    await act(async () => {
        await userEvent.click(button);
    });
};

const getExportCsvText = (): string => {
    const href = screen.getByRole('link', { name: 'Export filtered interviews as CSV' }).getAttribute('href') ?? '';
    const csvStart = href.indexOf(',');
    return decodeURIComponent(csvStart === -1 ? href : href.slice(csvStart + 1)).replace(/^\uFEFF/, '');
};

describe('Archived job interview viewer flow', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        fetch.mockReset();
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/archived-job-interviews/summary')) {
                return response({ interview_count: 1 });
            }
            return init?.method === 'GET' ? response([mockInterview]) : response(undefined, 204);
        });
    });

    test('displays job interview details and action buttons', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            { initialPreferences: { archived_interview_show_notes: true } }
        );

        expect(await screen.findByText(/abc pte ltd/i)).toBeInTheDocument();
        expect(screen.queryByText(/no job interview found/)).not.toBeInTheDocument();
        expect(screen.getByText(/software engineer/i)).toBeInTheDocument();
        expect(screen.getByText(/changi business park/i)).toBeInTheDocument();
        expect(screen.getByText(/hr/i)).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Notes for ABC Pte Ltd' })).toHaveValue('Bring resume');
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        expect(screen.getByRole('button', { name: /delete all archived interviews/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Export filtered interviews as CSV' })).toBeInTheDocument();
    });

    test('uses an independent archived Interview Show notes preference and keeps List notes read-only', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            {
                initialPreferences: {
                    archived_interview_show_notes: true,
                } as unknown as Partial<UserPreferences>,
            }
        );

        const notes = await screen.findByRole('textbox', { name: 'Notes for ABC Pte Ltd' });
        expect(notes).toHaveValue('Bring resume');
        expect(notes).toBeDisabled();
        expect(notes).toHaveAttribute('readonly');
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        expect(screen.getByRole('switch', { name: 'Show notes' })).toBeChecked();
    });

    test('keeps archived notes read-only inside Board Actions and never shows Calendar', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            { initialPreferences: { archived_interview_view_mode: 'board' } }
        );

        const interviews = await screen.findByRole('region', { name: 'Archived interviews' });
        await userEvent.click(within(interviews).getByText('Actions'));

        const notes = within(interviews).getByRole('textbox', { name: 'Notes for ABC Pte Ltd' });
        expect(within(interviews).getByText('Notes')).toBeInTheDocument();
        expect(notes).toBeDisabled();
        expect(notes).toHaveAttribute('readonly');
        expect(within(interviews).queryByRole('button', { name: 'Add to calendar' })).not.toBeInTheDocument();
    });

    test('shows pinned archived interviews as read-only in list and board views', async () => {
        fetch.mockImplementation(async (_url: string, init?: RequestInit) =>
            init?.method === 'GET' ? response([{ ...mockInterview, is_pinned: true }]) : response(undefined, 204)
        );

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>
        );

        expect(await screen.findByLabelText('ABC Pte Ltd interview is pinned')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /pin ABC Pte Ltd interview/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /unpin ABC Pte Ltd interview/i })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        const board = screen.getByRole('region', { name: 'Archived interviews' });
        expect(within(board).getByLabelText('ABC Pte Ltd interview is pinned')).toBeInTheDocument();
        expect(within(board).queryByRole('button', { name: /pin ABC Pte Ltd interview/i })).not.toBeInTheDocument();
        expect(within(board).queryByRole('button', { name: /unpin ABC Pte Ltd interview/i })).not.toBeInTheDocument();
    });

    test('shows a skeleton instead of a spinner during the initial fetch', () => {
        fetch.mockImplementation(async () => await new Promise<ReturnType<typeof response>>(() => undefined));

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>
        );

        expect(screen.getAllByRole('status', { name: 'Loading results' })).toHaveLength(2);
        expect(screen.queryByRole('progressbar', { name: 'Loading' })).not.toBeInTheDocument();
        expect(screen.queryByText(/no archived job interview found/i)).not.toBeInTheDocument();
        expect(document.querySelector('br')).not.toBeInTheDocument();
    });

    test('deletes archived interview after user confirms', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>
        );

        await screen.findByText(/abc pte ltd/i);

        // Simulates user confirming delete
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        // Simulates user clicking delete button and clicking confirm delete
        await clickConfirmedAction(screen.getByRole('button', { name: 'Delete' }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith({
                title: 'Confirm Deletion',
                description:
                    'Are you sure you want to delete this archived job interview? This action is permanent and cannot be undone.',
                confirmationText: 'Delete',
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true },
            })
        );

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-interviews/1`, {
                method: 'DELETE',
            })
        );

        await waitFor(() => expect(screen.queryByText(/abc pte ltd/i)).not.toBeInTheDocument());
    });

    test('deletes all archived interviews after user confirms', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>
        );

        await screen.findByText(/abc pte ltd/i);

        // Simulates user confirming delete
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        // Simulates user clicking delete button and clicking confirm delete
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(screen.getByRole('button', { name: 'Delete all archived interviews' }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Confirm Delete All',
                    description:
                        'Delete all 1 archived interview you own? This affects every archived interview in your account. This action is permanent and cannot be undone.',
                    confirmationText: 'Delete All',
                    cancellationText: 'Cancel',
                    confirmationButtonProps: expect.objectContaining({
                        autoFocus: false,
                        onKeyDown: expect.any(Function),
                    }),
                })
            )
        );

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-interviews`, {
                method: 'DELETE',
            })
        );

        await waitFor(() => expect(screen.queryByText(/abc pte ltd/i)).not.toBeInTheDocument());
    });

    test('renders the archived interview empty state without filter actions', async () => {
        fetch.mockResolvedValue(response([]));

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>
        );

        expect(await screen.findByRole('heading', { name: 'No archived interviews yet' })).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'No archived interviews yet' }).closest('section')?.className
        ).toContain('followsControls');
        expect(screen.getByText(/interviews linked to archived applications/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View active interviews' })).toHaveAttribute('href', '/interview/view');
        expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    });

    test('hides collection actions when filters hide every archived interview', async () => {
        const futureInterview = {
            ...mockInterview,
            interview_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        };
        fetch.mockImplementation(async (url: string) =>
            response(getTimeFilters(url).join(',') === 'Past Interviews' ? [] : [futureInterview])
        );

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            { initialPreferences: { archived_interview_time_filters: ['Past Interviews'] } }
        );

        expect(await screen.findByRole('heading', { name: 'No interviews match your filters' })).toBeInTheDocument();
        expect(screen.getByText('Try showing all time filters to see every archived interview.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'More...' })).not.toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Archived interview view and management controls' }).children
        ).toHaveLength(1);
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(await screen.findByRole('region', { name: 'Archived interviews' })).toBeInTheDocument();
    });

    test('navigates to the corresponding archived application without a preflight request', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedInterview />
                <LocationStateProbe />
            </MemoryRouter>,
            { initialPreferences: { archived_application_job_statuses: ['Offer'] } }
        );

        await userEvent.click(await screen.findByRole('link', { name: /review corresponding job application/i }));

        expect(screen.getByTestId('location-state')).toHaveTextContent(
            JSON.stringify({ applicationJobStatus: 'Applied', applicationTargetId: 1 })
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('renders only the archived interview Board skeleton for a saved Board preference', () => {
        fetch.mockImplementation(async () => await new Promise<ReturnType<typeof response>>(() => undefined));

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            { initialPreferences: { archived_interview_view_mode: 'board' } }
        );

        expect(screen.getByRole('status', { name: 'Loading interviews' })).toBeInTheDocument();
        expect(screen.getAllByTestId('skeleton-card')).toHaveLength(4);
        expect(screen.queryByRole('status', { name: 'Loading results' })).not.toBeInTheDocument();
        expect(screen.queryByRole('status', { name: 'Loading board' })).not.toBeInTheDocument();
    });

    test('switches archived interviews to Board without refetching', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>
        );

        const interviews = await screen.findByRole('region', { name: 'Archived interviews' });
        await userEvent.click(
            within(screen.getByRole('group', { name: 'Archived interview view' })).getByRole('button', {
                name: 'Board',
            })
        );

        await waitFor(() => expect(interviews).toHaveAttribute('data-layout', 'board'));
        expect(within(interviews).queryByText(/time left/i)).not.toBeInTheDocument();
        expect(within(interviews).queryByText(/notes:/i)).not.toBeInTheDocument();
        expect(
            within(interviews).queryByRole('link', { name: /review corresponding job application/i })
        ).not.toBeInTheDocument();
        const actions = within(interviews).getByText('Actions').closest('details');
        expect(actions).not.toHaveAttribute('open');

        await userEvent.click(within(interviews).getByText('Actions'));
        expect(actions).toHaveAttribute('open');
        expect(within(interviews).getByRole('button', { name: 'Delete' }).parentElement?.className).toContain(
            'compactActions'
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('navigates to the corresponding archived application when archived applications use Board view', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedInterview />
                <LocationStateProbe />
            </MemoryRouter>,
            {
                initialPreferences: {
                    archived_application_view_mode: 'board',
                },
            }
        );

        await userEvent.click(await screen.findByRole('link', { name: /review corresponding job application/i }));

        expect(screen.getByTestId('location-state')).toHaveTextContent(
            JSON.stringify({ applicationJobStatus: 'Applied', applicationTargetId: 1 })
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('requests saved archived time filters initially and trusts the server response', async () => {
        const serverFilteredInterview = {
            ...mockInterview,
            company_name: 'Server Filtered Archived Company',
            interview_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        };
        fetch.mockResolvedValue(response([serverFilteredInterview]));

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            { initialPreferences: { archived_interview_time_filters: ['Past Interviews'] } }
        );

        expect(
            await screen.findByRole('article', { name: 'Server Filtered Archived Company interview' })
        ).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/archived-job-interviews?timeFilters=Past+Interviews`,
            { method: 'GET' }
        );
    });

    test('fetches archived interviews before saving each changed selection', async () => {
        const requestOrder: string[] = [];
        const filteredInterview = {
            ...mockInterview,
            company_name: 'Filtered Archived Response',
            interview_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        };
        const updatePreferences = vi.fn(async (updates: UpdateUserPreferencesRequest) => {
            requestOrder.push('preference');
            return {
                ...testPreferences,
                ...updates,
            };
        });
        fetch.mockImplementation(async (url: string) => {
            if (getTimeFilters(url).join(',') === 'Past Interviews') {
                requestOrder.push('filtered-get');
                return response([filteredInterview]);
            }
            return response([mockInterview]);
        });

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            { updatePreferences }
        );

        await screen.findByRole('article', { name: 'ABC Pte Ltd interview' });
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Upcoming Interviews' }));

        expect(
            await screen.findByRole('article', { name: 'Filtered Archived Response interview' })
        ).toBeInTheDocument();
        expect(requestOrder).toEqual(['filtered-get', 'preference']);
        expect(updatePreferences).toHaveBeenCalledWith({ archived_interview_time_filters: ['Past Interviews'] });
    });

    test('shows the archived skeleton during a filter request without disabling rapid changes', async () => {
        let resolveFilter: (value: ReturnType<typeof response>) => void = () => undefined;
        fetch.mockImplementation(async (url: string) => {
            if (getTimeFilters(url).join(',') === 'Past Interviews') {
                return new Promise((resolve) => {
                    resolveFilter = resolve;
                });
            }
            return response([mockInterview]);
        });

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>
        );
        await screen.findByRole('article', { name: 'ABC Pte Ltd interview' });
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Upcoming Interviews' }));

        expect(screen.getAllByRole('status', { name: 'Loading results' })).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Filter by' })).toBeEnabled();
        await act(async () => resolveFilter(response([])));
        expect(await screen.findByRole('heading', { name: 'No interviews match your filters' })).toBeInTheDocument();
    });

    test('restores archived interviews and filters when preference persistence fails', async () => {
        const updatePreferences = vi.fn().mockRejectedValue(new Error('save failed'));
        fetch.mockImplementation(async (url: string) =>
            response(getTimeFilters(url).join(',') === 'Past Interviews' ? [] : [mockInterview])
        );

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            { updatePreferences }
        );
        await screen.findByRole('article', { name: 'ABC Pte Ltd interview' });
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Upcoming Interviews' }));

        expect(await screen.findByText('Unable to filter archived interviews. Please try again.')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Upcoming Interviews' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Past Interviews' })).toBeChecked();
        expect(screen.getByRole('article', { name: 'ABC Pte Ltd interview' })).toBeInTheDocument();
    });

    test('ignores an older archived filter response after a newer selection finishes', async () => {
        let resolveOlderFilter: (value: ReturnType<typeof response>) => void = () => undefined;
        const olderInterview = { ...mockInterview, company_name: 'Older Archived Result' };
        const latestInterview = { ...mockInterview, company_name: 'Latest Archived Result' };
        fetch.mockImplementation(async (url: string) => {
            const timeFilters = getTimeFilters(url).join(',');
            if (timeFilters === 'Past Interviews') {
                return new Promise((resolve) => {
                    resolveOlderFilter = resolve;
                });
            }
            if (timeFilters === 'Upcoming Interviews') {
                return response([latestInterview]);
            }
            return response([mockInterview]);
        });

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>
        );
        await screen.findByRole('article', { name: 'ABC Pte Ltd interview' });
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Upcoming Interviews' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Upcoming Interviews' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Past Interviews' }));

        expect(await screen.findByRole('article', { name: 'Latest Archived Result interview' })).toBeInTheDocument();
        await act(async () => resolveOlderFilter(response([olderInterview])));
        expect(screen.queryByRole('article', { name: 'Older Archived Result interview' })).not.toBeInTheDocument();
    });

    test('filters archived Board display and exports CSV from the same collection', async () => {
        const now = Date.now();
        const interviews = [
            {
                ...mockInterview,
                archived_interview_id: 1,
                company_name: 'Future Archived Company',
                interview_date: new Date(now + 60 * 60 * 1000).toISOString(),
            },
            {
                ...mockInterview,
                archived_interview_id: 2,
                company_name: 'Ended Archived Company',
                interview_date: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
            },
        ];
        fetch.mockResolvedValue(response([interviews[1]]));

        render(
            <MemoryRouter>
                <ViewArchivedInterview />
            </MemoryRouter>,
            {
                initialPreferences: {
                    archived_interview_time_filters: ['Past Interviews'],
                    archived_interview_view_mode: 'board',
                },
            }
        );

        const board = await screen.findByRole('region', { name: 'Archived interviews' });
        expect(board).toHaveAttribute('data-layout', 'board');
        expect(within(board).getByRole('article', { name: 'Ended Archived Company interview' })).toBeInTheDocument();
        expect(
            within(board).queryByRole('article', { name: 'Future Archived Company interview' })
        ).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        const csv = getExportCsvText();
        expect(csv).toContain('Ended Archived Company');
        expect(csv).not.toContain('Future Archived Company');
        expect(
            screen.queryByRole('button', { name: 'Export all upcoming active interviews (.ics)' })
        ).not.toBeInTheDocument();
    });
});
