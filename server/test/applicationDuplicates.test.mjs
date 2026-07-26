import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pool } from '../dist/db/connectDB.js';
import { findPotentialDuplicateApplication } from '../dist/db/queries/jobApplications.js';
import applicationRouter from '../dist/routes/application/index.js';

const VALID_APPLICATION = {
    companyName: 'Morgan Stanley',
    jobTitle: 'Software Engineer',
    appDate: '2020-01-02',
    jobStatus: 'Applied',
    jobLocation: 'Singapore',
    jobURL: 'https://example.com/jobs/123',
};

const createApplicationLayer = applicationRouter.stack.find(
    (layer) => layer.route?.path === '/' && layer.route.methods.post
);
assert.ok(createApplicationLayer, 'Expected the create-application route to be registered');
const createApplicationHandler = createApplicationLayer.route.stack.at(-1)?.handle;
assert.equal(typeof createApplicationHandler, 'function');

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

const invokeCreateApplication = async (body, userId = 42) => {
    const response = createResponse();
    await createApplicationHandler({ body, user: { id: userId } }, response);
    return response;
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

const compactSQL = (sql) => sql.replace(/\s+/g, ' ').trim();

test('duplicate query is user-scoped, parameterized, searches active and archived rows, and returns public fields only', async () => {
    const expectedDuplicate = {
        company_name: 'Morgan Stanley',
        job_title: 'Software Engineer',
        application_date: new Date('2020-01-02T10:30:00.000Z'),
    };
    let queryCall;

    const duplicate = await withMockedPoolQuery(
        async (sql, values) => {
            queryCall = { sql: compactSQL(sql), values };
            return { rows: [expectedDuplicate] };
        },
        () =>
            findPotentialDuplicateApplication(42, 'Morgan Stanley', 'Software Engineer', 'https://example.com/jobs/123')
    );

    assert.deepEqual(duplicate, expectedDuplicate);
    assert.deepEqual(queryCall.values, [42, 'Morgan Stanley', 'Software Engineer', 'https://example.com/jobs/123']);
    assert.match(
        queryCall.sql,
        /^SELECT company_name, job_title, application_date FROM job_applications WHERE user_id = \$1 /
    );
    assert.doesNotMatch(queryCall.sql, /\bis_archived\s*=/);
    assert.doesNotMatch(queryCall.sql, /SELECT \*/i);
    assert.doesNotMatch(queryCall.sql, /Morgan Stanley|Software Engineer|example\.com/);
});

test('duplicate query uses exact non-empty trimmed URLs or an exact normalized company-and-title pair', async () => {
    let sql;

    await withMockedPoolQuery(
        async (query) => {
            sql = compactSQL(query);
            return { rows: [] };
        },
        () => findPotentialDuplicateApplication(8, '  Morgan   Stanley ', ' Software   Engineer ', '')
    );

    assert.match(sql, /NULLIF\(BTRIM\(\$4::text\), ''\) IS NOT NULL/);
    assert.match(sql, /NULLIF\(BTRIM\(job_posting_url\), ''\) IS NOT NULL/);
    assert.match(sql, /BTRIM\(job_posting_url\) = BTRIM\(\$4::text\)/);
    assert.equal(sql.split("'[[:space:]]+'").length - 1, 4);
    assert.match(sql, /LOWER\(BTRIM\(REGEXP_REPLACE\(company_name,/);
    assert.match(sql, /LOWER\(BTRIM\(REGEXP_REPLACE\(\$2::text,/);
    assert.match(sql, /LOWER\(BTRIM\(REGEXP_REPLACE\(job_title,/);
    assert.match(sql, /LOWER\(BTRIM\(REGEXP_REPLACE\(\$3::text,/);
    assert.match(sql, /company_name[\s\S]* = [\s\S]*\$2::text[\s\S]* AND [\s\S]*job_title[\s\S]* = [\s\S]*\$3::text/);
    assert.match(sql, /\) OR \(/);
    assert.doesNotMatch(sql, /\bILIKE\b|similarity|levenshtein/i);
});

test('duplicate query deterministically prioritizes URL, active rows, recent dates, and stable IDs', async () => {
    let sql;

    const duplicate = await withMockedPoolQuery(
        async (query, values) => {
            sql = compactSQL(query);
            assert.equal(values[3], '');
            return { rows: [] };
        },
        () => findPotentialDuplicateApplication(5, 'Example', 'Engineer', '')
    );

    assert.equal(duplicate, undefined);
    assert.match(
        sql,
        /ORDER BY CASE WHEN[\s\S]*job_posting_url[\s\S]* = BTRIM\(\$4::text\) THEN 0 ELSE 1 END ASC, is_archived ASC, application_date DESC, job_id ASC LIMIT 1$/
    );
});

test('no duplicate preserves trimmed insertion values and the existing 201 response', async () => {
    const calls = [];

    const response = await withMockedPoolQuery(
        async (sql, values) => {
            calls.push({ sql: compactSQL(sql), values });
            return { rows: [], rowCount: 1 };
        },
        () =>
            invokeCreateApplication({
                ...VALID_APPLICATION,
                companyName: '  Morgan Stanley  ',
                jobTitle: '  Software Engineer  ',
                jobLocation: '  Singapore  ',
                jobURL: '  https://example.com/jobs/123  ',
            })
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body, 'Successfully added a job application!');
    assert.equal(calls.length, 2);
    assert.match(calls[0].sql, /^SELECT /);
    assert.deepEqual(calls[0].values, [42, 'Morgan Stanley', 'Software Engineer', 'https://example.com/jobs/123']);
    assert.match(calls[1].sql, /^INSERT INTO job_applications /);
    assert.deepEqual(calls[1].values, [
        42,
        'Morgan Stanley',
        'Software Engineer',
        '2020-01-02T00:00:00.000Z',
        'Applied',
        'Singapore',
        'https://example.com/jobs/123',
    ]);
});

test('a possible duplicate returns the stable 409 shape with an ISO date and does not insert', async () => {
    const calls = [];
    const storedDuplicate = {
        company_name: 'Morgan Stanley',
        job_title: 'Software Engineer',
        application_date: new Date('2020-01-02T10:30:00.000Z'),
        job_id: 99,
        user_id: 42,
        notes: 'must not leak',
    };

    const response = await withMockedPoolQuery(
        async (sql) => {
            calls.push(compactSQL(sql));
            return { rows: [storedDuplicate] };
        },
        () => invokeCreateApplication({ ...VALID_APPLICATION, allowDuplicate: false })
    );

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
        code: 'POSSIBLE_DUPLICATE_APPLICATION',
        message: 'A possible duplicate job application already exists.',
        duplicate: {
            company_name: 'Morgan Stanley',
            job_title: 'Software Engineer',
            application_date: '2020-01-02T10:30:00.000Z',
        },
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0], /^SELECT /);
});

test('allowDuplicate true bypasses the duplicate lookup and inserts through the single creation path', async () => {
    const calls = [];

    const response = await withMockedPoolQuery(
        async (sql, values) => {
            calls.push({ sql: compactSQL(sql), values });
            return { rows: [], rowCount: 1 };
        },
        () => invokeCreateApplication({ ...VALID_APPLICATION, allowDuplicate: true }, 77)
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body, 'Successfully added a job application!');
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /^INSERT INTO job_applications /);
    assert.equal(calls[0].values[0], 77);
});

test('a non-boolean duplicate override is rejected with the existing validation response before database access', async () => {
    let queryCalled = false;

    const response = await withMockedPoolQuery(
        async () => {
            queryCalled = true;
            return { rows: [] };
        },
        () => invokeCreateApplication({ ...VALID_APPLICATION, allowDuplicate: 'true' })
    );

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.body, { message: 'Job application fields are missing, invalid, or too long.' });
    assert.equal(queryCalled, false);
});

test('future-date validation retains precedence over an invalid duplicate override', async () => {
    let queryCalled = false;

    const response = await withMockedPoolQuery(
        async () => {
            queryCalled = true;
            return { rows: [] };
        },
        () => invokeCreateApplication({ ...VALID_APPLICATION, appDate: '9999-12-31', allowDuplicate: 'true' })
    );

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.body, { message: 'Application date cannot be in the future.' });
    assert.equal(queryCalled, false);
});

test('HTTP URL validation retains precedence over an invalid duplicate override', async () => {
    let queryCalled = false;

    const response = await withMockedPoolQuery(
        async () => {
            queryCalled = true;
            return { rows: [] };
        },
        () =>
            invokeCreateApplication({
                ...VALID_APPLICATION,
                jobURL: 'ftp://example.com/job',
                allowDuplicate: 'true',
            })
    );

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.body, { message: 'URL must be in a valid format.' });
    assert.equal(queryCalled, false);
});

test('duplicate override does not bypass the existing HTTP URL validation', async () => {
    let queryCalled = false;

    const response = await withMockedPoolQuery(
        async () => {
            queryCalled = true;
            return { rows: [] };
        },
        () => invokeCreateApplication({ ...VALID_APPLICATION, jobURL: 'ftp://example.com/job', allowDuplicate: true })
    );

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.body, { message: 'URL must be in a valid format.' });
    assert.equal(queryCalled, false);
});
