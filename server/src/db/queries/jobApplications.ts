import type {
    ApplicationPin,
    DashboardApplicationSummary,
    JobApplication,
    JobStatus,
    JobStatusCount,
    WeeklyApplicationCount,
} from '../models.js';
import { pool } from '../connectDB.js';
import { hasAffectedRows, JOB_STATUS_SORT_ORDER } from './shared.js';

export type UpdateApplicationStatusResult = 'active-interview' | 'offer-evaluation' | 'not-found' | 'updated';

type PotentialDuplicateApplication = {
    company_name: string;
    job_title: string;
    application_date: Date;
};

export const insertJobApplication = async (
    userId: number,
    companyName: string,
    jobTitle: string,
    applicationDate: string | null,
    jobStatus: JobStatus,
    jobLocation: string,
    jobURL: string
): Promise<void> => {
    await pool.query(
        `INSERT INTO job_applications (user_id, company_name, job_title, application_date, job_status, job_location, job_posting_url)
        VALUES ($1, $2, $3, COALESCE($4::timestamptz, CURRENT_TIMESTAMP), $5, $6, $7)`,
        [userId, companyName, jobTitle, applicationDate, jobStatus, jobLocation, jobURL]
    );
};

export const findPotentialDuplicateApplication = async (
    userId: number,
    companyName: string,
    jobTitle: string,
    jobURL: string
): Promise<PotentialDuplicateApplication | undefined> => {
    const result = await pool.query<PotentialDuplicateApplication>(
        `SELECT
            company_name,
            job_title,
            application_date
         FROM job_applications
         WHERE user_id = $1
            AND (
                (
                    NULLIF(BTRIM($4::text), '') IS NOT NULL
                    AND NULLIF(BTRIM(job_posting_url), '') IS NOT NULL
                    AND BTRIM(job_posting_url) = BTRIM($4::text)
                )
                OR (
                    LOWER(BTRIM(REGEXP_REPLACE(company_name, '[[:space:]]+', ' ', 'g'))) =
                        LOWER(BTRIM(REGEXP_REPLACE($2::text, '[[:space:]]+', ' ', 'g')))
                    AND LOWER(BTRIM(REGEXP_REPLACE(job_title, '[[:space:]]+', ' ', 'g'))) =
                        LOWER(BTRIM(REGEXP_REPLACE($3::text, '[[:space:]]+', ' ', 'g')))
                )
            )
         ORDER BY
            CASE
                WHEN NULLIF(BTRIM($4::text), '') IS NOT NULL
                    AND NULLIF(BTRIM(job_posting_url), '') IS NOT NULL
                    AND BTRIM(job_posting_url) = BTRIM($4::text)
                THEN 0
                ELSE 1
            END ASC,
            is_archived ASC,
            application_date DESC,
            job_id ASC
         LIMIT 1`,
        [userId, companyName, jobTitle, jobURL]
    );

    return result.rows[0];
};

export const getJobApplications = async (userId: number, jobStatuses: JobStatus[]): Promise<JobApplication[]> => {
    const result = await pool.query<JobApplication>(
        `SELECT
            job_id,
            company_name,
            job_title,
            application_date,
            job_status,
            job_location,
            job_posting_url,
            applications.notes,
            applications.is_pinned,
            application_follow_up_sent_at,
            EXISTS (
                SELECT 1
                FROM offer_evaluations
                WHERE offer_evaluations.job_id = applications.job_id
                    AND offer_evaluations.user_id = applications.user_id
            ) AS has_offer_evaluation
         FROM job_applications AS applications
         WHERE applications.user_id = $1 AND applications.is_archived = false
            AND applications.job_status = ANY($2::text[])
         ORDER BY ${JOB_STATUS_SORT_ORDER},
            application_date DESC`,
        [userId, jobStatuses]
    );

    return result.rows;
};

type DashboardApplicationSummaryRow = {
    status_counts: JobStatusCount[];
    interviewed_application_count: number;
};

export const getDashboardApplicationSummary = async (userId: number): Promise<DashboardApplicationSummary> => {
    const result = await pool.query<DashboardApplicationSummaryRow>(
        `WITH active_applications AS (
            SELECT applications.job_id, applications.job_status
            FROM job_applications AS applications
            WHERE applications.user_id = $1
                AND applications.is_archived = false
        ),
        status_counts AS (
            SELECT job_status, COUNT(*)::text AS count
            FROM active_applications
            GROUP BY job_status
        ),
        interviewed_applications AS (
            SELECT COUNT(*)::integer AS interviewed_application_count
            FROM active_applications AS applications
            WHERE applications.job_status IN ('Interview', 'Offer', 'Accepted', 'Declined')
                OR EXISTS (
                    SELECT 1
                    FROM interviews
                    WHERE interviews.job_id = applications.job_id
                        AND interviews.user_id = $1
                )
        )
        SELECT
            COALESCE(
                (SELECT json_agg(status_counts ORDER BY job_status) FROM status_counts),
                '[]'::json
            ) AS status_counts,
            interviewed_application_count
        FROM interviewed_applications`,
        [userId]
    );
    const row = result.rows[0];

    return {
        statusCounts: row?.status_counts ?? [],
        interviewedApplicationCount: row?.interviewed_application_count ?? 0,
    };
};

export const getApplicationsForLatestEightWeeks = async (
    userId: number,
    timeZone: string
): Promise<WeeklyApplicationCount[]> => {
    const result = await pool.query<WeeklyApplicationCount>(
        `WITH bounds AS (
            SELECT date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE $2)::date AS current_week_start
        ),
        last_8_mondays AS (
            SELECT generate_series(
                bounds.current_week_start - interval '7 weeks',
                bounds.current_week_start,
                interval '1 week'
            )::date AS start_of_week
            FROM bounds
        ),
        application_counts AS (
            SELECT
                date_trunc('week', applications.application_date AT TIME ZONE $2)::date AS start_of_week,
                COUNT(*) AS applications_count
            FROM job_applications AS applications
            CROSS JOIN bounds
            WHERE applications.user_id = $1
                AND applications.is_archived = false
                AND applications.application_date >=
                    (bounds.current_week_start - interval '7 weeks') AT TIME ZONE $2
                AND applications.application_date <
                    (bounds.current_week_start + interval '1 week') AT TIME ZONE $2
            GROUP BY start_of_week
        )
        SELECT
            TO_CHAR(weeks.start_of_week, 'YYYY-MM-DD') AS start_of_week,
            COALESCE(counts.applications_count, 0) AS applications_count
        FROM last_8_mondays AS weeks
        LEFT JOIN application_counts AS counts
            ON weeks.start_of_week = counts.start_of_week
        ORDER BY weeks.start_of_week ASC`,
        [userId, timeZone]
    );
    return result.rows;
};

export const deleteJobApplication = async (jobId: number, userId: number): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM job_applications WHERE job_id = $1 AND user_id = $2 AND is_archived = false`,
        [jobId, userId]
    );
    return hasAffectedRows(result);
};

export const deleteAllJobApplications = async (userId: number): Promise<void> => {
    await pool.query(`DELETE FROM job_applications WHERE user_id = $1 AND is_archived = false`, [userId]);
};

export const editNotes = async (jobId: number, userId: number, notes: string): Promise<boolean> => {
    const result = await pool.query(
        `UPDATE job_applications SET notes = $1
         WHERE job_id = $2 AND user_id = $3 AND is_archived = false`,
        [notes, jobId, userId]
    );
    return hasAffectedRows(result);
};

export const markApplicationFollowUpSent = async (jobId: number, userId: number): Promise<Date | undefined> => {
    const result = await pool.query<{ application_follow_up_sent_at: Date }>(
        `UPDATE job_applications
         SET application_follow_up_sent_at = COALESCE(application_follow_up_sent_at, CURRENT_TIMESTAMP)
         WHERE job_id = $1 AND user_id = $2 AND is_archived = false
            AND job_status = 'Applied'
         RETURNING application_follow_up_sent_at`,
        [jobId, userId]
    );

    return result.rows[0]?.application_follow_up_sent_at;
};

export const clearApplicationFollowUpSent = async (jobId: number, userId: number): Promise<boolean> => {
    const result = await pool.query(
        `UPDATE job_applications
         SET application_follow_up_sent_at = NULL
         WHERE job_id = $1 AND user_id = $2 AND is_archived = false
            AND job_status = 'Applied'
         RETURNING job_id`,
        [jobId, userId]
    );

    return hasAffectedRows(result);
};

export const updateApplicationPin = async (
    isPinned: boolean,
    jobId: number,
    userId: number
): Promise<ApplicationPin | undefined> => {
    const result = await pool.query<ApplicationPin>(
        `UPDATE job_applications
         SET is_pinned = $1
         WHERE job_id = $2 AND user_id = $3 AND is_archived = false
         RETURNING job_id, is_pinned`,
        [isPinned, jobId, userId]
    );

    return result.rows[0];
};

export const updateApplicationStatus = async (
    jobStatus: JobStatus,
    jobId: number,
    userId: number
): Promise<UpdateApplicationStatusResult> => {
    const result = await pool.query<{
        application_exists: boolean;
        application_updated: boolean;
        has_active_interview: boolean;
        has_offer_evaluation: boolean;
    }>(
        `WITH application AS (
            SELECT
                job_id,
                EXISTS (
                    SELECT 1
                    FROM offer_evaluations
                    WHERE offer_evaluations.job_id = job_applications.job_id
                        AND offer_evaluations.user_id = job_applications.user_id
                ) AS has_offer_evaluation,
                EXISTS (
                    SELECT 1
                    FROM interviews
                    WHERE interviews.job_id = job_applications.job_id
                        AND interviews.user_id = job_applications.user_id
                        AND interviews.is_archived = false
                ) AS has_active_interview
            FROM job_applications
            WHERE job_id = $2 AND user_id = $3 AND is_archived = false
            FOR UPDATE
        ),
        updated_application AS (
            UPDATE job_applications
            SET
                job_status = $1,
                application_follow_up_sent_at = CASE
                    WHEN $1::text = 'Applied' THEN application_follow_up_sent_at
                    ELSE NULL
                END
            FROM application
            WHERE job_applications.job_id = application.job_id
                AND (
                    NOT application.has_offer_evaluation
                    OR $1::text IN ('Offer', 'Accepted', 'Declined')
                )
                AND (
                    $1::text <> 'Applied'
                    OR job_applications.job_status = 'Applied'
                    OR NOT application.has_active_interview
                )
            RETURNING 1
        )
        SELECT
            EXISTS(SELECT 1 FROM application) AS application_exists,
            EXISTS(SELECT 1 FROM updated_application) AS application_updated,
            COALESCE((SELECT has_active_interview FROM application), false) AS has_active_interview,
            COALESCE((SELECT has_offer_evaluation FROM application), false) AS has_offer_evaluation`,
        [jobStatus, jobId, userId]
    );

    if (result.rows[0]?.application_updated) {
        return 'updated';
    }
    if (!result.rows[0]?.application_exists) {
        return 'not-found';
    }
    if (jobStatus === 'Applied' && result.rows[0].has_active_interview) {
        return 'active-interview';
    }
    return result.rows[0].has_offer_evaluation ? 'offer-evaluation' : 'active-interview';
};
