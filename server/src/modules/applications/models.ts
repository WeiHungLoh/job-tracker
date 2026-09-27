import type { ErrorResponse } from '../../shared/http/models.js';

export type JobStatus =
    | 'Accepted'
    | 'Offer'
    | 'Declined'
    | 'Interview'
    | 'Applied'
    | 'Withdrawn'
    | 'Ghosted'
    | 'Rejected';

export type PotentialDuplicateApplication = {
    company_name: string;
    job_title: string;
    application_date: Date;
};

export type CreateApplicationResult =
    | { status: 'created' }
    | { status: 'duplicate'; duplicate: PotentialDuplicateApplication };

export const JOB_STATUSES: readonly JobStatus[] = [
    'Accepted',
    'Applied',
    'Declined',
    'Ghosted',
    'Interview',
    'Offer',
    'Rejected',
    'Withdrawn',
];

export type JobApplication = {
    job_id: number;
    company_name: string;
    job_title: string;
    application_date: Date;
    job_status: JobStatus;
    job_location: string;
    job_posting_url: string;
    notes: string;
    has_offer_evaluation: boolean;
    is_pinned: boolean;
    application_follow_up_sent_at: Date | null;
};

export type ArchivedJobApplication = {
    archived_job_id: number;
    company_name: string;
    job_title: string;
    application_date: Date;
    job_status: JobStatus;
    job_location: string;
    job_posting_url: string;
    notes: string;
    is_pinned: boolean;
    application_follow_up_sent_at: Date | null;
};

export type ApplicationPin = {
    job_id: number;
    is_pinned: boolean;
};

export type JobStatusCount = {
    job_status: JobStatus;
    count: string;
};

export type DashboardApplicationSummary = {
    statusCounts: JobStatusCount[];
    interviewedApplicationCount: number;
};

export type WeeklyApplicationCount = {
    start_of_week: string;
    applications_count: string;
};

export type ApplicationCollectionSummary = {
    application_count: number;
    related_interview_count: number;
    offer_evaluation_count: number;
    counteroffer_plan_count: number;
};

export type ApplicationRelationSummary = {
    related_interview_count: number;
    offer_evaluation_count: number;
    counteroffer_plan_count: number;
};

export type JobIdParams = {
    jobId: string;
};

export type ListApplicationsQuery = {
    jobStatuses?: string | string[];
};

export type ListWeeklyApplicationsQuery = {
    timeZone?: string | string[];
};

export type CreateApplicationRequest = {
    companyName: string;
    jobTitle: string;
    appDate: string | null;
    jobStatus: JobStatus;
    jobLocation: string;
    jobURL: string;
    allowDuplicate?: boolean;
};

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

export type UpdateNotesRequest = {
    notes: string;
};

export type UpdateApplicationStatusRequest = {
    jobStatus: JobStatus;
};

export type UpdateApplicationPinRequest = {
    isPinned: boolean;
};

export type UpdateApplicationPinResponse = ApplicationPin | ErrorResponse;

export type MarkApplicationFollowUpResponse =
    | {
          application_follow_up_sent_at: Date;
      }
    | ErrorResponse;

export type CreateApplicationResponse = string | DuplicateApplicationErrorResponse | ErrorResponse;

export type ListApplicationsResponse = JobApplication[] | ErrorResponse;

export type GetDashboardApplicationSummaryResponse = DashboardApplicationSummary | ErrorResponse;

export type ListWeeklyApplicationsResponse = WeeklyApplicationCount[] | ErrorResponse;

export type GetApplicationCollectionSummaryResponse = ApplicationCollectionSummary | ErrorResponse;

export type GetApplicationRelationSummaryResponse = ApplicationRelationSummary | ErrorResponse;

export type ArchiveApplicationRequest = {
    jobId: number;
};

export type ArchivedJobIdParams = {
    archivedJobId: string;
};

export type ListArchivedApplicationsQuery = {
    jobStatuses?: string | string[];
};

export type ListArchivedApplicationsResponse = ArchivedJobApplication[] | ErrorResponse;

export type GetArchivedApplicationCollectionSummaryResponse = ApplicationCollectionSummary | ErrorResponse;

export type GetArchivedApplicationRelationSummaryResponse = ApplicationRelationSummary | ErrorResponse;
