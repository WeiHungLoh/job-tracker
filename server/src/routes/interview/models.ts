import type { ErrorResponse } from '../../http/models.js';
export type { EmptyResponse } from '../../http/models.js';
import type { InterviewCollectionSummary, InterviewPin, JobInterview } from '../../db/models.js';

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
export type MarkInterviewFollowUpResponse =
    | {
          follow_up_sent_at: Date;
      }
    | ErrorResponse;
