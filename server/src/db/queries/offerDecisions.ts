import type {
    CounterofferPlan,
    CounterofferPlanInput,
    JobStatus,
    OfferDecisionFilter,
    OfferDecisionApplication,
    OfferDetails,
    OfferDecisionWorkspace,
    OfferEvaluation,
    OfferEvaluationInput,
    SaveOfferEvaluationInput,
} from '../models.js';
import { OFFER_DECISION_VALUE_MAX } from '../../config/validation.js';
import { pool } from '../connectDB.js';

type OfferDecisionRow = {
    job_id: number;
    company_name: string;
    job_title: string;
    job_status: JobStatus;
    application_date: Date | string;
    evaluation_job_id: number | null;
    career_growth_rating: number | null;
    company_culture_fit_rating: number | null;
    work_life_balance_rating: number | null;
    compensation_rating: number | null;
    currency: string | null;
    monthly_base_salary: number | null;
    bonus: string | null;
    annual_leave_days: number | null;
    work_arrangement: OfferDetails['work_arrangement'] | null;
    decision_deadline: Date | string | null;
    pros: string | null;
    concerns: string | null;
    counteroffer_job_id: number | null;
    counteroffer_monthly_base_salary: number | null;
    counteroffer_bonus: string | null;
    counteroffer_annual_leave_days: number | null;
    counteroffer_work_arrangement: CounterofferPlanInput['work_arrangement'] | null;
    counteroffer_career_growth_rating: number | null;
    counteroffer_company_culture_fit_rating: number | null;
    counteroffer_work_life_balance_rating: number | null;
    counteroffer_compensation_rating: number | null;
};

type LockedApplicationRow = {
    job_id: number;
    application_date: Date | string;
};

type OfferEvaluationRow = {
    career_growth_rating: number;
    company_culture_fit_rating: number;
    work_life_balance_rating: number;
    compensation_rating: number;
    currency: string;
    monthly_base_salary: number;
    bonus: string;
    annual_leave_days: number | null;
    work_arrangement: OfferDetails['work_arrangement'];
    decision_deadline: Date | string;
    pros: string;
    concerns: string;
};

type CounterofferPlanRow = {
    monthly_base_salary: number;
    bonus: string;
    annual_leave_days: number | null;
    work_arrangement: CounterofferPlanInput['work_arrangement'];
    career_growth_rating: number;
    company_culture_fit_rating: number;
    work_life_balance_rating: number;
    compensation_rating: number;
};

type LockedCounterofferEvaluationRow = CounterofferPlanRow & {
    job_id: number;
    job_status: JobStatus;
    is_archived: boolean;
    decision_deadline: Date | string;
};

export type SaveOfferEvaluationResult =
    | 'saved'
    | 'application_unavailable'
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

const toISOString = (value: Date | string): string => (value instanceof Date ? value.toISOString() : value);

const toEvaluation = (row: OfferDecisionRow): OfferEvaluation | null => {
    if (row.evaluation_job_id === null) {
        return null;
    }

    return {
        job_id: row.evaluation_job_id,
        ratings: {
            career_growth: Number(row.career_growth_rating),
            company_culture_fit: Number(row.company_culture_fit_rating),
            work_life_balance: Number(row.work_life_balance_rating),
            compensation: Number(row.compensation_rating),
        },
        details: {
            currency: row.currency ?? 'SGD',
            monthly_base_salary: row.monthly_base_salary,
            bonus: row.bonus ?? '',
            annual_leave_days: row.annual_leave_days,
            work_arrangement: row.work_arrangement ?? '',
            decision_deadline: row.decision_deadline ? toISOString(row.decision_deadline) : '',
            pros: row.pros ?? '',
            concerns: row.concerns ?? '',
        },
    };
};

const toApplication = (row: OfferDecisionRow): OfferDecisionApplication => ({
    job_id: row.job_id,
    company_name: row.company_name,
    job_title: row.job_title,
    job_status: row.job_status,
    application_date: toISOString(row.application_date),
    evaluation: toEvaluation(row),
    has_counteroffer_plan: row.counteroffer_job_id !== null && row.counteroffer_job_id !== undefined,
    counteroffer_plan:
        row.counteroffer_job_id === null || row.counteroffer_job_id === undefined
            ? null
            : {
                  monthly_base_salary: Number(row.counteroffer_monthly_base_salary),
                  bonus: row.counteroffer_bonus ?? '',
                  annual_leave_days: row.counteroffer_annual_leave_days,
                  work_arrangement: row.counteroffer_work_arrangement ?? '',
                  ratings: {
                      career_growth: Number(row.counteroffer_career_growth_rating),
                      company_culture_fit: Number(row.counteroffer_company_culture_fit_rating),
                      work_life_balance: Number(row.counteroffer_work_life_balance_rating),
                      compensation: Number(row.counteroffer_compensation_rating),
                  },
              },
});

const toCounterofferPlan = (row: CounterofferPlanRow): CounterofferPlan => ({
    monthly_base_salary: row.monthly_base_salary,
    bonus: row.bonus,
    annual_leave_days: row.annual_leave_days,
    work_arrangement: row.work_arrangement,
    ratings: {
        career_growth: Number(row.career_growth_rating),
        company_culture_fit: Number(row.company_culture_fit_rating),
        work_life_balance: Number(row.work_life_balance_rating),
        compensation: Number(row.compensation_rating),
    },
});

export const getOfferDecisionWorkspace = async (
    userId: number,
    isArchived: boolean,
    filters: readonly OfferDecisionFilter[]
): Promise<OfferDecisionWorkspace> => {
    const result = await pool.query<OfferDecisionRow>(
        `SELECT
            applications.job_id,
            applications.company_name,
            applications.job_title,
            applications.job_status,
            applications.application_date,
            evaluations.job_id AS evaluation_job_id,
            evaluations.career_growth_rating,
            evaluations.company_culture_fit_rating,
            evaluations.work_life_balance_rating,
            evaluations.compensation_rating,
            evaluations.currency,
            evaluations.monthly_base_salary,
            evaluations.bonus,
            evaluations.annual_leave_days,
            evaluations.work_arrangement,
            evaluations.decision_deadline,
            evaluations.pros,
            evaluations.concerns,
            plans.job_id AS counteroffer_job_id,
            plans.monthly_base_salary AS counteroffer_monthly_base_salary,
            plans.bonus AS counteroffer_bonus,
            plans.annual_leave_days AS counteroffer_annual_leave_days,
            plans.work_arrangement AS counteroffer_work_arrangement,
            plans.career_growth_rating AS counteroffer_career_growth_rating,
            plans.company_culture_fit_rating AS counteroffer_company_culture_fit_rating,
            plans.work_life_balance_rating AS counteroffer_work_life_balance_rating,
            plans.compensation_rating AS counteroffer_compensation_rating
        FROM job_applications AS applications
        LEFT JOIN offer_evaluations AS evaluations
            ON evaluations.job_id = applications.job_id
            AND evaluations.user_id = applications.user_id
        LEFT JOIN offer_counteroffer_plans AS plans
            ON plans.job_id = applications.job_id
            AND plans.user_id = applications.user_id
        WHERE applications.user_id = $1
            AND applications.is_archived = $2
            AND (
                ($2 = false AND (
                    applications.job_status = 'Offer'
                    OR evaluations.job_id IS NOT NULL
                ))
                OR ($2 = true AND evaluations.job_id IS NOT NULL)
            )
            AND (
                (
                    'Offers to Evaluate' = ANY($3::text[])
                    AND $2 = false
                    AND applications.job_status = 'Offer'
                    AND evaluations.job_id IS NULL
                )
                OR (
                    'Evaluated Offers' = ANY($3::text[])
                    AND applications.job_status = 'Offer'
                    AND evaluations.job_id IS NOT NULL
                    AND (
                        evaluations.decision_deadline IS NULL
                        OR evaluations.decision_deadline >= NOW()
                    )
                )
                OR (
                    'Expired Evaluated Offers' = ANY($3::text[])
                    AND applications.job_status = 'Offer'
                    AND evaluations.job_id IS NOT NULL
                    AND evaluations.decision_deadline < NOW()
                )
                OR (
                    'Previous Evaluations' = ANY($3::text[])
                    AND applications.job_status <> 'Offer'
                    AND evaluations.job_id IS NOT NULL
                )
            )
        ORDER BY
            CASE
                WHEN applications.job_status = 'Offer' THEN 1
                ELSE 2
            END,
            applications.company_name,
            applications.job_title,
            applications.job_id`,
        [userId, isArchived, filters]
    );

    return { applications: result.rows.map(toApplication) };
};

export const getCounterofferPlan = async (userId: number, jobId: number): Promise<CounterofferPlan | null> => {
    const result = await pool.query<CounterofferPlanRow>(
        `SELECT
            plans.monthly_base_salary,
            plans.bonus,
            plans.annual_leave_days,
            plans.work_arrangement,
            plans.career_growth_rating,
            plans.company_culture_fit_rating,
            plans.work_life_balance_rating,
            plans.compensation_rating
        FROM offer_counteroffer_plans AS plans
        WHERE plans.user_id = $1
            AND plans.job_id = $2`,
        [userId, jobId]
    );

    return result.rows[0] ? toCounterofferPlan(result.rows[0]) : null;
};

const calculateOfferDecisionScore = (ratings: OfferDecisionInputRatings): number => {
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

type OfferDecisionInputRatings = CounterofferPlanInput['ratings'];

const upsertCounterofferPlan = async (
    query: (sql: string, values?: unknown[]) => Promise<unknown>,
    userId: number,
    jobId: number,
    plan: CounterofferPlanInput
): Promise<void> => {
    await query(
        `INSERT INTO offer_counteroffer_plans (
            job_id,
            user_id,
            monthly_base_salary,
            bonus,
            annual_leave_days,
            work_arrangement,
            career_growth_rating,
            company_culture_fit_rating,
            work_life_balance_rating,
            compensation_rating
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (job_id, user_id) DO UPDATE SET
            monthly_base_salary = EXCLUDED.monthly_base_salary,
            bonus = EXCLUDED.bonus,
            annual_leave_days = EXCLUDED.annual_leave_days,
            work_arrangement = EXCLUDED.work_arrangement,
            career_growth_rating = EXCLUDED.career_growth_rating,
            company_culture_fit_rating = EXCLUDED.company_culture_fit_rating,
            work_life_balance_rating = EXCLUDED.work_life_balance_rating,
            compensation_rating = EXCLUDED.compensation_rating,
            updated_at = CURRENT_TIMESTAMP`,
        [
            jobId,
            userId,
            plan.monthly_base_salary,
            plan.bonus,
            plan.annual_leave_days,
            plan.work_arrangement,
            plan.ratings.career_growth,
            plan.ratings.company_culture_fit,
            plan.ratings.work_life_balance,
            plan.ratings.compensation,
        ]
    );
};

export const saveCounterofferPlan = async (
    userId: number,
    jobId: number,
    request: CounterofferPlanInput
): Promise<SaveCounterofferPlanResult> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const evaluationResult = await client.query<LockedCounterofferEvaluationRow>(
            `SELECT
                applications.job_id,
                applications.job_status,
                applications.is_archived,
                evaluations.decision_deadline,
                evaluations.monthly_base_salary,
                evaluations.bonus,
                evaluations.annual_leave_days,
                evaluations.work_arrangement,
                evaluations.career_growth_rating,
                evaluations.company_culture_fit_rating,
                evaluations.work_life_balance_rating,
                evaluations.compensation_rating
            FROM job_applications AS applications
            JOIN offer_evaluations AS evaluations
                ON evaluations.job_id = applications.job_id
                AND evaluations.user_id = applications.user_id
            WHERE applications.user_id = $1
                AND applications.job_id = $2
            FOR UPDATE OF applications, evaluations`,
            [userId, jobId]
        );
        const currentOffer = evaluationResult.rows[0];

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

        const savedPlanResult = await client.query<CounterofferPlanRow>(
            `SELECT
                plans.monthly_base_salary,
                plans.bonus,
                plans.annual_leave_days,
                plans.work_arrangement,
                plans.career_growth_rating,
                plans.company_culture_fit_rating,
                plans.work_life_balance_rating,
                plans.compensation_rating
            FROM offer_counteroffer_plans AS plans
            WHERE plans.user_id = $1
                AND plans.job_id = $2
            FOR UPDATE`,
            [userId, jobId]
        );
        if (savedPlanResult.rows[0] && counterofferPlanMatchesEvaluation(request, savedPlanResult.rows[0])) {
            await client.query('ROLLBACK');
            return 'unchanged_from_saved';
        }

        await upsertCounterofferPlan(client.query.bind(client), userId, jobId, request);
        await client.query('COMMIT');
        return 'saved';
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const deleteCounterofferPlan = async (userId: number, jobId: number): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM offer_counteroffer_plans
        WHERE user_id = $1
            AND job_id = $2
        RETURNING job_id`,
        [userId, jobId]
    );

    return (result.rowCount ?? 0) > 0;
};

const upsertOfferEvaluation = async (
    query: (sql: string, values?: unknown[]) => Promise<unknown>,
    userId: number,
    jobId: number,
    request: OfferEvaluationInput
): Promise<void> => {
    await query(
        `INSERT INTO offer_evaluations (
            job_id,
            user_id,
            career_growth_rating,
            company_culture_fit_rating,
            work_life_balance_rating,
            compensation_rating,
            currency,
            monthly_base_salary,
            bonus,
            annual_leave_days,
            work_arrangement,
            decision_deadline,
            pros,
            concerns
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (job_id, user_id) DO UPDATE SET
            career_growth_rating = EXCLUDED.career_growth_rating,
            company_culture_fit_rating = EXCLUDED.company_culture_fit_rating,
            work_life_balance_rating = EXCLUDED.work_life_balance_rating,
            compensation_rating = EXCLUDED.compensation_rating,
            currency = EXCLUDED.currency,
            monthly_base_salary = EXCLUDED.monthly_base_salary,
            bonus = EXCLUDED.bonus,
            annual_leave_days = EXCLUDED.annual_leave_days,
            work_arrangement = EXCLUDED.work_arrangement,
            decision_deadline = EXCLUDED.decision_deadline,
            pros = EXCLUDED.pros,
            concerns = EXCLUDED.concerns`,
        [
            jobId,
            userId,
            request.ratings.career_growth,
            request.ratings.company_culture_fit,
            request.ratings.work_life_balance,
            request.ratings.compensation,
            request.details.currency,
            request.details.monthly_base_salary,
            request.details.bonus,
            request.details.annual_leave_days,
            request.details.work_arrangement,
            request.details.decision_deadline || null,
            request.details.pros,
            request.details.concerns,
        ]
    );
};

export const deleteOfferEvaluation = async (userId: number, jobId: number): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM offer_evaluations AS evaluations
        USING job_applications AS applications
        WHERE evaluations.job_id = $2
            AND evaluations.user_id = $1
            AND applications.job_id = evaluations.job_id
            AND applications.user_id = evaluations.user_id
        RETURNING evaluations.job_id`,
        [userId, jobId]
    );

    return result.rowCount === 1;
};

export const deleteAllOfferEvaluations = async (userId: number, isArchived: boolean): Promise<void> => {
    await pool.query(
        `DELETE FROM offer_evaluations AS evaluations
        USING job_applications AS applications
        WHERE evaluations.user_id = $1
            AND applications.job_id = evaluations.job_id
            AND applications.user_id = evaluations.user_id
            AND applications.is_archived = $2`,
        [userId, isArchived]
    );
};

export const saveOfferEvaluation = async (
    userId: number,
    jobId: number,
    request: SaveOfferEvaluationInput
): Promise<SaveOfferEvaluationResult> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const applicationsResult = await client.query<LockedApplicationRow>(
            `SELECT
                applications.job_id,
                applications.application_date
            FROM job_applications AS applications
            WHERE applications.user_id = $1
                AND applications.job_id = $2
                AND applications.is_archived = false
            FOR UPDATE OF applications`,
            [userId, jobId]
        );
        const application = applicationsResult.rows[0];

        if (!application) {
            await client.query('ROLLBACK');
            return 'application_unavailable';
        }

        if (new Date(request.details.decision_deadline).getTime() < new Date(application.application_date).getTime()) {
            await client.query('ROLLBACK');
            return 'deadline_before_application';
        }

        const existingEvaluationResult = await client.query<OfferEvaluationRow>(
            `SELECT
                evaluations.career_growth_rating,
                evaluations.company_culture_fit_rating,
                evaluations.work_life_balance_rating,
                evaluations.compensation_rating,
                evaluations.currency,
                evaluations.monthly_base_salary,
                evaluations.bonus,
                evaluations.annual_leave_days,
                evaluations.work_arrangement,
                evaluations.decision_deadline,
                evaluations.pros,
                evaluations.concerns
            FROM offer_evaluations AS evaluations
            WHERE evaluations.user_id = $1
                AND evaluations.job_id = $2
            FOR UPDATE`,
            [userId, jobId]
        );
        if (
            existingEvaluationResult.rows[0] &&
            offerEvaluationMatchesRequest(request, existingEvaluationResult.rows[0])
        ) {
            await client.query('ROLLBACK');
            return 'unchanged';
        }

        const counterofferResult = await client.query<CounterofferPlanRow>(
            `SELECT
                plans.monthly_base_salary,
                plans.bonus,
                plans.annual_leave_days,
                plans.work_arrangement,
                plans.career_growth_rating,
                plans.company_culture_fit_rating,
                plans.work_life_balance_rating,
                plans.compensation_rating
            FROM offer_counteroffer_plans AS plans
            WHERE plans.user_id = $1
                AND plans.job_id = $2
            FOR UPDATE`,
            [userId, jobId]
        );
        const counterofferPlan = counterofferResult.rows[0];
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
            await client.query(
                `DELETE FROM offer_counteroffer_plans
                WHERE user_id = $1
                    AND job_id = $2`,
                [userId, jobId]
            );
        }

        await upsertOfferEvaluation(client.query.bind(client), userId, jobId, request);
        await client.query('COMMIT');
        return 'saved';
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
