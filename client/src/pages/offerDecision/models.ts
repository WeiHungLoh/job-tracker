import type { JobStatus } from '../application/models';

export type OfferDecisionCategory = 'career_growth' | 'company_culture_fit' | 'work_life_balance' | 'compensation';

export type OfferDecisionRating = 1 | 2 | 3 | 4 | 5;

export type OfferDecisionCategoryConfig = {
    key: OfferDecisionCategory;
    label: string;
};

export type OfferDecisionValues = {
    career_growth: OfferDecisionRating;
    company_culture_fit: OfferDecisionRating;
    work_life_balance: OfferDecisionRating;
    compensation: OfferDecisionRating;
};

export type OfferWorkArrangement = '' | 'Remote' | 'Hybrid' | 'On-site' | 'Flexible';

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
    has_counteroffer_plan?: boolean;
    counteroffer_plan?: CounterofferPlan | null;
};

export type OfferDecisionWorkspaceData = {
    applications: OfferDecisionApplication[];
};

export type OfferDecisionFilter =
    | 'Offers to Evaluate'
    | 'Evaluated Offers'
    | 'Expired Evaluated Offers'
    | 'Previous Evaluations';

export type OfferDecisionStatus = 'Accepted' | 'Declined' | 'Offer';

export type OfferDecisionViewMode = 'cards' | 'table';
export type OfferDecisionTableOrientation = 'horizontal' | 'vertical';

export type ArchivedOfferDecisionFilter = Exclude<OfferDecisionFilter, 'Offers to Evaluate'>;

export type OfferDecisionGroups = Record<OfferDecisionFilter, OfferDecisionApplication[]>;

export type SaveOfferEvaluationRequest = {
    ratings: OfferDecisionValues;
    details: OfferDetails;
    deleteCounterofferPlan?: boolean;
};

export type SaveOfferEvaluationAPIRequest = SaveOfferEvaluationRequest & {
    jobId: number;
};

export type OfferEvaluationFormErrors = {
    ratings?: string;
    currency?: string;
    monthly_base_salary?: string;
    bonus?: string;
    annual_leave_days?: string;
    work_arrangement?: string;
    decision_deadline?: string;
    pros?: string;
    concerns?: string;
};

export type ValidOfferEvaluation = {
    isValid: true;
    values: SaveOfferEvaluationRequest;
};

export type InvalidOfferEvaluation = {
    isValid: false;
    errors: OfferEvaluationFormErrors;
};

export type OfferEvaluationValidationResult = ValidOfferEvaluation | InvalidOfferEvaluation;

export type GetActiveOfferDecisionsRequest = {
    filters: OfferDecisionFilter[];
};
export type GetArchivedOfferDecisionsRequest = {
    filters: ArchivedOfferDecisionFilter[];
};
export type GetOfferDecisionsResponse = OfferDecisionWorkspaceData;
export type SaveOfferEvaluationResponse = null;
export type DeleteOfferEvaluationRequest = { jobId: number };
export type DeleteOfferEvaluationResponse = null;
export type DeleteAllOfferEvaluationsRequest = null;
export type DeleteAllOfferEvaluationsResponse = null;

export type OfferEvaluationDeletionSummary = {
    evaluationCount: number;
    counterofferPlanCount: number;
};

export type OfferDecisionWorkspaceProps = {
    data: OfferDecisionWorkspaceData;
    getDeleteAllEvaluationSummary?: () => Promise<OfferEvaluationDeletionSummary>;
    isFiltering?: boolean;
    isLoading?: boolean;
    onDeleteCounterofferPlan?: (jobId: number) => Promise<void>;
    onDelete?: (jobId: number) => Promise<void>;
    onDeleteAll?: () => Promise<void>;
    onFilterSelectionChange?: (filters: OfferDecisionFilter[]) => Promise<boolean>;
    onGetCounterofferPlan?: (jobId: number) => Promise<CounterofferPlan>;
    loadAllEvaluatedOffers?: () => Promise<OfferDecisionApplication[]>;
    onSave?: (jobId: number, request: SaveOfferEvaluationRequest) => Promise<void>;
    onSaveCounterofferPlan?: (jobId: number, request: SaveCounterofferPlanRequest) => Promise<void>;
    onTargetOfferProcessed?: () => void;
    onUpdateOfferStatus?: (application: OfferDecisionApplication, status: OfferDecisionStatus) => Promise<void>;
    readOnly: boolean;
    selectedFilters?: OfferDecisionFilter[];
    targetOfferJobId?: number;
};

export type CounterofferPlan = {
    monthly_base_salary: number;
    bonus: string;
    annual_leave_days: number | null;
    work_arrangement: OfferWorkArrangement;
    ratings: OfferDecisionValues;
};

export type SaveCounterofferPlanRequest = CounterofferPlan;

export type CounterofferPlanErrors = {
    annual_leave_days?: string;
    bonus?: string;
    fit_rating?: string;
    monthly_base_salary?: string;
    ratings?: string;
    unchanged?: string;
    work_arrangement?: string;
};

export type ValidCounterofferPlan = {
    isValid: true;
    request: SaveCounterofferPlanRequest;
};

export type InvalidCounterofferPlan = {
    isValid: false;
    errors: CounterofferPlanErrors;
};

export type CounterofferPlanValidationResult = ValidCounterofferPlan | InvalidCounterofferPlan;

export type GetCounterofferPlanRequest = { jobId: number };
export type GetCounterofferPlanResponse = CounterofferPlan;
export type SaveCounterofferPlanAPIRequest = SaveCounterofferPlanRequest & { jobId: number };
export type SaveCounterofferPlanResponse = null;
export type DeleteCounterofferPlanRequest = { jobId: number };
export type DeleteCounterofferPlanResponse = null;
