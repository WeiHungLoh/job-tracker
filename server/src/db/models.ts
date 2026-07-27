export type JobStatus = 'Accepted' | 'Applied' | 'Declined' | 'Ghosted' | 'Interview' | 'Offer' | 'Rejected';
export type CollectionViewMode = 'list' | 'board';

export type InterviewTimeFilter = 'Upcoming Interviews' | 'Past Interviews';

export const INTERVIEW_TIME_FILTERS: readonly InterviewTimeFilter[] = ['Upcoming Interviews', 'Past Interviews'];

export type OfferDecisionFilter =
    | 'Offers to Evaluate'
    | 'Evaluated Offers'
    | 'Expired Evaluated Offers'
    | 'Previous Evaluations';

export type ArchivedOfferDecisionFilter = Exclude<OfferDecisionFilter, 'Offers to Evaluate'>;

export const OFFER_DECISION_FILTERS: readonly OfferDecisionFilter[] = [
    'Offers to Evaluate',
    'Evaluated Offers',
    'Expired Evaluated Offers',
    'Previous Evaluations',
];

export const ARCHIVED_OFFER_DECISION_FILTERS: readonly ArchivedOfferDecisionFilter[] = [
    'Evaluated Offers',
    'Expired Evaluated Offers',
    'Previous Evaluations',
];

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

export const APPLICATION_LIST_SORT_ORDERS: readonly ApplicationListSortOrder[] = [
    'job_status',
    'application_date_desc',
    'application_date_asc',
    'company_name_asc',
    'company_name_desc',
];

export const APPLICATION_BOARD_SORT_ORDERS: readonly ApplicationBoardSortOrder[] = APPLICATION_LIST_SORT_ORDERS.filter(
    (sortOrder): sortOrder is ApplicationBoardSortOrder => sortOrder !== 'job_status'
);

export const DEFAULT_APPLICATION_LIST_SORT_ORDER: ApplicationListSortOrder = 'job_status';
export const DEFAULT_APPLICATION_BOARD_SORT_ORDER: ApplicationBoardSortOrder = 'application_date_desc';

export const JOB_STATUSES: readonly JobStatus[] = [
    'Accepted',
    'Applied',
    'Declined',
    'Ghosted',
    'Interview',
    'Offer',
    'Rejected',
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
    application_follow_up_sent_at: Date | null;
};

export type JobInterview = {
    interview_id: number;
    job_id: number;
    interview_date: Date;
    interview_duration_minutes: number;
    interview_location: string;
    interview_type: string;
    interview_notes: string;
    company_name: string;
    job_title: string;
    job_status: JobStatus;
    follow_up_sent_at: Date | null;
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

export type InterviewOfferDeadlineWarningRecord = {
    job_id: number;
    company_name: string;
    job_title: string;
    decision_deadline: Date;
};

export type ArchivedJobInterview = {
    archived_interview_id: number;
    archived_job_id: number;
    interview_date: Date;
    interview_duration_minutes: number;
    interview_location: string;
    interview_type: string;
    interview_notes: string;
    company_name: string;
    job_title: string;
    job_status: JobStatus;
    follow_up_sent_at: Date | null;
};

export type JobStatusCount = {
    job_status: JobStatus;
    count: string;
};

export type WeeklyApplicationCount = {
    start_of_week: Date;
    applications_count: string;
};

export type ApplicationCollectionSummary = {
    application_count: number;
    related_interview_count: number;
    offer_evaluation_count: number;
};

export type ApplicationRelationSummary = {
    related_interview_count: number;
    offer_evaluation_count: number;
};

export type OfferDecisionValues = {
    career_growth: number;
    company_culture_fit: number;
    work_life_balance: number;
    compensation: number;
};

export type OfferWorkArrangement = '' | 'Remote' | 'Hybrid' | 'On-site' | 'Flexible';

export const OFFER_WORK_ARRANGEMENTS: readonly Exclude<OfferWorkArrangement, ''>[] = [
    'Remote',
    'Hybrid',
    'On-site',
    'Flexible',
];

export type OfferDetails = {
    currency: string;
    monthly_base_salary: number | null;
    bonus: string;
    annual_leave_days: number | null;
    work_arrangement: OfferWorkArrangement;
    decision_deadline: string;
    pros: string;
    concerns: string;
};

export type OfferEvaluationInput = {
    ratings: OfferDecisionValues;
    details: OfferDetails;
};

export type OfferEvaluation = {
    job_id: number;
    ratings: OfferDecisionValues;
    details: OfferDetails;
};

export type OfferDecisionApplication = {
    job_id: number;
    company_name: string;
    job_title: string;
    job_status: JobStatus;
    application_date: string;
    evaluation: OfferEvaluation | null;
    has_counteroffer_plan: boolean;
};

export type OfferDecisionWorkspace = {
    applications: OfferDecisionApplication[];
};

export type CounterofferPlanInput = {
    monthly_base_salary: number;
    bonus: string;
    annual_leave_days: number | null;
    work_arrangement: OfferWorkArrangement;
    ratings: OfferDecisionValues;
};

export type CounterofferPlan = CounterofferPlanInput;

export type InterviewCollectionSummary = {
    interview_count: number;
};

export type User = {
    user_id: number;
    email: string;
    hashed_password: string;
};

export type AuthenticationSession = {
    session_id: string;
    user_id: number;
    refresh_token_hash: string;
    created_at: Date;
    expires_at: Date;
};

export type UserPreferences = {
    application_job_statuses: JobStatus[];
    application_show_notes: boolean;
    application_show_archive: boolean;
    application_enable_scroll: boolean;
    application_view_mode: CollectionViewMode;
    application_list_sort_order: ApplicationListSortOrder;
    application_board_sort_order: ApplicationBoardSortOrder;
    archived_application_job_statuses: JobStatus[];
    archived_application_show_notes: boolean;
    archived_application_view_mode: CollectionViewMode;
    archived_application_list_sort_order: ApplicationListSortOrder;
    archived_application_board_sort_order: ApplicationBoardSortOrder;
    interview_view_mode: CollectionViewMode;
    archived_interview_view_mode: CollectionViewMode;
    interview_time_filters: InterviewTimeFilter[];
    archived_interview_time_filters: InterviewTimeFilter[];
    offer_decision_filters: OfferDecisionFilter[];
    archived_offer_decision_filters: ArchivedOfferDecisionFilter[];
};
