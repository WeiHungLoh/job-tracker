import type {
    CounterofferPlan,
    CounterofferPlanInput,
    OfferDecisionWorkspace,
    OfferEvaluationInput,
} from '../../db/models.js';
import type { CodedErrorResponse, EmptyResponse, ErrorResponse } from '../../http/models.js';

export type SaveOfferEvaluationRequest = OfferEvaluationInput;

export type GetOfferDecisionsQuery = {
    filters?: string | string[];
};

export type GetOfferDecisionsResponse = OfferDecisionWorkspace | ErrorResponse;
export type SaveOfferEvaluationResponse = EmptyResponse | ErrorResponse;
export type DeleteOfferEvaluationResponse = EmptyResponse | ErrorResponse;
export type DeleteAllOfferEvaluationsResponse = EmptyResponse | ErrorResponse;
export type SaveCounterofferPlanRequest = CounterofferPlanInput;
export type GetCounterofferPlanResponse = CounterofferPlan | CodedErrorResponse;
export type SaveCounterofferPlanResponse = EmptyResponse | CodedErrorResponse;
export type DeleteCounterofferPlanResponse = EmptyResponse | CodedErrorResponse;
