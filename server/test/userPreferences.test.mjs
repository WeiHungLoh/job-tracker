import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    APPLICATION_BOARD_SORT_ORDERS,
    APPLICATION_LIST_SORT_ORDERS,
    DEFAULT_APPLICATION_BOARD_SORT_ORDER,
    DEFAULT_APPLICATION_LIST_SORT_ORDER,
    JOB_STATUSES,
    NEEDS_ATTENTION_CATEGORIES,
    DEFAULT_NEEDS_ATTENTION_SETTINGS,
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
    isNeedsAttentionCategoryArray,
    isOptionalIntegerInRange,
    isOptionalApplicationBoardSortOrder,
    isOptionalApplicationListSortOrder,
} from '../dist/http/validation.js';

test('Needs Attention preference validators enforce categories and timing boundaries', () => {
    assert.equal(isNeedsAttentionCategoryArray([...NEEDS_ATTENTION_CATEGORIES]), true);
    assert.equal(isNeedsAttentionCategoryArray([]), true);
    assert.equal(isNeedsAttentionCategoryArray(['offer-decision-due', 'offer-decision-due']), false);
    assert.equal(isNeedsAttentionCategoryArray(['unsupported']), false);
    assert.equal(isNeedsAttentionCategoryArray('offer-decision-due'), false);

    for (const [minimum, maximum] of [
        [1, 14],
        [1, 30],
        [1, 50],
        [1, 60],
    ]) {
        assert.equal(isOptionalIntegerInRange(undefined, minimum, maximum), true);
        assert.equal(isOptionalIntegerInRange(minimum, minimum, maximum), true);
        assert.equal(isOptionalIntegerInRange(maximum, minimum, maximum), true);
        assert.equal(isOptionalIntegerInRange(minimum - 1, minimum, maximum), false);
        assert.equal(isOptionalIntegerInRange(maximum + 1, minimum, maximum), false);
        assert.equal(isOptionalIntegerInRange(1.5, minimum, maximum), false);
        assert.equal(isOptionalIntegerInRange(String(minimum), minimum, maximum), false);
    }
});

test('interview time filter validator accepts only supported arrays', () => {
    assert.equal(isInterviewTimeFilterArray(['Upcoming Interviews', 'Past Interviews']), true);
    assert.equal(isInterviewTimeFilterArray(['Upcoming Interviews']), true);
    assert.equal(isInterviewTimeFilterArray([]), true);
    assert.equal(isInterviewTimeFilterArray(['Upcoming Interviews', 'Upcoming Interviews']), false);
    assert.equal(isInterviewTimeFilterArray(['Unknown']), false);
    assert.equal(isInterviewTimeFilterArray('Upcoming Interviews'), false);
});

test('application status preference validator rejects duplicates', async () => {
    const { isJobStatusArray } = await import('../dist/http/validation.js');

    assert.equal(isJobStatusArray(['Applied', 'Interview']), true);
    assert.equal(isJobStatusArray([]), true);
    assert.equal(isJobStatusArray(['Applied', 'Applied']), false);
    assert.equal(isJobStatusArray(['Unsupported']), false);
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
    assert.match(setupSql, /interview_show_notes BOOLEAN NOT NULL DEFAULT true/);
    assert.match(setupSql, /archived_interview_show_notes BOOLEAN NOT NULL DEFAULT true/);
    assert.doesNotMatch(setupSql, /ALTER TABLE/);
    assert.doesNotMatch(setupSql, /array_append/);
});

test('fresh schema declares Needs Attention defaults and database timing constraints without alterations', async () => {
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
    assert.deepEqual(DEFAULT_NEEDS_ATTENTION_SETTINGS, {
        needs_attention_categories: [...NEEDS_ATTENTION_CATEGORIES],
        needs_attention_max_items: 10,
        needs_attention_offer_due_days: 3,
        needs_attention_offer_overdue_days: 14,
        needs_attention_post_interview_stale_days: 14,
        needs_attention_post_interview_follow_up_days: 7,
        needs_attention_application_stale_days: 14,
        needs_attention_application_follow_up_days: 7,
    });
    assert.match(setupSql, /needs_attention_categories TEXT\[\] NOT NULL DEFAULT/);
    assert.match(setupSql, /needs_attention_max_items[\s\S]*?BETWEEN 1\s+AND 50/);
    assert.match(setupSql, /needs_attention_offer_due_days[\s\S]*?BETWEEN 1\s+AND 14/);
    assert.match(setupSql, /needs_attention_offer_overdue_days[\s\S]*?BETWEEN 1\s+AND 30/);
    assert.match(setupSql, /needs_attention_post_interview_stale_days[\s\S]*?BETWEEN 1\s+AND 60/);
    assert.match(setupSql, /needs_attention_post_interview_follow_up_days[\s\S]*?BETWEEN 1\s+AND 30/);
    assert.match(setupSql, /needs_attention_application_stale_days[\s\S]*?BETWEEN 1\s+AND 60/);
    assert.match(setupSql, /needs_attention_application_follow_up_days[\s\S]*?BETWEEN 1\s+AND 30/);
    assert.match(setupSql, /application_job_statuses <@[\s\S]*?CARDINALITY\(application_job_statuses\) =/);
    assert.match(
        setupSql,
        /archived_application_job_statuses <@[\s\S]*?CARDINALITY\(archived_application_job_statuses\) =/
    );
    assert.match(setupSql, /interview_time_filters <@[\s\S]*?CARDINALITY\(interview_time_filters\) =/);
    assert.match(
        setupSql,
        /archived_interview_time_filters <@[\s\S]*?CARDINALITY\(archived_interview_time_filters\) =/
    );
    assert.match(setupSql, /offer_decision_filters <@[\s\S]*?CARDINALITY\(offer_decision_filters\) =/);
    assert.match(
        setupSql,
        /archived_offer_decision_filters <@[\s\S]*?CARDINALITY\(archived_offer_decision_filters\) =/
    );
    assert.doesNotMatch(setupSql, /ALTER TABLE/);
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
        interview_show_notes: true,
        archived_interview_view_mode: 'board',
        archived_interview_show_notes: false,
        interview_time_filters: ['Upcoming Interviews'],
        archived_interview_time_filters: ['Past Interviews'],
        offer_decision_filters: ['Offers to Evaluate', 'Evaluated Offers'],
        archived_offer_decision_filters: ['Previous Evaluations'],
        needs_attention_categories: ['offer-evaluation', 'application-follow-up'],
        needs_attention_max_items: 12,
        needs_attention_offer_due_days: 4,
        needs_attention_offer_overdue_days: 15,
        needs_attention_post_interview_stale_days: 16,
        needs_attention_post_interview_follow_up_days: 8,
        needs_attention_application_stale_days: 17,
        needs_attention_application_follow_up_days: 9,
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
        'interview_show_notes',
        'archived_interview_show_notes',
        'offer_decision_filters',
        'archived_offer_decision_filters',
        'needs_attention_categories',
        'needs_attention_max_items',
        'needs_attention_offer_due_days',
        'needs_attention_offer_overdue_days',
        'needs_attention_post_interview_stale_days',
        'needs_attention_post_interview_follow_up_days',
        'needs_attention_application_stale_days',
        'needs_attention_application_follow_up_days',
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
    assert.match(calls[1].sql, /interview_show_notes = COALESCE\(\$15, interview_show_notes\)/);
    assert.match(calls[1].sql, /archived_interview_show_notes = COALESCE\(\$17, archived_interview_show_notes\)/);
    assert.match(calls[1].sql, /interview_time_filters = COALESCE\(\$18, interview_time_filters\)/);
    assert.match(calls[1].sql, /archived_interview_time_filters = COALESCE\(\$19, archived_interview_time_filters\)/);
    assert.match(calls[1].sql, /offer_decision_filters = COALESCE\(\$20, offer_decision_filters\)/);
    assert.match(calls[1].sql, /archived_offer_decision_filters = COALESCE\(\$21, archived_offer_decision_filters\)/);
    assert.match(calls[1].sql, /needs_attention_categories = COALESCE\(\$22, needs_attention_categories\)/);
    assert.match(calls[1].sql, /needs_attention_max_items = COALESCE\(\$23, needs_attention_max_items\)/);
    assert.match(
        calls[1].sql,
        /needs_attention_application_follow_up_days =[\s\S]*?COALESCE\(\$29, needs_attention_application_follow_up_days\)/
    );
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
        true,
        'board',
        false,
        ['Upcoming Interviews'],
        ['Past Interviews'],
        ['Offers to Evaluate', 'Evaluated Offers'],
        ['Previous Evaluations'],
        ['offer-evaluation', 'application-follow-up'],
        12,
        4,
        15,
        16,
        8,
        17,
        9,
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

    assert.equal(values.length, 29);
    assert.equal(values[0], 9);
    assert.equal(values[12], 'company_name_asc');
    assert.equal(
        values.slice(1, 12).every((value) => value === undefined),
        true
    );
    assert.equal(
        values.slice(13, 21).every((value) => value === undefined),
        true
    );
    assert.equal(
        values.slice(21).every((value) => value === undefined),
        true
    );
});
