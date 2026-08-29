import type {
    ApplicationPin,
    ApplicationCollectionSummary,
    ApplicationRelationSummary,
    JobApplication,
    JobStatus,
    WeeklyApplicationCount,
    DashboardApplicationSummary,
} from '../../db/models.js';
import type { ErrorResponse } from '../../http/models.js';
export type { EmptyResponse } from '../../http/models.js';

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
