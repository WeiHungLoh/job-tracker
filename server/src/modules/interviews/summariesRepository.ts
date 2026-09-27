import { pool } from '../../shared/db/connectDB.js';
import type { InterviewCollectionSummary } from './models.js';

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
