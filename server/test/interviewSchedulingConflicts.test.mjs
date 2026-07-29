import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pool } from '../dist/db/connectDB.js';
import { getInterviewOfferDeadlineWarnings, getInterviewSchedulingConflicts } from '../dist/db/queries/interviews.js';
import interviewRouter from '../dist/routes/interview/index.js';

const VALID_INTERVIEW = {
    jobId: 11,
    interviewDate: '2026-07-25T06:30:00.000Z',
    interviewDurationMinutes: 30,
    interviewLocation: 'Zoom',
    interviewType: 'Technical Interview',
    notes: 'Prepare system design examples.',
};

const createInterviewLayer = interviewRouter.stack.find(
    (layer) => layer.route?.path === '/' && layer.route.methods.post
);
assert.ok(createInterviewLayer, 'Expected the create-interview route to be registered');
const createInterviewHandler = createInterviewLayer.route.stack.at(-1)?.handle;
assert.equal(typeof createInterviewHandler, 'function');

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

const invokeCreateInterview = async (body, userId = 42) => {
    const response = createResponse();
    await createInterviewHandler({ body, user: { id: userId } }, response);
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
const AUTHORITATIVE_NOW = Date.parse('2026-07-25T13:00:00.000Z');

const storedConflict = {
    interview_id: 51,
    job_id: 12,
    company_name: 'Grab',
    job_title: 'Software Engineer',
    interview_date: new Date('2026-07-25T06:00:00.000Z'),
    interview_duration_minutes: 60,
    interview_type: 'Technical Interview',
};

const storedOfferDeadlineWarning = {
    job_id: 13,
    company_name: 'Stripe',
    job_title: 'Platform Engineer',
    decision_deadline: new Date('2026-07-25T07:00:00.000Z'),
};

test('offer deadline lookup is user-scoped, active-only, excludes the target job, and checks the interview end', async () => {
    let queryCall;

    const warnings = await withMockedPoolQuery(
        async (sql, values) => {
            queryCall = { sql: compactSQL(sql), values };
            return { rows: [storedOfferDeadlineWarning] };
        },
        () => getInterviewOfferDeadlineWarnings(11, 42, VALID_INTERVIEW.interviewDate, 60)
    );

    assert.deepEqual(warnings, [storedOfferDeadlineWarning]);
    assert.deepEqual(queryCall.values, [11, 42, VALID_INTERVIEW.interviewDate, 60]);
    assert.match(queryCall.sql, /applications\.user_id = \$2/);
    assert.match(queryCall.sql, /applications\.is_archived = false/);
    assert.match(queryCall.sql, /applications\.job_status = 'Offer'/);
    assert.match(queryCall.sql, /applications\.job_id <> \$1/);
    assert.match(queryCall.sql, /\$3::timestamptz >= NOW\(\)/);
    assert.match(queryCall.sql, /evaluations\.decision_deadline >= NOW\(\)/);
    assert.match(queryCall.sql, /evaluations\.decision_deadline <= \$3::timestamptz \+ \$4 \* INTERVAL '1 minute'/);
    assert.match(queryCall.sql, /ORDER BY evaluations\.decision_deadline ASC/);
});

test('scheduling conflict lookup ignores interviews that have already ended', async () => {
    let queryCall;

    await withMockedPoolQuery(
        async (sql, values) => {
            queryCall = { sql: compactSQL(sql), values };
            return { rows: [] };
        },
        () => getInterviewSchedulingConflicts(11, 42, VALID_INTERVIEW.interviewDate, 60)
    );

    assert.match(
        queryCall.sql,
        /interviews\.interview_date \+ interviews\.interview_duration_minutes \* INTERVAL '1 minute' > NOW\(\)/
    );
});

test('an active offer deadline warning returns 409 and does not insert', async () => {
    const calls = [];
    const response = await withMockedPoolQuery(
        async (sql) => {
            const query = compactSQL(sql);
            calls.push(query);
            if (query.includes('ORDER BY interviews.interview_date ASC')) {
                return { rows: [] };
            }
            return { rows: [storedOfferDeadlineWarning] };
        },
        () => invokeCreateInterview(VALID_INTERVIEW)
    );

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
        code: 'INTERVIEW_OFFER_DEADLINE_WARNING',
        message: 'This interview may finish after an active offer deadline.',
        warnings: [
            {
                job_id: 13,
                company_name: 'Stripe',
                job_title: 'Platform Engineer',
                decision_deadline: '2026-07-25T07:00:00.000Z',
            },
        ],
    });
    assert.equal(calls.length, 2);
    assert.ok(calls.every((query) => !query.includes('INSERT INTO interviews')));
});

test('a non-boolean offer deadline override is rejected before database access', async () => {
    let queryCalled = false;
    const response = await withMockedPoolQuery(
        async () => {
            queryCalled = true;
            return { rows: [] };
        },
        () => invokeCreateInterview({ ...VALID_INTERVIEW, allowOfferDeadlineWarning: 'true' })
    );

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.body, { message: 'Interview fields are missing, invalid, or too long.' });
    assert.equal(queryCalled, false);
});

const createStoredConflictFixture = (overrides = {}) => ({
    ...storedConflict,
    user_id: 42,
    is_archived: false,
    application_is_archived: false,
    ...overrides,
});

const getFixtureConflicts = (fixtures, values) => {
    const [, userId, interviewDate, interviewDurationMinutes] = values;
    const newStart = Date.parse(interviewDate);
    const newEnd = newStart + interviewDurationMinutes * 60 * 1000;

    if (newStart < AUTHORITATIVE_NOW) {
        return [];
    }

    return fixtures
        .filter((fixture) => {
            const existingStart = fixture.interview_date.getTime();
            const existingEnd = existingStart + fixture.interview_duration_minutes * 60 * 1000;

            return (
                fixture.user_id === userId &&
                !fixture.is_archived &&
                !fixture.application_is_archived &&
                newStart < existingEnd &&
                existingStart < newEnd
            );
        })
        .sort(
            (firstConflict, secondConflict) =>
                firstConflict.interview_date.getTime() - secondConflict.interview_date.getTime() ||
                firstConflict.interview_id - secondConflict.interview_id
        )
        .map(({ user_id, is_archived, application_is_archived, ...conflict }) => conflict);
};

test('conflict lookup is parameterized, user-scoped, active-only, ordered, and uses strict half-open overlap', async () => {
    let queryCall;

    const conflicts = await withMockedPoolQuery(
        async (sql, values) => {
            queryCall = { sql: compactSQL(sql), values };
            return { rows: [storedConflict] };
        },
        () => getInterviewSchedulingConflicts(11, 42, VALID_INTERVIEW.interviewDate, 30)
    );

    assert.deepEqual(conflicts, [storedConflict]);
    assert.deepEqual(queryCall.values, [11, 42, VALID_INTERVIEW.interviewDate, 30]);
    assert.match(queryCall.sql, /interviews\.user_id = \$2/);
    assert.match(queryCall.sql, /interviews\.is_archived = false/);
    assert.match(queryCall.sql, /applications\.is_archived = false/);
    assert.match(queryCall.sql, /\$3::timestamptz >= NOW\(\)/);
    assert.match(
        queryCall.sql,
        /\$3::timestamptz < interviews\.interview_date \+ interviews\.interview_duration_minutes \* INTERVAL '1 minute'/
    );
    assert.match(queryCall.sql, /interviews\.interview_date < \$3::timestamptz \+ \$4 \* INTERVAL '1 minute'/);
    assert.match(
        queryCall.sql,
        /INTERVAL '1 minute' AND interviews\.interview_date < \$3::timestamptz \+ \$4 \* INTERVAL '1 minute'/
    );
    assert.doesNotMatch(queryCall.sql, /\$3::timestamptz <=|interviews\.interview_date <=/);
    assert.match(queryCall.sql, /ORDER BY interviews\.interview_date ASC/);
    assert.doesNotMatch(queryCall.sql, /interviews\.job_id <>|interviews\.job_id !=/);
});

const conflictScenarios = [
    {
        name: 'no existing interviews returns no conflict',
        fixtures: [],
        interviewDate: '2026-07-25T14:30:00.000Z',
        duration: 30,
        expectedIds: [],
    },
    {
        name: 'same-application overlap is detected',
        fixtures: [createStoredConflictFixture({ job_id: 11, interview_date: new Date('2026-07-25T14:00:00.000Z') })],
        interviewDate: '2026-07-25T14:30:00.000Z',
        duration: 30,
        expectedIds: [51],
    },
    {
        name: 'different-application overlap is detected',
        fixtures: [createStoredConflictFixture({ job_id: 12, interview_date: new Date('2026-07-25T14:00:00.000Z') })],
        interviewDate: '2026-07-25T14:30:00.000Z',
        duration: 30,
        expectedIds: [51],
    },
    {
        name: 'an exact duplicate interval is detected',
        fixtures: [createStoredConflictFixture({ interview_date: new Date('2026-07-25T14:00:00.000Z') })],
        interviewDate: '2026-07-25T14:00:00.000Z',
        duration: 60,
        expectedIds: [51],
    },
    {
        name: 'a new interval contained inside an existing interval is detected',
        fixtures: [
            createStoredConflictFixture({
                interview_date: new Date('2026-07-25T14:00:00.000Z'),
                interview_duration_minutes: 120,
            }),
        ],
        interviewDate: '2026-07-25T14:30:00.000Z',
        duration: 30,
        expectedIds: [51],
    },
    {
        name: 'an existing interval contained inside a new interval is detected',
        fixtures: [
            createStoredConflictFixture({
                interview_date: new Date('2026-07-25T14:30:00.000Z'),
                interview_duration_minutes: 30,
            }),
        ],
        interviewDate: '2026-07-25T14:00:00.000Z',
        duration: 120,
        expectedIds: [51],
    },
    {
        name: 'a left-side partial overlap is detected',
        fixtures: [createStoredConflictFixture({ interview_date: new Date('2026-07-25T14:00:00.000Z') })],
        interviewDate: '2026-07-25T13:30:00.000Z',
        duration: 60,
        expectedIds: [51],
    },
    {
        name: 'a right-side partial overlap is detected',
        fixtures: [createStoredConflictFixture({ interview_date: new Date('2026-07-25T14:00:00.000Z') })],
        interviewDate: '2026-07-25T14:30:00.000Z',
        duration: 60,
        expectedIds: [51],
    },
    {
        name: 'new start equal to existing end is allowed',
        fixtures: [createStoredConflictFixture({ interview_date: new Date('2026-07-25T14:00:00.000Z') })],
        interviewDate: '2026-07-25T15:00:00.000Z',
        duration: 60,
        expectedIds: [],
    },
    {
        name: 'new end equal to existing start is allowed',
        fixtures: [createStoredConflictFixture({ interview_date: new Date('2026-07-25T15:00:00.000Z') })],
        interviewDate: '2026-07-25T14:00:00.000Z',
        duration: 60,
        expectedIds: [],
    },
    {
        name: 'an archived interview is ignored',
        fixtures: [
            createStoredConflictFixture({
                interview_date: new Date('2026-07-25T14:00:00.000Z'),
                is_archived: true,
            }),
        ],
        interviewDate: '2026-07-25T14:30:00.000Z',
        duration: 30,
        expectedIds: [],
    },
    {
        name: 'an interview under an archived application is ignored',
        fixtures: [
            createStoredConflictFixture({
                interview_date: new Date('2026-07-25T14:00:00.000Z'),
                application_is_archived: true,
            }),
        ],
        interviewDate: '2026-07-25T14:30:00.000Z',
        duration: 30,
        expectedIds: [],
    },
    {
        name: "another user's interview is ignored",
        fixtures: [
            createStoredConflictFixture({
                interview_date: new Date('2026-07-25T14:00:00.000Z'),
                user_id: 7,
            }),
        ],
        interviewDate: '2026-07-25T14:30:00.000Z',
        duration: 30,
        expectedIds: [],
    },
    {
        name: 'a proposed interview before the authoritative current time skips conflict detection',
        fixtures: [
            createStoredConflictFixture({
                interview_date: new Date('2026-07-25T12:30:00.000Z'),
                interview_duration_minutes: 60,
            }),
        ],
        interviewDate: '2026-07-25T12:45:00.000Z',
        duration: 30,
        expectedIds: [],
    },
    {
        name: 'a proposed interview at the authoritative current-time boundary is checked normally',
        fixtures: [
            createStoredConflictFixture({
                interview_date: new Date('2026-07-25T12:30:00.000Z'),
                interview_duration_minutes: 60,
            }),
        ],
        interviewDate: '2026-07-25T13:00:00.000Z',
        duration: 30,
        expectedIds: [51],
    },
];

for (const scenario of conflictScenarios) {
    test(scenario.name, async () => {
        const conflicts = await withMockedPoolQuery(
            async (_sql, values) => ({ rows: getFixtureConflicts(scenario.fixtures, values) }),
            () => getInterviewSchedulingConflicts(11, 42, scenario.interviewDate, scenario.duration)
        );

        assert.deepEqual(
            conflicts.map((conflict) => conflict.interview_id),
            scenario.expectedIds
        );
    });
}

test('a scheduling conflict returns every display field with 409 and does not insert', async () => {
    const calls = [];
    const response = await withMockedPoolQuery(
        async (sql) => {
            calls.push(compactSQL(sql));
            return { rows: [storedConflict] };
        },
        () => invokeCreateInterview(VALID_INTERVIEW)
    );

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
        code: 'INTERVIEW_SCHEDULING_CONFLICT',
        message: 'This interview overlaps with an existing active interview.',
        conflicts: [
            {
                interview_id: 51,
                job_id: 12,
                company_name: 'Grab',
                job_title: 'Software Engineer',
                interview_date: '2026-07-25T06:00:00.000Z',
                interview_duration_minutes: 60,
                interview_type: 'Technical Interview',
            },
        ],
    });
    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /INSERT INTO interviews/);
});

test('same-application and different-application conflicts are all returned in start-time order', async () => {
    const sameApplicationConflict = {
        ...storedConflict,
        interview_id: 50,
        job_id: VALID_INTERVIEW.jobId,
        interview_date: new Date('2026-07-25T05:30:00.000Z'),
    };

    const response = await withMockedPoolQuery(
        async () => ({ rows: [sameApplicationConflict, storedConflict] }),
        () => invokeCreateInterview(VALID_INTERVIEW)
    );

    assert.equal(response.statusCode, 409);
    assert.deepEqual(
        response.body.conflicts.map((conflict) => conflict.interview_id),
        [50, 51]
    );
});

test('no conflict preserves the existing successful creation response', async () => {
    const calls = [];
    const response = await withMockedPoolQuery(
        async (sql) => {
            const query = compactSQL(sql);
            calls.push(query);
            if (query.includes('inserted_interview')) {
                return { rows: [{ application_eligible: true, application_exists: true, interview_created: true }] };
            }
            return { rows: [] };
        },
        () => invokeCreateInterview(VALID_INTERVIEW)
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body, 'Successfully added an interview!');
    assert.equal(calls.length, 3);
});

test('a past proposed interview is created normally when the database returns no conflicts', async () => {
    const calls = [];
    const response = await withMockedPoolQuery(
        async (sql) => {
            const query = compactSQL(sql);
            calls.push(query);
            if (query.includes('inserted_interview')) {
                return { rows: [{ application_eligible: true, application_exists: true, interview_created: true }] };
            }
            return { rows: [] };
        },
        () => invokeCreateInterview({ ...VALID_INTERVIEW, interviewDate: '2000-01-02T06:30:00.000Z' })
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body, 'Successfully added an interview!');
    assert.equal(calls.length, 3);
});

test('a past proposed interview still fails the existing application-date validation', async () => {
    const response = await withMockedPoolQuery(
        async (sql) => {
            if (compactSQL(sql).includes('inserted_interview')) {
                return { rows: [{ application_eligible: true, application_exists: true, interview_created: false }] };
            }
            return { rows: [] };
        },
        () => invokeCreateInterview({ ...VALID_INTERVIEW, interviewDate: '2000-01-02T06:30:00.000Z' })
    );

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.body, { message: 'Interview date must be after the application date.' });
});

test('allowSchedulingConflict true skips only the conflict lookup and still checks offer deadlines', async () => {
    const calls = [];
    const response = await withMockedPoolQuery(
        async (sql) => {
            const query = compactSQL(sql);
            calls.push(query);
            if (query.includes('offer_evaluations')) {
                return { rows: [] };
            }
            return { rows: [{ application_eligible: true, application_exists: true, interview_created: true }] };
        },
        () => invokeCreateInterview({ ...VALID_INTERVIEW, allowSchedulingConflict: true })
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body, 'Successfully added an interview!');
    assert.equal(calls.length, 2);
    assert.match(calls[0], /offer_evaluations/);
    assert.match(calls[1], /INSERT INTO interviews/);
});

test('allowOfferDeadlineWarning true skips only the deadline lookup and still checks scheduling conflicts', async () => {
    const calls = [];
    const response = await withMockedPoolQuery(
        async (sql) => {
            const query = compactSQL(sql);
            calls.push(query);
            return { rows: [storedConflict] };
        },
        () => invokeCreateInterview({ ...VALID_INTERVIEW, allowOfferDeadlineWarning: true })
    );

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.code, 'INTERVIEW_SCHEDULING_CONFLICT');
    assert.equal(calls.length, 1);
    assert.match(calls[0], /ORDER BY interviews\.interview_date ASC/);
    assert.doesNotMatch(calls[0], /offer_evaluations|INSERT INTO interviews/);
});

test('a rejected conflict attempt can be retried with the override without duplicating the insert', async () => {
    let queryCount = 0;
    const responses = await withMockedPoolQuery(
        async (sql) => {
            queryCount += 1;
            const query = compactSQL(sql);
            if (query.includes('ORDER BY interviews.interview_date ASC')) {
                return { rows: [storedConflict] };
            }
            if (query.includes('offer_evaluations')) {
                return { rows: [] };
            }
            return { rows: [{ application_eligible: true, application_exists: true, interview_created: true }] };
        },
        async () => [
            await invokeCreateInterview(VALID_INTERVIEW),
            await invokeCreateInterview({ ...VALID_INTERVIEW, allowSchedulingConflict: true }),
        ]
    );

    assert.equal(responses[0].statusCode, 409);
    assert.equal(responses[1].statusCode, 201);
    assert.equal(queryCount, 3);
});

test('a non-boolean scheduling-conflict override is rejected before database access', async () => {
    let queryCalled = false;
    const response = await withMockedPoolQuery(
        async () => {
            queryCalled = true;
            return { rows: [] };
        },
        () => invokeCreateInterview({ ...VALID_INTERVIEW, allowSchedulingConflict: 'true' })
    );

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.body, { message: 'Interview fields are missing, invalid, or too long.' });
    assert.equal(queryCalled, false);
});

for (const [name, body] of [
    ['invalid application ID', { ...VALID_INTERVIEW, jobId: 0 }],
    ['invalid duration', { ...VALID_INTERVIEW, interviewDurationMinutes: 0 }],
]) {
    test(`${name} remains invalid when the conflict override is true`, async () => {
        let queryCalled = false;
        const response = await withMockedPoolQuery(
            async () => {
                queryCalled = true;
                return { rows: [] };
            },
            () => invokeCreateInterview({ ...body, allowSchedulingConflict: true })
        );

        assert.equal(response.statusCode, 422);
        assert.equal(queryCalled, false);
    });
}

for (const [insertResult, expectedStatus, expectedMessage] of [
    ['not-found', 404, 'Job application not found.'],
    ['application-ineligible', 409, 'Interviews can only be added to applications with Interview status.'],
    ['invalid-date', 422, 'Interview date must be after the application date.'],
]) {
    test(`the override preserves the existing ${insertResult} application validation`, async () => {
        const response = await withMockedPoolQuery(
            async () => ({
                rows: [
                    {
                        application_exists: insertResult !== 'not-found',
                        application_eligible: insertResult !== 'application-ineligible',
                        interview_created: false,
                    },
                ],
            }),
            () =>
                invokeCreateInterview({
                    ...VALID_INTERVIEW,
                    allowSchedulingConflict: true,
                    allowOfferDeadlineWarning: true,
                })
        );

        assert.equal(response.statusCode, expectedStatus);
        assert.deepEqual(response.body, { message: expectedMessage });
    });
}

for (const [name, insertResult, expectedStatus, expectedMessage] of [
    ['inactive or archived target application', 'not-found', 404, 'Job application not found.'],
    [
        'interview date before the application date',
        'invalid-date',
        422,
        'Interview date must be after the application date.',
    ],
]) {
    test(`normal conflict checking preserves ${name} validation`, async () => {
        const response = await withMockedPoolQuery(
            async (sql) => {
                if (compactSQL(sql).includes('ORDER BY interviews.interview_date ASC')) {
                    return { rows: [] };
                }
                if (compactSQL(sql).includes('offer_evaluations')) {
                    return { rows: [] };
                }
                return {
                    rows: [
                        {
                            application_exists: insertResult !== 'not-found',
                            application_eligible: true,
                            interview_created: false,
                        },
                    ],
                };
            },
            () => invokeCreateInterview(VALID_INTERVIEW)
        );

        assert.equal(response.statusCode, expectedStatus);
        assert.deepEqual(response.body, { message: expectedMessage });
    });
}
