import type { CodedErrorResponse, EmptyResponse, ErrorResponse } from '../../shared/http/models.js';
import type { JobStatus } from '../applications/api.js';

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

export type InterviewOfferDeadlineWarningRecord = {
    job_id: number;
    company_name: string;
    job_title: string;
    decision_deadline: Date;
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

export type SaveOfferEvaluationInput = OfferEvaluationInput & {
    deleteCounterofferPlan?: boolean;
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
    counteroffer_plan: CounterofferPlan | null;
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

export type SaveOfferEvaluationRequest = SaveOfferEvaluationInput;

export type GetOfferDecisionsQuery = {
    filters?: string | string[];
};

export type GetOfferDecisionsResponse = OfferDecisionWorkspace | ErrorResponse;

export type SaveOfferEvaluationResponse = EmptyResponse | CodedErrorResponse;

export type DeleteOfferEvaluationResponse = EmptyResponse | ErrorResponse;

export type DeleteAllOfferEvaluationsResponse = EmptyResponse | ErrorResponse;

export type SaveCounterofferPlanRequest = CounterofferPlanInput;

export type GetCounterofferPlanResponse = CounterofferPlan | CodedErrorResponse;

export type SaveCounterofferPlanResponse = EmptyResponse | CodedErrorResponse;

export type DeleteCounterofferPlanResponse = EmptyResponse | CodedErrorResponse;

export type LockedApplicationRow = {
    job_id: number;
    job_status: JobStatus;
    application_date: Date | string;
};

export type OfferEvaluationRow = {
    career_growth_rating: number;
    company_culture_fit_rating: number;
    work_life_balance_rating: number;
    compensation_rating: number;
    currency: string;
    monthly_base_salary: number;
    bonus: string;
    annual_leave_days: number | null;
    work_arrangement: OfferWorkArrangement;
    decision_deadline: Date | string;
    pros: string;
    concerns: string;
};

export type CounterofferPlanRow = {
    monthly_base_salary: number;
    bonus: string;
    annual_leave_days: number | null;
    work_arrangement: OfferWorkArrangement;
    career_growth_rating: number;
    company_culture_fit_rating: number;
    work_life_balance_rating: number;
    compensation_rating: number;
};

export type LockedCounterofferEvaluationRow = CounterofferPlanRow & {
    job_id: number;
    job_status: JobStatus;
    is_archived: boolean;
    decision_deadline: Date | string;
};

export type SaveOfferEvaluationResult =
    | 'saved'
    | 'application_unavailable'
    | 'application_ineligible'
    | 'evaluation_above_counteroffer'
    | 'unchanged'
    | 'deadline_before_application';

export type SaveCounterofferPlanResult =
    | 'saved'
    | 'evaluation_not_found'
    | 'application_ineligible'
    | 'decision_window_expired'
    | 'fit_below_current'
    | 'unchanged_from_current'
    | 'unchanged_from_saved';
