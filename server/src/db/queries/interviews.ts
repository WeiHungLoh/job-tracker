import type {
    InterviewOfferDeadlineWarningRecord,
    InterviewPin,
    InterviewSchedulingConflictRecord,
    InterviewTimeFilter,
    JobInterview,
} from '../models.js';
import { pool } from '../connectDB.js';
import { hasAffectedRows } from './shared.js';

export type InsertInterviewResult = 'application-ineligible' | 'created' | 'invalid-date' | 'not-found';

export type MarkInterviewFollowUpResult = Date | 'not-completed' | 'not-found';

export const getInterviewSchedulingConflicts = async (
    jobId: number,
    userId: number,
    interviewDate: string,
    interviewDurationMinutes: number
): Promise<InterviewSchedulingConflictRecord[]> => {
    const result = await pool.query<InterviewSchedulingConflictRecord>(
        `WITH target_application AS (
            SELECT 1
            FROM job_applications
            WHERE job_id = $1
                AND user_id = $2
                AND is_archived = false
                AND job_status = 'Interview'
                AND application_date IS NOT NULL
                AND $3::timestamptz > application_date
        )
        SELECT
            interviews.interview_id,
            interviews.job_id,
            applications.company_name,
            applications.job_title,
            interviews.interview_date,
            interviews.interview_duration_minutes,
            interviews.interview_type
        FROM interviews
        INNER JOIN job_applications AS applications
            ON interviews.job_id = applications.job_id
            AND interviews.user_id = applications.user_id
        CROSS JOIN target_application
        WHERE interviews.user_id = $2
            AND interviews.is_archived = false
            AND applications.is_archived = false
            AND $3::timestamptz >= NOW()
            AND interviews.interview_date
                + interviews.interview_duration_minutes * INTERVAL '1 minute' > NOW()
            AND $3::timestamptz < interviews.interview_date
                + interviews.interview_duration_minutes * INTERVAL '1 minute'
            AND interviews.interview_date
                < $3::timestamptz + $4 * INTERVAL '1 minute'
        ORDER BY interviews.interview_date ASC, interviews.interview_id ASC`,
        [jobId, userId, interviewDate, interviewDurationMinutes]
    );

    return result.rows;
};

export const getInterviewOfferDeadlineWarnings = async (
    jobId: number,
    userId: number,
    interviewDate: string,
    interviewDurationMinutes: number
): Promise<InterviewOfferDeadlineWarningRecord[]> => {
    const result = await pool.query<InterviewOfferDeadlineWarningRecord>(
        `WITH target_application AS (
            SELECT 1
            FROM job_applications
            WHERE job_id = $1
                AND user_id = $2
                AND is_archived = false
                AND job_status = 'Interview'
                AND application_date IS NOT NULL
                AND $3::timestamptz > application_date
        )
        SELECT
            applications.job_id,
            applications.company_name,
            applications.job_title,
            evaluations.decision_deadline
        FROM job_applications AS applications
        INNER JOIN offer_evaluations AS evaluations
            ON applications.job_id = evaluations.job_id
            AND applications.user_id = evaluations.user_id
        CROSS JOIN target_application
        WHERE applications.user_id = $2
            AND applications.is_archived = false
            AND applications.job_status = 'Offer'
            AND applications.job_id <> $1
            AND $3::timestamptz >= NOW()
            AND evaluations.decision_deadline >= NOW()
            AND evaluations.decision_deadline
                <= $3::timestamptz + $4 * INTERVAL '1 minute'
        ORDER BY evaluations.decision_deadline ASC, applications.job_id ASC`,
        [jobId, userId, interviewDate, interviewDurationMinutes]
    );

    return result.rows;
};

export const insertInterview = async (
    jobId: number,
    userId: number,
    interviewDate: string,
    interviewDurationMinutes: number,
    location: string,
    interviewType: string,
    meetingURL: string,
    notes: string
): Promise<InsertInterviewResult> => {
    const result = await pool.query<{
        application_eligible: boolean;
        application_exists: boolean;
        interview_created: boolean;
    }>(
        `WITH application AS (
            SELECT application_date, job_status = 'Interview' AS is_eligible
            FROM job_applications
            WHERE job_id = $1 AND user_id = $2 AND is_archived = false
            FOR UPDATE
        ),
        inserted_interview AS (
            INSERT INTO interviews (
                job_id,
                user_id,
                interview_date,
                interview_duration_minutes,
                interview_location,
                interview_type,
                meeting_url,
                interview_notes
            )
            SELECT $1, $2, $3, $4, $5, $6, $7, $8
            FROM application
            WHERE is_eligible
                AND application_date IS NOT NULL
                AND $3::timestamptz > application_date
            RETURNING 1
        )
        SELECT
            EXISTS(SELECT 1 FROM application) AS application_exists,
            COALESCE((SELECT is_eligible FROM application), false) AS application_eligible,
            EXISTS(SELECT 1 FROM inserted_interview) AS interview_created`,
        [jobId, userId, interviewDate, interviewDurationMinutes, location, interviewType, meetingURL, notes]
    );

    if (result.rows[0]?.interview_created) {
        return 'created';
    }
    if (!result.rows[0]?.application_exists) {
        return 'not-found';
    }
    return result.rows[0].application_eligible ? 'invalid-date' : 'application-ineligible';
};

export const getInterviews = async (userId: number, timeFilters: InterviewTimeFilter[]): Promise<JobInterview[]> => {
    const result = await pool.query<JobInterview>(
        `SELECT
            interviews.interview_id,
            interviews.job_id,
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
            AND interviews.is_archived = false
            AND job_applications.is_archived = false
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

export const updateInterviewPin = async (
    isPinned: boolean,
    interviewId: number,
    userId: number
): Promise<InterviewPin | undefined> => {
    const result = await pool.query<InterviewPin>(
        `UPDATE interviews
         SET is_pinned = $1
         WHERE interview_id = $2 AND user_id = $3 AND is_archived = false
         RETURNING interview_id, is_pinned`,
        [isPinned, interviewId, userId]
    );

    return result.rows[0];
};

export const updateInterviewNotes = async (notes: string, interviewId: number, userId: number): Promise<boolean> => {
    const result = await pool.query(
        `UPDATE interviews
         SET interview_notes = $1
         WHERE interview_id = $2 AND user_id = $3 AND is_archived = false
         RETURNING interview_id`,
        [notes, interviewId, userId]
    );

    return hasAffectedRows(result);
};

export const deleteJobInterview = async (interviewId: number, userId: number): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM interviews WHERE interview_id = $1 AND user_id = $2 AND is_archived = false`,
        [interviewId, userId]
    );
    return hasAffectedRows(result);
};

export const markInterviewFollowUpSent = async (
    interviewId: number,
    userId: number
): Promise<MarkInterviewFollowUpResult> => {
    const result = await pool.query<{ interview_exists: boolean; follow_up_sent_at: Date | null }>(
        `WITH target_interview AS (
            SELECT interview_id
            FROM interviews
            WHERE interview_id = $1 AND user_id = $2 AND is_archived = false
        ),
        updated_interview AS (
            UPDATE interviews
            SET follow_up_sent_at = COALESCE(follow_up_sent_at, CURRENT_TIMESTAMP)
            FROM target_interview
            WHERE interviews.interview_id = target_interview.interview_id
                AND interviews.interview_date
                    + interviews.interview_duration_minutes * INTERVAL '1 minute' <= CURRENT_TIMESTAMP
            RETURNING interviews.follow_up_sent_at
        )
        SELECT
            EXISTS(SELECT 1 FROM target_interview) AS interview_exists,
            (SELECT follow_up_sent_at FROM updated_interview) AS follow_up_sent_at`,
        [interviewId, userId]
    );

    const followUpResult = result.rows[0];
    if (!followUpResult?.interview_exists) {
        return 'not-found';
    }
    return followUpResult.follow_up_sent_at ?? 'not-completed';
};

export const clearInterviewFollowUpSent = async (interviewId: number, userId: number): Promise<boolean> => {
    const result = await pool.query(
        `UPDATE interviews
         SET follow_up_sent_at = NULL
         WHERE interview_id = $1 AND user_id = $2 AND is_archived = false
         RETURNING interview_id`,
        [interviewId, userId]
    );

    return hasAffectedRows(result);
};

export const deleteAllJobInterviews = async (userId: number): Promise<void> => {
    await pool.query(`DELETE FROM interviews WHERE user_id = $1 AND is_archived = false`, [userId]);
};
