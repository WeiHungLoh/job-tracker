import type {
    ApplicationCollectionSummary,
    ApplicationRelationSummary,
    InterviewCollectionSummary,
} from '../models.js';
import { pool } from '../connectDB.js';

export const getApplicationRelationSummary = async (
    jobId: number,
    userId: number,
    isArchived: boolean
): Promise<ApplicationRelationSummary | undefined> => {
    const result = await pool.query<ApplicationRelationSummary>(
        `SELECT
            COUNT(DISTINCT interviews.interview_id)::integer AS related_interview_count,
            COUNT(DISTINCT evaluations.job_id)::integer AS offer_evaluation_count,
            COUNT(DISTINCT counteroffers.job_id)::integer AS counteroffer_plan_count
         FROM job_applications AS applications
         LEFT JOIN interviews
            ON interviews.job_id = applications.job_id
            AND interviews.user_id = applications.user_id
            AND interviews.is_archived = $3
         LEFT JOIN offer_evaluations AS evaluations
            ON evaluations.job_id = applications.job_id
            AND evaluations.user_id = applications.user_id
         LEFT JOIN offer_counteroffer_plans AS counteroffers
            ON counteroffers.job_id = applications.job_id
            AND counteroffers.user_id = applications.user_id
         WHERE applications.job_id = $1
            AND applications.user_id = $2
            AND applications.is_archived = $3
         GROUP BY applications.job_id`,
        [jobId, userId, isArchived]
    );

    return result.rows[0];
};

export const getApplicationCollectionSummary = async (
    userId: number,
    isArchived: boolean
): Promise<ApplicationCollectionSummary> => {
    const result = await pool.query<ApplicationCollectionSummary>(
        `SELECT
            COUNT(DISTINCT applications.job_id)::integer AS application_count,
            COUNT(DISTINCT interviews.interview_id)::integer AS related_interview_count,
            COUNT(DISTINCT evaluations.job_id)::integer AS offer_evaluation_count,
            COUNT(DISTINCT counteroffers.job_id)::integer AS counteroffer_plan_count
         FROM job_applications AS applications
         LEFT JOIN interviews
            ON interviews.job_id = applications.job_id
            AND interviews.user_id = $1
            AND interviews.is_archived = $2
         LEFT JOIN offer_evaluations AS evaluations
            ON evaluations.job_id = applications.job_id
            AND evaluations.user_id = applications.user_id
         LEFT JOIN offer_counteroffer_plans AS counteroffers
            ON counteroffers.job_id = applications.job_id
            AND counteroffers.user_id = applications.user_id
         WHERE applications.user_id = $1
            AND applications.is_archived = $2`,
        [userId, isArchived]
    );

    return (
        result.rows[0] ?? {
            application_count: 0,
            related_interview_count: 0,
            offer_evaluation_count: 0,
            counteroffer_plan_count: 0,
        }
    );
};

export const getInterviewCollectionSummary = async (
    userId: number,
    isArchived: boolean
): Promise<InterviewCollectionSummary> => {
    const result = await pool.query<InterviewCollectionSummary>(
        `SELECT COUNT(*)::integer AS interview_count
         FROM interviews
         WHERE user_id = $1 AND is_archived = $2`,
        [userId, isArchived]
    );

    return result.rows[0] ?? { interview_count: 0 };
};
