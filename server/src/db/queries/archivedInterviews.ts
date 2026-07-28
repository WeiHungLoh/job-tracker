import type { ArchivedJobInterview, InterviewTimeFilter } from '../models.js';
import { pool } from '../connectDB.js';
import { hasAffectedRows } from './shared.js';

export const getArchivedJobInterviews = async (
    userId: number,
    timeFilters: InterviewTimeFilter[]
): Promise<ArchivedJobInterview[]> => {
    const result = await pool.query<ArchivedJobInterview>(
        `SELECT
            interviews.interview_id AS archived_interview_id,
            interviews.job_id AS archived_job_id,
            interviews.interview_date,
            interviews.interview_duration_minutes,
            interviews.interview_location,
            interviews.interview_type,
            interviews.meeting_url,
            interviews.interview_notes,
            interviews.follow_up_sent_at,
            interviews.is_pinned,
            job_applications.company_name,
            job_applications.job_title,
            job_applications.job_status
         FROM interviews
         INNER JOIN job_applications ON interviews.job_id = job_applications.job_id
         WHERE interviews.user_id = $1
            AND interviews.is_archived = true
            AND job_applications.is_archived = true
            AND (
                (
                    'Upcoming Interviews' = ANY($2::text[])
                    AND interviews.interview_date
                        + interviews.interview_duration_minutes * INTERVAL '1 minute' > NOW()
                )
                OR (
                    'Past Interviews' = ANY($2::text[])
                    AND interviews.interview_date
                        + interviews.interview_duration_minutes * INTERVAL '1 minute' <= NOW()
                )
            )
         ORDER BY
            interviews.is_pinned DESC,
            interviews.interview_date + interviews.interview_duration_minutes * INTERVAL '1 minute' > NOW() DESC,
            interviews.interview_date ASC`,
        [userId, timeFilters]
    );
    return result.rows;
};

export const deleteAllArchivedJobInterviews = async (userId: number): Promise<void> => {
    await pool.query(`DELETE FROM interviews WHERE user_id = $1 AND is_archived = true`, [userId]);
};

export const deleteArchivedJobInterview = async (interviewId: number, userId: number): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM interviews WHERE interview_id = $1 AND user_id = $2 AND is_archived = true`,
        [interviewId, userId]
    );
    return hasAffectedRows(result);
};
