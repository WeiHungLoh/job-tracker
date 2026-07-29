export const JOB_STATUS_SORT_ORDER = `
    CASE
        WHEN job_status = 'Accepted' THEN 1
        WHEN job_status = 'Offer' THEN 2
        WHEN job_status = 'Declined' THEN 3
        WHEN job_status = 'Interview' THEN 4
        WHEN job_status = 'Applied' THEN 5
        WHEN job_status = 'Withdrawn' THEN 6
        WHEN job_status = 'Ghosted' THEN 7
        ELSE 8
    END`;

export const hasAffectedRows = (result: { rowCount: number | null }): boolean => {
    return (result.rowCount ?? 0) > 0;
};
