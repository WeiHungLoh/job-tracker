import { pool } from '../../shared/db/connectDB.js';
import { OFFER_DECISION_VALUE_MAX } from './config.js';
import type {
    CounterofferPlanInput,
    CounterofferPlanRow,
    OfferDecisionValues,
    OfferEvaluationInput,
    OfferEvaluationRow,
    SaveCounterofferPlanResult,
    SaveOfferEvaluationInput,
    SaveOfferEvaluationResult,
} from './models.js';
import {
    deleteCounterofferPlanInTransaction,
    lockCounterofferEvaluation,
    lockCounterofferPlan,
    lockOfferApplication,
    lockOfferEvaluation,
    upsertCounterofferPlan,
    upsertOfferEvaluation,
} from './repository.js';

const calculateOfferDecisionScore = (ratings: OfferDecisionValues): number => {
    const total =
        ratings.career_growth + ratings.company_culture_fit + ratings.work_life_balance + ratings.compensation;
    return Math.round((total / (4 * OFFER_DECISION_VALUE_MAX)) * 100);
};

const counterofferPlanMatchesEvaluation = (plan: CounterofferPlanInput, evaluation: CounterofferPlanRow): boolean =>
    plan.monthly_base_salary === Number(evaluation.monthly_base_salary) &&
    plan.bonus === evaluation.bonus &&
    plan.annual_leave_days === evaluation.annual_leave_days &&
    plan.work_arrangement === evaluation.work_arrangement &&
    plan.ratings.career_growth === Number(evaluation.career_growth_rating) &&
    plan.ratings.company_culture_fit === Number(evaluation.company_culture_fit_rating) &&
    plan.ratings.work_life_balance === Number(evaluation.work_life_balance_rating) &&
    plan.ratings.compensation === Number(evaluation.compensation_rating);

const offerEvaluationMatchesRequest = (request: OfferEvaluationInput, evaluation: OfferEvaluationRow): boolean =>
    request.ratings.career_growth === Number(evaluation.career_growth_rating) &&
    request.ratings.company_culture_fit === Number(evaluation.company_culture_fit_rating) &&
    request.ratings.work_life_balance === Number(evaluation.work_life_balance_rating) &&
    request.ratings.compensation === Number(evaluation.compensation_rating) &&
    request.details.currency === evaluation.currency &&
    request.details.monthly_base_salary === Number(evaluation.monthly_base_salary) &&
    request.details.bonus === evaluation.bonus &&
    request.details.annual_leave_days === evaluation.annual_leave_days &&
    request.details.work_arrangement === evaluation.work_arrangement &&
    new Date(request.details.decision_deadline).getTime() === new Date(evaluation.decision_deadline).getTime() &&
    request.details.pros === evaluation.pros &&
    request.details.concerns === evaluation.concerns;

export const saveCounterofferPlan = async (
    userId: number,
    jobId: number,
    request: CounterofferPlanInput
): Promise<SaveCounterofferPlanResult> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const currentOffer = await lockCounterofferEvaluation(client, userId, jobId);

        if (!currentOffer) {
            await client.query('ROLLBACK');
            return 'evaluation_not_found';
        }
        if (currentOffer.is_archived || currentOffer.job_status !== 'Offer') {
            await client.query('ROLLBACK');
            return 'application_ineligible';
        }
        if (new Date(currentOffer.decision_deadline).getTime() < Date.now()) {
            await client.query('ROLLBACK');
            return 'decision_window_expired';
        }
        const currentFitRating = calculateOfferDecisionScore({
            career_growth: Number(currentOffer.career_growth_rating),
            company_culture_fit: Number(currentOffer.company_culture_fit_rating),
            work_life_balance: Number(currentOffer.work_life_balance_rating),
            compensation: Number(currentOffer.compensation_rating),
        });
        if (calculateOfferDecisionScore(request.ratings) < currentFitRating) {
            await client.query('ROLLBACK');
            return 'fit_below_current';
        }
        if (counterofferPlanMatchesEvaluation(request, currentOffer)) {
            await client.query('ROLLBACK');
            return 'unchanged_from_current';
        }

        const savedPlan = await lockCounterofferPlan(client, userId, jobId);
        if (savedPlan && counterofferPlanMatchesEvaluation(request, savedPlan)) {
            await client.query('ROLLBACK');
            return 'unchanged_from_saved';
        }

        await upsertCounterofferPlan(client, userId, jobId, request);
        await client.query('COMMIT');
        return 'saved';
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const saveOfferEvaluation = async (
    userId: number,
    jobId: number,
    request: SaveOfferEvaluationInput
): Promise<SaveOfferEvaluationResult> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const application = await lockOfferApplication(client, userId, jobId);

        if (!application) {
            await client.query('ROLLBACK');
            return 'application_unavailable';
        }

        if (
            application.job_status !== 'Offer' &&
            application.job_status !== 'Accepted' &&
            application.job_status !== 'Declined'
        ) {
            await client.query('ROLLBACK');
            return 'application_ineligible';
        }

        if (new Date(request.details.decision_deadline).getTime() < new Date(application.application_date).getTime()) {
            await client.query('ROLLBACK');
            return 'deadline_before_application';
        }

        const existingEvaluation = await lockOfferEvaluation(client, userId, jobId);
        if (existingEvaluation && offerEvaluationMatchesRequest(request, existingEvaluation)) {
            await client.query('ROLLBACK');
            return 'unchanged';
        }

        const counterofferPlan = await lockCounterofferPlan(client, userId, jobId);
        const evaluationFitRating = calculateOfferDecisionScore(request.ratings);
        const counterofferFitRating = counterofferPlan
            ? calculateOfferDecisionScore({
                  career_growth: Number(counterofferPlan.career_growth_rating),
                  company_culture_fit: Number(counterofferPlan.company_culture_fit_rating),
                  work_life_balance: Number(counterofferPlan.work_life_balance_rating),
                  compensation: Number(counterofferPlan.compensation_rating),
              })
            : undefined;

        if (counterofferFitRating !== undefined && evaluationFitRating > counterofferFitRating) {
            if (request.deleteCounterofferPlan !== true) {
                await client.query('ROLLBACK');
                return 'evaluation_above_counteroffer';
            }
            await deleteCounterofferPlanInTransaction(client, userId, jobId);
        }

        await upsertOfferEvaluation(client, userId, jobId, request);
        await client.query('COMMIT');
        return 'saved';
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
