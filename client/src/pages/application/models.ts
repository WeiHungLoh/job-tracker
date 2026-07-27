import type { SortOption } from '../../components/activityControls/sortOptions/models';

export type JobStatus = 'Accepted' | 'Applied' | 'Declined' | 'Ghosted' | 'Interview' | 'Offer' | 'Rejected';

export type JobStatusCount = {
    job_status: JobStatus;
    count: string;
};

export type WeeklyApplicationCount = {
    start_of_week: string;
    applications_count: string;
};

export type ApplicationListSortOrder =
    | 'job_status'
    | 'application_date_desc'
    | 'application_date_asc'
    | 'company_name_asc'
    | 'company_name_desc';

export type ApplicationBoardSortOrder =
    | 'application_date_desc'
    | 'application_date_asc'
    | 'company_name_asc'
    | 'company_name_desc';

export const DEFAULT_APPLICATION_LIST_SORT_ORDER: ApplicationListSortOrder = 'job_status';
export const DEFAULT_APPLICATION_BOARD_SORT_ORDER: ApplicationBoardSortOrder = 'application_date_desc';

export const APPLICATION_LIST_SORT_OPTIONS: readonly SortOption<ApplicationListSortOrder>[] = [
    { label: 'Job Status', value: 'job_status' },
    { label: 'Newest Application', value: 'application_date_desc' },
    { label: 'Oldest Application', value: 'application_date_asc' },
    { label: 'Company A–Z', value: 'company_name_asc' },
    { label: 'Company Z–A', value: 'company_name_desc' },
];

export const APPLICATION_BOARD_SORT_OPTIONS: readonly SortOption<ApplicationBoardSortOrder>[] =
    APPLICATION_LIST_SORT_OPTIONS.filter(
        (option): option is SortOption<ApplicationBoardSortOrder> => option.value !== 'job_status'
    );

export const JOB_STATUSES: readonly JobStatus[] = [
    'Accepted',
    'Applied',
    'Declined',
    'Ghosted',
    'Interview',
    'Offer',
    'Rejected',
];

export const JOB_STATUS_SORT_ORDER: readonly JobStatus[] = [
    'Accepted',
    'Offer',
    'Declined',
    'Interview',
    'Applied',
    'Ghosted',
    'Rejected',
];

export const JOB_STATUS_ORDER = JOB_STATUS_SORT_ORDER.reduce(
    (order, status, index) => ({ ...order, [status]: index + 1 }),
    {} as Record<JobStatus, number>
);

export type JobApplication = {
    job_id: number;
    company_name: string;
    job_title: string;
    application_date: string;
    job_status: JobStatus;
    job_location: string;
    job_posting_url: string;
    notes: string;
    has_offer_evaluation?: boolean;
    application_follow_up_sent_at?: string | null;
};

export type ArchivedJobApplication = {
    archived_job_id: number;
    company_name: string;
    job_title: string;
    application_date: string;
    job_status: JobStatus;
    job_location: string;
    job_posting_url: string;
    notes: string;
    application_follow_up_sent_at?: string | null;
};

export type ListApplicationsRequest = {
    jobStatuses: JobStatus[];
};
export type ListApplicationsResponse = JobApplication[];

export type ListWeeklyApplicationsRequest = null;
export type ListWeeklyApplicationsResponse = WeeklyApplicationCount[];

export type ListJobStatusCountsRequest = null;
export type ListJobStatusCountsResponse = JobStatusCount[];

export type ApplicationCollectionSummary = {
    application_count: number;
    related_interview_count: number;
    offer_evaluation_count: number;
};
export type GetApplicationCollectionSummaryRequest = null;
export type GetApplicationCollectionSummaryResponse = ApplicationCollectionSummary;

export type ApplicationRelationSummary = {
    related_interview_count: number;
    offer_evaluation_count: number;
};
export type GetApplicationRelationSummaryRequest = {
    jobId: number;
};
export type GetApplicationRelationSummaryResponse = ApplicationRelationSummary;
export type GetArchivedApplicationRelationSummaryRequest = {
    archivedJobId: number;
};
export type GetArchivedApplicationRelationSummaryResponse = ApplicationRelationSummary;

export type DuplicateApplicationCode = 'POSSIBLE_DUPLICATE_APPLICATION';

export type DuplicateApplicationDetails = {
    company_name: string;
    job_title: string;
    application_date: string;
};

export type DuplicateApplicationErrorResponse = {
    code: DuplicateApplicationCode;
    message: string;
    duplicate: DuplicateApplicationDetails;
};

export type CreateApplicationRequest = {
    companyName: string;
    jobTitle: string;
    appDate: Date;
    jobStatus: JobStatus;
    jobLocation: string;
    jobURL: string;
    allowDuplicate?: boolean;
};
export type CreateApplicationResponse = string;

export type DeleteApplicationRequest = {
    jobId: number;
};
export type DeleteApplicationResponse = null;

export type DeleteAllApplicationsRequest = null;
export type DeleteAllApplicationsResponse = null;

export type UpdateNotesRequest = {
    jobId: number;
    notes: string;
};
export type UpdateNotesResponse = null;

export type UpdateApplicationStatusRequest = {
    jobId: number;
    jobStatus: JobStatus;
};
export type UpdateApplicationStatusResponse = null;

export type MarkApplicationFollowUpRequest = {
    jobId: number;
};
export type MarkApplicationFollowUpResponse = {
    application_follow_up_sent_at: string;
};
export type UndoApplicationFollowUpRequest = {
    jobId: number;
};
export type UndoApplicationFollowUpResponse = null;

export type ListArchivedApplicationsRequest = {
    jobStatuses: JobStatus[];
};
export type ListArchivedApplicationsResponse = ArchivedJobApplication[];

export type ArchiveApplicationRequest = {
    jobId: number;
};
export type ArchiveApplicationResponse = null;
export type ArchiveAllApplicationsRequest = null;
export type ArchiveAllApplicationsResponse = null;

export type DeleteArchivedApplicationRequest = {
    archivedJobId: number;
};
export type DeleteArchivedApplicationResponse = null;

export type DeleteAllArchivedApplicationsRequest = null;
export type DeleteAllArchivedApplicationsResponse = null;

export type UnarchiveApplicationRequest = {
    archivedJobId: number;
};
export type UnarchiveApplicationResponse = null;
export type UnarchiveAllApplicationsRequest = null;
export type UnarchiveAllApplicationsResponse = null;

export type ApplicationCsvHeader = {
    label: string;
    key: string;
};

export const APPLICATION_CSV_HEADERS: ApplicationCsvHeader[] = [
    { label: 'Company', key: 'company_name' },
    { label: 'Job Title', key: 'job_title' },
    { label: 'Application Date', key: 'application_date' },
    { label: 'Status', key: 'job_status' },
    { label: 'Location', key: 'job_location' },
    { label: 'Job URL', key: 'job_posting_url' },
    { label: 'Notes', key: 'notes' },
];
