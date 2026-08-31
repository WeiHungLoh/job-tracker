import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ViewApplication from '../../../pages/application/jobApplication/viewApplication/ViewApplication';
import { render } from '../../renderWithProviders';
import userEvent from '@testing-library/user-event';
import { JOB_STATUSES } from '../../../pages/application/models';
import type { UpdateUserPreferencesRequest, UserPreferences } from '../../../components/userPreferences/models';
import type { ReactNode } from 'react';
import * as highlightElement from '../../../helper/highlightElement';
import boardStyles from '../../../pages/application/applicationBoard/ApplicationBoard.module.css';

globalThis.fetch = vi.fn();

const mockApplication = {
    job_id: 1,
    company_name: 'ABC Pte Ltd',
    job_title: 'Software Engineer',
    job_location: 'Remote',
    application_date: '2025-06-20T00:00:00Z',
    job_status: 'Applied',
    job_posting_url: 'https://jobstreet.com',
    notes: '',
    is_pinned: false,
};

const mockInterview = {
    interview_id: 1,
    job_id: 1,
    company_name: 'ABC Pte Ltd',
    job_title: 'Software Engineer',
    interview_date: '2025-07-20T00:00:00Z',
    interview_duration_minutes: 60,
    interview_location: 'Zoom',
    interview_type: 'Technical',
    interview_notes: '',
};

const mockPreferences: UserPreferences = {
    application_job_statuses: [...JOB_STATUSES],
    application_show_notes: false,
    application_show_archive: false,
    application_enable_scroll: false,
    application_view_mode: 'list',
    application_list_sort_order: 'job_status',
    application_board_sort_order: 'application_date_desc',
    archived_application_job_statuses: [...JOB_STATUSES],
    archived_application_show_notes: false,
    archived_application_view_mode: 'list',
    archived_application_list_sort_order: 'job_status',
    archived_application_board_sort_order: 'application_date_desc',
    interview_view_mode: 'list',
    interview_show_notes: false,
    archived_interview_view_mode: 'list',
    archived_interview_show_notes: false,
    interview_time_filters: ['Upcoming Interviews', 'Past Interviews'],
    archived_interview_time_filters: ['Upcoming Interviews', 'Past Interviews'],
    offer_decision_filters: [
        'Offers to Evaluate',
        'Evaluated Offers',
        'Expired Evaluated Offers',
        'Previous Evaluations',
    ],
    archived_offer_decision_filters: ['Evaluated Offers', 'Expired Evaluated Offers', 'Previous Evaluations'],
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

const mockConfirm = vi.fn();
vi.mock('material-ui-confirm', () => ({
    useConfirm: () => mockConfirm,
}));

vi.mock('@dnd-kit/core', () => ({
    DndContext: ({
        children,
        onDragCancel,
        onDragEnd,
        onDragStart,
    }: {
        children: ReactNode;
        onDragCancel?: () => void;
        onDragEnd: (event: { active: { id: string }; over: { id: string } }) => void;
        onDragStart?: (event: { active: { id: string } }) => void;
    }) => (
        <div>
            <button
                data-testid='mock-start-drag-application-1'
                hidden
                onClick={() => onDragStart?.({ active: { id: '1' } })}
                type='button'
            />
            <button data-testid='mock-cancel-drag' hidden onClick={() => onDragCancel?.()} type='button' />
            <button
                data-testid='mock-drag-application-1-to-interview'
                hidden
                onClick={() => onDragEnd({ active: { id: '1' }, over: { id: 'Interview' } })}
                type='button'
            />
            <button
                data-testid='mock-drag-application-1-to-applied'
                hidden
                onClick={() => onDragEnd({ active: { id: '1' }, over: { id: 'Applied' } })}
                type='button'
            />
            {children}
        </div>
    ),
    KeyboardSensor: vi.fn(),
    PointerSensor: vi.fn(),
    useDraggable: () => ({
        attributes: { role: 'button', tabIndex: 0 },
        listeners: {},
        setActivatorNodeRef: vi.fn(),
        setNodeRef: vi.fn(),
        transform: null,
    }),
    useDroppable: () => ({
        isOver: false,
        setNodeRef: vi.fn(),
    }),
    useSensor: vi.fn(),
    useSensors: vi.fn(),
}));

globalThis.alert = vi.fn();

const applicationRequestCount = (url: string) =>
    fetch.mock.calls.filter(([requestUrl]) => String(requestUrl) === url).length;

const applicationListRequestCount = () =>
    fetch.mock.calls.filter(
        ([requestUrl, init]: [string, RequestInit?]) =>
            requestUrl.includes('/job-applications?') && init?.method === 'GET'
    ).length;

const getSortOptionLabels = () =>
    within(screen.getByRole('radiogroup', { name: 'Sort options' }))
        .getAllByRole('radio')
        .map((radio) => radio.closest('label')?.textContent);

const getListCompanyHeadings = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

const expectListCompanyOrder = (companyNames: string[]) => {
    expect(getListCompanyHeadings()).toEqual(companyNames.map((companyName, index) => `${index + 1}. ${companyName}`));
};

const getExportCsvText = async (): Promise<string> => {
    await userEvent.click(screen.getByRole('button', { name: 'More…' }));
    const href = screen.getByRole('link', { name: 'Export filtered applications as CSV' }).getAttribute('href') ?? '';
    const csvStart = href.indexOf(',');

    return decodeURIComponent(csvStart === -1 ? href : href.slice(csvStart + 1)).replace(/^\uFEFF/, '');
};

const expectCsvCompanyOrder = (csv: string, companyNames: string[]) => {
    let previousCompanyIndex = -1;

    for (const companyName of companyNames) {
        const companyIndex = csv.indexOf(companyName);
        expect(companyIndex).toBeGreaterThan(previousCompanyIndex);
        previousCompanyIndex = companyIndex;
    }
};

const statusUpdateRequestCount = (jobId: number) =>
    fetch.mock.calls.filter(
        ([url, init]: [string, RequestInit?]) =>
            url.endsWith(`/job-applications/${jobId}/status`) && init?.method === 'PATCH'
    ).length;

const mockPendingApplicationStatusUpdate = () => {
    let resolveStatusUpdate: ((value: ReturnType<typeof response>) => void) | undefined;
    fetch.mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/job-interviews')) {
            return response([]);
        }
        if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
            return new Promise((resolve) => {
                resolveStatusUpdate = resolve;
            });
        }
        return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
    });

    return () => {
        if (!resolveStatusUpdate) {
            throw new Error('Expected a pending application status update.');
        }
        resolveStatusUpdate(response(undefined, 204));
    };
};

const renderPendingApplicationStatusUpdate = (initialPreferences: Partial<UserPreferences>) => {
    const resolveStatusUpdate = mockPendingApplicationStatusUpdate();
    render(
        <MemoryRouter>
            <ViewApplication />
        </MemoryRouter>,
        { initialPreferences }
    );
    return resolveStatusUpdate;
};

const beginPendingListStatusUpdate = async () => {
    await screen.findByText(/ABC Pte Ltd/i);
    await userEvent.click(screen.getByRole('button', { name: /edit status/i }));
    await userEvent.selectOptions(
        screen.getByRole('combobox', { name: /Application status for Software Engineer at ABC Pte Ltd/ }),
        'Interview'
    );
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
};

const waitForStatusAutoScrollDelay = async () => {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
    });
};

const LocationStateProbe = () => {
    const location = useLocation();
    return <output data-testid='location-state'>{JSON.stringify(location.state)}</output>;
};

const clickConfirmedAction = async (button: HTMLElement) => {
    await act(async () => {
        await userEvent.click(button);
    });
};

const mockApplicationCollection = (applications: unknown[]) => {
    fetch.mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/user-preferences')) {
            return response({
                ...mockPreferences,
                ...(init?.body ? JSON.parse(String(init.body)) : {}),
            });
        }
        if (url.endsWith('/job-interviews')) {
            return response([]);
        }
        if (/\/job-applications\/\d+\/relation-summary$/.test(url)) {
            return response({ related_interview_count: 0 });
        }
        if (url.endsWith('/job-applications/summary')) {
            return response({ application_count: applications.length, related_interview_count: 0 });
        }
        return init?.method === 'GET' ? response(applications) : response(undefined, 204);
    });
};

describe('Job application viewing flow', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        fetch.mockReset();
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (init?.method !== 'GET') {
                return response(undefined, 204);
            }
            if (/\/job-applications\/\d+\/relation-summary$/.test(url)) {
                return response({ related_interview_count: 0 });
            }
            if (url.endsWith('/job-applications/summary')) {
                return response({ application_count: 1, related_interview_count: 0 });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            return response([mockApplication]);
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('aborts its initial application and interview requests when unmounted', async () => {
        const pendingResponse = new Promise<never>(() => undefined);
        fetch.mockImplementation(async (url: string) => {
            if (url.includes('/job-applications?') || url.includes('/job-interviews')) {
                return pendingResponse;
            }
            return response([]);
        });

        const { unmount } = render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(fetch.mock.calls.filter(([url]) => String(url).includes('/job-applications?'))).toHaveLength(1);
            expect(fetch.mock.calls.filter(([url]) => String(url).includes('/job-interviews'))).toHaveLength(1);
        });
        const requestSignals = fetch.mock.calls
            .filter(([url]) => String(url).includes('/job-applications?') || String(url).includes('/job-interviews'))
            .map(([, init]) => (init as RequestInit | undefined)?.signal);

        unmount();

        expect(requestSignals).toHaveLength(2);
        requestSignals.forEach((signal) => expect(signal).toBeInstanceOf(AbortSignal));
        requestSignals.forEach((signal) => expect(signal?.aborted).toBe(true));
    });

    test('displays job application details and action buttons', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );
        expect(await screen.findByText(/ABC Pte Ltd/i)).toBeInTheDocument();
        expect(screen.queryByText(/no job applications match the selected job statuses/i)).not.toBeInTheDocument();
        expect(screen.getByText(/software engineer/i)).toBeInTheDocument();
        expect(screen.getByText(/^job status:/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit status/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pin ABC Pte Ltd application' })).toHaveAttribute(
            'aria-pressed',
            'false'
        );
        expect(screen.getByRole('button', { name: /^Delete application for / })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Filter by' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.queryByRole('region', { name: 'Application board' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        expect(screen.getByRole('switch', { name: 'Show notes' })).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByRole('switch', { name: 'Show archive' })).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByRole('switch', { name: 'Auto-scroll and highlight updates' })).toHaveAttribute(
            'aria-checked',
            'false'
        );
        await userEvent.click(screen.getByRole('button', { name: 'More…' }));
        expect(screen.getByRole('button', { name: /delete all applications/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /archive all applications/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Export filtered applications as CSV' })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            `${
                import.meta.env.VITE_API_URL
            }/job-applications?jobStatuses=Accepted&jobStatuses=Applied&jobStatuses=Declined&jobStatuses=Ghosted&jobStatuses=Interview&jobStatuses=Offer&jobStatuses=Rejected&jobStatuses=Withdrawn`,
            {
                method: 'GET',
                signal: expect.any(AbortSignal),
            }
        );
    });

    test('pins and unpins without refetching, reorders the list, scrolls when enabled, and shows success', async () => {
        const olderApplication = {
            ...mockApplication,
            company_name: 'Zulu Systems',
            application_date: '2025-05-20T00:00:00Z',
        };
        const newerApplication = {
            ...mockApplication,
            job_id: 2,
            company_name: 'Alpha Labs',
            application_date: '2025-06-20T00:00:00Z',
        };
        mockApplicationCollection([olderApplication, newerApplication]);
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    application_enable_scroll: true,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/pin')) {
                const { isPinned } = JSON.parse(String(init?.body));
                return response({ job_id: 1, is_pinned: isPinned });
            }
            return init?.method === 'GET' ? response([olderApplication, newerApplication]) : response(undefined, 204);
        });
        const highlightSpy = vi.spyOn(highlightElement, 'scrollAndHighlight');

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            {
                initialPreferences: {
                    application_enable_scroll: true,
                    application_list_sort_order: 'application_date_desc',
                },
            }
        );

        await screen.findByRole('button', { name: 'Pin Zulu Systems application' });
        expectListCompanyOrder(['Alpha Labs', 'Zulu Systems']);

        await userEvent.click(screen.getByRole('button', { name: 'Pin Zulu Systems application' }));

        await waitFor(() => expectListCompanyOrder(['Zulu Systems', 'Alpha Labs']));
        expect(screen.getByRole('button', { name: 'Unpin Zulu Systems application' })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        expect(await screen.findByText('Job application pinned')).toBeInTheDocument();
        await waitFor(() =>
            expect(highlightSpy).toHaveBeenCalledWith(
                '1',
                expect.any(String),
                expect.any(Object),
                undefined,
                expect.any(Function)
            )
        );

        await userEvent.click(screen.getByRole('button', { name: 'Unpin Zulu Systems application' }));

        await waitFor(() => expectListCompanyOrder(['Alpha Labs', 'Zulu Systems']));
        expect(await screen.findByText('Job application unpinned')).toBeInTheDocument();
        await waitFor(() => expect(highlightSpy).toHaveBeenCalledTimes(2));
        expect(applicationListRequestCount()).toBe(1);
        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/job-applications/1/pin`,
            expect.objectContaining({
                body: JSON.stringify({ isPinned: true }),
                method: 'PATCH',
            })
        );
        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/job-applications/1/pin`,
            expect.objectContaining({
                body: JSON.stringify({ isPinned: false }),
                method: 'PATCH',
            })
        );
        highlightSpy.mockRestore();
    });

    test('disables only the pending pin and preserves its state when pinning fails', async () => {
        let resolvePinRequest: ((value: ReturnType<typeof response>) => void) | undefined;
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response(mockPreferences);
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/pin')) {
                return await new Promise((resolve) => {
                    resolvePinRequest = resolve;
                });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        const pinButton = await screen.findByRole('button', { name: 'Pin ABC Pte Ltd application' });
        void userEvent.click(pinButton);
        await waitFor(() => expect(pinButton).toBeDisabled());

        await act(async () => {
            resolvePinRequest?.(response({ message: 'Pin update unavailable.' }, 400));
        });

        expect(await screen.findByText('Pin update unavailable')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pin ABC Pte Ltd application' })).toBeEnabled();
        expect(applicationListRequestCount()).toBe(1);
    });

    test.each([{ viewMode: 'list' }, { viewMode: 'board' }] as const)(
        'does not auto scroll or trigger a status change when pinning in $viewMode view with auto-scroll disabled',
        async ({ viewMode }) => {
            fetch.mockImplementation(async (url: string, init?: RequestInit) => {
                if (url.endsWith('/user-preferences')) {
                    return response({
                        ...mockPreferences,
                        application_enable_scroll: false,
                        application_view_mode: viewMode,
                        ...(init?.body ? JSON.parse(String(init.body)) : {}),
                    });
                }
                if (url.endsWith('/job-interviews')) {
                    return response([]);
                }
                if (url.endsWith('/job-applications/1/pin')) {
                    return response({ job_id: 1, is_pinned: true });
                }
                return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
            });
            const highlightSpy = vi.spyOn(highlightElement, 'scrollAndHighlight');

            render(
                <MemoryRouter>
                    <ViewApplication />
                </MemoryRouter>,
                {
                    initialPreferences: {
                        application_enable_scroll: false,
                        application_view_mode: viewMode,
                    },
                }
            );

            await userEvent.click(await screen.findByRole('button', { name: 'Pin ABC Pte Ltd application' }));
            await screen.findByRole('button', { name: 'Unpin ABC Pte Ltd application' });
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 150));
            });

            expect(highlightSpy).not.toHaveBeenCalled();
            expect(statusUpdateRequestCount(1)).toBe(0);
            highlightSpy.mockRestore();
        }
    );

    test('centers and highlights a pinned application in Board view when auto-scroll is enabled', async () => {
        const boardScrollTo = vi.fn();
        const pageScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        const highlightSpy = vi.spyOn(highlightElement, 'scrollAndHighlight');
        HTMLElement.prototype.scrollTo = boardScrollTo;
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    application_enable_scroll: true,
                    application_view_mode: 'board',
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/pin')) {
                return response({ job_id: 1, is_pinned: true });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            {
                initialPreferences: {
                    application_enable_scroll: true,
                    application_view_mode: 'board',
                },
            }
        );

        await userEvent.click(await screen.findByRole('button', { name: 'Pin ABC Pte Ltd application' }));

        await waitFor(() => expect(boardScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 0 }));
        expect(pageScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 });
        expect(screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).toHaveClass(
            boardStyles.cardHighlighted
        );
        expect(highlightSpy).not.toHaveBeenCalled();
        expect(statusUpdateRequestCount(1)).toBe(0);
        highlightSpy.mockRestore();
    });

    test('undoes a persisted application follow-up without refetching and shows success', async () => {
        const sentApplication = {
            ...mockApplication,
            application_follow_up_sent_at: '2026-07-27T07:42:00.000Z',
        };
        mockApplicationCollection([sentApplication]);
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        const undo = await screen.findByRole('button', {
            name: 'Undo follow-up for Software Engineer at ABC Pte Ltd',
        });
        await userEvent.click(undo);

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1/follow-up`, {
                method: 'DELETE',
                signal: expect.any(AbortSignal),
            })
        );
        await waitFor(() => expect(screen.queryByRole('button', { name: /undo follow-up/i })).not.toBeInTheDocument());
        expect(await screen.findByText('Application follow-up undone')).toBeInTheDocument();
        expect(applicationListRequestCount()).toBe(1);
    });

    test('removes the application follow-up badge when status leaves Applied', async () => {
        mockApplicationCollection([
            {
                ...mockApplication,
                application_follow_up_sent_at: '2026-07-27T07:42:00.000Z',
            },
        ]);
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByRole('button', { name: 'Undo follow-up for Software Engineer at ABC Pte Ltd' });
        await userEvent.click(screen.getByRole('button', { name: /^Edit status for / }));
        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: /Application status for Software Engineer at ABC Pte Ltd/ }),
            'Interview'
        );
        await userEvent.click(screen.getByRole('button', { name: /^Save changes to status for / }));

        await waitFor(() => expect(screen.queryByRole('button', { name: /undo follow-up/i })).not.toBeInTheDocument());
        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/job-applications/1/status`,
            expect.objectContaining({
                body: JSON.stringify({ jobStatus: 'Interview' }),
                method: 'PATCH',
            })
        );
    });

    test('places the view toggle before the application controls', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);

        const listButton = screen.getByRole('button', { name: 'List' });
        const boardButton = screen.getByRole('button', { name: 'Board' });
        const filterButton = screen.getByRole('button', { name: 'Filter by' });
        const sortButton = screen.getByRole('button', { name: 'Sort by' });
        const displayButton = screen.getByRole('button', { name: 'Display options' });
        const moreButton = screen.getByRole('button', { name: 'More…' });

        expect(listButton.compareDocumentPosition(boardButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(boardButton.compareDocumentPosition(filterButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(filterButton.compareDocumentPosition(sortButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(sortButton.compareDocumentPosition(displayButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(displayButton.compareDocumentPosition(moreButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('shows the exact list and board sort options with their defaults', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));

        expect(getSortOptionLabels()).toEqual([
            'Job status',
            'Newest application',
            'Oldest application',
            'Company A–Z',
            'Company Z–A',
        ]);
        expect(screen.getByRole('radio', { name: 'Job status' })).toBeChecked();

        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        });
        await screen.findByRole('region', { name: 'Application board' });
        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));

        expect(getSortOptionLabels()).toEqual([
            'Newest application',
            'Oldest application',
            'Company A–Z',
            'Company Z–A',
        ]);
        expect(screen.queryByRole('radio', { name: 'Job status' })).not.toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Newest application' })).toBeChecked();
    });

    test('reorders the active application list for every sort option', async () => {
        mockApplicationCollection([
            {
                ...mockApplication,
                application_date: '2025-01-15T00:00:00Z',
                company_name: 'Delta Ltd',
                job_id: 1,
                job_status: 'Applied',
            },
            {
                ...mockApplication,
                application_date: '2025-04-15T00:00:00Z',
                company_name: 'Alpha Ltd',
                job_id: 2,
                job_status: 'Rejected',
            },
            {
                ...mockApplication,
                application_date: '2025-03-15T00:00:00Z',
                company_name: 'Charlie Ltd',
                job_id: 3,
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-02-15T00:00:00Z',
                company_name: 'Bravo Ltd',
                job_id: 4,
                job_status: 'Accepted',
            },
        ]);

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByRole('heading', { level: 2, name: '1. Bravo Ltd' });
        expectListCompanyOrder(['Bravo Ltd', 'Charlie Ltd', 'Delta Ltd', 'Alpha Ltd']);

        const selectSortOption = async (option: string, expectedCompanyOrder: string[]) => {
            const sortButton = screen.getByRole('button', { name: 'Sort by' });

            await waitFor(() => expect(sortButton).toBeEnabled());
            await userEvent.click(sortButton);

            await userEvent.click(await screen.findByRole('radio', { name: option }));

            await waitFor(() => expectListCompanyOrder(expectedCompanyOrder));
            await waitFor(() => expect(sortButton).toBeEnabled());
        };

        await selectSortOption('Newest application', ['Alpha Ltd', 'Charlie Ltd', 'Bravo Ltd', 'Delta Ltd']);
        await selectSortOption('Oldest application', ['Delta Ltd', 'Bravo Ltd', 'Charlie Ltd', 'Alpha Ltd']);
        await selectSortOption('Company A–Z', ['Alpha Ltd', 'Bravo Ltd', 'Charlie Ltd', 'Delta Ltd']);
        await selectSortOption('Company Z–A', ['Delta Ltd', 'Charlie Ltd', 'Bravo Ltd', 'Alpha Ltd']);
        await selectSortOption('Job status', ['Bravo Ltd', 'Charlie Ltd', 'Delta Ltd', 'Alpha Ltd']);
    });

    test('reorders active cards within board columns for every board sort option', async () => {
        mockApplicationCollection([
            {
                ...mockApplication,
                application_date: '2025-01-15T00:00:00Z',
                company_name: 'Delta Offer',
                job_id: 1,
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-02-15T00:00:00Z',
                company_name: 'Alpha Offer',
                job_id: 2,
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-03-15T00:00:00Z',
                company_name: 'Charlie Offer',
                job_id: 3,
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-04-15T00:00:00Z',
                company_name: 'Bravo Offer',
                job_id: 4,
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-01-15T00:00:00Z',
                company_name: 'Kilo Applied',
                job_id: 5,
                job_status: 'Applied',
            },
            {
                ...mockApplication,
                application_date: '2025-02-15T00:00:00Z',
                company_name: 'Hotel Applied',
                job_id: 6,
                job_status: 'Applied',
            },
            {
                ...mockApplication,
                application_date: '2025-03-15T00:00:00Z',
                company_name: 'Juliet Applied',
                job_id: 7,
                job_status: 'Applied',
            },
            {
                ...mockApplication,
                application_date: '2025-04-15T00:00:00Z',
                company_name: 'India Applied',
                job_id: 8,
                job_status: 'Applied',
            },
        ]);

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            {
                initialPreferences: {
                    application_view_mode: 'board',
                },
            }
        );

        const board = await screen.findByRole('region', { name: 'Application board' });
        expect(
            within(board)
                .getAllByRole('heading', { level: 2 })
                .map((heading) => heading.textContent)
        ).toEqual([
            'Accepted 0',
            'Offer 4',
            'Declined 0',
            'Interview 0',
            'Applied 4',
            'Withdrawn 0',
            'Ghosted 0',
            'Rejected 0',
        ]);

        const expectBoardCompanyOrder = (columnName: string, expectedCompanyOrder: string[]) => {
            expect(
                within(within(board).getByRole('region', { name: columnName }))
                    .getAllByRole('heading', { level: 3 })
                    .map((heading) => heading.textContent)
            ).toEqual(expectedCompanyOrder);
        };
        const expectBoardOrders = (offerOrder: string[], appliedOrder: string[]) => {
            expectBoardCompanyOrder('Offer 4', offerOrder);
            expectBoardCompanyOrder('Applied 4', appliedOrder);
        };
        const selectSortOption = async (option: string, offerOrder: string[], appliedOrder: string[]) => {
            const sortButton = screen.getByRole('button', { name: 'Sort by' });

            await waitFor(() => expect(sortButton).toBeEnabled());
            await userEvent.click(sortButton);

            await userEvent.click(await screen.findByRole('radio', { name: option }));

            await waitFor(() => expectBoardOrders(offerOrder, appliedOrder));
            await waitFor(() => expect(sortButton).toBeEnabled());
        };

        expectBoardOrders(
            ['Bravo Offer', 'Charlie Offer', 'Alpha Offer', 'Delta Offer'],
            ['India Applied', 'Juliet Applied', 'Hotel Applied', 'Kilo Applied']
        );
        await selectSortOption(
            'Oldest application',
            ['Delta Offer', 'Alpha Offer', 'Charlie Offer', 'Bravo Offer'],
            ['Kilo Applied', 'Hotel Applied', 'Juliet Applied', 'India Applied']
        );
        await selectSortOption(
            'Company A–Z',
            ['Alpha Offer', 'Bravo Offer', 'Charlie Offer', 'Delta Offer'],
            ['Hotel Applied', 'India Applied', 'Juliet Applied', 'Kilo Applied']
        );
        await selectSortOption(
            'Company Z–A',
            ['Delta Offer', 'Charlie Offer', 'Bravo Offer', 'Alpha Offer'],
            ['Kilo Applied', 'Juliet Applied', 'India Applied', 'Hotel Applied']
        );
        await selectSortOption(
            'Newest application',
            ['Bravo Offer', 'Charlie Offer', 'Alpha Offer', 'Delta Offer'],
            ['India Applied', 'Juliet Applied', 'Hotel Applied', 'Kilo Applied']
        );

        expect(
            within(board)
                .getAllByRole('heading', { level: 2 })
                .map((heading) => heading.textContent)
        ).toEqual([
            'Accepted 0',
            'Offer 4',
            'Declined 0',
            'Interview 0',
            'Applied 4',
            'Withdrawn 0',
            'Ghosted 0',
            'Rejected 0',
        ]);
    });

    test.each([
        [
            'list',
            { application_view_mode: 'list', application_list_sort_order: 'company_name_asc' },
            ['Alpha Applied', 'Beta Offer', 'Yankee Offer', 'Zulu Applied'],
        ],
        [
            'board',
            { application_view_mode: 'board', application_board_sort_order: 'company_name_desc' },
            ['Yankee Offer', 'Beta Offer', 'Zulu Applied', 'Alpha Applied'],
        ],
    ] as const)('exports active %s applications in their displayed order', async (_mode, initialPreferences, order) => {
        mockApplicationCollection([
            { ...mockApplication, company_name: 'Alpha Applied', job_id: 1, job_status: 'Applied' },
            { ...mockApplication, company_name: 'Zulu Applied', job_id: 2, job_status: 'Applied' },
            { ...mockApplication, company_name: 'Beta Offer', job_id: 3, job_status: 'Offer' },
            { ...mockApplication, company_name: 'Yankee Offer', job_id: 4, job_status: 'Offer' },
        ]);

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences }
        );

        await screen.findByRole('button', { name: 'Sort by' });
        expectCsvCompanyOrder(await getExportCsvText(), [...order]);
    });

    test('exports only the active applications returned for the saved status filter with the stable filename', async () => {
        mockApplicationCollection([{ ...mockApplication, company_name: 'Filtered Offer', job_status: 'Offer' }]);

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_job_statuses: ['Offer'] } }
        );

        await screen.findByRole('heading', { level: 2, name: '1. Filtered Offer' });
        const csv = await getExportCsvText();
        expect(csv).toContain('Filtered Offer');
        expect(csv).not.toContain('ABC Pte Ltd');
        expect(screen.getByRole('link', { name: 'Export filtered applications as CSV' })).toHaveAttribute(
            'download',
            'job_applications.csv'
        );
        expect(fetch.mock.calls.some(([url]) => String(url).includes('/job-applications?jobStatuses=Offer'))).toBe(
            true
        );
    });

    test('shows an error and rolls back the active list sort when saving fails', async () => {
        mockApplicationCollection([
            { ...mockApplication, job_id: 1, company_name: 'Alpha Applied', job_status: 'Applied' },
            { ...mockApplication, job_id: 2, company_name: 'Zulu Offer', job_status: 'Offer' },
        ]);
        const updatePreferences = vi.fn(async (): Promise<UserPreferences> => {
            throw new Error('Preference request failed');
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { updatePreferences }
        );

        await screen.findByRole('heading', { level: 2, name: '1. Zulu Offer' });
        expect(getListCompanyHeadings()).toEqual(['1. Zulu Offer', '2. Alpha Applied']);

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        await userEvent.click(screen.getByRole('radio', { name: 'Company A–Z' }));

        expect(
            await screen.findByText('Unable to save the application sorting preference. Please try again')
        ).toBeInTheDocument();
        expect(updatePreferences).toHaveBeenCalledWith({ application_list_sort_order: 'company_name_asc' });
        expect(getListCompanyHeadings()).toEqual(['1. Zulu Offer', '2. Alpha Applied']);

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        expect(screen.getByRole('radio', { name: 'Job status' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Company A–Z' })).not.toBeChecked();
    });

    test('switches to board view and groups applications by status', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (init?.method !== 'GET') {
                return response(undefined, 204);
            }
            return response([
                { ...mockApplication, is_pinned: true },
                { ...mockApplication, job_id: 2, company_name: 'Offer Pte Ltd', job_status: 'Offer' },
            ]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        const board = screen.getByRole('region', { name: 'Application board' });
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
        expect(
            within(board)
                .getAllByRole('heading', { level: 2 })
                .map((heading) => heading.textContent)
        ).toEqual([
            'Accepted 0',
            'Offer 1',
            'Declined 0',
            'Interview 0',
            'Applied 1',
            'Withdrawn 0',
            'Ghosted 0',
            'Rejected 0',
        ]);
        expect(within(board).getByRole('heading', { name: 'Applied 1' })).toBeInTheDocument();
        expect(within(board).getByRole('heading', { name: 'Offer 1' })).toBeInTheDocument();
        const applicationCard = within(board).getByRole('article', { name: /ABC Pte Ltd Software Engineer/i });
        expect(applicationCard).toBeInTheDocument();
        expect(within(applicationCard).getByText('20 Jun 2025')).toBeInTheDocument();
        expect(within(applicationCard).queryByText('Remote')).not.toBeInTheDocument();
        expect(within(applicationCard).queryByText('Applied 20 Jun 2025')).not.toBeInTheDocument();
        expect(within(applicationCard).queryByText(/\d+ days \d+ hours \d+ minutes/)).not.toBeInTheDocument();
        const pinButton = within(applicationCard).getByRole('button', {
            name: 'Unpin ABC Pte Ltd application',
        });
        const statusBadge = within(applicationCard).getByText('Applied', { selector: 'span' });
        const dragButton = within(applicationCard).getByRole('button', {
            name: 'Drag ABC Pte Ltd Software Engineer application',
        });
        expect(pinButton).toHaveAttribute('aria-pressed', 'true');
        expect(pinButton.compareDocumentPosition(statusBadge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(statusBadge.compareDocumentPosition(dragButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(within(board).getByRole('article', { name: /Offer Pte Ltd Software Engineer/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Application view and management controls' }).className).toContain(
            'applicationWithDisplay'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        const autoScrollToggle = screen.getByRole('switch', { name: 'Auto-scroll and highlight updates' });
        expect(autoScrollToggle).toHaveAttribute('aria-checked', 'false');
        expect(screen.queryByRole('switch', { name: 'Show notes' })).not.toBeInTheDocument();
        expect(screen.queryByRole('switch', { name: 'Show archive' })).not.toBeInTheDocument();
        await userEvent.click(autoScrollToggle);
        await waitFor(() => expect(autoScrollToggle).toHaveAttribute('aria-checked', 'true'));
    });

    test('board filters hide excluded columns without resetting the selected view', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications?jobStatuses=Offer')) {
                return response([{ ...mockApplication, job_status: 'Offer' }]);
            }
            if (init?.method !== 'GET') {
                return response(undefined, 204);
            }
            return response([mockApplication]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true')
        );
        await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading board' })).not.toBeInTheDocument());
        expect(screen.getByRole('heading', { name: 'Offer 1' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Applied 0' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'List' }));
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Offer' })).toBeChecked();
    });

    test('uses user preferences for the selected application view', async () => {
        const { unmount } = render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_view_mode: 'board' } }
        );

        await screen.findByRole('region', { name: 'Application board' });
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');

        unmount();
        fetch.mockClear();

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByRole('region', { name: 'Application board' })).not.toBeInTheDocument();
    });

    test('updates status from the board fallback with horizontal feedback and shows the update in list view', async () => {
        const scrollIntoView = vi.fn();
        const scrollTo = vi.fn();
        const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        HTMLElement.prototype.scrollIntoView = scrollIntoView;
        HTMLElement.prototype.scrollTo = scrollTo;

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_enable_scroll: true } }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: 'Move ABC Pte Ltd to status' }),
            'Interview'
        );

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobStatus: 'Interview' }),
                signal: expect.any(AbortSignal),
            })
        );
        expect(screen.getByRole('heading', { name: 'Applied 0' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Interview 1' })).toBeInTheDocument();
        await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 0 }));
        expect(windowScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 });
        expect(screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).toHaveClass(
            boardStyles.cardHighlighted
        );
        expect(scrollIntoView).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'List' }));
        expect(screen.getByText(/^Job status: Interview$/)).toBeInTheDocument();
    });

    test('dragging a board card updates status through the existing endpoint with horizontal feedback', async () => {
        const scrollIntoView = vi.fn();
        const scrollTo = vi.fn();
        const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        HTMLElement.prototype.scrollIntoView = scrollIntoView;
        HTMLElement.prototype.scrollTo = scrollTo;

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_enable_scroll: true } }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        fireEvent.click(screen.getByTestId('mock-drag-application-1-to-interview'));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobStatus: 'Interview' }),
                signal: expect.any(AbortSignal),
            })
        );
        expect(screen.getByRole('heading', { name: 'Interview 1' })).toBeInTheDocument();
        await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 0 }));
        expect(windowScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 });
        expect(screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).toHaveClass(
            boardStyles.cardHighlighted
        );
        expect(scrollIntoView).not.toHaveBeenCalled();
    });

    test('does not reveal a board status change when auto-scroll and highlight is disabled', async () => {
        const scrollTo = vi.fn();
        const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        HTMLElement.prototype.scrollTo = scrollTo;

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: 'Move ABC Pte Ltd to status' }),
            'Interview'
        );

        await screen.findByText('Job application status updated');
        expect(scrollTo).not.toHaveBeenCalled();
        expect(windowScrollTo).not.toHaveBeenCalled();
        expect(screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).not.toHaveClass(
            boardStyles.cardHighlighted
        );
    });

    test('does not queue a board reveal after leaving Board before the status request succeeds', async () => {
        let resolveStatusUpdate: ((value: ReturnType<typeof response>) => void) | undefined;
        const pendingStatusUpdate = new Promise<ReturnType<typeof response>>((resolve) => {
            resolveStatusUpdate = resolve;
        });
        const scrollTo = vi.fn();
        const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        HTMLElement.prototype.scrollTo = scrollTo;

        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return await pendingStatusUpdate;
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_enable_scroll: true } }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: 'Move ABC Pte Ltd to status' }),
            'Interview'
        );
        await waitFor(() => expect(statusUpdateRequestCount(1)).toBe(1));

        await userEvent.click(screen.getByRole('button', { name: 'List' }));
        expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');

        await act(async () => resolveStatusUpdate?.(response(undefined, 204)));
        expect(await screen.findByText('Job application status updated')).toBeInTheDocument();
        expect(scrollTo).not.toHaveBeenCalled();
        expect(windowScrollTo).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        await screen.findByRole('region', { name: 'Application board' });
        expect(scrollTo).not.toHaveBeenCalled();
        expect(windowScrollTo).not.toHaveBeenCalled();
        expect(screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).not.toHaveClass(
            boardStyles.cardHighlighted
        );
    });

    test('dropping a board card into its current status does not call the update endpoint', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        const statusUpdatesBeforeDrop = statusUpdateRequestCount(1);
        fireEvent.click(screen.getByTestId('mock-drag-application-1-to-applied'));

        expect(statusUpdateRequestCount(1)).toBe(statusUpdatesBeforeDrop);
    });

    test('disables moving board applications with interviews back to applied', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([mockInterview]);
            }
            if (init?.method !== 'GET') {
                return response(undefined, 204);
            }
            return response([{ ...mockApplication, job_status: 'Interview' }]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        const board = screen.getByRole('region', { name: 'Application board' });
        const appliedColumn = within(board).getByRole('region', { name: 'Applied 0' });
        const statusSelect = screen.getByRole('combobox', { name: 'Move ABC Pte Ltd to status' });

        expect(within(statusSelect).getByRole('option', { name: 'Applied' })).toBeDisabled();
        expect(appliedColumn).not.toHaveAttribute('aria-disabled');

        fireEvent.click(screen.getByTestId('mock-start-drag-application-1'));

        expect(appliedColumn).toHaveAttribute('aria-disabled', 'true');

        const statusUpdatesBeforeDrop = statusUpdateRequestCount(1);
        fireEvent.click(screen.getByTestId('mock-drag-application-1-to-applied'));

        expect(statusUpdateRequestCount(1)).toBe(statusUpdatesBeforeDrop);
        expect(appliedColumn).not.toHaveAttribute('aria-disabled');
        expect(screen.getByRole('heading', { name: 'Interview 1' })).toBeInTheDocument();
    });

    test('prevents duplicate board status update requests for the same card', async () => {
        let resolveStatusUpdate: ((value: ReturnType<typeof response>) => void) | undefined;
        const pendingStatusUpdate = new Promise<ReturnType<typeof response>>((resolve) => {
            resolveStatusUpdate = resolve;
        });

        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return await pendingStatusUpdate;
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        fireEvent.click(screen.getByTestId('mock-drag-application-1-to-interview'));
        expect(screen.getByRole('button', { name: 'Drag ABC Pte Ltd Software Engineer application' })).toBeDisabled();
        fireEvent.click(screen.getByTestId('mock-drag-application-1-to-interview'));

        expect(statusUpdateRequestCount(1)).toBe(1);
        resolveStatusUpdate?.(response(undefined, 204));
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Interview 1' })).toBeInTheDocument());
    });

    test('rolls back an optimistic board status update when the API fails', async () => {
        const scrollTo = vi.fn();
        const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        HTMLElement.prototype.scrollTo = scrollTo;
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return response({ message: 'Status update is temporarily unavailable.' }, 400);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_enable_scroll: true } }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: 'Move ABC Pte Ltd to status' }),
            'Interview'
        );

        expect(await screen.findByText('Status update is temporarily unavailable')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Applied 1' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Interview 0' })).toBeInTheDocument();
        expect(scrollTo).not.toHaveBeenCalled();
        expect(windowScrollTo).not.toHaveBeenCalled();
    });

    test('locks conflicting card mutations while a board status update is pending', async () => {
        let resolveStatusUpdate: (value: ReturnType<typeof response>) => void = () => undefined;
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return new Promise((resolve) => {
                    resolveStatusUpdate = resolve;
                });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_view_mode: 'board' } }
        );

        await userEvent.selectOptions(
            await screen.findByRole('combobox', { name: 'Move ABC Pte Ltd to status' }),
            'Interview'
        );
        await waitFor(() => expect(statusUpdateRequestCount(1)).toBe(1));

        const card = screen.getByRole('article', { name: 'ABC Pte Ltd Software Engineer' });
        await userEvent.click(within(card).getByText('Actions'));

        expect(within(card).getByRole('button', { name: 'Pin ABC Pte Ltd application' })).toBeDisabled();
        expect(
            within(card).getByRole('button', { name: 'Archive application for Software Engineer at ABC Pte Ltd' })
        ).toBeDisabled();
        expect(
            within(card).getByRole('button', { name: 'Delete application for Software Engineer at ABC Pte Ltd' })
        ).toBeDisabled();
        expect(within(card).getByRole('textbox', { name: 'Edit notes' })).toBeDisabled();

        await act(async () => resolveStatusUpdate(response(undefined, 204)));
        await waitFor(() =>
            expect(within(card).getByRole('button', { name: 'Pin ABC Pte Ltd application' })).toBeEnabled()
        );
    });

    test('a failed board status update preserves newer application fields from a filter response', async () => {
        let resolveStatusUpdate: (value: ReturnType<typeof response>) => void = () => undefined;
        let applicationRequestCount = 0;
        const newerApplication = {
            ...mockApplication,
            is_pinned: true,
            job_status: 'Interview',
            notes: 'Newer server notes',
        };

        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return new Promise((resolve) => {
                    resolveStatusUpdate = resolve;
                });
            }
            if (url.includes('/job-applications?') && init?.method === 'GET') {
                applicationRequestCount += 1;
                return response(applicationRequestCount === 1 ? [mockApplication] : [newerApplication]);
            }
            return response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_view_mode: 'board' } }
        );

        await userEvent.selectOptions(
            await screen.findByRole('combobox', { name: 'Move ABC Pte Ltd to status' }),
            'Interview'
        );
        await waitFor(() => expect(statusUpdateRequestCount(1)).toBe(1));
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Accepted' }));
        await waitFor(() => expect(applicationRequestCount).toBe(2));

        await act(async () =>
            resolveStatusUpdate(response({ message: 'Status update is temporarily unavailable.' }, 400))
        );

        expect(await screen.findByText('Status update is temporarily unavailable')).toBeInTheDocument();
        const card = screen.getByRole('article', { name: 'ABC Pte Ltd Software Engineer' });
        expect(within(card).getByRole('button', { name: 'Unpin ABC Pte Ltd application' })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await userEvent.click(within(card).getByText('Actions'));
        expect(within(card).getByRole('textbox', { name: 'Edit notes' })).toHaveValue('Newer server notes');
    });

    test('a failed board status update does not restore an application removed by a newer response', async () => {
        let resolveStatusUpdate: (value: ReturnType<typeof response>) => void = () => undefined;
        let applicationRequestCount = 0;

        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return new Promise((resolve) => {
                    resolveStatusUpdate = resolve;
                });
            }
            if (url.includes('/job-applications?') && init?.method === 'GET') {
                applicationRequestCount += 1;
                return response(applicationRequestCount === 1 ? [mockApplication] : []);
            }
            return response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_view_mode: 'board' } }
        );

        await userEvent.selectOptions(
            await screen.findByRole('combobox', { name: 'Move ABC Pte Ltd to status' }),
            'Interview'
        );
        await waitFor(() => expect(statusUpdateRequestCount(1)).toBe(1));
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Accepted' }));
        expect(await screen.findByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument();

        await act(async () =>
            resolveStatusUpdate(response({ message: 'Status update is temporarily unavailable.' }, 400))
        );

        expect(await screen.findByText('Status update is temporarily unavailable')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument();
        expect(screen.queryByRole('article', { name: 'ABC Pte Ltd Software Engineer' })).not.toBeInTheDocument();
    });

    test('keeps a board status rollback within the current status filter', async () => {
        let resolveStatusUpdate: ((value: ReturnType<typeof response>) => void) | undefined;
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return new Promise((resolve) => {
                    resolveStatusUpdate = resolve;
                });
            }
            if (url.includes('/job-applications?jobStatuses=Interview')) {
                return response([]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            {
                initialPreferences: {
                    application_job_statuses: ['Applied', 'Interview'],
                    application_view_mode: 'board',
                },
            }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.selectOptions(
            screen.getByRole('combobox', { name: 'Move ABC Pte Ltd to status' }),
            'Interview'
        );
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Interview 1' })).toBeInTheDocument());

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Applied' }));
        expect(await screen.findByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument();

        await act(async () => {
            if (!resolveStatusUpdate) {
                throw new Error('Expected a pending board status update.');
            }
            resolveStatusUpdate(response({ message: 'Status update is temporarily unavailable.' }, 400));
        });

        expect(await screen.findByText('Status update is temporarily unavailable')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
    });

    test('keeps board actions available without showing full notes directly on the card', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        const card = screen.getByRole('article', { name: 'ABC Pte Ltd Software Engineer' });
        expect(
            within(card).getByRole('button', { name: 'Drag ABC Pte Ltd Software Engineer application' })
        ).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Add your notes here')).not.toBeVisible();
        const actions = within(card).getByText('Actions');
        expect(actions).toHaveAccessibleName('Actions for Software Engineer at ABC Pte Ltd');
        await userEvent.click(actions);

        expect(
            screen.getByRole('link', { name: 'View job posting for Software Engineer at ABC Pte Ltd' })
        ).toBeInTheDocument();
        const notesField = screen.getByPlaceholderText('Add your notes here');
        expect(notesField).toBeVisible();
        expect(notesField).toHaveAttribute('maxlength', '3000');
        expect(within(card).queryByRole('status')).not.toBeInTheDocument();

        fireEvent.change(notesField, { target: { value: 'Board note' } });
        expect(
            notesField.compareDocumentPosition(within(card).getByRole('status')) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Archive application for Software Engineer at ABC Pte Ltd' })
        ).toHaveTextContent('Archive');
        expect(
            screen.getByRole('button', { name: 'Delete application for Software Engineer at ABC Pte Ltd' })
        ).toHaveTextContent('Delete');
    });

    test('fetches applications from the server when the status filter changes', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));

        const callsBeforeTogglingShowAll = fetch.mock.calls.length;
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        expect(fetch).toHaveBeenCalledTimes(callsBeforeTogglingShowAll);

        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        expect(fetch).toHaveBeenCalledTimes(callsBeforeTogglingShowAll);

        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));

        const callsBeforeSelectingOffer = fetch.mock.calls.length;
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications?jobStatuses=Offer`, {
                method: 'GET',
                signal: expect.any(AbortSignal),
            })
        );
        expect(fetch.mock.calls.length).toBeGreaterThan(callsBeforeSelectingOffer);

        await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Accepted' })).not.toBeDisabled());
        await userEvent.click(screen.getByRole('checkbox', { name: 'Accepted' }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(
                `${import.meta.env.VITE_API_URL}/job-applications?jobStatuses=Offer&jobStatuses=Accepted`,
                {
                    method: 'GET',
                    signal: expect.any(AbortSignal),
                }
            )
        );
        await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Accepted' })).toBeChecked());

        const offerOnlyUrl = `${import.meta.env.VITE_API_URL}/job-applications?jobStatuses=Offer`;
        const offerOnlyRequestsBeforeRemovingAccepted = applicationRequestCount(offerOnlyUrl);
        await userEvent.click(screen.getByRole('checkbox', { name: 'Accepted' }));
        await waitFor(() =>
            expect(applicationRequestCount(offerOnlyUrl)).toBeGreaterThan(offerOnlyRequestsBeforeRemovingAccepted)
        );
        await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Accepted' })).not.toBeChecked());

        await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Offer' })).toBeChecked());
        const allStatusesUrl = `${
            import.meta.env.VITE_API_URL
        }/job-applications?jobStatuses=Accepted&jobStatuses=Applied&jobStatuses=Declined&jobStatuses=Ghosted&jobStatuses=Interview&jobStatuses=Offer&jobStatuses=Rejected&jobStatuses=Withdrawn`;
        const allStatusRequestsBeforeClearingFinalStatus = applicationRequestCount(allStatusesUrl);
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));

        await waitFor(() =>
            expect(applicationRequestCount(allStatusesUrl)).toBeGreaterThan(allStatusRequestsBeforeClearingFinalStatus)
        );
        expect(screen.getByRole('checkbox', { name: 'Show all' })).toBeChecked();
    });

    test('uses a valid dashboard status for the first request, saves it once, and preserves board preferences', async () => {
        const initialPreferences: UserPreferences = {
            ...mockPreferences,
            application_view_mode: 'board',
            application_list_sort_order: 'company_name_desc',
            application_board_sort_order: 'application_date_asc',
        };
        const updatePreferences = vi.fn(async (updatedPreferences: UpdateUserPreferencesRequest) => ({
            ...initialPreferences,
            ...updatedPreferences,
        }));
        const offerUrl = `${import.meta.env.VITE_API_URL}/job-applications?jobStatuses=Offer`;

        render(
            <MemoryRouter
                initialEntries={[{ pathname: '/application/view', state: { applicationJobStatus: 'Offer' } }]}
            >
                <ViewApplication />
                <LocationStateProbe />
            </MemoryRouter>,
            { initialPreferences, updatePreferences }
        );

        await waitFor(() => expect(applicationRequestCount(offerUrl)).toBe(1));
        expect(updatePreferences).toHaveBeenCalledTimes(1);
        expect(updatePreferences).toHaveBeenCalledWith({ application_job_statuses: ['Offer'] });
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() => expect(screen.getByTestId('location-state')).toHaveTextContent('null'));
        expect(applicationListRequestCount()).toBe(1);
    });

    test('keeps Board view, restores the missing filter and reveals the exact navigation target', async () => {
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        const boardScrollTo = vi.fn();
        const pageScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        HTMLElement.prototype.scrollTo = boardScrollTo;
        const initialPreferences: UserPreferences = {
            ...mockPreferences,
            application_view_mode: 'board',
            application_job_statuses: ['Applied'],
        };
        const updatePreferences = vi.fn(async (updatedPreferences: UpdateUserPreferencesRequest) => ({
            ...initialPreferences,
            ...updatedPreferences,
        }));

        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: '/application/view',
                        state: { applicationJobStatus: 'Offer', applicationTargetId: 1 },
                    },
                ]}
            >
                <ViewApplication />
                <LocationStateProbe />
            </MemoryRouter>,
            { initialPreferences, updatePreferences }
        );

        await waitFor(() =>
            expect(updatePreferences).toHaveBeenCalledWith({
                application_job_statuses: ['Applied', 'Offer'],
            })
        );
        await waitFor(() => expect(boardScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 0 }));
        expect(pageScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 });
        expect(screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).toHaveClass(
            boardStyles.cardHighlighted
        );
        expect(scrollAndHighlight).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() => expect(screen.getByTestId('location-state')).toHaveTextContent('null'));
        scrollAndHighlight.mockRestore();
    });

    test('does not resave an already-selected dashboard status', async () => {
        const updatePreferences = vi.fn();
        const offerUrl = `${import.meta.env.VITE_API_URL}/job-applications?jobStatuses=Offer`;

        render(
            <MemoryRouter
                initialEntries={[{ pathname: '/application/view', state: { applicationJobStatus: 'Offer' } }]}
            >
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_job_statuses: ['Offer'] }, updatePreferences }
        );

        await waitFor(() => expect(applicationRequestCount(offerUrl)).toBe(1));
        expect(updatePreferences).not.toHaveBeenCalled();
    });

    test('ignores an invalid dashboard status and uses the saved filter', async () => {
        const updatePreferences = vi.fn();
        const appliedUrl = `${import.meta.env.VITE_API_URL}/job-applications?jobStatuses=Applied`;

        render(
            <MemoryRouter
                initialEntries={[{ pathname: '/application/view', state: { applicationJobStatus: 'Unknown' } }]}
            >
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_job_statuses: ['Applied'] }, updatePreferences }
        );

        await waitFor(() => expect(applicationRequestCount(appliedUrl)).toBe(1));
        expect(updatePreferences).not.toHaveBeenCalled();
    });

    test('shows the standard filtering toast when the dashboard preference update fails', async () => {
        const updatePreferences = vi.fn().mockRejectedValue(new Error('save failed'));

        render(
            <MemoryRouter
                initialEntries={[{ pathname: '/application/view', state: { applicationJobStatus: 'Offer' } }]}
            >
                <ViewApplication />
            </MemoryRouter>,
            { updatePreferences }
        );

        expect(await screen.findByText('Unable to filter job applications. Please try again')).toBeInTheDocument();
    });

    test('does not resave List mode or an already-selected status before highlighting a navigation target', async () => {
        const updatePreferences = vi.fn();
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');

        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: '/application/view',
                        state: { applicationJobStatus: 'Applied', applicationTargetId: 1 },
                    },
                ]}
            >
                <ViewApplication />
            </MemoryRouter>,
            {
                initialPreferences: { application_job_statuses: ['Applied'], application_view_mode: 'list' },
                updatePreferences,
            }
        );

        await waitFor(() =>
            expect(scrollAndHighlight).toHaveBeenCalledWith(
                '1',
                expect.any(String),
                expect.anything(),
                undefined,
                expect.any(Function)
            )
        );
        expect(updatePreferences).not.toHaveBeenCalled();
        scrollAndHighlight.mockRestore();
    });

    test('keeps filter checkboxes enabled while applications are loading', async () => {
        let resolveFilterRequest: ((value: ReturnType<typeof response>) => void) | undefined;
        const pendingFilterRequest = new Promise<ReturnType<typeof response>>((resolve) => {
            resolveFilterRequest = resolve;
        });

        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications?jobStatuses=Offer')) {
                return await pendingFilterRequest;
            }
            return response([mockApplication]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));

        expect(screen.getByRole('checkbox', { name: 'Accepted' })).not.toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'Offer' })).not.toBeDisabled();
        expect(screen.getAllByRole('status', { name: 'Loading results' })).toHaveLength(2);
        expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('progressbar', { name: 'Loading' })).not.toBeInTheDocument();

        resolveFilterRequest?.(response([mockApplication]));

        await waitFor(() => expect(screen.queryAllByRole('status', { name: 'Loading results' })).toHaveLength(0));
        expect(screen.getByText(/ABC Pte Ltd/i)).toBeInTheDocument();
    });

    test('ignores an older filter response after a newer selection has finished', async () => {
        let resolveOlderFilter: (value: ReturnType<typeof response>) => void = () => undefined;
        const olderApplication = { ...mockApplication, company_name: 'Older result' };
        const latestApplication = { ...mockApplication, company_name: 'Latest result' };
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications?jobStatuses=Offer')) {
                return new Promise((resolve) => {
                    resolveOlderFilter = resolve;
                });
            }
            if (url.endsWith('/job-applications?jobStatuses=Offer&jobStatuses=Accepted')) {
                return response([latestApplication]);
            }
            return response([mockApplication]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Accepted' }));

        expect(await screen.findByRole('heading', { level: 2, name: '1. Latest result' })).toBeInTheDocument();

        await act(async () => resolveOlderFilter(response([olderApplication])));

        await waitFor(() =>
            expect(screen.queryByRole('heading', { level: 2, name: '1. Older result' })).not.toBeInTheDocument()
        );
        expect(screen.getByRole('heading', { level: 2, name: '1. Latest result' })).toBeInTheDocument();
    });

    test('refetches a filter that started before an application pin committed', async () => {
        let resolvePin: (value: ReturnType<typeof response>) => void = () => undefined;
        let resolveStaleFilter: (value: ReturnType<typeof response>) => void = () => undefined;
        let offerFilterRequestCount = 0;

        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/pin')) {
                return new Promise((resolve) => {
                    resolvePin = resolve;
                });
            }
            if (url.endsWith('/job-applications?jobStatuses=Offer')) {
                offerFilterRequestCount += 1;
                if (offerFilterRequestCount === 1) {
                    return new Promise((resolve) => {
                        resolveStaleFilter = resolve;
                    });
                }
                return response([{ ...mockApplication, is_pinned: true }]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await userEvent.click(await screen.findByRole('button', { name: 'Pin ABC Pte Ltd application' }));
        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(
                `${import.meta.env.VITE_API_URL}/job-applications/1/pin`,
                expect.objectContaining({ method: 'PATCH' })
            )
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));
        await waitFor(() => expect(offerFilterRequestCount).toBe(1));

        await act(async () => resolvePin(response({ job_id: 1, is_pinned: true })));
        await act(async () => resolveStaleFilter(response([mockApplication])));

        await waitFor(() => expect(offerFilterRequestCount).toBe(2));
        expect(await screen.findByRole('button', { name: 'Unpin ABC Pte Ltd application' })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
    });

    test('restores the newest persisted filter result when a later filter request fails', async () => {
        let resolveOlderPreference: (preferences: UserPreferences) => void = () => undefined;
        let resolveLatestFilter: (value: ReturnType<typeof response>) => void = () => undefined;
        const olderApplication = { ...mockApplication, company_name: 'Persisted result' };
        const updatePreferences = vi.fn(
            () =>
                new Promise<UserPreferences>((resolve) => {
                    resolveOlderPreference = resolve;
                })
        );

        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications?jobStatuses=Offer')) {
                return response([olderApplication]);
            }
            if (url.endsWith('/job-applications?jobStatuses=Offer&jobStatuses=Accepted')) {
                return new Promise((resolve) => {
                    resolveLatestFilter = resolve;
                });
            }
            return response([mockApplication]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { updatePreferences }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));
        await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ application_job_statuses: ['Offer'] }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Accepted' }));

        await act(async () =>
            resolveOlderPreference({
                ...mockPreferences,
                application_job_statuses: ['Offer'],
            })
        );
        await act(async () => resolveLatestFilter(response({ message: 'Unable to filter.' }, 400)));

        expect(await screen.findByRole('heading', { level: 2, name: '1. Persisted result' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Offer' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Accepted' })).not.toBeChecked();
    });

    test('shows application controls above the skeleton during the initial fetch', () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }

            return await new Promise<ReturnType<typeof response>>(() => undefined);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        const filterButton = screen.getByRole('button', { name: 'Filter by' });
        const [firstSkeleton] = screen.getAllByRole('status', { name: 'Loading results' });

        expect(filterButton.compareDocumentPosition(firstSkeleton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(filterButton).toBeDisabled();
        expect(screen.queryByText(/no job applications match/i)).not.toBeInTheDocument();
    });

    test('shows the board skeleton during the initial fetch in board view', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }

            return await new Promise<ReturnType<typeof response>>(() => undefined);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_view_mode: 'board' } }
        );

        expect(await screen.findByRole('status', { name: 'Loading board' })).toBeInTheDocument();
        expect(screen.getAllByTestId('skeleton-board-column')).toHaveLength(4);
        expect(screen.queryAllByRole('status', { name: 'Loading results' })).toHaveLength(0);
    });

    test('restores the saved filter and shows the backend message when filtering fails', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications?jobStatuses=Offer')) {
                return response({ message: 'Job application filtering is temporarily unavailable.' }, 400);
            }
            return response([mockApplication]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show all' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));

        expect(await screen.findByText('Job application filtering is temporarily unavailable')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Show all' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Offer' })).toBeChecked();
    });

    test('opens the status editor locally without calling the update endpoint', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        const statusUpdatesBeforeEditing = statusUpdateRequestCount(1);

        await userEvent.click(screen.getByRole('button', { name: /edit status/i }));

        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /Application status for/ })).toBeInTheDocument();
        expect(statusUpdateRequestCount(1)).toBe(statusUpdatesBeforeEditing);

        await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

        expect(screen.getByRole('button', { name: /edit status/i })).toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: /Application status for/ })).not.toBeInTheDocument();
        expect(statusUpdateRequestCount(1)).toBe(statusUpdatesBeforeEditing);
    });

    test('disables the list status editor while an update is pending', async () => {
        let resolveStatusUpdate: (value: ReturnType<typeof response>) => void = () => undefined;
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response(mockPreferences);
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return new Promise((resolve) => {
                    resolveStatusUpdate = resolve;
                });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: /edit status/i }));
        await userEvent.selectOptions(screen.getByRole('combobox', { name: /Application status for/ }), 'Interview');
        await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

        expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
        expect(screen.getByRole('combobox', { name: /Application status for/ })).toBeDisabled();
        expect(statusUpdateRequestCount(1)).toBe(1);

        await act(async () => resolveStatusUpdate(response(undefined, 204)));

        await waitFor(() => expect(screen.getByRole('button', { name: /edit status/i })).toBeInTheDocument());
        expect(statusUpdateRequestCount(1)).toBe(1);
    });

    test('keeps the local status editor open and shows the backend message when saving fails', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/status') && init?.method === 'PATCH') {
                return response({ message: 'Status update is temporarily unavailable.' }, 400);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: /edit status/i }));
        await userEvent.selectOptions(screen.getByRole('combobox', { name: /Application status for/ }), 'Interview');
        await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

        expect(await screen.findByText('Status update is temporarily unavailable')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /Application status for/ })).toHaveValue('Interview');
        expect(screen.getByText(/^Job status: Applied$/)).toBeInTheDocument();
    });

    test.each([
        { shouldScroll: true, sortOrder: 'job_status' },
        { shouldScroll: false, sortOrder: 'company_name_asc' },
    ] as const)(
        'auto scroll after a status change is $shouldScroll when list sorting is $sortOrder',
        async ({ shouldScroll, sortOrder }) => {
            const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
            render(
                <MemoryRouter>
                    <ViewApplication />
                </MemoryRouter>,
                {
                    initialPreferences: {
                        application_enable_scroll: true,
                        application_list_sort_order: sortOrder,
                    },
                }
            );

            await screen.findByText(/ABC Pte Ltd/i);
            await userEvent.click(screen.getByRole('button', { name: /edit status/i }));
            await userEvent.selectOptions(
                await screen.findByRole('combobox', { name: /Application status for/ }),
                'Interview'
            );
            await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

            await waitFor(() => expect(screen.getByText(/^Job status: Interview$/)).toBeInTheDocument());
            if (shouldScroll) {
                await waitFor(() => expect(scrollAndHighlight).toHaveBeenCalledOnce());
            } else {
                await act(async () => {
                    await new Promise((resolve) => setTimeout(resolve, 150));
                });
                expect(scrollAndHighlight).not.toHaveBeenCalled();
            }
            scrollAndHighlight.mockRestore();
        }
    );

    test('cancels a pending status auto-scroll when auto-scroll is disabled before the update completes', async () => {
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        const resolveStatusUpdate = renderPendingApplicationStatusUpdate({
            application_enable_scroll: true,
            application_list_sort_order: 'job_status',
        });
        await beginPendingListStatusUpdate();

        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        const autoScrollToggle = screen.getByRole('switch', { name: 'Auto-scroll and highlight updates' });
        await userEvent.click(autoScrollToggle);
        await waitFor(() => expect(autoScrollToggle).toHaveAttribute('aria-checked', 'false'));

        await act(async () => resolveStatusUpdate());
        await waitFor(() => expect(screen.getByText(/^Job status: Interview$/)).toBeInTheDocument());
        await waitForStatusAutoScrollDelay();

        expect(scrollAndHighlight).not.toHaveBeenCalled();
        scrollAndHighlight.mockRestore();
    });

    test('cancels a pending status auto-scroll when list sorting changes before the update completes', async () => {
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        const resolveStatusUpdate = renderPendingApplicationStatusUpdate({
            application_enable_scroll: true,
            application_list_sort_order: 'job_status',
        });
        await beginPendingListStatusUpdate();

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        await userEvent.click(screen.getByRole('radio', { name: /Company A/ }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Sort by' })).toBeEnabled());

        await act(async () => resolveStatusUpdate());
        await waitFor(() => expect(screen.getByText(/^Job status: Interview$/)).toBeInTheDocument());
        await waitForStatusAutoScrollDelay();

        expect(scrollAndHighlight).not.toHaveBeenCalled();
        scrollAndHighlight.mockRestore();
    });

    test('applies the current status filter when a pending status update completes', async () => {
        const resolveStatusUpdate = renderPendingApplicationStatusUpdate({
            application_job_statuses: ['Applied', 'Interview'],
        });
        await beginPendingListStatusUpdate();

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Interview' }));
        await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Interview' })).not.toBeChecked());

        await act(async () => resolveStatusUpdate());

        await waitFor(() => expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument());
    });

    test('cancels a pending status auto-scroll when the current filter excludes the new status', async () => {
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        const resolveStatusUpdate = renderPendingApplicationStatusUpdate({
            application_enable_scroll: true,
            application_job_statuses: ['Applied', 'Interview'],
            application_list_sort_order: 'job_status',
        });
        await beginPendingListStatusUpdate();

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Interview' }));
        await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Interview' })).not.toBeChecked());

        await act(async () => resolveStatusUpdate());
        await waitForStatusAutoScrollDelay();

        expect(scrollAndHighlight).not.toHaveBeenCalled();
        scrollAndHighlight.mockRestore();
    });

    test('does not scroll when a status change removes the application from the selected filter', async () => {
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            {
                initialPreferences: {
                    application_enable_scroll: true,
                    application_job_statuses: ['Applied'],
                },
            }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: /edit status/i }));
        await userEvent.selectOptions(await screen.findByRole('combobox', { name: /Application status for/ }), 'Offer');
        await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument());
        expect(scrollAndHighlight).not.toHaveBeenCalled();
        scrollAndHighlight.mockRestore();
    });

    test('uses newest application date first within the new status group after changing status', async () => {
        const applications = [
            {
                ...mockApplication,
                job_id: 3,
                company_name: 'Offer Pte Ltd',
                job_status: 'Offer',
                application_date: '2025-06-19T00:00:00Z',
            },
            mockApplication,
            {
                ...mockApplication,
                job_id: 2,
                company_name: 'XYZ Pte Ltd',
                job_status: 'Rejected',
                application_date: '2025-06-21T00:00:00Z',
            },
        ];
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (init?.method !== 'GET') {
                return response(undefined, 204);
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            return response(applications);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/XYZ Pte Ltd/i);
        userEvent.click(screen.getAllByRole('button', { name: /edit status/i })[2]);
        userEvent.selectOptions(await screen.findByRole('combobox', { name: /Application status for/ }), 'Offer');
        userEvent.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => {
            const companyHeadings = screen.getAllByRole('heading', { level: 2 });
            expect(companyHeadings[0]).toHaveTextContent('1. XYZ Pte Ltd');
            expect(companyHeadings[1]).toHaveTextContent('2. Offer Pte Ltd');
            expect(companyHeadings[2]).toHaveTextContent('3. ABC Pte Ltd');
        });

        const statusUpdateCalls = fetch.mock.calls.filter(
            ([url, init]: [string, RequestInit?]) =>
                url.endsWith('/job-applications/2/status') && init?.method === 'PATCH'
        );
        expect(statusUpdateCalls).toHaveLength(1);
        expect(statusUpdateCalls[0][1]).toMatchObject({
            body: JSON.stringify({ jobStatus: 'Offer' }),
        });
    });

    test('deletes application after user confirms', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/1/relation-summary')) {
                return response({ related_interview_count: 2 });
            }
            if (url.endsWith('/job-applications/summary')) {
                return response({ application_count: 1, related_interview_count: 0 });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);

        // Simulates user confirming delete
        mockConfirm.mockResolvedValueOnce({ confirmed: true });

        // Simulates user clicking delete button and clicking confirm delete
        userEvent.click(screen.getByRole('button', { name: /^Delete application for / }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith({
                title: 'Confirm deletion',
                description:
                    'Delete this active job application and its 2 related active interviews? This action is permanent and cannot be undone.',
                confirmationText: 'Delete',
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true, color: 'error', variant: 'contained' },
            })
        );

        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1/relation-summary`, {
            method: 'GET',
            signal: expect.any(AbortSignal),
        });

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1`, {
                method: 'DELETE',
                signal: expect.any(AbortSignal),
            })
        );

        await waitFor(() => expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument());
    });

    test('archives an application with its exact relation confirmation', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/1/relation-summary')) {
                return response({ related_interview_count: 1 });
            }
            if (url.endsWith('/job-applications/summary')) {
                return response({ application_count: 1, related_interview_count: 0 });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        await userEvent.click(screen.getByRole('switch', { name: 'Show archive' }));
        await userEvent.click(screen.getByRole('button', { name: /^Archive application for / }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith({
                title: 'Confirm archive',
                description: 'Archive this active job application and its 1 related active interview?',
                confirmationText: 'Archive',
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true },
            })
        );
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1/relation-summary`, {
            method: 'GET',
            signal: expect.any(AbortSignal),
        });
        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: 1 }),
                signal: expect.any(AbortSignal),
            })
        );
        await waitFor(() => expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument());
    });

    test('keeps an application active when its pending notes cannot be saved before archiving', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/1/relation-summary')) {
                return response({ related_interview_count: 0 });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/notes') && init?.method === 'PATCH') {
                return response({ message: 'Preserve these notes before archiving.' }, 400);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_show_archive: true, application_show_notes: true } }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        fireEvent.change(screen.getByPlaceholderText('Add your notes here'), {
            target: { value: 'Keep this draft when archived' },
        });
        await userEvent.click(screen.getByRole('button', { name: /^Archive application for / }));

        expect(await screen.findByText('Preserve these notes before archiving')).toBeInTheDocument();
        expect(screen.getByText(/ABC Pte Ltd/i)).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: 1 }),
            signal: expect.any(AbortSignal),
        });
    });

    test('prevents newer edits while an archive is preserving pending notes', async () => {
        let resolveNotesSave: (value: ReturnType<typeof response>) => void = () => undefined;
        const pendingNotesSave = new Promise<ReturnType<typeof response>>((resolve) => {
            resolveNotesSave = resolve;
        });

        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/1/relation-summary')) {
                return response({ related_interview_count: 0 });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/notes') && init?.method === 'PATCH') {
                return pendingNotesSave;
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        mockConfirm.mockResolvedValueOnce({ confirmed: true });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_show_archive: true, application_show_notes: true } }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        const notesField = screen.getByRole('textbox', { name: 'Notes for ABC Pte Ltd' });
        fireEvent.change(notesField, { target: { value: 'Preserve this exact draft' } });
        await userEvent.click(screen.getByRole('button', { name: /^Archive application for / }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Preserve this exact draft' }),
                keepalive: true,
                signal: expect.any(AbortSignal),
            })
        );
        expect(notesField).toBeDisabled();

        await userEvent.type(notesField, ' with a newer edit');
        expect(notesField).toHaveValue('Preserve this exact draft');

        await act(async () => resolveNotesSave(response(undefined, 204)));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: 1 }),
                signal: expect.any(AbortSignal),
            })
        );
    });

    test('guards a single application action synchronously while confirmation is pending', async () => {
        let resolveConfirmation: ((result: { confirmed: boolean }) => void) | undefined;
        mockConfirm.mockImplementationOnce(
            () =>
                new Promise<{ confirmed: boolean }>((resolve) => {
                    resolveConfirmation = resolve;
                })
        );
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_show_archive: true } }
        );
        const archiveButton = await screen.findByRole('button', { name: /^Archive application for / });

        act(() => {
            archiveButton.click();
            archiveButton.click();
        });

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
        expect(
            fetch.mock.calls.filter(([url]) => String(url).endsWith('/job-applications/1/relation-summary'))
        ).toHaveLength(1);
        expect(archiveButton).toBeDisabled();

        await act(async () => {
            resolveConfirmation?.({ confirmed: false });
        });
        await waitFor(() => expect(archiveButton).toBeEnabled());
    });

    test('shows the backend error when a relation summary cannot be loaded', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/1/relation-summary')) {
                return response({ message: 'Unable to inspect this application.' }, 400);
            }
            if (url.endsWith('/job-applications/summary')) {
                return response({ application_count: 1, related_interview_count: 0 });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await userEvent.click(await screen.findByRole('button', { name: /^Delete application for / }));

        expect(await screen.findByText('Unable to inspect this application')).toBeInTheDocument();
        expect(mockConfirm).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1`, {
            method: 'DELETE',
            signal: expect.any(AbortSignal),
        });
    });

    test('keeps an active application when its single-action confirmation is cancelled', async () => {
        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        const deleteButton = await screen.findByRole('button', { name: /^Delete application for / });
        await clickConfirmedAction(deleteButton);

        expect(mockConfirm).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1/relation-summary`, {
            method: 'GET',
            signal: expect.any(AbortSignal),
        });
        expect(fetch).not.toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications/1`, {
            method: 'DELETE',
            signal: expect.any(AbortSignal),
        });
        expect(screen.getByText(/ABC Pte Ltd/i)).toBeInTheDocument();
        await waitFor(() => expect(deleteButton).toBeEnabled());
    });

    test('limits application notes to 3000 characters', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        await userEvent.click(screen.getByRole('switch', { name: 'Show notes' }));

        expect(screen.getByPlaceholderText('Add your notes here')).toHaveAttribute('maxlength', '3000');
    });

    test('autosaves notes after 1000ms and clears the Saved message after 3000ms', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        await userEvent.click(screen.getByRole('switch', { name: 'Show notes' }));

        const notesField = screen.getByPlaceholderText('Add your notes here');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        vi.useFakeTimers();
        fireEvent.change(notesField, { target: { value: 'Follow up next week' } });
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('Saving…');

        await act(async () => vi.advanceTimersByTimeAsync(999));
        expect(
            fetch.mock.calls.filter(
                ([url, init]: [string, RequestInit?]) =>
                    url.endsWith('/job-applications/1/notes') && init?.method === 'PATCH'
            )
        ).toHaveLength(0);

        await act(async () => vi.advanceTimersByTimeAsync(1));
        const noteRequests = fetch.mock.calls.filter(
            ([url, init]: [string, RequestInit?]) =>
                url.endsWith('/job-applications/1/notes') && init?.method === 'PATCH'
        );
        expect(noteRequests).toHaveLength(1);
        expect(JSON.parse(String(noteRequests[0][1]?.body))).toEqual({ notes: 'Follow up next week' });
        expect(status).toHaveTextContent('Saved');

        await act(async () => vi.advanceTimersByTimeAsync(3_000));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('keeps a final note error visible and retries the latest draft immediately', async () => {
        let noteRequestCount = 0;
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/user-preferences')) {
                return response({
                    ...mockPreferences,
                    ...(init?.body ? JSON.parse(String(init.body)) : {}),
                });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.endsWith('/job-applications/1/notes') && init?.method === 'PATCH') {
                noteRequestCount += 1;
                return noteRequestCount === 1
                    ? response({ message: 'Notes could not be saved.' }, 400)
                    : response(undefined, 204);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        await userEvent.click(screen.getByRole('switch', { name: 'Show notes' }));

        vi.useFakeTimers();
        fireEvent.change(screen.getByPlaceholderText('Add your notes here'), {
            target: { value: 'Retry this draft' },
        });
        await act(async () => vi.advanceTimersByTimeAsync(1_000));

        expect(screen.getByText('Couldn’t save')).toBeInTheDocument();
        expect(screen.getByText('Notes could not be saved')).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Retry saving notes for ABC Pte Ltd' }));
            await Promise.resolve();
        });

        expect(noteRequestCount).toBe(2);
        expect(screen.getByRole('status')).toHaveTextContent('Saved');
    });

    test('renders the active application empty state with no data', async () => {
        fetch.mockResolvedValue(response([]));

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        expect(await screen.findByRole('heading', { name: 'No active applications yet' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Application view and management controls' }).className).toContain(
            'applicationCompact'
        );
        expect(screen.getByText(/add your first job application/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Add application' })).toHaveAttribute('href', '/application/add');
        expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Display options' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Show all' })).toBeVisible();
        expect(screen.getByRole('checkbox', { name: 'Accepted' })).toBeVisible();
    });

    test('clears active application filters, saves all statuses, and refreshes list results', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.includes('jobStatuses=Accepted')) {
                return response([mockApplication]);
            }
            return response([]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_job_statuses: ['Offer'] } }
        );

        expect(await screen.findByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

        expect(await screen.findByText(/ABC Pte Ltd/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sort by' })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            `${
                import.meta.env.VITE_API_URL
            }/job-applications?jobStatuses=Accepted&jobStatuses=Applied&jobStatuses=Declined&jobStatuses=Ghosted&jobStatuses=Interview&jobStatuses=Offer&jobStatuses=Rejected&jobStatuses=Withdrawn`,
            { method: 'GET', signal: expect.any(AbortSignal) }
        );
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Show all' })).toBeChecked();
    });

    test('clears active application filters and refreshes board results', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            if (url.includes('jobStatuses=Accepted')) {
                return response([mockApplication]);
            }
            return response([]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_job_statuses: ['Offer'], application_view_mode: 'board' } }
        );

        expect(await screen.findByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

        const board = await screen.findByRole('region', { name: 'Application board' });
        expect(within(board).getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).toBeInTheDocument();
    });

    test('renders the active application empty state inside board layout', async () => {
        fetch.mockResolvedValue(response([]));

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_view_mode: 'board' } }
        );

        expect(await screen.findByRole('heading', { name: 'No active applications yet' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Add application' })).toHaveAttribute('href', '/application/add');
        expect(screen.queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Application board' })).not.toBeInTheDocument();
    });

    test('deletes all applications after user confirms', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);

        // Simulates user confirming delete
        mockConfirm.mockResolvedValueOnce({ confirmed: true });

        // Simulates user clicking delete button and clicking confirm delete
        await userEvent.click(screen.getByRole('button', { name: 'More…' }));
        await clickConfirmedAction(screen.getByRole('button', { name: /delete all applications/i }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Confirm delete all',
                    description:
                        'Delete all 1 active job application? This affects every active application you own, including applications not visible under the current job-status filters. This action is permanent and cannot be undone.',
                    confirmationText: 'Delete all',
                    cancellationText: 'Cancel',
                    confirmationButtonProps: expect.objectContaining({
                        autoFocus: false,
                        onKeyDown: expect.any(Function),
                    }),
                })
            )
        );

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications`, {
                method: 'DELETE',
                signal: expect.any(AbortSignal),
            })
        );

        await waitFor(() => expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument());
    });

    test('orders Export, Archive all, and Delete all with exactly two dividers', async () => {
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'More…' }));
        const options = screen.getByRole('link', { name: 'Export filtered applications as CSV' }).parentElement;

        expect(options).not.toBeNull();
        expect(
            Array.from(options?.children ?? []).map((item) =>
                item.tagName === 'HR' ? 'divider' : item.textContent?.trim()
            )
        ).toEqual([
            'Export filtered applications as CSV',
            'divider',
            'Archive all applications',
            'divider',
            'Delete all applications',
        ]);
    });

    test('archives every active application with accurate related-interview counts', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/summary')) {
                return response({ application_count: 2, related_interview_count: 1 });
            }
            if (url.endsWith('/job-interviews')) {
                return response([mockInterview]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        mockConfirm.mockResolvedValueOnce({ confirmed: true });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );
        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'More…' }));
        await clickConfirmedAction(screen.getByRole('button', { name: 'Archive all applications' }));

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Confirm archive all',
                description:
                    'Archive all 2 active job applications and their 1 related active interview? This affects every active application you own, including applications not visible under the current job-status filters.',
            })
        );
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications/archive-all`, {
            method: 'PATCH',
            signal: expect.any(AbortSignal),
        });
        expect(await screen.findByRole('heading', { name: 'No active applications yet' })).toBeInTheDocument();
    });

    test('disables every notes editor while a bulk archive is pending', async () => {
        let resolveSummary: (value: ReturnType<typeof response>) => void = () => undefined;
        const pendingSummary = new Promise<ReturnType<typeof response>>((resolve) => {
            resolveSummary = resolve;
        });

        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/summary')) {
                return pendingSummary;
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        mockConfirm.mockResolvedValueOnce({ confirmed: false });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_show_notes: true } }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        const notesField = screen.getByRole('textbox', { name: 'Notes for ABC Pte Ltd' });
        await userEvent.click(screen.getByRole('button', { name: 'More…' }));
        await userEvent.click(screen.getByRole('button', { name: 'Archive all applications' }));

        expect(notesField).toBeDisabled();

        await act(async () => resolveSummary(response({ application_count: 1, related_interview_count: 0 })));
        await waitFor(() => expect(notesField).toBeEnabled());
    });

    test('does not mutate when the bulk confirmation is cancelled or closed', async () => {
        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );
        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'More…' }));
        await clickConfirmedAction(screen.getByRole('button', { name: 'Archive all applications' }));

        expect(fetch).not.toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/archived-job-applications/archive-all`,
            { method: 'PATCH', signal: expect.any(AbortSignal) }
        );
        expect(screen.getByText(/ABC Pte Ltd/i)).toBeInTheDocument();
    });

    test('hides collection actions when filters hide every owned application', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/job-applications/summary')) {
                return response({ application_count: 3, related_interview_count: 1 });
            }
            return response([]);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>,
            { initialPreferences: { application_job_statuses: ['Offer'] } }
        );

        expect(await screen.findByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'More…' })).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Application view and management controls' }).children).toHaveLength(
            1
        );
        expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('/job-applications/summary'))).toHaveLength(0);
    });

    test('does not confirm or mutate when refreshed active counts fail', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/summary')) {
                return response({ message: 'Unable to load active application counts. Please try again.' }, 400);
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );
        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'More…' }));
        await userEvent.click(screen.getByRole('button', { name: 'Delete all applications' }));

        expect(
            await screen.findByText('Unable to load active application counts. Please try again')
        ).toBeInTheDocument();
        expect(mockConfirm).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/job-applications`, {
            method: 'DELETE',
            signal: expect.any(AbortSignal),
        });
    });

    test('reconciles stale local applications without confirming when the current total is zero', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/job-applications/summary')) {
                return response({ application_count: 0, related_interview_count: 0 });
            }
            if (url.endsWith('/job-interviews')) {
                return response([]);
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });

        render(
            <MemoryRouter>
                <ViewApplication />
            </MemoryRouter>
        );
        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'More…' }));
        await userEvent.click(screen.getByRole('button', { name: 'Delete all applications' }));

        expect(await screen.findByRole('heading', { name: 'No active applications yet' })).toBeInTheDocument();
        expect(mockConfirm).not.toHaveBeenCalled();
    });
});
