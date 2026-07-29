import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { pool } from '../dist/db/connectDB.js';
import { archiveAllJobApplications, unarchiveAllJobApplications } from '../dist/db/queries/archivedJobApplications.js';
import {
    getApplicationCollectionSummary,
    getInterviewCollectionSummary,
} from '../dist/db/queries/collectionSummaries.js';

const withMockPoolConnect = async (query, operation) => {
    const originalConnect = pool.connect;
    let released = false;
    pool.connect = async () => ({ query, release: () => (released = true) });

    try {
        await operation();
        return { released };
    } finally {
        pool.connect = originalConnect;
    }
};

test('Archive All uses one user-scoped set update and commits application/interview changes together', async () => {
    const calls = [];
    const { released } = await withMockPoolConnect(
        async (sql, values) => {
            calls.push({ sql, values });
            return { rowCount: 0, rows: [] };
        },
        () => archiveAllJobApplications(42)
    );

    assert.equal(calls[0].sql, 'BEGIN');
    assert.match(calls[1].sql, /WITH archived_applications AS/);
    assert.match(calls[1].sql, /SET is_archived = true/);
    assert.match(calls[1].sql, /WHERE user_id = \$1 AND is_archived = false/);
    assert.match(calls[1].sql, /interviews\.user_id = \$1/);
    assert.deepEqual(calls[1].values, [42]);
    assert.equal(calls[2].sql, 'COMMIT');
    assert.equal(released, true);
});

test('Archive All rolls back and releases the client without a partial commit', async () => {
    const calls = [];
    const expectedError = new Error('interview update failed');
    const originalConnect = pool.connect;
    let released = false;
    pool.connect = async () => ({
        query: async (sql) => {
            calls.push(sql);
            if (String(sql).includes('WITH archived_applications')) {
                throw expectedError;
            }
            return { rowCount: 0, rows: [] };
        },
        release: () => (released = true),
    });

    try {
        await assert.rejects(archiveAllJobApplications(42), expectedError);
    } finally {
        pool.connect = originalConnect;
    }

    assert.equal(calls[0], 'BEGIN');
    assert.match(calls[1], /WITH archived_applications AS/);
    assert.equal(calls[2], 'ROLLBACK');
    assert.equal(released, true);
});

test('Unarchive All updates only the authenticated archived collection and commits', async () => {
    const calls = [];
    await withMockPoolConnect(
        async (sql, values) => {
            calls.push({ sql, values });
            return { rowCount: 0, rows: [] };
        },
        () => unarchiveAllJobApplications(7)
    );

    assert.equal(calls[0].sql, 'BEGIN');
    assert.match(calls[1].sql, /WITH unarchived_applications AS/);
    assert.match(calls[1].sql, /WHERE user_id = \$1 AND is_archived = true/);
    assert.match(calls[1].sql, /interviews\.user_id = \$1/);
    assert.deepEqual(calls[1].values, [7]);
    assert.equal(calls[2].sql, 'COMMIT');
});

test('collection summaries use one aggregate query with matching user and archive predicates', async () => {
    const originalQuery = pool.query;
    const calls = [];
    pool.query = async (sql, values) => {
        calls.push({ sql, values });
        return {
            rows: String(sql).includes('COUNT(DISTINCT')
                ? [
                      {
                          application_count: 2,
                          related_interview_count: 1,
                          offer_evaluation_count: 1,
                          counteroffer_plan_count: 1,
                      },
                  ]
                : [{ interview_count: 3 }],
        };
    };

    try {
        assert.deepEqual(await getApplicationCollectionSummary(9, false), {
            application_count: 2,
            related_interview_count: 1,
            offer_evaluation_count: 1,
            counteroffer_plan_count: 1,
        });
        assert.deepEqual(await getInterviewCollectionSummary(9, true), { interview_count: 3 });
    } finally {
        pool.query = originalQuery;
    }

    assert.match(calls[0].sql, /applications\.user_id = \$1/);
    assert.match(calls[0].sql, /interviews\.user_id = \$1/);
    assert.match(calls[0].sql, /COUNT\(DISTINCT evaluations\.job_id\)::integer AS offer_evaluation_count/);
    assert.match(calls[0].sql, /COUNT\(DISTINCT counteroffers\.job_id\)::integer AS counteroffer_plan_count/);
    assert.deepEqual(calls[0].values, [9, false]);
    assert.match(calls[1].sql, /WHERE user_id = \$1 AND is_archived = \$2/);
    assert.deepEqual(calls[1].values, [9, true]);
});

test('static bulk routes precede parameterized application and interview routes', async () => {
    const archivedApplicationRoutes = await readFile(
        new URL('../src/routes/archivedApplication/index.ts', import.meta.url),
        'utf8'
    );
    const applicationRoutes = await readFile(new URL('../src/routes/application/index.ts', import.meta.url), 'utf8');
    const interviewRoutes = await readFile(new URL('../src/routes/interview/index.ts', import.meta.url), 'utf8');
    const archivedInterviewRoutes = await readFile(
        new URL('../src/routes/archivedInterview/index.ts', import.meta.url),
        'utf8'
    );

    assert.ok(
        archivedApplicationRoutes.indexOf("'/archive-all'") < archivedApplicationRoutes.indexOf("'/:archivedJobId'")
    );
    assert.ok(
        archivedApplicationRoutes.indexOf("'/unarchive-all'") < archivedApplicationRoutes.indexOf("'/:archivedJobId'")
    );
    assert.ok(applicationRoutes.indexOf("'/summary'") < applicationRoutes.indexOf("'/:jobId'"));
    assert.ok(interviewRoutes.indexOf("'/summary'") < interviewRoutes.indexOf("'/:interviewId'"));
    assert.ok(
        archivedInterviewRoutes.indexOf("'/summary'") < archivedInterviewRoutes.indexOf("'/:archivedInterviewId'")
    );
});

test('existing Delete All queries remain user-scoped and archive-scoped with application cascades', async () => {
    const activeApplications = await readFile(new URL('../src/db/queries/jobApplications.ts', import.meta.url), 'utf8');
    const archivedApplications = await readFile(
        new URL('../src/db/queries/archivedJobApplications.ts', import.meta.url),
        'utf8'
    );
    const activeInterviews = await readFile(new URL('../src/db/queries/interviews.ts', import.meta.url), 'utf8');
    const archivedInterviews = await readFile(
        new URL('../src/db/queries/archivedInterviews.ts', import.meta.url),
        'utf8'
    );
    const schema = await readFile(new URL('../src/db/queries/createTables.ts', import.meta.url), 'utf8');

    assert.match(activeApplications, /DELETE FROM job_applications WHERE user_id = \$1 AND is_archived = false/);
    assert.match(archivedApplications, /DELETE FROM job_applications WHERE user_id = \$1 AND is_archived = true/);
    assert.match(activeInterviews, /DELETE FROM interviews WHERE user_id = \$1 AND is_archived = false/);
    assert.match(archivedInterviews, /DELETE FROM interviews WHERE user_id = \$1 AND is_archived = true/);
    assert.match(schema, /REFERENCES job_applications\(job_id, user_id\)[\s\S]*?ON DELETE CASCADE/);
});
