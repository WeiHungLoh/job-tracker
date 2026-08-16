import { shouldAutoScrollAfterStatusChange, sortApplications } from '../../pages/application/applicationSorting';
import {
    APPLICATION_BOARD_SORT_OPTIONS,
    APPLICATION_LIST_SORT_OPTIONS,
    DEFAULT_APPLICATION_BOARD_SORT_ORDER,
    DEFAULT_APPLICATION_LIST_SORT_ORDER,
    JOB_STATUSES,
    JOB_STATUS_SORT_ORDER,
} from '../../pages/application/models';

const applications = [
    {
        id: 'older-applied',
        application_date: '2025-01-10T00:00:00Z',
        company_name: 'Beta Labs',
        is_pinned: false,
        job_status: 'Applied',
    },
    {
        id: 'new-offer',
        application_date: '2025-03-10T00:00:00Z',
        company_name: 'Delta Works',
        is_pinned: false,
        job_status: 'Offer',
    },
    {
        id: 'newer-applied',
        application_date: '2025-04-10T00:00:00Z',
        company_name: 'alpha Systems',
        is_pinned: false,
        job_status: 'Applied',
    },
    {
        id: 'old-rejected',
        application_date: '2024-12-10T00:00:00Z',
        company_name: 'Charlie Group',
        is_pinned: false,
        job_status: 'Rejected',
    },
] as const;

describe('application sorting', () => {
    test('enables status-change auto scroll only for Job Status sorting when the toggle is enabled', () => {
        expect(shouldAutoScrollAfterStatusChange(true, 'job_status')).toBe(true);
        expect(shouldAutoScrollAfterStatusChange(false, 'job_status')).toBe(false);
        expect(shouldAutoScrollAfterStatusChange(true, 'application_date_desc')).toBe(false);
        expect(shouldAutoScrollAfterStatusChange(true, 'application_date_asc')).toBe(false);
        expect(shouldAutoScrollAfterStatusChange(true, 'company_name_asc')).toBe(false);
        expect(shouldAutoScrollAfterStatusChange(true, 'company_name_desc')).toBe(false);
    });

    test('exposes the exact list and Board choices with their defaults', () => {
        expect(DEFAULT_APPLICATION_LIST_SORT_ORDER).toBe('job_status');
        expect(DEFAULT_APPLICATION_BOARD_SORT_ORDER).toBe('application_date_desc');
        expect(APPLICATION_LIST_SORT_OPTIONS).toEqual([
            { label: 'Job Status', value: 'job_status' },
            { label: 'Newest Application', value: 'application_date_desc' },
            { label: 'Oldest Application', value: 'application_date_asc' },
            { label: 'Company A–Z', value: 'company_name_asc' },
            { label: 'Company Z–A', value: 'company_name_desc' },
        ]);
        expect(APPLICATION_BOARD_SORT_OPTIONS).toEqual(APPLICATION_LIST_SORT_OPTIONS.slice(1));
        expect(JOB_STATUSES).toContain('Withdrawn');
        expect(JOB_STATUS_SORT_ORDER).toEqual([
            'Accepted',
            'Offer',
            'Declined',
            'Interview',
            'Applied',
            'Withdrawn',
            'Ghosted',
            'Rejected',
        ]);
    });

    test.each([
        ['job_status', ['new-offer', 'newer-applied', 'older-applied', 'old-rejected']],
        ['application_date_desc', ['newer-applied', 'new-offer', 'older-applied', 'old-rejected']],
        ['application_date_asc', ['old-rejected', 'older-applied', 'new-offer', 'newer-applied']],
        ['company_name_asc', ['newer-applied', 'older-applied', 'old-rejected', 'new-offer']],
        ['company_name_desc', ['new-offer', 'old-rejected', 'older-applied', 'newer-applied']],
    ] as const)('sorts by %s without mutating its input', (sortOrder, expectedOrder) => {
        const originalOrder = applications.map((application) => application.id);
        const sortedApplications = sortApplications(applications, sortOrder);

        expect(sortedApplications.map((application) => application.id)).toEqual(expectedOrder);
        expect(applications.map((application) => application.id)).toEqual(originalOrder);
        expect(sortedApplications).not.toBe(applications);
    });

    test.each(['company_name_asc', 'company_name_desc'] as const)(
        'uses newest application first when company names are equal for %s',
        (sortOrder) => {
            const matchingCompanies = [
                {
                    ...applications[0],
                    id: 'older',
                    application_date: '2025-01-01T00:00:00Z',
                    company_name: 'Example',
                },
                {
                    ...applications[1],
                    id: 'newer',
                    application_date: '2025-02-01T00:00:00Z',
                    company_name: 'example',
                },
            ];

            expect(sortApplications(matchingCompanies, sortOrder).map((application) => application.id)).toEqual([
                'newer',
                'older',
            ]);
        }
    );

    test('uses newest application first within the same job status, then company A–Z when dates are equal', () => {
        const sameStatusApplications = [
            {
                ...applications[0],
                id: 'older-alpha',
                application_date: '2025-01-01T00:00:00Z',
                company_name: 'Alpha Systems',
                job_status: 'Applied' as const,
            },
            {
                ...applications[1],
                id: 'newer-zulu',
                application_date: '2025-03-01T00:00:00Z',
                company_name: 'Zulu Labs',
                job_status: 'Applied' as const,
            },
            {
                ...applications[2],
                id: 'newer-beta',
                application_date: '2025-03-01T00:00:00Z',
                company_name: 'Beta Works',
                job_status: 'Applied' as const,
            },
        ];

        expect(sortApplications(sameStatusApplications, 'job_status').map((application) => application.id)).toEqual([
            'newer-beta',
            'newer-zulu',
            'older-alpha',
        ]);
    });

    test.each([
        ['application_date_desc', ['alpha', 'beta']],
        ['application_date_asc', ['alpha', 'beta']],
    ] as const)('uses company A–Z when the selected %s value is tied', (sortOrder, expectedOrder) => {
        const sharedDate = '2025-02-01T00:00:00Z';
        const tiedApplications = [
            {
                ...applications[0],
                id: 'beta',
                application_date: sharedDate,
                company_name: 'Beta Labs',
                job_status: 'Applied' as const,
            },
            {
                ...applications[1],
                id: 'alpha',
                application_date: sharedDate,
                company_name: 'alpha Systems',
                job_status: 'Applied' as const,
            },
        ];

        expect(sortApplications(tiedApplications, sortOrder).map((application) => application.id)).toEqual(
            expectedOrder
        );
    });

    test.each([
        ['job_status', ['pinned-offer', 'pinned-applied', 'unpinned-offer', 'unpinned-applied']],
        ['application_date_desc', ['pinned-applied', 'pinned-offer', 'unpinned-applied', 'unpinned-offer']],
        ['application_date_asc', ['pinned-offer', 'pinned-applied', 'unpinned-offer', 'unpinned-applied']],
        ['company_name_asc', ['pinned-applied', 'pinned-offer', 'unpinned-applied', 'unpinned-offer']],
        ['company_name_desc', ['pinned-offer', 'pinned-applied', 'unpinned-offer', 'unpinned-applied']],
    ] as const)(
        'keeps pinned applications first while preserving %s within both groups',
        (sortOrder, expectedOrder) => {
            const pinPriorityApplications = [
                {
                    id: 'unpinned-offer',
                    application_date: '2025-01-01T00:00:00Z',
                    company_name: 'Zulu',
                    is_pinned: false,
                    job_status: 'Offer' as const,
                },
                {
                    id: 'pinned-applied',
                    application_date: '2025-04-01T00:00:00Z',
                    company_name: 'Alpha',
                    is_pinned: true,
                    job_status: 'Applied' as const,
                },
                {
                    id: 'unpinned-applied',
                    application_date: '2025-05-01T00:00:00Z',
                    company_name: 'Alpha',
                    is_pinned: false,
                    job_status: 'Applied' as const,
                },
                {
                    id: 'pinned-offer',
                    application_date: '2025-02-01T00:00:00Z',
                    company_name: 'Zulu',
                    is_pinned: true,
                    job_status: 'Offer' as const,
                },
            ];

            expect(sortApplications(pinPriorityApplications, sortOrder).map((application) => application.id)).toEqual(
                expectedOrder
            );
        }
    );

    test('supports archived application shapes, empty arrays, and single items', () => {
        const archivedApplication = {
            archived_job_id: 1,
            application_date: '2025-01-01T00:00:00Z',
            company_name: 'Archived Company',
            is_pinned: true,
            job_status: 'Offer' as const,
        };

        expect(sortApplications([], 'job_status')).toEqual([]);
        expect(sortApplications([archivedApplication], 'application_date_desc')).toEqual([archivedApplication]);
    });
});
