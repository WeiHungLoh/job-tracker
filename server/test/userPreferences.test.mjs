import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    APPLICATION_BOARD_SORT_ORDERS,
    APPLICATION_LIST_SORT_ORDERS,
    DEFAULT_APPLICATION_BOARD_SORT_ORDER,
    DEFAULT_APPLICATION_LIST_SORT_ORDER,
    JOB_STATUSES,
    OFFER_DECISION_FILTERS,
    ARCHIVED_OFFER_DECISION_FILTERS,
} from '../dist/db/models.js';
import { pool } from '../dist/db/connectDB.js';
import createTables from '../dist/db/queries/createTables.js';
import { getUserPreferences, updateUserPreferences } from '../dist/db/queries/userPreferences.js';
import {
    isApplicationBoardSortOrder,
    isApplicationListSortOrder,
    isInterviewTimeFilterArray,
    isArchivedOfferDecisionFilterArray,
    isOfferDecisionFilterArray,
    isOptionalApplicationBoardSortOrder,
    isOptionalApplicationListSortOrder,
} from '../dist/http/validation.js';

test('interview time filter validator accepts only supported arrays', () => {
    assert.equal(isInterviewTimeFilterArray(['Upcoming Interviews', 'Past Interviews']), true);
    assert.equal(isInterviewTimeFilterArray(['Upcoming Interviews']), true);
    assert.equal(isInterviewTimeFilterArray([]), true);
    assert.equal(isInterviewTimeFilterArray(['Upcoming Interviews', 'Upcoming Interviews']), false);
    assert.equal(isInterviewTimeFilterArray(['Unknown']), false);
    assert.equal(isInterviewTimeFilterArray('Upcoming Interviews'), false);
});

test('offer comparison filter validators keep active and archived values distinct', () => {
    assert.deepEqual(OFFER_DECISION_FILTERS, [
        'Offers to Evaluate',
        'Evaluated Offers',
        'Expired Evaluated Offers',
        'Previous Evaluations',
    ]);
    assert.deepEqual(ARCHIVED_OFFER_DECISION_FILTERS, [
        'Evaluated Offers',
        'Expired Evaluated Offers',
        'Previous Evaluations',
    ]);
    assert.equal(isOfferDecisionFilterArray(['Offers to Evaluate', 'Evaluated Offers']), true);
    assert.equal(isOfferDecisionFilterArray([]), true);
    assert.equal(isOfferDecisionFilterArray(['Evaluated Offers', 'Evaluated Offers']), false);
    assert.equal(isOfferDecisionFilterArray(['Unknown']), false);
    assert.equal(isArchivedOfferDecisionFilterArray(['Evaluated Offers', 'Previous Evaluations']), true);
    assert.equal(isArchivedOfferDecisionFilterArray(['Offers to Evaluate']), false);
    assert.equal(isArchivedOfferDecisionFilterArray('Evaluated Offers'), false);
});

test('application sort order constants, defaults, and validators agree', () => {
    assert.equal(JOB_STATUSES.includes('Withdrawn'), true);
    assert.deepEqual(APPLICATION_LIST_SORT_ORDERS, [
        'job_status',
        'application_date_desc',
        'application_date_asc',
        'company_name_asc',
        'company_name_desc',
    ]);
    assert.deepEqual(APPLICATION_BOARD_SORT_ORDERS, [
        'application_date_desc',
        'application_date_asc',
        'company_name_asc',
        'company_name_desc',
    ]);
    assert.equal(DEFAULT_APPLICATION_LIST_SORT_ORDER, 'job_status');
    assert.equal(DEFAULT_APPLICATION_BOARD_SORT_ORDER, 'application_date_desc');

    for (const sortOrder of APPLICATION_LIST_SORT_ORDERS) {
        assert.equal(isApplicationListSortOrder(sortOrder), true);
    }
    for (const sortOrder of APPLICATION_BOARD_SORT_ORDERS) {
        assert.equal(isApplicationBoardSortOrder(sortOrder), true);
    }

    assert.equal(isApplicationBoardSortOrder('job_status'), false);
    assert.equal(isApplicationListSortOrder('unsupported'), false);
    assert.equal(isApplicationBoardSortOrder('unsupported'), false);
    assert.equal(isApplicationListSortOrder(1), false);
    assert.equal(isApplicationBoardSortOrder(null), false);
    assert.equal(isOptionalApplicationListSortOrder(undefined), true);
    assert.equal(isOptionalApplicationBoardSortOrder(undefined), true);
});

test('fresh schema declarations support Withdrawn without runtime table alterations', async () => {
    const originalQuery = pool.query;
    const queries = [];
    pool.query = async (sql) => {
        queries.push(String(sql));
        return { rows: [] };
    };

    try {
        await createTables();
    } finally {
        pool.query = originalQuery;
    }

    const setupSql = queries.join('\n');
    assert.match(setupSql, /job_applications_job_status_check[\s\S]*?'Withdrawn'/);
    assert.match(setupSql, /user_preferences_application_job_statuses_check[\s\S]*?'Withdrawn'/);
    assert.match(setupSql, /user_preferences_archived_application_job_statuses_check[\s\S]*?'Withdrawn'/);
    assert.match(setupSql, /application_job_statuses TEXT\[\] NOT NULL DEFAULT[\s\S]*?'Withdrawn'/);
    assert.match(setupSql, /archived_application_job_statuses TEXT\[\] NOT NULL DEFAULT[\s\S]*?'Withdrawn'/);
    assert.doesNotMatch(setupSql, /ALTER TABLE/);
    assert.doesNotMatch(setupSql, /array_append/);
});

test('user preference queries read and update every preference field with independent parameters', async () => {
    const originalQuery = pool.query;
    const calls = [];
    const storedPreferences = {
        application_job_statuses: ['Applied'],
        application_show_notes: true,
        application_show_archive: true,
        application_enable_scroll: true,
        application_view_mode: 'list',
        application_list_sort_order: 'company_name_asc',
        application_board_sort_order: 'application_date_asc',
        archived_application_job_statuses: ['Offer'],
        archived_application_show_notes: false,
        archived_application_view_mode: 'board',
        archived_application_list_sort_order: 'application_date_desc',
        archived_application_board_sort_order: 'company_name_desc',
        interview_view_mode: 'list',
        archived_interview_view_mode: 'board',
        interview_time_filters: ['Upcoming Interviews'],
        archived_interview_time_filters: ['Past Interviews'],
        offer_decision_filters: ['Offers to Evaluate', 'Evaluated Offers'],
        archived_offer_decision_filters: ['Previous Evaluations'],
    };

    pool.query = async (sql, values) => {
        calls.push({ sql, values });
        return { rows: [storedPreferences] };
    };

    try {
        assert.deepEqual(await getUserPreferences(42), storedPreferences);
        assert.deepEqual(await updateUserPreferences(42, storedPreferences), storedPreferences);
    } finally {
        pool.query = originalQuery;
    }

    for (const field of [
        'application_list_sort_order',
        'application_board_sort_order',
        'archived_application_list_sort_order',
        'archived_application_board_sort_order',
        'offer_decision_filters',
        'archived_offer_decision_filters',
    ]) {
        assert.match(calls[0].sql, new RegExp(`\\b${field}\\b`));
        assert.match(calls[1].sql, new RegExp(`\\b${field}\\b`));
    }

    assert.match(calls[1].sql, /application_list_sort_order = COALESCE\(\$7, application_list_sort_order\)/);
    assert.match(calls[1].sql, /application_board_sort_order = COALESCE\(\$8, application_board_sort_order\)/);
    assert.match(
        calls[1].sql,
        /archived_application_list_sort_order = COALESCE\(\$12, archived_application_list_sort_order\)/
    );
    assert.match(
        calls[1].sql,
        /archived_application_board_sort_order = COALESCE\(\$13, archived_application_board_sort_order\)/
    );
    assert.match(calls[1].sql, /interview_time_filters = COALESCE\(\$16, interview_time_filters\)/);
    assert.match(calls[1].sql, /archived_interview_time_filters = COALESCE\(\$17, archived_interview_time_filters\)/);
    assert.match(calls[1].sql, /offer_decision_filters = COALESCE\(\$18, offer_decision_filters\)/);
    assert.match(calls[1].sql, /archived_offer_decision_filters = COALESCE\(\$19, archived_offer_decision_filters\)/);
    assert.deepEqual(calls[1].values, [
        42,
        ['Applied'],
        true,
        true,
        true,
        'list',
        'company_name_asc',
        'application_date_asc',
        ['Offer'],
        false,
        'board',
        'application_date_desc',
        'company_name_desc',
        'list',
        'board',
        ['Upcoming Interviews'],
        ['Past Interviews'],
        ['Offers to Evaluate', 'Evaluated Offers'],
        ['Previous Evaluations'],
    ]);
});

test('omitted sort preferences remain undefined for SQL COALESCE preservation', async () => {
    const originalQuery = pool.query;
    let values;
    pool.query = async (_sql, queryValues) => {
        values = queryValues;
        return { rows: [] };
    };

    try {
        await updateUserPreferences(9, { archived_application_board_sort_order: 'company_name_asc' });
    } finally {
        pool.query = originalQuery;
    }

    assert.equal(values.length, 19);
    assert.equal(values[0], 9);
    assert.equal(values[12], 'company_name_asc');
    assert.equal(
        values.slice(1, 12).every((value) => value === undefined),
        true
    );
    assert.equal(
        values.slice(13).every((value) => value === undefined),
        true
    );
});
