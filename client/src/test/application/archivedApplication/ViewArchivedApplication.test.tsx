import { act, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ViewArchivedApplication from '../../../pages/application/archivedApplication/viewArchivedApplication/ViewArchivedApplication';
import { render } from '../../renderWithProviders';
import userEvent from '@testing-library/user-event';
import { JOB_STATUSES } from '../../../pages/application/models';
import { routes } from '../../../routes';
import type { UpdateUserPreferencesRequest, UserPreferences } from '../../../components/userPreferences/models';
import * as highlightElement from '../../../helper/highlightElement';
import boardStyles from '../../../pages/application/applicationBoard/ApplicationBoard.module.css';

globalThis.fetch = vi.fn();

const mockApplication = {
    archived_job_id: 1,
    company_name: 'ABC Pte Ltd',
    job_title: 'Software Engineer',
    job_location: 'Remote',
    application_date: '2025-06-20T00:00:00Z',
    job_status: 'Applied',
    job_posting_url: 'https://jobstreet.com',
    notes: '',
    is_pinned: false,
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

const LocationStateProbe = () => {
    const location = useLocation();
    return <output data-testid='location-state'>{JSON.stringify(location.state)}</output>;
};

const clickConfirmedAction = async (button: HTMLElement) => {
    await act(async () => {
        await userEvent.click(button);
    });
};

const archivedApplicationListRequestCount = () =>
    fetch.mock.calls.filter(
        ([requestUrl, init]: [string, RequestInit?]) =>
            requestUrl.includes('/archived-job-applications?') && init?.method === 'GET'
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
    await userEvent.click(screen.getByRole('button', { name: 'More...' }));
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

const mockArchivedApplicationCollection = (applications: unknown[]) => {
    fetch.mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/user-preferences')) {
            return response({
                ...mockPreferences,
                ...(init?.body ? JSON.parse(String(init.body)) : {}),
            });
        }
        if (url.endsWith('/archived-job-applications/summary')) {
            return response({ application_count: applications.length, related_interview_count: 0 });
        }
        if (/\/archived-job-applications\/\d+\/relation-summary$/.test(url)) {
            return response({ related_interview_count: 0 });
        }
        return init?.method === 'GET' ? response(applications) : response(undefined, 204);
    });
};

describe('Archived job application viewing flow', () => {
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
            if (url.endsWith('/archived-job-applications/summary')) {
                return response({ application_count: 1, related_interview_count: 0 });
            }
            if (/\/archived-job-applications\/\d+\/relation-summary$/.test(url)) {
                return response({ related_interview_count: 0 });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
    });

    test('preserves Board mode and filters while revealing a corresponding archived application', async () => {
        const initialPreferences = {
            ...mockPreferences,
            archived_application_job_statuses: ['Offer'] as UserPreferences['archived_application_job_statuses'],
            archived_application_view_mode: 'board' as const,
        };
        const updatePreferences = vi.fn(async (updates: UpdateUserPreferencesRequest) => ({
            ...initialPreferences,
            ...updates,
        }));
        const scrollAndHighlight = vi.spyOn(highlightElement, 'scrollAndHighlight');
        const boardScrollTo = vi.fn();
        const pageScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        HTMLElement.prototype.scrollTo = boardScrollTo;

        render(
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: '/application/archived',
                        state: { applicationJobStatus: 'Applied', applicationTargetId: 1 },
                    },
                ]}
            >
                <ViewArchivedApplication />
                <LocationStateProbe />
            </MemoryRouter>,
            { initialPreferences, updatePreferences }
        );

        await waitFor(() =>
            expect(updatePreferences).toHaveBeenCalledWith({
                archived_application_job_statuses: ['Offer', 'Applied'],
            })
        );
        await waitFor(() => expect(boardScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 0 }));
        expect(pageScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 });
        expect(screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).toHaveClass(
            boardStyles.cardHighlighted
        );
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
        expect(scrollAndHighlight).not.toHaveBeenCalled();
        expect(updatePreferences).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(screen.getByTestId('location-state')).toHaveTextContent('null'));
        scrollAndHighlight.mockRestore();
    });

    test('displays archived job application details and action buttons', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        expect(await screen.findByText(/ABC Pte Ltd/i)).toBeInTheDocument();
        expect(
            screen.queryByText(/no archived job applications match the selected job statuses/i)
        ).not.toBeInTheDocument();
        expect(screen.getByText(/software engineer/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /unarchive/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Filter by' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.queryByRole('region', { name: 'Archived application board' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        expect(screen.getByRole('switch', { name: 'Show notes' })).toHaveAttribute('aria-checked', 'false');
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        expect(screen.getByRole('button', { name: /delete all archived applications/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /unarchive all applications/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Export filtered applications as CSV' })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            `${
                import.meta.env.VITE_API_URL
            }/archived-job-applications?jobStatuses=Accepted&jobStatuses=Applied&jobStatuses=Declined&jobStatuses=Ghosted&jobStatuses=Interview&jobStatuses=Offer&jobStatuses=Rejected&jobStatuses=Withdrawn`,
            {
                method: 'GET',
            }
        );
    });

    test('shows pinned archived applications as read-only in list and board views', async () => {
        mockArchivedApplicationCollection([{ ...mockApplication, is_pinned: true }]);

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        expect(await screen.findByLabelText('ABC Pte Ltd application is pinned')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /pin ABC Pte Ltd application/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /unpin ABC Pte Ltd application/i })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        const board = await screen.findByRole('region', { name: 'Archived application board' });
        expect(within(board).getByLabelText('ABC Pte Ltd application is pinned')).toBeInTheDocument();
        expect(within(board).queryByRole('button', { name: /pin ABC Pte Ltd application/i })).not.toBeInTheDocument();
        expect(within(board).queryByRole('button', { name: /unpin ABC Pte Ltd application/i })).not.toBeInTheDocument();
    });

    test('does not show a pin for unpinned archived applications in list or board view', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        expect(screen.queryByLabelText(/application is pinned/i)).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        const board = await screen.findByRole('region', { name: 'Archived application board' });
        expect(within(board).queryByLabelText(/application is pinned/i)).not.toBeInTheDocument();
    });

    test('places Sort by between Filter by and Display options while keeping actions last', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);

        const listButton = screen.getByRole('button', { name: 'List' });
        const boardButton = screen.getByRole('button', { name: 'Board' });
        const filterButton = screen.getByRole('button', { name: 'Filter by' });
        const sortButton = screen.getByRole('button', { name: 'Sort by' });
        const displayButton = screen.getByRole('button', { name: 'Display options' });
        const moreButton = screen.getByRole('button', { name: 'More...' });

        expect(listButton.compareDocumentPosition(boardButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(boardButton.compareDocumentPosition(filterButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(filterButton.compareDocumentPosition(sortButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(sortButton.compareDocumentPosition(displayButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(displayButton.compareDocumentPosition(moreButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('shows the exact archived list and board sort options with their defaults', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));

        expect(getSortOptionLabels()).toEqual([
            'Job Status',
            'Newest Application',
            'Oldest Application',
            'Company A–Z',
            'Company Z–A',
        ]);
        expect(screen.getByRole('radio', { name: 'Job Status' })).toBeChecked();

        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        });
        await screen.findByRole('region', { name: 'Archived application board' });
        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));

        expect(getSortOptionLabels()).toEqual([
            'Newest Application',
            'Oldest Application',
            'Company A–Z',
            'Company Z–A',
        ]);
        expect(screen.queryByRole('radio', { name: 'Job Status' })).not.toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Newest Application' })).toBeChecked();
    });

    test('reorders the archived application list for every sort option', async () => {
        mockArchivedApplicationCollection([
            {
                ...mockApplication,
                application_date: '2025-01-15T00:00:00Z',
                archived_job_id: 1,
                company_name: 'Delta Ltd',
                job_status: 'Applied',
            },
            {
                ...mockApplication,
                application_date: '2025-04-15T00:00:00Z',
                archived_job_id: 2,
                company_name: 'Alpha Ltd',
                job_status: 'Rejected',
            },
            {
                ...mockApplication,
                application_date: '2025-03-15T00:00:00Z',
                archived_job_id: 3,
                company_name: 'Charlie Ltd',
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-02-15T00:00:00Z',
                archived_job_id: 4,
                company_name: 'Bravo Ltd',
                job_status: 'Accepted',
            },
        ]);

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
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
        };

        await selectSortOption('Newest Application', ['Alpha Ltd', 'Charlie Ltd', 'Bravo Ltd', 'Delta Ltd']);
        await selectSortOption('Oldest Application', ['Delta Ltd', 'Bravo Ltd', 'Charlie Ltd', 'Alpha Ltd']);
        await selectSortOption('Company A–Z', ['Alpha Ltd', 'Bravo Ltd', 'Charlie Ltd', 'Delta Ltd']);
        await selectSortOption('Company Z–A', ['Delta Ltd', 'Charlie Ltd', 'Bravo Ltd', 'Alpha Ltd']);
        await selectSortOption('Job Status', ['Bravo Ltd', 'Charlie Ltd', 'Delta Ltd', 'Alpha Ltd']);
    });

    test('saves only the archived mode sort preference without refetching applications', async () => {
        let savedPreferences: UserPreferences = { ...mockPreferences };
        const updatePreferences = vi.fn(async (updatedPreferences: UpdateUserPreferencesRequest) => {
            savedPreferences = { ...savedPreferences, ...updatedPreferences };
            return savedPreferences;
        });

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { updatePreferences }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        const applicationRequestsBeforeSorting = archivedApplicationListRequestCount();

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        await act(async () => {
            await userEvent.click(screen.getByRole('radio', { name: 'Oldest Application' }));
        });
        await waitFor(() =>
            expect(updatePreferences).toHaveBeenNthCalledWith(1, {
                archived_application_list_sort_order: 'application_date_asc',
            })
        );

        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Board' }));
        });
        await screen.findByRole('region', { name: 'Archived application board' });
        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        await act(async () => {
            await userEvent.click(screen.getByRole('radio', { name: 'Company Z–A' }));
        });

        await waitFor(() =>
            expect(updatePreferences).toHaveBeenNthCalledWith(3, {
                archived_application_board_sort_order: 'company_name_desc',
            })
        );
        expect(updatePreferences).toHaveBeenNthCalledWith(2, { archived_application_view_mode: 'board' });
        expect(updatePreferences).toHaveBeenCalledTimes(3);
        expect(archivedApplicationListRequestCount()).toBe(applicationRequestsBeforeSorting);
    });

    test('reorders archived cards within board columns for every board sort option', async () => {
        mockArchivedApplicationCollection([
            {
                ...mockApplication,
                application_date: '2025-01-15T00:00:00Z',
                archived_job_id: 1,
                company_name: 'Delta Offer',
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-02-15T00:00:00Z',
                archived_job_id: 2,
                company_name: 'Alpha Offer',
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-03-15T00:00:00Z',
                archived_job_id: 3,
                company_name: 'Charlie Offer',
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-04-15T00:00:00Z',
                archived_job_id: 4,
                company_name: 'Bravo Offer',
                job_status: 'Offer',
            },
            {
                ...mockApplication,
                application_date: '2025-01-15T00:00:00Z',
                archived_job_id: 5,
                company_name: 'Kilo Applied',
                job_status: 'Applied',
            },
            {
                ...mockApplication,
                application_date: '2025-02-15T00:00:00Z',
                archived_job_id: 6,
                company_name: 'Hotel Applied',
                job_status: 'Applied',
            },
            {
                ...mockApplication,
                application_date: '2025-03-15T00:00:00Z',
                archived_job_id: 7,
                company_name: 'Juliet Applied',
                job_status: 'Applied',
            },
            {
                ...mockApplication,
                application_date: '2025-04-15T00:00:00Z',
                archived_job_id: 8,
                company_name: 'India Applied',
                job_status: 'Applied',
            },
        ]);

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            {
                initialPreferences: {
                    archived_application_view_mode: 'board',
                },
            }
        );

        const board = await screen.findByRole('region', { name: 'Archived application board' });
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
            'Oldest Application',
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
            'Newest Application',
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
            { archived_application_view_mode: 'list', archived_application_list_sort_order: 'company_name_asc' },
            ['Alpha Applied', 'Beta Offer', 'Yankee Offer', 'Zulu Applied'],
        ],
        [
            'board',
            { archived_application_view_mode: 'board', archived_application_board_sort_order: 'company_name_desc' },
            ['Yankee Offer', 'Beta Offer', 'Zulu Applied', 'Alpha Applied'],
        ],
    ] as const)(
        'exports archived %s applications in their displayed order',
        async (_mode, initialPreferences, order) => {
            mockArchivedApplicationCollection([
                { ...mockApplication, archived_job_id: 1, company_name: 'Alpha Applied', job_status: 'Applied' },
                { ...mockApplication, archived_job_id: 2, company_name: 'Zulu Applied', job_status: 'Applied' },
                { ...mockApplication, archived_job_id: 3, company_name: 'Beta Offer', job_status: 'Offer' },
                { ...mockApplication, archived_job_id: 4, company_name: 'Yankee Offer', job_status: 'Offer' },
            ]);

            render(
                <MemoryRouter>
                    <ViewArchivedApplication />
                </MemoryRouter>,
                { initialPreferences }
            );

            await screen.findByRole('button', { name: 'Sort by' });
            expectCsvCompanyOrder(await getExportCsvText(), [...order]);
        }
    );

    test('exports only the archived applications returned for the saved status filter with the stable filename', async () => {
        mockArchivedApplicationCollection([
            { ...mockApplication, company_name: 'Filtered Archived Offer', job_status: 'Offer' },
        ]);

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { initialPreferences: { archived_application_job_statuses: ['Offer'] } }
        );

        await screen.findByRole('heading', { level: 2, name: '1. Filtered Archived Offer' });
        const csv = await getExportCsvText();
        expect(csv).toContain('Filtered Archived Offer');
        expect(csv).not.toContain('ABC Pte Ltd');
        expect(screen.getByRole('link', { name: 'Export filtered applications as CSV' })).toHaveAttribute(
            'download',
            'archived_job_applications.csv'
        );
        expect(
            fetch.mock.calls.some(([url]) => String(url).includes('/archived-job-applications?jobStatuses=Offer'))
        ).toBe(true);
    });

    test('shows an error and rolls back the archived list sort when saving fails', async () => {
        mockArchivedApplicationCollection([
            { ...mockApplication, archived_job_id: 1, company_name: 'Alpha Applied', job_status: 'Applied' },
            { ...mockApplication, archived_job_id: 2, company_name: 'Zulu Offer', job_status: 'Offer' },
        ]);
        const updatePreferences = vi.fn(async (): Promise<UserPreferences> => {
            throw new Error('Preference request failed');
        });

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { updatePreferences }
        );

        await screen.findByRole('heading', { level: 2, name: '1. Zulu Offer' });
        expect(getListCompanyHeadings()).toEqual(['1. Zulu Offer', '2. Alpha Applied']);

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        await userEvent.click(screen.getByRole('radio', { name: 'Company A–Z' }));

        expect(
            await screen.findByText('Unable to save the archived application sorting preference. Please try again')
        ).toBeInTheDocument();
        expect(updatePreferences).toHaveBeenCalledWith({
            archived_application_list_sort_order: 'company_name_asc',
        });
        expect(getListCompanyHeadings()).toEqual(['1. Zulu Offer', '2. Alpha Applied']);

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        expect(screen.getByRole('radio', { name: 'Job Status' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Company A–Z' })).not.toBeChecked();
    });

    test('switches to board view with read-only archived application cards', async () => {
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
            return response([
                mockApplication,
                {
                    ...mockApplication,
                    archived_job_id: 2,
                    company_name: 'Offer Pte Ltd',
                    job_status: 'Offer',
                },
            ]);
        });

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        const board = screen.getByRole('region', { name: 'Archived application board' });
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByRole('button', { name: 'Display options' })).not.toBeInTheDocument();
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

        const applicationCard = within(board).getByRole('article', { name: /ABC Pte Ltd Software Engineer/i });
        expect(within(applicationCard).getByText('20 Jun 2025')).toBeInTheDocument();
        expect(within(applicationCard).queryByText('Remote')).not.toBeInTheDocument();
        expect(within(applicationCard).queryByRole('combobox', { name: /move/i })).not.toBeInTheDocument();
        expect(within(applicationCard).queryByText('Edit notes')).not.toBeInTheDocument();
        expect(within(applicationCard).queryByPlaceholderText('Add your notes here')).not.toBeInTheDocument();

        await userEvent.click(within(applicationCard).getByText('Actions'));

        expect(
            within(applicationCard).getByRole('link', { name: 'View job posting' })
        ).toBeInTheDocument();
        expect(within(applicationCard).getByRole('button', { name: 'Unarchive' })).toBeInTheDocument();
        expect(within(applicationCard).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    test('shows archived board notes as read-only when enabled', async () => {
        fetch.mockImplementation(async (_url: string, init?: RequestInit) =>
            init?.method === 'GET'
                ? response([{ ...mockApplication, notes: 'Follow up after cooling period.' }])
                : response(undefined, 204)
        );

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Display options' }));
        await userEvent.click(screen.getByRole('switch', { name: 'Show notes' }));
        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        const applicationCard = screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i });
        await userEvent.click(within(applicationCard).getByText('Actions'));

        expect(within(applicationCard).getByText('Notes')).toBeInTheDocument();
        expect(within(applicationCard).getByDisplayValue('Follow up after cooling period.')).toBeDisabled();
        expect(within(applicationCard).queryByText('Edit notes')).not.toBeInTheDocument();
    });

    test('uses user preferences for the selected archived application view', async () => {
        const { unmount } = render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { initialPreferences: { archived_application_view_mode: 'board' } }
        );

        await screen.findByRole('region', { name: 'Archived application board' });
        expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');

        unmount();
        fetch.mockClear();

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByRole('region', { name: 'Archived application board' })).not.toBeInTheDocument();
    });

    test('fetches archived applications from the server when the status filter changes', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(
                `${import.meta.env.VITE_API_URL}/archived-job-applications?jobStatuses=Offer`,
                {
                    method: 'GET',
                }
            )
        );
    });

    test('shows controls above the skeleton while archived applications are filtering', async () => {
        let resolveFilterRequest: ((value: ReturnType<typeof response>) => void) | undefined;
        const pendingFilterRequest = new Promise<ReturnType<typeof response>>((resolve) => {
            resolveFilterRequest = resolve;
        });

        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/archived-job-applications?jobStatuses=Offer')) {
                return await pendingFilterRequest;
            }

            return response([mockApplication]);
        });

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));

        const filterButton = screen.getByRole('button', { name: 'Filter by' });
        const skeletons = screen.getAllByRole('status', { name: 'Loading results' });

        expect(skeletons).toHaveLength(2);
        expect(filterButton.compareDocumentPosition(skeletons[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(filterButton).not.toBeDisabled();
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
            if (url.endsWith('/archived-job-applications?jobStatuses=Offer')) {
                return new Promise((resolve) => {
                    resolveOlderFilter = resolve;
                });
            }
            if (url.endsWith('/archived-job-applications?jobStatuses=Offer&jobStatuses=Accepted')) {
                return response([latestApplication]);
            }
            return response([mockApplication]);
        });

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Accepted' }));

        expect(await screen.findByRole('heading', { level: 2, name: '1. Latest result' })).toBeInTheDocument();

        await act(async () => resolveOlderFilter(response([olderApplication])));

        await waitFor(() =>
            expect(screen.queryByRole('heading', { level: 2, name: '1. Older result' })).not.toBeInTheDocument()
        );
        expect(screen.getByRole('heading', { level: 2, name: '1. Latest result' })).toBeInTheDocument();
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
            if (url.endsWith('/archived-job-applications?jobStatuses=Offer')) {
                return response([olderApplication]);
            }
            if (url.endsWith('/archived-job-applications?jobStatuses=Offer&jobStatuses=Accepted')) {
                return new Promise((resolve) => {
                    resolveLatestFilter = resolve;
                });
            }
            return response([mockApplication]);
        });

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { updatePreferences }
        );

        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));
        await waitFor(() =>
            expect(updatePreferences).toHaveBeenCalledWith({ archived_application_job_statuses: ['Offer'] })
        );
        await userEvent.click(screen.getByRole('checkbox', { name: 'Accepted' }));

        await act(async () =>
            resolveOlderPreference({
                ...mockPreferences,
                archived_application_job_statuses: ['Offer'],
            })
        );
        await act(async () => resolveLatestFilter(response({ message: 'Unable to filter.' }, 400)));

        expect(await screen.findByRole('heading', { level: 2, name: '1. Persisted result' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Offer' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Accepted' })).not.toBeChecked();
    });

    test('shows the board skeleton during the initial fetch in board view', async () => {
        fetch.mockImplementation(async () => await new Promise<ReturnType<typeof response>>(() => undefined));

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { initialPreferences: { archived_application_view_mode: 'board' } }
        );

        expect(await screen.findByRole('status', { name: 'Loading board' })).toBeInTheDocument();
        expect(screen.getAllByTestId('skeleton-board-column')).toHaveLength(4);
        expect(screen.queryAllByRole('status', { name: 'Loading results' })).toHaveLength(0);
    });

    test('deletes application after user confirms', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/archived-job-applications/1/relation-summary')) {
                return response({ related_interview_count: 1 });
            }
            if (url.endsWith('/archived-job-applications/summary')) {
                return response({ application_count: 1, related_interview_count: 0 });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);

        // Simulates user confirming delete
        mockConfirm.mockResolvedValueOnce({ confirmed: true });

        // Simulates user clicking delete button and clicking confirm delete
        userEvent.click(screen.getByRole('button', { name: 'Delete' }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith({
                title: 'Confirm Deletion',
                description:
                    'Delete this archived job application and its 1 related archived interview? This action is permanent and cannot be undone.',
                confirmationText: 'Delete',
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true },
            })
        );

        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/archived-job-applications/1/relation-summary`,
            { method: 'GET' }
        );

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications/1`, {
                method: 'DELETE',
            })
        );

        await waitFor(() => expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument());
    });

    test('deletes all archived applications after user confirms', async () => {
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await screen.findByText(/ABC Pte Ltd/i);

        // Simulates user confirming delete
        mockConfirm.mockResolvedValueOnce({ confirmed: true });

        // Simulates user clicking delete button and clicking confirm delete
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(screen.getByRole('button', { name: /delete all archived applications/i }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Confirm Delete All',
                    description:
                        'Delete all 1 archived job application? This affects every archived application you own, including applications not visible under the current archived job-status filters. This action is permanent and cannot be undone.',
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
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications`, {
                method: 'DELETE',
            })
        );

        await waitFor(() => expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument());
    });

    test('unarchives the complete archived collection with current counts', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/archived-job-applications/summary')) {
                return response({ application_count: 5, related_interview_count: 2 });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        mockConfirm.mockResolvedValueOnce({ confirmed: true });

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );
        await screen.findByText(/ABC Pte Ltd/i);
        await userEvent.click(screen.getByRole('button', { name: 'More...' }));
        await clickConfirmedAction(screen.getByRole('button', { name: 'Unarchive all applications' }));

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Confirm Unarchive All',
                description:
                    'Unarchive all 5 archived job applications and their 2 related archived interviews? This affects every archived application you own, including applications not visible under the current archived job-status filters.',
            })
        );
        expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications/unarchive-all`, {
            method: 'PATCH',
        });
        expect(await screen.findByRole('heading', { name: 'No archived applications yet' })).toBeInTheDocument();
    });

    test('unarchives an application with its exact relation confirmation', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/archived-job-applications/1/relation-summary')) {
                return response({ related_interview_count: 2 });
            }
            if (url.endsWith('/archived-job-applications/summary')) {
                return response({ application_count: 1, related_interview_count: 0 });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        expect(await screen.findByText(/ABC Pte Ltd/i)).toBeInTheDocument();

        userEvent.click(screen.getByRole('button', { name: /unarchive/i }));

        await waitFor(() =>
            expect(mockConfirm).toHaveBeenCalledWith({
                title: 'Confirm Unarchive',
                description: 'Unarchive this archived job application and its 2 related archived interviews?',
                confirmationText: 'Unarchive',
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true },
            })
        );
        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/archived-job-applications/1/relation-summary`,
            { method: 'GET' }
        );
        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications/1/restore`, {
                method: 'PATCH',
            })
        );
        await waitFor(() => expect(screen.queryByText(/ABC Pte Ltd/i)).not.toBeInTheDocument());
    });

    test('keeps an archived application when its single-action confirmation is cancelled', async () => {
        mockConfirm.mockResolvedValueOnce({ confirmed: false });
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        const deleteButton = await screen.findByRole('button', { name: 'Delete' });
        await clickConfirmedAction(deleteButton);

        expect(mockConfirm).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenCalledWith(
            `${import.meta.env.VITE_API_URL}/archived-job-applications/1/relation-summary`,
            { method: 'GET' }
        );
        expect(fetch).not.toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications/1`, {
            method: 'DELETE',
        });
        expect(screen.getByText(/ABC Pte Ltd/i)).toBeInTheDocument();
        await waitFor(() => expect(deleteButton).toBeEnabled());
    });

    test('does not confirm or mutate when an archived relation summary fails', async () => {
        fetch.mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.endsWith('/archived-job-applications/1/relation-summary')) {
                return response({ message: 'Unable to inspect this archived application.' }, 400);
            }
            if (url.endsWith('/archived-job-applications/summary')) {
                return response({ application_count: 1, related_interview_count: 0 });
            }
            return init?.method === 'GET' ? response([mockApplication]) : response(undefined, 204);
        });
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        expect(await screen.findByText('Unable to inspect this archived application')).toBeInTheDocument();
        expect(mockConfirm).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/archived-job-applications/1`, {
            method: 'DELETE',
        });
        expect(screen.getByText(/ABC Pte Ltd/i)).toBeInTheDocument();
    });

    test('guards an archived application action synchronously while confirmation is pending', async () => {
        let resolveConfirmation: ((result: { confirmed: boolean }) => void) | undefined;
        mockConfirm.mockImplementationOnce(
            () =>
                new Promise<{ confirmed: boolean }>((resolve) => {
                    resolveConfirmation = resolve;
                })
        );
        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );
        const unarchiveButton = await screen.findByRole('button', { name: 'Unarchive' });

        act(() => {
            unarchiveButton.click();
            unarchiveButton.click();
        });

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
        expect(
            fetch.mock.calls.filter(([url]) => String(url).endsWith('/archived-job-applications/1/relation-summary'))
        ).toHaveLength(1);
        expect(unarchiveButton).toBeDisabled();

        await act(async () => {
            resolveConfirmation?.({ confirmed: false });
        });
        await waitFor(() => expect(unarchiveButton).toBeEnabled());
    });

    test('renders the archived application empty state with no data', async () => {
        fetch.mockResolvedValue(response([]));

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        expect(await screen.findByRole('heading', { name: 'No archived applications yet' })).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Archived application view and management controls' }).className
        ).toContain('applicationCompact');
        expect(screen.getByText(/archive applications you no longer need/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View active applications' })).toHaveAttribute(
            'href',
            '/application/view'
        );
        expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Display options' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Show All' })).toBeVisible();
        expect(screen.getByRole('checkbox', { name: 'Accepted' })).toBeVisible();
    });

    test('clears archived application filters, saves all statuses, and refreshes list results', async () => {
        fetch.mockImplementation(async (url: string) =>
            url.includes('jobStatuses=Accepted') ? response([mockApplication]) : response([])
        );

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { initialPreferences: { archived_application_job_statuses: ['Offer'] } }
        );

        expect(
            await screen.findByRole('heading', { name: 'No archived applications match your filters' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

        expect(await screen.findByText(/ABC Pte Ltd/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sort by' })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            `${
                import.meta.env.VITE_API_URL
            }/archived-job-applications?jobStatuses=Accepted&jobStatuses=Applied&jobStatuses=Declined&jobStatuses=Ghosted&jobStatuses=Interview&jobStatuses=Offer&jobStatuses=Rejected&jobStatuses=Withdrawn`,
            { method: 'GET' }
        );
        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Show All' })).toBeChecked();
    });

    test('hides collection actions when filters hide every archived application', async () => {
        fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/archived-job-applications/summary')) {
                return response({ application_count: 3, related_interview_count: 1 });
            }
            return response([]);
        });

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { initialPreferences: { archived_application_job_statuses: ['Offer'] } }
        );

        expect(
            await screen.findByRole('heading', { name: 'No archived applications match your filters' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'More...' })).not.toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Archived application view and management controls' }).children
        ).toHaveLength(1);
        expect(
            fetch.mock.calls.filter(([url]) => String(url).endsWith('/archived-job-applications/summary'))
        ).toHaveLength(0);
    });

    test('clears archived application filters and refreshes board results', async () => {
        fetch.mockImplementation(async (url: string) =>
            url.includes('jobStatuses=Accepted') ? response([mockApplication]) : response([])
        );

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            {
                initialPreferences: {
                    archived_application_job_statuses: ['Offer'],
                    archived_application_view_mode: 'board',
                },
            }
        );

        expect(
            await screen.findByRole('heading', { name: 'No archived applications match your filters' })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

        const board = await screen.findByRole('region', { name: 'Archived application board' });
        expect(within(board).getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).toBeInTheDocument();
    });

    test('renders the archived application empty state inside board layout', async () => {
        fetch.mockResolvedValue(response([]));

        render(
            <MemoryRouter>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { initialPreferences: { archived_application_view_mode: 'board' } }
        );

        expect(await screen.findByRole('heading', { name: 'No archived applications yet' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View active applications' })).toHaveAttribute(
            'href',
            '/application/view'
        );
        expect(screen.queryByRole('button', { name: 'Sort by' })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Archived application board' })).not.toBeInTheDocument();
    });

    test('reveals an archived hash target with Board scrolling instead of the List helper', async () => {
        const scrollIntoView = vi.fn();
        const boardScrollTo = vi.fn();
        const pageScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        HTMLElement.prototype.scrollIntoView = scrollIntoView;
        HTMLElement.prototype.scrollTo = boardScrollTo;

        render(
            <MemoryRouter initialEntries={[`${routes.archivedApplications}#1`]}>
                <ViewArchivedApplication />
            </MemoryRouter>,
            { initialPreferences: { archived_application_view_mode: 'board' } }
        );

        expect(await screen.findByRole('region', { name: 'Archived application board' })).toBeInTheDocument();
        await waitFor(() => expect(boardScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 0 }));
        expect(pageScrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 });
        expect(screen.getByRole('article', { name: /ABC Pte Ltd Software Engineer/i })).toHaveClass(
            boardStyles.cardHighlighted
        );
        expect(scrollIntoView).not.toHaveBeenCalled();
    });

    test('keeps archived hash scroll-and-highlight in List view', async () => {
        const scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollIntoView = scrollIntoView;

        render(
            <MemoryRouter initialEntries={[`${routes.archivedApplications}#1`]}>
                <ViewArchivedApplication />
            </MemoryRouter>
        );

        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce());
    });
});
