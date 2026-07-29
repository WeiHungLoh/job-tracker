import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { pool } from '../dist/db/connectDB.js';
import { clearApplicationFollowUpSent, markApplicationFollowUpSent } from '../dist/db/queries/jobApplications.js';
import { clearInterviewFollowUpSent, markInterviewFollowUpSent } from '../dist/db/queries/interviews.js';
import applicationRouter from '../dist/routes/application/index.js';
import interviewRouter from '../dist/routes/interview/index.js';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const getRouteHandler = (router, path, method) => {
    const layer = router.stack.find((candidate) => candidate.route?.path === path && candidate.route?.methods[method]);
    assert.ok(layer, `${method.toUpperCase()} ${path} route should exist`);
    return layer.route.stack.at(-1).handle;
};

const createResponse = () => {
    const result = { statusCode: 200, body: undefined };
    return {
        result,
        response: {
            json(body) {
                result.body = body;
                return this;
            },
            send(body) {
                result.body = body;
                return this;
            },
            sendStatus(statusCode) {
                result.statusCode = statusCode;
                return this;
            },
            status(statusCode) {
                result.statusCode = statusCode;
                return this;
            },
        },
    };
};

test('adds nullable follow-up timestamps to fresh application and interview tables', async () => {
    const source = await readSource('../src/db/queries/createTables.ts');

    assert.match(source, /application_follow_up_sent_at TIMESTAMPTZ/);
    assert.match(source, /follow_up_sent_at TIMESTAMPTZ/);
});

test('keeps follow-up mutations user-scoped, active-only, and server timestamped', async () => {
    const applicationQueries = await readSource('../src/db/queries/jobApplications.ts');
    const interviewQueries = await readSource('../src/db/queries/interviews.ts');

    assert.match(
        applicationQueries,
        /SET application_follow_up_sent_at = COALESCE\(application_follow_up_sent_at, CURRENT_TIMESTAMP\)/
    );
    assert.match(
        applicationQueries,
        /WHERE job_id = \$1 AND user_id = \$2 AND is_archived = false\s+AND job_status = 'Applied'/
    );
    assert.match(applicationQueries, /SET application_follow_up_sent_at = NULL/);
    assert.match(interviewQueries, /SET follow_up_sent_at = COALESCE\(follow_up_sent_at, CURRENT_TIMESTAMP\)/);
    assert.match(interviewQueries, /SET follow_up_sent_at = NULL/);

    for (const source of [applicationQueries, interviewQueries]) {
        assert.match(source, /RETURNING/);
        assert.match(source, /user_id = \$2/);
        assert.match(source, /is_archived = false/);
    }
});

test('returns follow-up timestamps from active and archived collection queries', async () => {
    const activeApplications = await readSource('../src/db/queries/jobApplications.ts');
    const archivedApplications = await readSource('../src/db/queries/archivedJobApplications.ts');
    const activeInterviews = await readSource('../src/db/queries/interviews.ts');
    const archivedInterviews = await readSource('../src/db/queries/archivedInterviews.ts');

    assert.match(activeApplications, /application_follow_up_sent_at/);
    assert.match(archivedApplications, /application_follow_up_sent_at/);
    assert.match(activeInterviews, /follow_up_sent_at/);
    assert.match(archivedInterviews, /follow_up_sent_at/);
});

test('atomically clears an application follow-up when status leaves Applied', async () => {
    const source = await readSource('../src/db/queries/jobApplications.ts');

    assert.match(
        source,
        /application_follow_up_sent_at = CASE\s+WHEN \$1::text = 'Applied' THEN application_follow_up_sent_at\s+ELSE NULL\s+END/
    );
});

test('exposes resource-oriented follow-up endpoints before generic id routes', async () => {
    const applicationRoutes = await readSource('../src/routes/application/index.ts');
    const interviewRoutes = await readSource('../src/routes/interview/index.ts');

    assert.match(applicationRoutes, /router\.put\(\s*'\/:jobId\/follow-up'/);
    assert.match(applicationRoutes, /router\.delete\(\s*'\/:jobId\/follow-up'/);
    assert.match(interviewRoutes, /router\.put\(\s*'\/:interviewId\/follow-up'/);
    assert.match(interviewRoutes, /router\.delete\(\s*'\/:interviewId\/follow-up'/);
});

test('application follow-up mutations return the server value and scope every query to the user', async () => {
    const originalQuery = pool.query;
    const sentAt = new Date('2026-07-27T07:42:00.000Z');
    const calls = [];
    pool.query = async (sql, values) => {
        calls.push({ sql: String(sql), values });
        return calls.length === 1
            ? { rows: [{ application_follow_up_sent_at: sentAt }], rowCount: 1 }
            : { rows: [{ job_id: 17 }], rowCount: 1 };
    };

    try {
        assert.equal(await markApplicationFollowUpSent(17, 42), sentAt);
        assert.equal(await clearApplicationFollowUpSent(17, 42), true);
    } finally {
        pool.query = originalQuery;
    }

    assert.deepEqual(
        calls.map((call) => call.values),
        [
            [17, 42],
            [17, 42],
        ]
    );
    assert.match(calls[0].sql, /CURRENT_TIMESTAMP/);
    assert.match(calls[0].sql, /job_status = 'Applied'/);
    assert.match(calls[1].sql, /application_follow_up_sent_at = NULL/);
});

test('interview follow-up mutations affect only the exact active user-scoped interview', async () => {
    const originalQuery = pool.query;
    const sentAt = new Date('2026-07-27T07:42:00.000Z');
    const calls = [];
    pool.query = async (sql, values) => {
        calls.push({ sql: String(sql), values });
        return calls.length === 1
            ? { rows: [{ interview_exists: true, follow_up_sent_at: sentAt }], rowCount: 1 }
            : { rows: [{ interview_id: 23 }], rowCount: 1 };
    };

    try {
        assert.equal(await markInterviewFollowUpSent(23, 42), sentAt);
        assert.equal(await clearInterviewFollowUpSent(23, 42), true);
    } finally {
        pool.query = originalQuery;
    }

    assert.deepEqual(
        calls.map((call) => call.values),
        [
            [23, 42],
            [23, 42],
        ]
    );
    for (const call of calls) {
        assert.match(call.sql, /interview_id = \$1 AND user_id = \$2 AND is_archived = false/);
    }
    assert.match(
        calls[0].sql,
        /interviews\.interview_date\s+\+ interviews\.interview_duration_minutes \* INTERVAL '1 minute' <= CURRENT_TIMESTAMP/
    );
});

test('rejects marking an interview follow-up before the interview has finished', async () => {
    const originalQuery = pool.query;
    pool.query = async () => ({
        rows: [{ interview_exists: true, follow_up_sent_at: null }],
        rowCount: 1,
    });

    try {
        assert.equal(await markInterviewFollowUpSent(23, 42), 'not-completed');
    } finally {
        pool.query = originalQuery;
    }
});

test('archive and restore queries do not clear either follow-up timestamp', async () => {
    const source = await readSource('../src/db/queries/archivedJobApplications.ts');

    assert.doesNotMatch(source, /SET application_follow_up_sent_at/);
    assert.doesNotMatch(source, /SET follow_up_sent_at/);
});

test('follow-up routes validate IDs, return server timestamps, and hide inaccessible records behind 404', async () => {
    const originalQuery = pool.query;
    const sentAt = new Date('2026-07-27T07:42:00.000Z');
    const applicationMark = getRouteHandler(applicationRouter, '/:jobId/follow-up', 'put');
    const interviewMark = getRouteHandler(interviewRouter, '/:interviewId/follow-up', 'put');

    try {
        pool.query = async () => ({ rows: [{ application_follow_up_sent_at: sentAt }], rowCount: 1 });
        const markedApplication = createResponse();
        await applicationMark({ params: { jobId: '17' }, user: { id: 42 } }, markedApplication.response);
        assert.equal(markedApplication.result.statusCode, 200);
        assert.deepEqual(markedApplication.result.body, { application_follow_up_sent_at: sentAt });

        pool.query = async () => ({ rows: [], rowCount: 0 });
        const inaccessibleInterview = createResponse();
        await interviewMark({ params: { interviewId: '23' }, user: { id: 42 } }, inaccessibleInterview.response);
        assert.equal(inaccessibleInterview.result.statusCode, 404);
        assert.deepEqual(inaccessibleInterview.result.body, { message: 'Active interview not found.' });

        pool.query = async () => ({
            rows: [{ interview_exists: true, follow_up_sent_at: null }],
            rowCount: 1,
        });
        const unfinishedInterview = createResponse();
        await interviewMark({ params: { interviewId: '23' }, user: { id: 42 } }, unfinishedInterview.response);
        assert.equal(unfinishedInterview.result.statusCode, 409);
        assert.deepEqual(unfinishedInterview.result.body, {
            message: 'Interview follow-up can only be marked as sent after the interview has finished.',
        });

        const invalidApplication = createResponse();
        await applicationMark({ params: { jobId: '0' }, user: { id: 42 } }, invalidApplication.response);
        assert.equal(invalidApplication.result.statusCode, 422);
    } finally {
        pool.query = originalQuery;
    }
});
