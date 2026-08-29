import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pool } from '../dist/db/connectDB.js';
import {
    getApplicationsForLatestEightWeeks,
    getDashboardApplicationSummary,
} from '../dist/db/queries/jobApplications.js';

test('dashboard application summary counts recorded interview evidence once and keeps status counts independent', async () => {
    const originalQuery = pool.query;
    let captured;
    pool.query = async (sql, values) => {
        captured = { sql: String(sql), values };
        return {
            rows: [
                {
                    status_counts: [
                        { job_status: 'Applied', count: '2' },
                        { job_status: 'Rejected', count: '1' },
                    ],
                    interviewed_application_count: 2,
                },
            ],
        };
    };

    try {
        assert.deepEqual(await getDashboardApplicationSummary(42), {
            statusCounts: [
                { job_status: 'Applied', count: '2' },
                { job_status: 'Rejected', count: '1' },
            ],
            interviewedApplicationCount: 2,
        });
    } finally {
        pool.query = originalQuery;
    }

    assert.deepEqual(captured.values, [42]);
    assert.match(captured.sql, /applications\.user_id = \$1/);
    assert.match(captured.sql, /applications\.is_archived = false/);
    assert.match(captured.sql, /job_status IN \('Interview', 'Offer', 'Accepted', 'Declined'\)/);
    assert.match(captured.sql, /EXISTS[\s\S]*?FROM interviews[\s\S]*?interviews\.job_id = applications\.job_id/);
    assert.doesNotMatch(captured.sql, /interviews\.is_archived = false/);
});

test('dashboard application summary returns an empty successful summary when no active applications exist', async () => {
    const originalQuery = pool.query;
    pool.query = async () => ({
        rows: [{ status_counts: [], interviewed_application_count: 0 }],
    });

    try {
        assert.deepEqual(await getDashboardApplicationSummary(7), {
            statusCounts: [],
            interviewedApplicationCount: 0,
        });
    } finally {
        pool.query = originalQuery;
    }
});

test('weekly application counts use one requested time zone for calendar boundaries and grouping', async () => {
    const originalQuery = pool.query;
    let captured;
    pool.query = async (sql, values) => {
        captured = { sql: String(sql), values };
        return { rows: [{ start_of_week: '2026-08-24', applications_count: '3' }] };
    };

    try {
        assert.deepEqual(await getApplicationsForLatestEightWeeks(42, 'America/Los_Angeles'), [
            { start_of_week: '2026-08-24', applications_count: '3' },
        ]);
    } finally {
        pool.query = originalQuery;
    }

    assert.deepEqual(captured.values, [42, 'America/Los_Angeles']);
    assert.match(captured.sql, /CURRENT_TIMESTAMP AT TIME ZONE \$2/);
    assert.match(captured.sql, /application_date AT TIME ZONE \$2/);
    assert.match(captured.sql, /TO_CHAR\(weeks\.start_of_week, 'YYYY-MM-DD'\)/);
});
