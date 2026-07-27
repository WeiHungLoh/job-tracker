import type { ArchivedJobApplication, JobStatus } from '../models.js';
import { pool } from '../connectDB.js';
import { hasAffectedRows, JOB_STATUS_SORT_ORDER } from './shared.js';

export const archiveJobApplication = async (jobId: number, userId: number): Promise<boolean> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const applicationResult = await client.query(
            `UPDATE job_applications
             SET is_archived = true
             WHERE job_id = $1 AND user_id = $2 AND is_archived = false`,
            [jobId, userId]
        );

        if (!hasAffectedRows(applicationResult)) {
            await client.query('ROLLBACK');
            return false;
        }

        await client.query(
            `UPDATE interviews SET is_archived = true
             WHERE job_id = $1 AND user_id = $2 AND is_archived = false`,
            [jobId, userId]
        );
        await client.query('COMMIT');
        return true;
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const unarchiveJobApplication = async (archivedJobId: number, userId: number): Promise<boolean> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const applicationResult = await client.query(
            `UPDATE job_applications SET is_archived = false
             WHERE job_id = $1 AND user_id = $2 AND is_archived = true`,
            [archivedJobId, userId]
        );

        if (!hasAffectedRows(applicationResult)) {
            await client.query('ROLLBACK');
            return false;
        }

        await client.query(
            `UPDATE interviews SET is_archived = false
             WHERE job_id = $1 AND user_id = $2 AND is_archived = true`,
            [archivedJobId, userId]
        );
        await client.query('COMMIT');
        return true;
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const archiveAllJobApplications = async (userId: number): Promise<void> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(
            `WITH archived_applications AS (
                UPDATE job_applications
                SET is_archived = true
                WHERE user_id = $1 AND is_archived = false
                RETURNING job_id
            )
            UPDATE interviews
            SET is_archived = true
            FROM archived_applications
            WHERE interviews.job_id = archived_applications.job_id
                AND interviews.user_id = $1
                AND interviews.is_archived = false`,
            [userId]
        );
        await client.query('COMMIT');
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const unarchiveAllJobApplications = async (userId: number): Promise<void> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(
            `WITH unarchived_applications AS (
                UPDATE job_applications
                SET is_archived = false
                WHERE user_id = $1 AND is_archived = true
                RETURNING job_id
            )
            UPDATE interviews
            SET is_archived = false
            FROM unarchived_applications
            WHERE interviews.job_id = unarchived_applications.job_id
                AND interviews.user_id = $1
                AND interviews.is_archived = true`,
            [userId]
        );
        await client.query('COMMIT');
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const getArchivedJobApplications = async (
    userId: number,
    jobStatuses: JobStatus[]
): Promise<ArchivedJobApplication[]> => {
    const result = await pool.query<ArchivedJobApplication>(
        `SELECT
            job_id AS archived_job_id,
            company_name,
            job_title,
            application_date,
            job_status,
            job_location,
            job_posting_url,
            notes,
            application_follow_up_sent_at
         FROM job_applications
         WHERE user_id = $1 AND is_archived = true
            AND job_status = ANY($2::text[])
         ORDER BY ${JOB_STATUS_SORT_ORDER},
            application_date DESC`,
        [userId, jobStatuses]
    );

    return result.rows;
};

export const deleteArchivedJobApplication = async (jobId: number, userId: number): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM job_applications WHERE job_id = $1 AND user_id = $2 AND is_archived = true`,
        [jobId, userId]
    );
    return hasAffectedRows(result);
};

export const deleteAllArchivedJobApplications = async (userId: number): Promise<void> => {
    await pool.query(`DELETE FROM job_applications WHERE user_id = $1 AND is_archived = true`, [userId]);
};
