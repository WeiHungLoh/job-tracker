import type { JobStatus } from '../application/models';
import type { InterviewTimeFilter } from '../../helper/interviewTiming';

export type JobInterview = {
    interview_id: number;
    job_id: number;
    company_name: string;
    job_title: string;
    job_status?: JobStatus;
    interview_date: string;
    interview_duration_minutes: number;
    interview_location: string;
    interview_type: string;
    interview_notes: string;
    meeting_url: string;
    follow_up_sent_at?: string | null;
    is_pinned: boolean;
};

export type ArchivedJobInterview = {
    archived_interview_id: number;
    archived_job_id: number;
    company_name: string;
    job_title: string;
    job_status?: JobStatus;
    interview_date: string;
    interview_duration_minutes: number;
    interview_location: string;
    interview_type: string;
    interview_notes: string;
    meeting_url: string;
    follow_up_sent_at?: string | null;
    is_pinned: boolean;
};

export type ListInterviewsRequest = {
    timeFilters?: InterviewTimeFilter[];
};
export type ListInterviewsResponse = JobInterview[];

export type InterviewCollectionSummary = {
    interview_count: number;
};
export type GetInterviewCollectionSummaryRequest = null;
export type GetInterviewCollectionSummaryResponse = InterviewCollectionSummary;

export type CreateInterviewRequest = {
    jobId: number;
    interviewDate: Date;
    interviewDurationMinutes: number;
    interviewLocation: string;
    interviewType: string;
    meetingURL: string;
    notes: string;
    allowSchedulingConflict?: boolean;
    allowOfferDeadlineWarning?: boolean;
};
export type CreateInterviewResponse = string;

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

export type DeleteInterviewRequest = {
    interviewId: number;
};
export type DeleteInterviewResponse = null;

export type DeleteAllInterviewsRequest = null;
export type DeleteAllInterviewsResponse = null;

export type UpdateInterviewPinRequest = {
    interviewId: number;
    isPinned: boolean;
};
export type UpdateInterviewPinResponse = {
    interview_id: number;
    is_pinned: boolean;
};

export type MarkInterviewFollowUpRequest = {
    interviewId: number;
};
export type MarkInterviewFollowUpResponse = {
    follow_up_sent_at: string;
};
export type UndoInterviewFollowUpRequest = {
    interviewId: number;
};
export type UndoInterviewFollowUpResponse = null;

export type ListArchivedInterviewsRequest = {
    timeFilters?: InterviewTimeFilter[];
};
export type ListArchivedInterviewsResponse = ArchivedJobInterview[];

export type DeleteArchivedInterviewRequest = {
    archivedInterviewId: number;
};
export type DeleteArchivedInterviewResponse = null;

export type DeleteAllArchivedInterviewsRequest = null;
export type DeleteAllArchivedInterviewsResponse = null;

export type InterviewCsvHeader = {
    label: string;
    key: string;
};

export const INTERVIEW_CSV_HEADERS: InterviewCsvHeader[] = [
    { label: 'Company', key: 'company_name' },
    { label: 'Job Title', key: 'job_title' },
    { label: 'Location', key: 'interview_location' },
    { label: 'Interview Date', key: 'interview_date' },
    { label: 'Follow-up Sent', key: 'follow_up_sent_at' },
    { label: 'Duration (minutes)', key: 'interview_duration_minutes' },
    { label: 'Interview Type', key: 'interview_type' },
    { label: 'Meeting URL', key: 'meeting_url' },
    { label: 'Pinned', key: 'is_pinned' },
    { label: 'Additional Notes', key: 'notes' },
];
