import type { ErrorResponse } from '../../shared/http/models.js';
import type { JobStatus } from '../applications/api.js';
import type { InterviewOfferDeadlineWarningRecord } from '../offers/api.js';

export type InterviewTimeFilter = 'Upcoming Interviews' | 'Past Interviews';

export type InsertInterviewResult = 'application-ineligible' | 'created' | 'invalid-date' | 'not-found';

export type CreateInterviewResult =
    | { status: InsertInterviewResult }
    | { status: 'scheduling-conflict'; conflicts: InterviewSchedulingConflictRecord[] }
    | { status: 'offer-deadline-warning'; warnings: InterviewOfferDeadlineWarningRecord[] };

export const INTERVIEW_TIME_FILTERS: readonly InterviewTimeFilter[] = ['Upcoming Interviews', 'Past Interviews'];

export type JobInterview = {
    interview_id: number;
    job_id: number;
    interview_date: Date;
    interview_duration_minutes: number;
    interview_location: string;
    interview_type: string;
    interview_notes: string;
    meeting_url: string;
    company_name: string;
    job_title: string;
    job_status: JobStatus;
    follow_up_sent_at: Date | null;
    is_pinned: boolean;
};

export type InterviewPin = {
    interview_id: number;
    is_pinned: boolean;
};

export type InterviewSchedulingConflictRecord = {
    interview_id: number;
    job_id: number;
    company_name: string;
    job_title: string;
    interview_date: Date;
    interview_duration_minutes: number;
    interview_type: string;
};

export type ArchivedJobInterview = {
    archived_interview_id: number;
    archived_job_id: number;
    interview_date: Date;
    interview_duration_minutes: number;
    interview_location: string;
    interview_type: string;
    interview_notes: string;
    meeting_url: string;
    company_name: string;
    job_title: string;
    job_status: JobStatus;
    follow_up_sent_at: Date | null;
    is_pinned: boolean;
};

export type InterviewCollectionSummary = {
    interview_count: number;
};

export type ArchivedInterviewIdParams = {
    archivedInterviewId: string;
};

export type ListArchivedInterviewsQuery = {
    timeFilters?: string | string[];
};

export type ListArchivedInterviewsResponse = ArchivedJobInterview[] | ErrorResponse;

export type GetArchivedInterviewCollectionSummaryResponse = InterviewCollectionSummary | ErrorResponse;

export type InterviewIdParams = {
    interviewId: string;
};

export type ListInterviewsQuery = {
    timeFilters?: string | string[];
};

export type CreateInterviewRequest = {
    jobId: number;
    interviewDate: string;
    interviewDurationMinutes: number;
    interviewLocation: string;
    interviewType: string;
    meetingURL?: string;
    notes: string;
    allowSchedulingConflict?: boolean;
    allowOfferDeadlineWarning?: boolean;
};

export type InterviewSchedulingConflictCode = 'INTERVIEW_SCHEDULING_CONFLICT';

export type InterviewSchedulingConflict = {
    interview_id: number;
    job_id: number;
    company_name: string;
    job_title: string;
    interview_date: string;
    interview_duration_minutes: number;
    interview_type: string;
};

export type InterviewSchedulingConflictResponse = {
    code: InterviewSchedulingConflictCode;
    message: string;
    conflicts: InterviewSchedulingConflict[];
};

export type InterviewOfferDeadlineWarningCode = 'INTERVIEW_OFFER_DEADLINE_WARNING';

export type InterviewOfferDeadlineWarning = {
    job_id: number;
    company_name: string;
    job_title: string;
    decision_deadline: string;
};

export type InterviewOfferDeadlineWarningResponse = {
    code: InterviewOfferDeadlineWarningCode;
    message: string;
    warnings: InterviewOfferDeadlineWarning[];
};

export type CreateInterviewResponse =
    | string
    | InterviewSchedulingConflictResponse
    | InterviewOfferDeadlineWarningResponse
    | ErrorResponse;

export type ListInterviewsResponse = JobInterview[] | ErrorResponse;

export type GetInterviewCollectionSummaryResponse = InterviewCollectionSummary | ErrorResponse;

export type UpdateInterviewPinRequest = {
    isPinned: boolean;
};

export type UpdateInterviewPinResponse = InterviewPin | ErrorResponse;

export type UpdateInterviewNotesRequest = {
    notes: string;
};

export type MarkInterviewFollowUpResponse =
    | {
          follow_up_sent_at: Date;
      }
    | ErrorResponse;
