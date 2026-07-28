import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEFAULT_INTERVIEW_DURATION_MINUTES,
    INTERVIEW_DURATION_MINUTES_MAX,
    INTERVIEW_DURATION_MINUTES_MIN,
} from '../dist/config/validation.js';
import { pool } from '../dist/db/connectDB.js';
import { getArchivedJobInterviews } from '../dist/db/queries/archivedInterviews.js';
import { getInterviews, insertInterview } from '../dist/db/queries/interviews.js';
import { toIntegerInRange } from '../dist/http/validation.js';

test('interview duration constants and integer validation agree', () => {
    assert.equal(INTERVIEW_DURATION_MINUTES_MIN, 1);
    assert.equal(INTERVIEW_DURATION_MINUTES_MAX, 1440);
    assert.equal(DEFAULT_INTERVIEW_DURATION_MINUTES, 60);
    assert.equal(toIntegerInRange(1, 1, 1440), 1);
    assert.equal(toIntegerInRange(60, 1, 1440), 60);
    assert.equal(toIntegerInRange(1440, 1, 1440), 1440);

    for (const invalidValue of [undefined, null, '60', 0, -1, 1.5, 1441]) {
        assert.equal(toIntegerInRange(invalidValue, 1, 1440), undefined);
    }
});

test('interview queries persist, return, and sort with the stored duration', async () => {
    const originalQuery = pool.query;
    const calls = [];
    pool.query = async (sql, values) => {
        const query = String(sql);
        calls.push({ sql: query, values });
        if (query.includes('inserted_interview')) {
            return { rows: [{ application_exists: true, interview_created: true }] };
        }
        return { rows: [] };
    };

    try {
        assert.equal(
            await insertInterview(
                12,
                34,
                '2027-01-02T00:00:00.000Z',
                90,
                'Remote',
                'Technical',
                'https://meet.example.com/room',
                'Prepare'
            ),
            'created'
        );
        assert.deepEqual(await getInterviews(34, ['Upcoming Interviews']), []);
        assert.deepEqual(await getArchivedJobInterviews(34, ['Past Interviews']), []);
    } finally {
        pool.query = originalQuery;
    }

    assert.deepEqual(calls[0].values, [
        12,
        34,
        '2027-01-02T00:00:00.000Z',
        90,
        'Remote',
        'Technical',
        'https://meet.example.com/room',
        'Prepare',
    ]);
    assert.match(calls[0].sql, /interview_duration_minutes/);
    assert.match(calls[0].sql, /SELECT \$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8/);

    for (const call of calls.slice(1)) {
        const compactSQL = call.sql.replace(/\s+/g, ' ').trim();
        assert.match(compactSQL, /interviews\.interview_duration_minutes/);
        assert.match(compactSQL, /'Upcoming Interviews' = ANY\(\$2::text\[\]\)/);
        assert.match(compactSQL, /'Past Interviews' = ANY\(\$2::text\[\]\)/);
        assert.match(
            compactSQL,
            /interviews\.interview_date \+ interviews\.interview_duration_minutes \* INTERVAL '1 minute' > NOW\(\)/
        );
        assert.match(
            compactSQL,
            /interviews\.interview_date \+ interviews\.interview_duration_minutes \* INTERVAL '1 minute' <= NOW\(\)/
        );
        assert.match(
            compactSQL,
            /interviews\.interview_date \+ interviews\.interview_duration_minutes \* INTERVAL '1 minute' > NOW\(\) DESC/
        );
        assert.match(compactSQL, /interviews\.interview_date ASC/);
    }
    assert.deepEqual(calls[1].values, [34, ['Upcoming Interviews']]);
    assert.deepEqual(calls[2].values, [34, ['Past Interviews']]);
    assert.match(calls[1].sql, /interviews\.is_archived = false/);
    assert.match(calls[2].sql, /interviews\.is_archived = true/);
});
