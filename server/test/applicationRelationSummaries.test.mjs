import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pool } from '../dist/db/connectDB.js';
import * as collectionSummaries from '../dist/db/queries/collectionSummaries.js';
import applicationRouter from '../dist/routes/application/index.js';
import archivedApplicationRouter from '../dist/routes/archivedApplication/index.js';

const compactSQL = (sql) => sql.replace(/\s+/g, ' ').trim();

const createResponse = () => ({
    statusCode: undefined,
    body: undefined,
    status(statusCode) {
        this.statusCode = statusCode;
        return this;
    },
    send(body) {
        this.body = body;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

const getRouteHandler = (router, path) => {
    const layer = router.stack.find((candidate) => candidate.route?.path === path && candidate.route.methods.get);
    return layer?.route.stack.at(-1)?.handle;
};

const withMockedPoolQuery = async (query, operation) => {
    const originalQuery = pool.query;
    pool.query = query;

    try {
        return await operation();
    } finally {
        pool.query = originalQuery;
    }
};

test('application relation summary uses one parameterized owner/state-scoped aggregate query', async () => {
    const getApplicationRelationSummary = collectionSummaries.getApplicationRelationSummary;
    assert.equal(typeof getApplicationRelationSummary, 'function');

    const calls = [];
    const summary = await withMockedPoolQuery(
        async (sql, values) => {
            calls.push({ sql: compactSQL(sql), values });
            return { rows: [{ related_interview_count: 3, offer_evaluation_count: 1, counteroffer_plan_count: 1 }] };
        },
        () => getApplicationRelationSummary(17, 42, false)
    );

    assert.deepEqual(summary, { related_interview_count: 3, offer_evaluation_count: 1, counteroffer_plan_count: 1 });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].values, [17, 42, false]);
    assert.match(calls[0].sql, /COUNT\(DISTINCT interviews\.interview_id\)::integer AS related_interview_count/);
    assert.match(calls[0].sql, /COUNT\(DISTINCT evaluations\.job_id\)::integer AS offer_evaluation_count/);
    assert.match(calls[0].sql, /COUNT\(DISTINCT counteroffers\.job_id\)::integer AS counteroffer_plan_count/);
    assert.match(calls[0].sql, /FROM job_applications AS applications LEFT JOIN interviews/);
    assert.match(calls[0].sql, /interviews\.job_id = applications\.job_id/);
    assert.match(calls[0].sql, /interviews\.user_id = applications\.user_id/);
    assert.match(calls[0].sql, /interviews\.is_archived = \$3/);
    assert.match(calls[0].sql, /evaluations\.job_id = applications\.job_id/);
    assert.match(calls[0].sql, /evaluations\.user_id = applications\.user_id/);
    assert.match(calls[0].sql, /counteroffers\.job_id = applications\.job_id/);
    assert.match(calls[0].sql, /counteroffers\.user_id = applications\.user_id/);
    assert.match(calls[0].sql, /applications\.job_id = \$1/);
    assert.match(calls[0].sql, /applications\.user_id = \$2/);
    assert.match(calls[0].sql, /applications\.is_archived = \$3/);
    assert.match(calls[0].sql, /GROUP BY applications\.job_id/);
    assert.doesNotMatch(calls[0].sql, /\b17\b|\b42\b/);
});

test('application relation summary returns no result for an application outside the requested owner/state scope', async () => {
    const getApplicationRelationSummary = collectionSummaries.getApplicationRelationSummary;
    assert.equal(typeof getApplicationRelationSummary, 'function');

    let queryCount = 0;
    const summary = await withMockedPoolQuery(
        async () => {
            queryCount += 1;
            return { rows: [] };
        },
        () => getApplicationRelationSummary(91, 7, true)
    );

    assert.equal(summary, undefined);
    assert.equal(queryCount, 1);
});

test('active application relation-summary route returns the scoped count from one query', async () => {
    const handler = getRouteHandler(applicationRouter, '/:jobId/relation-summary');
    assert.equal(typeof handler, 'function');

    const calls = [];
    const response = await withMockedPoolQuery(
        async (sql, values) => {
            calls.push({ sql: compactSQL(sql), values });
            return { rows: [{ related_interview_count: 2, offer_evaluation_count: 1, counteroffer_plan_count: 1 }] };
        },
        async () => {
            const routeResponse = createResponse();
            await handler({ params: { jobId: '17' }, user: { id: 42 } }, routeResponse);
            return routeResponse;
        }
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
        related_interview_count: 2,
        offer_evaluation_count: 1,
        counteroffer_plan_count: 1,
    });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].values, [17, 42, false]);
});

test('archived application relation-summary route returns the matching archived-interview count', async () => {
    const handler = getRouteHandler(archivedApplicationRouter, '/:archivedJobId/relation-summary');
    assert.equal(typeof handler, 'function');

    const calls = [];
    const response = await withMockedPoolQuery(
        async (sql, values) => {
            calls.push({ sql: compactSQL(sql), values });
            return { rows: [{ related_interview_count: 4, offer_evaluation_count: 1, counteroffer_plan_count: 1 }] };
        },
        async () => {
            const routeResponse = createResponse();
            await handler({ params: { archivedJobId: '31' }, user: { id: 8 } }, routeResponse);
            return routeResponse;
        }
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
        related_interview_count: 4,
        offer_evaluation_count: 1,
        counteroffer_plan_count: 1,
    });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].values, [31, 8, true]);
});

test('missing, wrong-owner, and wrong-state applications share the existing 404 response convention', async () => {
    const cases = [
        {
            handler: getRouteHandler(applicationRouter, '/:jobId/relation-summary'),
            request: { params: { jobId: '17' }, user: { id: 42 } },
            expectedValues: [17, 42, false],
            message: 'Job application not found.',
        },
        {
            handler: getRouteHandler(archivedApplicationRouter, '/:archivedJobId/relation-summary'),
            request: { params: { archivedJobId: '31' }, user: { id: 8 } },
            expectedValues: [31, 8, true],
            message: 'Archived job application not found.',
        },
    ];

    for (const routeCase of cases) {
        assert.equal(typeof routeCase.handler, 'function');
        const calls = [];
        const response = await withMockedPoolQuery(
            async (_sql, values) => {
                calls.push(values);
                return { rows: [] };
            },
            async () => {
                const routeResponse = createResponse();
                await routeCase.handler(routeCase.request, routeResponse);
                return routeResponse;
            }
        );

        assert.equal(response.statusCode, 404);
        assert.deepEqual(response.body, { message: routeCase.message });
        assert.deepEqual(calls, [routeCase.expectedValues]);
    }
});

test('relation-summary routes reject invalid IDs before querying the database', async () => {
    const cases = [
        {
            handler: getRouteHandler(applicationRouter, '/:jobId/relation-summary'),
            request: { params: { jobId: 'invalid' }, user: { id: 42 } },
            message: 'Job application ID must be a positive integer.',
        },
        {
            handler: getRouteHandler(archivedApplicationRouter, '/:archivedJobId/relation-summary'),
            request: { params: { archivedJobId: '0' }, user: { id: 8 } },
            message: 'Archived job application ID must be a positive integer.',
        },
    ];
    let queryCount = 0;

    for (const routeCase of cases) {
        assert.equal(typeof routeCase.handler, 'function');
        const response = await withMockedPoolQuery(
            async () => {
                queryCount += 1;
                return { rows: [] };
            },
            async () => {
                const routeResponse = createResponse();
                await routeCase.handler(routeCase.request, routeResponse);
                return routeResponse;
            }
        );

        assert.equal(response.statusCode, 422);
        assert.deepEqual(response.body, { message: routeCase.message });
    }

    assert.equal(queryCount, 0);
});

test('relation-summary endpoints are registered before parameterized application routes', () => {
    const activePaths = applicationRouter.stack.map((layer) => layer.route?.path).filter(Boolean);
    const archivedPaths = archivedApplicationRouter.stack.map((layer) => layer.route?.path).filter(Boolean);
    const activeRelationIndex = activePaths.indexOf('/:jobId/relation-summary');
    const archivedRelationIndex = archivedPaths.indexOf('/:archivedJobId/relation-summary');

    assert.notEqual(activeRelationIndex, -1);
    assert.notEqual(archivedRelationIndex, -1);
    assert.ok(activeRelationIndex < activePaths.indexOf('/:jobId'));
    assert.ok(archivedRelationIndex < archivedPaths.indexOf('/:archivedJobId'));
});
