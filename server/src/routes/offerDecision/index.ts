import type {
    DeleteAllOfferEvaluationsResponse,
    DeleteOfferEvaluationResponse,
    DeleteCounterofferPlanResponse,
    GetCounterofferPlanResponse,
    GetOfferDecisionsQuery,
    GetOfferDecisionsResponse,
    SaveOfferEvaluationRequest,
    SaveOfferEvaluationResponse,
    SaveCounterofferPlanRequest,
    SaveCounterofferPlanResponse,
} from './models.js';
import type { Request, Response } from 'express';
import {
    deleteAllOfferEvaluations,
    deleteCounterofferPlan,
    deleteOfferEvaluation,
    getCounterofferPlan,
    getOfferDecisionWorkspace,
    saveOfferEvaluation,
    saveCounterofferPlan,
} from '../../db/queries/offerDecisions.js';
import { handleCodedRouteError, handleRouteError, sendCodedError, sendError } from '../../http/responses.js';
import {
    isSaveCounterofferPlanRequest,
    isSaveOfferEvaluationRequest,
    toOfferDecisionFilterQueryValues,
    toPositiveInteger,
} from '../../http/validation.js';
import express from 'express';

const router = express.Router();

const createDeleteAllHandler =
    (isArchived: boolean) =>
    async (
        req: Request<Record<string, never>, DeleteAllOfferEvaluationsResponse>,
        res: Response<DeleteAllOfferEvaluationsResponse>
    ): Promise<void> => {
        try {
            await deleteAllOfferEvaluations(req.user.id, isArchived);
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(
                res,
                error,
                isArchived
                    ? 'Unable to delete archived offer evaluations.'
                    : 'Unable to delete active offer evaluations.'
            );
        }
    };

router.get(
    '/',
    async (
        req: Request<Record<string, never>, GetOfferDecisionsResponse, Record<string, never>, GetOfferDecisionsQuery>,
        res: Response<GetOfferDecisionsResponse>
    ): Promise<void> => {
        const filters = toOfferDecisionFilterQueryValues(req.query.filters, false);
        if (filters === undefined) {
            sendError(res, 422, 'Each offer comparison filter must be supported.');
            return;
        }

        try {
            res.status(200).json(await getOfferDecisionWorkspace(req.user.id, false, filters));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load offer comparisons.');
        }
    }
);

router.get(
    '/archived',
    async (
        req: Request<Record<string, never>, GetOfferDecisionsResponse, Record<string, never>, GetOfferDecisionsQuery>,
        res: Response<GetOfferDecisionsResponse>
    ): Promise<void> => {
        const filters = toOfferDecisionFilterQueryValues(req.query.filters, true);
        if (filters === undefined) {
            sendError(res, 422, 'Each offer comparison filter must be supported.');
            return;
        }

        try {
            res.status(200).json(await getOfferDecisionWorkspace(req.user.id, true, filters));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load archived offer comparisons.');
        }
    }
);

router.delete('/', createDeleteAllHandler(false));
router.delete('/archived', createDeleteAllHandler(true));

router.get(
    '/:jobId/counteroffer-plan',
    async (
        req: Request<{ jobId: string }, GetCounterofferPlanResponse>,
        res: Response<GetCounterofferPlanResponse>
    ): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendCodedError(res, 422, 'INVALID_APPLICATION_ID', 'Application ID is invalid.');
            return;
        }

        try {
            const plan = await getCounterofferPlan(req.user.id, jobId);
            if (!plan) {
                sendCodedError(res, 404, 'COUNTEROFFER_PLAN_NOT_FOUND', 'Counteroffer plan was not found.');
                return;
            }

            res.status(200).json(plan);
        } catch (error: unknown) {
            handleCodedRouteError(res, error, 'COUNTEROFFER_DATABASE_FAILURE', 'Unable to load counteroffer plan.');
        }
    }
);

router.put(
    '/:jobId/counteroffer-plan',
    async (
        req: Request<{ jobId: string }, SaveCounterofferPlanResponse, SaveCounterofferPlanRequest>,
        res: Response<SaveCounterofferPlanResponse>
    ): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendCodedError(res, 422, 'INVALID_APPLICATION_ID', 'Application ID is invalid.');
            return;
        }
        if (!isSaveCounterofferPlanRequest(req.body)) {
            sendCodedError(res, 422, 'INVALID_COUNTEROFFER_PLAN', 'Counteroffer plan fields are missing or invalid.');
            return;
        }

        try {
            const result = await saveCounterofferPlan(req.user.id, jobId, req.body);
            if (result === 'evaluation_not_found') {
                sendCodedError(res, 404, 'OFFER_EVALUATION_NOT_FOUND', 'Offer evaluation was not found.');
                return;
            }
            if (result === 'application_ineligible') {
                sendCodedError(
                    res,
                    409,
                    'COUNTEROFFER_APPLICATION_INELIGIBLE',
                    'Counteroffer plans can only be edited for active, non-archived applications with Offer status.'
                );
                return;
            }
            if (result === 'decision_window_expired') {
                sendCodedError(
                    res,
                    409,
                    'COUNTEROFFER_DECISION_WINDOW_EXPIRED',
                    'The offer decision window has expired. This counteroffer plan is now read-only.'
                );
                return;
            }
            if (result === 'fit_below_current') {
                sendCodedError(
                    res,
                    422,
                    'COUNTEROFFER_FIT_BELOW_CURRENT',
                    'The Ideal offer must have a fit rating at least as high as the current offer.'
                );
                return;
            }
            if (result === 'unchanged_from_current') {
                sendCodedError(
                    res,
                    422,
                    'COUNTEROFFER_PLAN_UNCHANGED',
                    'Change at least one term or rating for the Ideal offer.'
                );
                return;
            }

            res.sendStatus(204);
        } catch (error: unknown) {
            handleCodedRouteError(res, error, 'COUNTEROFFER_DATABASE_FAILURE', 'Unable to save counteroffer plan.');
        }
    }
);

router.delete(
    '/:jobId/counteroffer-plan',
    async (
        req: Request<{ jobId: string }, DeleteCounterofferPlanResponse>,
        res: Response<DeleteCounterofferPlanResponse>
    ): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendCodedError(res, 422, 'INVALID_APPLICATION_ID', 'Application ID is invalid.');
            return;
        }

        try {
            if (!(await deleteCounterofferPlan(req.user.id, jobId))) {
                sendCodedError(res, 404, 'COUNTEROFFER_PLAN_NOT_FOUND', 'Counteroffer plan was not found.');
                return;
            }

            res.sendStatus(204);
        } catch (error: unknown) {
            handleCodedRouteError(res, error, 'COUNTEROFFER_DATABASE_FAILURE', 'Unable to delete counteroffer plan.');
        }
    }
);

router.put(
    '/:jobId',
    async (
        req: Request<{ jobId: string }, SaveOfferEvaluationResponse, SaveOfferEvaluationRequest>,
        res: Response<SaveOfferEvaluationResponse>
    ): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendError(res, 422, 'Application ID is invalid.');
            return;
        }
        if (!isSaveOfferEvaluationRequest(req.body)) {
            sendError(res, 422, 'Offer evaluation fields are missing or invalid.');
            return;
        }

        try {
            const result = await saveOfferEvaluation(req.user.id, jobId, req.body);
            if (result === 'application_unavailable') {
                sendError(res, 409, 'Only active applications with Offer status can be saved.');
                return;
            }
            if (result === 'deadline_before_application') {
                sendError(res, 422, 'Decision deadline cannot be earlier than the application date.');
                return;
            }
            if (result === 'counteroffer_above_evaluation') {
                sendCodedError(
                    res,
                    409,
                    'OFFER_EVALUATION_BELOW_COUNTEROFFER',
                    'This evaluation fit rating is lower than the saved counteroffer plan. Confirm deletion of the counteroffer plan before saving.'
                );
                return;
            }

            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to save offer evaluation.');
        }
    }
);

router.delete(
    '/:jobId',
    async (
        req: Request<{ jobId: string }, DeleteOfferEvaluationResponse>,
        res: Response<DeleteOfferEvaluationResponse>
    ): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendError(res, 422, 'Application ID is invalid.');
            return;
        }

        try {
            if (!(await deleteOfferEvaluation(req.user.id, jobId))) {
                sendError(res, 404, 'Offer evaluation was not found.');
                return;
            }

            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to delete offer evaluation.');
        }
    }
);

export default router;
