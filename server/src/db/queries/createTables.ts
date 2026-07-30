import { pool } from '../connectDB.js';
import {
    APPLICATION_BOARD_SORT_ORDERS,
    APPLICATION_LIST_SORT_ORDERS,
    DEFAULT_APPLICATION_BOARD_SORT_ORDER,
    DEFAULT_APPLICATION_LIST_SORT_ORDER,
    JOB_STATUSES,
    INTERVIEW_TIME_FILTERS,
    OFFER_DECISION_FILTERS,
    ARCHIVED_OFFER_DECISION_FILTERS,
    OFFER_WORK_ARRANGEMENTS,
    NEEDS_ATTENTION_CATEGORIES,
    DEFAULT_NEEDS_ATTENTION_SETTINGS,
} from '../models.js';
import {
    DEFAULT_INTERVIEW_DURATION_MINUTES,
    FIELD_MAX_LENGTHS,
    INTERVIEW_DURATION_MINUTES_MAX,
    INTERVIEW_DURATION_MINUTES_MIN,
    NEEDS_ATTENTION_LIMITS,
    OFFER_ANNUAL_LEAVE_DAYS_MAX,
    OFFER_DECISION_VALUE_MAX,
    OFFER_DECISION_VALUE_MIN,
    OFFER_DETAILS_MAX_LENGTHS,
    OFFER_MONTHLY_BASE_SALARY_MAX,
} from '../../config/validation.js';

const toSQLTextValues = (values: readonly string[]): string => values.map((value) => `'${value}'`).join(', ');
const toSQLUniqueArrayCount = (values: readonly string[], column: string): string =>
    values.map((value) => `(CASE WHEN '${value}' = ANY(${column}) THEN 1 ELSE 0 END)`).join(' + ');

const JOB_STATUS_SQL_VALUES = toSQLTextValues(JOB_STATUSES);
const JOB_STATUS_SQL_ARRAY = `ARRAY[${JOB_STATUS_SQL_VALUES}]::TEXT[]`;
const JOB_STATUS_UNIQUE_COUNT_SQL = toSQLUniqueArrayCount(JOB_STATUSES, 'application_job_statuses');
const ARCHIVED_JOB_STATUS_UNIQUE_COUNT_SQL = toSQLUniqueArrayCount(JOB_STATUSES, 'archived_application_job_statuses');
const COLLECTION_VIEW_MODE_SQL_VALUES = "'list', 'board'";
const APPLICATION_LIST_SORT_ORDER_SQL_VALUES = toSQLTextValues(APPLICATION_LIST_SORT_ORDERS);
const APPLICATION_BOARD_SORT_ORDER_SQL_VALUES = toSQLTextValues(APPLICATION_BOARD_SORT_ORDERS);
const INTERVIEW_TIME_FILTER_SQL_VALUES = toSQLTextValues(INTERVIEW_TIME_FILTERS);
const INTERVIEW_TIME_FILTER_SQL_ARRAY = `ARRAY[${INTERVIEW_TIME_FILTER_SQL_VALUES}]::TEXT[]`;
const INTERVIEW_TIME_FILTER_UNIQUE_COUNT_SQL = toSQLUniqueArrayCount(INTERVIEW_TIME_FILTERS, 'interview_time_filters');
const ARCHIVED_INTERVIEW_TIME_FILTER_UNIQUE_COUNT_SQL = toSQLUniqueArrayCount(
    INTERVIEW_TIME_FILTERS,
    'archived_interview_time_filters'
);
const OFFER_DECISION_FILTER_SQL_ARRAY = `ARRAY[${toSQLTextValues(OFFER_DECISION_FILTERS)}]::TEXT[]`;
const OFFER_DECISION_FILTER_UNIQUE_COUNT_SQL = toSQLUniqueArrayCount(OFFER_DECISION_FILTERS, 'offer_decision_filters');
const ARCHIVED_OFFER_DECISION_FILTER_SQL_ARRAY = `ARRAY[${toSQLTextValues(ARCHIVED_OFFER_DECISION_FILTERS)}]::TEXT[]`;
const ARCHIVED_OFFER_DECISION_FILTER_UNIQUE_COUNT_SQL = toSQLUniqueArrayCount(
    ARCHIVED_OFFER_DECISION_FILTERS,
    'archived_offer_decision_filters'
);
const OFFER_WORK_ARRANGEMENT_SQL_VALUES = toSQLTextValues(['', ...OFFER_WORK_ARRANGEMENTS]);
const NEEDS_ATTENTION_CATEGORY_SQL_VALUES = toSQLTextValues(NEEDS_ATTENTION_CATEGORIES);
const NEEDS_ATTENTION_CATEGORY_SQL_ARRAY = `ARRAY[${NEEDS_ATTENTION_CATEGORY_SQL_VALUES}]::TEXT[]`;
const NEEDS_ATTENTION_CATEGORY_UNIQUE_COUNT_SQL = toSQLUniqueArrayCount(
    NEEDS_ATTENTION_CATEGORIES,
    'needs_attention_categories'
);

const createTables = async (): Promise<void> => {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL
                CONSTRAINT users_email_check
                CHECK (
                    email = LOWER(BTRIM(email))
                    AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
                ),
            hashed_password TEXT NOT NULL
                CONSTRAINT users_hashed_password_check
                CHECK (CHAR_LENGTH(hashed_password) > 0),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`;

    const createAuthenticationSessionsTable = `
        CREATE TABLE IF NOT EXISTS authentication_sessions (
            session_id UUID PRIMARY KEY,
            user_id INTEGER NOT NULL
                REFERENCES users(user_id)
                ON DELETE CASCADE,
            refresh_token_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMPTZ NOT NULL
        )`;

    const createJobAppTable = `CREATE TABLE IF NOT EXISTS job_applications (
            job_id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            company_name TEXT NOT NULL
                CONSTRAINT job_applications_company_name_check
                CHECK (
                    company_name = BTRIM(company_name)
                    AND CHAR_LENGTH(company_name) BETWEEN 1 AND ${FIELD_MAX_LENGTHS.companyName}
                ),
            job_title TEXT NOT NULL
                CONSTRAINT job_applications_job_title_check
                CHECK (
                    job_title = BTRIM(job_title)
                    AND CHAR_LENGTH(job_title) BETWEEN 1 AND ${FIELD_MAX_LENGTHS.jobTitle}
                ),
            application_date TIMESTAMPTZ NOT NULL
                CONSTRAINT job_applications_application_date_range_check
                CHECK (
                    application_date >= TIMESTAMPTZ '0001-01-01 00:00:00+00'
                    AND application_date <= TIMESTAMPTZ '9999-12-31 23:59:59.999999+00'
                ),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT job_applications_application_date_not_future_check
                CHECK (application_date <= created_at),
            job_status TEXT NOT NULL
                CONSTRAINT job_applications_job_status_check
                CHECK (job_status IN (${JOB_STATUS_SQL_VALUES})),
            job_location TEXT NOT NULL DEFAULT ''
                CONSTRAINT job_applications_job_location_check
                CHECK (
                    job_location = BTRIM(job_location)
                    AND CHAR_LENGTH(job_location) <= ${FIELD_MAX_LENGTHS.location}
                ),
            job_posting_url TEXT NOT NULL DEFAULT ''
                CONSTRAINT job_applications_job_posting_url_check
                CHECK (
                    job_posting_url = BTRIM(job_posting_url)
                    AND CHAR_LENGTH(job_posting_url) <= ${FIELD_MAX_LENGTHS.jobURL}
                ),
            notes TEXT NOT NULL DEFAULT ''
                CONSTRAINT job_applications_notes_check
                CHECK (CHAR_LENGTH(notes) <= ${FIELD_MAX_LENGTHS.notes}),
            application_follow_up_sent_at TIMESTAMPTZ,
            is_pinned BOOLEAN NOT NULL DEFAULT false,
            is_archived BOOLEAN NOT NULL DEFAULT false,
            CONSTRAINT job_applications_job_user_unique
                UNIQUE (job_id, user_id)
        )`;

    const createOfferEvaluationTable = `CREATE TABLE IF NOT EXISTS offer_evaluations (
        job_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        career_growth_rating INTEGER NOT NULL
            CHECK (career_growth_rating BETWEEN ${OFFER_DECISION_VALUE_MIN} AND ${OFFER_DECISION_VALUE_MAX}),
        company_culture_fit_rating INTEGER NOT NULL
            CHECK (company_culture_fit_rating BETWEEN ${OFFER_DECISION_VALUE_MIN} AND ${OFFER_DECISION_VALUE_MAX}),
        work_life_balance_rating INTEGER NOT NULL
            CHECK (work_life_balance_rating BETWEEN ${OFFER_DECISION_VALUE_MIN} AND ${OFFER_DECISION_VALUE_MAX}),
        compensation_rating INTEGER NOT NULL
            CHECK (compensation_rating BETWEEN ${OFFER_DECISION_VALUE_MIN} AND ${OFFER_DECISION_VALUE_MAX}),
        currency TEXT NOT NULL
            CHECK (currency ~ '^[A-Z]{3}$'),
        monthly_base_salary INTEGER NOT NULL
            CHECK (monthly_base_salary BETWEEN 0 AND ${OFFER_MONTHLY_BASE_SALARY_MAX}),
        bonus TEXT NOT NULL DEFAULT ''
            CONSTRAINT offer_evaluations_bonus_check
            CHECK (bonus = BTRIM(bonus) AND CHAR_LENGTH(bonus) <= ${OFFER_DETAILS_MAX_LENGTHS.bonus}),
        annual_leave_days INTEGER
            CHECK (annual_leave_days BETWEEN 0 AND ${OFFER_ANNUAL_LEAVE_DAYS_MAX}),
        work_arrangement TEXT NOT NULL DEFAULT ''
            CHECK (work_arrangement IN (${OFFER_WORK_ARRANGEMENT_SQL_VALUES})),
        decision_deadline TIMESTAMPTZ NOT NULL
            CONSTRAINT offer_evaluations_decision_deadline_range_check
            CHECK (
                decision_deadline >= TIMESTAMPTZ '0001-01-01 00:00:00+00'
                AND decision_deadline <= TIMESTAMPTZ '9999-12-31 23:59:59.999999+00'
            ),
        pros TEXT NOT NULL DEFAULT ''
            CONSTRAINT offer_evaluations_pros_check
            CHECK (pros = BTRIM(pros) AND CHAR_LENGTH(pros) <= ${OFFER_DETAILS_MAX_LENGTHS.notes}),
        concerns TEXT NOT NULL DEFAULT ''
            CONSTRAINT offer_evaluations_concerns_check
            CHECK (concerns = BTRIM(concerns) AND CHAR_LENGTH(concerns) <= ${OFFER_DETAILS_MAX_LENGTHS.notes}),
        PRIMARY KEY (job_id, user_id),
        CONSTRAINT offer_evaluations_job_user_fk
            FOREIGN KEY (job_id, user_id)
            REFERENCES job_applications(job_id, user_id)
            ON DELETE CASCADE
    )`;

    const createCounterofferPlanTable = `CREATE TABLE IF NOT EXISTS offer_counteroffer_plans (
        job_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        monthly_base_salary INTEGER NOT NULL
            CHECK (monthly_base_salary BETWEEN 0 AND ${OFFER_MONTHLY_BASE_SALARY_MAX}),
        bonus TEXT NOT NULL DEFAULT ''
            CONSTRAINT offer_counteroffer_plans_bonus_check
            CHECK (bonus = BTRIM(bonus) AND CHAR_LENGTH(bonus) <= ${OFFER_DETAILS_MAX_LENGTHS.bonus}),
        annual_leave_days INTEGER
            CHECK (annual_leave_days BETWEEN 0 AND ${OFFER_ANNUAL_LEAVE_DAYS_MAX}),
        work_arrangement TEXT NOT NULL DEFAULT ''
            CHECK (work_arrangement IN (${OFFER_WORK_ARRANGEMENT_SQL_VALUES})),
        career_growth_rating INTEGER NOT NULL
            CHECK (career_growth_rating BETWEEN ${OFFER_DECISION_VALUE_MIN} AND ${OFFER_DECISION_VALUE_MAX}),
        company_culture_fit_rating INTEGER NOT NULL
            CHECK (company_culture_fit_rating BETWEEN ${OFFER_DECISION_VALUE_MIN} AND ${OFFER_DECISION_VALUE_MAX}),
        work_life_balance_rating INTEGER NOT NULL
            CHECK (work_life_balance_rating BETWEEN ${OFFER_DECISION_VALUE_MIN} AND ${OFFER_DECISION_VALUE_MAX}),
        compensation_rating INTEGER NOT NULL
            CHECK (compensation_rating BETWEEN ${OFFER_DECISION_VALUE_MIN} AND ${OFFER_DECISION_VALUE_MAX}),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (job_id, user_id),
        CONSTRAINT offer_counteroffer_plans_evaluation_fk
            FOREIGN KEY (job_id, user_id)
            REFERENCES offer_evaluations(job_id, user_id)
            ON DELETE CASCADE
    )`;

    const createInterviewTable = `CREATE TABLE IF NOT EXISTS interviews (
            interview_id SERIAL PRIMARY KEY,
            job_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            interview_date TIMESTAMPTZ NOT NULL
                CONSTRAINT interviews_date_range_check
                CHECK (
                    interview_date >= TIMESTAMPTZ '0001-01-01 00:00:00+00'
                    AND interview_date <= TIMESTAMPTZ '9999-12-31 23:59:59.999999+00'
                ),
            interview_duration_minutes INTEGER NOT NULL DEFAULT ${DEFAULT_INTERVIEW_DURATION_MINUTES}
                CONSTRAINT interviews_duration_minutes_check
                CHECK (interview_duration_minutes BETWEEN ${INTERVIEW_DURATION_MINUTES_MIN} AND ${INTERVIEW_DURATION_MINUTES_MAX}),
            interview_location TEXT NOT NULL
                CONSTRAINT interviews_location_check
                CHECK (
                    interview_location = BTRIM(interview_location)
                    AND CHAR_LENGTH(interview_location) BETWEEN 1 AND ${FIELD_MAX_LENGTHS.location}
                ),
            interview_type TEXT NOT NULL DEFAULT ''
                CONSTRAINT interviews_type_check
                CHECK (
                    interview_type = BTRIM(interview_type)
                    AND CHAR_LENGTH(interview_type) <= ${FIELD_MAX_LENGTHS.interviewType}
                ),
            interview_notes TEXT NOT NULL DEFAULT ''
                CONSTRAINT interviews_notes_check
                CHECK (
                    interview_notes = BTRIM(interview_notes)
                    AND CHAR_LENGTH(interview_notes) <= ${FIELD_MAX_LENGTHS.notes}
                ),
            meeting_url TEXT NOT NULL DEFAULT ''
                CONSTRAINT interviews_meeting_url_check
                CHECK (
                    meeting_url = BTRIM(meeting_url)
                    AND CHAR_LENGTH(meeting_url) <= ${FIELD_MAX_LENGTHS.meetingURL}
                ),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            follow_up_sent_at TIMESTAMPTZ,
            is_archived BOOLEAN NOT NULL DEFAULT false,
            is_pinned BOOLEAN NOT NULL DEFAULT false,
            CONSTRAINT interviews_job_user_fk
                FOREIGN KEY (job_id, user_id)
                REFERENCES job_applications(job_id, user_id)
                ON DELETE CASCADE
        )`;

    const createUserPreferencesTable = `CREATE TABLE IF NOT EXISTS user_preferences (
            user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
            application_job_statuses TEXT[] NOT NULL DEFAULT ${JOB_STATUS_SQL_ARRAY}
                CONSTRAINT user_preferences_application_job_statuses_check
                CHECK (
                    application_job_statuses <@ ${JOB_STATUS_SQL_ARRAY}
                    AND CARDINALITY(application_job_statuses) = (${JOB_STATUS_UNIQUE_COUNT_SQL})
                ),
            application_show_notes BOOLEAN NOT NULL DEFAULT true,
            application_show_archive BOOLEAN NOT NULL DEFAULT true,
            application_enable_scroll BOOLEAN NOT NULL DEFAULT true,
            application_view_mode TEXT NOT NULL DEFAULT 'list'
                CONSTRAINT user_preferences_application_view_mode_check
                CHECK (application_view_mode IN (${COLLECTION_VIEW_MODE_SQL_VALUES})),
            application_list_sort_order TEXT NOT NULL DEFAULT '${DEFAULT_APPLICATION_LIST_SORT_ORDER}'
                CONSTRAINT user_preferences_application_list_sort_order_check
                CHECK (application_list_sort_order IN (${APPLICATION_LIST_SORT_ORDER_SQL_VALUES})),
            application_board_sort_order TEXT NOT NULL DEFAULT '${DEFAULT_APPLICATION_BOARD_SORT_ORDER}'
                CONSTRAINT user_preferences_application_board_sort_order_check
                CHECK (application_board_sort_order IN (${APPLICATION_BOARD_SORT_ORDER_SQL_VALUES})),
            archived_application_job_statuses TEXT[] NOT NULL DEFAULT ${JOB_STATUS_SQL_ARRAY}
                CONSTRAINT user_preferences_archived_application_job_statuses_check
                CHECK (
                    archived_application_job_statuses <@ ${JOB_STATUS_SQL_ARRAY}
                    AND CARDINALITY(archived_application_job_statuses) = (${ARCHIVED_JOB_STATUS_UNIQUE_COUNT_SQL})
                ),
            archived_application_show_notes BOOLEAN NOT NULL DEFAULT true,
            archived_application_view_mode TEXT NOT NULL DEFAULT 'list'
                CONSTRAINT user_preferences_archived_application_view_mode_check
                CHECK (archived_application_view_mode IN (${COLLECTION_VIEW_MODE_SQL_VALUES})),
            archived_application_list_sort_order TEXT NOT NULL DEFAULT '${DEFAULT_APPLICATION_LIST_SORT_ORDER}'
                CONSTRAINT user_preferences_archived_application_list_sort_order_check
                CHECK (archived_application_list_sort_order IN (${APPLICATION_LIST_SORT_ORDER_SQL_VALUES})),
            archived_application_board_sort_order TEXT NOT NULL DEFAULT '${DEFAULT_APPLICATION_BOARD_SORT_ORDER}'
                CONSTRAINT user_preferences_archived_application_board_sort_order_check
                CHECK (archived_application_board_sort_order IN (${APPLICATION_BOARD_SORT_ORDER_SQL_VALUES})),
            interview_view_mode TEXT NOT NULL DEFAULT 'list'
                CONSTRAINT user_preferences_interview_view_mode_check
                CHECK (interview_view_mode IN (${COLLECTION_VIEW_MODE_SQL_VALUES})),
            interview_show_notes BOOLEAN NOT NULL DEFAULT true,
            archived_interview_view_mode TEXT NOT NULL DEFAULT 'list'
                CONSTRAINT user_preferences_archived_interview_view_mode_check
                CHECK (archived_interview_view_mode IN (${COLLECTION_VIEW_MODE_SQL_VALUES})),
            archived_interview_show_notes BOOLEAN NOT NULL DEFAULT true,
            interview_time_filters TEXT[] NOT NULL DEFAULT ${INTERVIEW_TIME_FILTER_SQL_ARRAY}
                CONSTRAINT user_preferences_interview_time_filters_check
                CHECK (
                    interview_time_filters <@ ${INTERVIEW_TIME_FILTER_SQL_ARRAY}
                    AND CARDINALITY(interview_time_filters) = (${INTERVIEW_TIME_FILTER_UNIQUE_COUNT_SQL})
                ),
            archived_interview_time_filters TEXT[] NOT NULL DEFAULT ${INTERVIEW_TIME_FILTER_SQL_ARRAY}
                CONSTRAINT user_preferences_archived_interview_time_filters_check
                CHECK (
                    archived_interview_time_filters <@ ${INTERVIEW_TIME_FILTER_SQL_ARRAY}
                    AND CARDINALITY(archived_interview_time_filters) = (${ARCHIVED_INTERVIEW_TIME_FILTER_UNIQUE_COUNT_SQL})
                ),
            offer_decision_filters TEXT[] NOT NULL DEFAULT ${OFFER_DECISION_FILTER_SQL_ARRAY}
                CONSTRAINT user_preferences_offer_decision_filters_check
                CHECK (
                    offer_decision_filters <@ ${OFFER_DECISION_FILTER_SQL_ARRAY}
                    AND CARDINALITY(offer_decision_filters) = (${OFFER_DECISION_FILTER_UNIQUE_COUNT_SQL})
                ),
            archived_offer_decision_filters TEXT[] NOT NULL DEFAULT ${ARCHIVED_OFFER_DECISION_FILTER_SQL_ARRAY}
                CONSTRAINT user_preferences_archived_offer_decision_filters_check
                CHECK (
                    archived_offer_decision_filters <@ ${ARCHIVED_OFFER_DECISION_FILTER_SQL_ARRAY}
                    AND CARDINALITY(archived_offer_decision_filters) = (${ARCHIVED_OFFER_DECISION_FILTER_UNIQUE_COUNT_SQL})
                ),
            needs_attention_categories TEXT[] NOT NULL DEFAULT ${NEEDS_ATTENTION_CATEGORY_SQL_ARRAY}
                CONSTRAINT user_preferences_needs_attention_categories_check
                CHECK (
                    needs_attention_categories <@ ${NEEDS_ATTENTION_CATEGORY_SQL_ARRAY}
                    AND CARDINALITY(needs_attention_categories) = (${NEEDS_ATTENTION_CATEGORY_UNIQUE_COUNT_SQL})
                ),
            needs_attention_max_items INTEGER NOT NULL
                DEFAULT ${DEFAULT_NEEDS_ATTENTION_SETTINGS.needs_attention_max_items}
                CONSTRAINT user_preferences_needs_attention_max_items_check
                CHECK (
                    needs_attention_max_items
                    BETWEEN ${NEEDS_ATTENTION_LIMITS.maxItems.minimum} AND ${NEEDS_ATTENTION_LIMITS.maxItems.maximum}
                ),
            needs_attention_offer_due_days INTEGER NOT NULL
                DEFAULT ${DEFAULT_NEEDS_ATTENTION_SETTINGS.needs_attention_offer_due_days}
                CONSTRAINT user_preferences_needs_attention_offer_due_days_check
                CHECK (
                    needs_attention_offer_due_days
                    BETWEEN ${NEEDS_ATTENTION_LIMITS.offerDueDays.minimum} AND ${NEEDS_ATTENTION_LIMITS.offerDueDays.maximum}
                ),
            needs_attention_offer_overdue_days INTEGER NOT NULL
                DEFAULT ${DEFAULT_NEEDS_ATTENTION_SETTINGS.needs_attention_offer_overdue_days}
                CONSTRAINT user_preferences_needs_attention_offer_overdue_days_check
                CHECK (
                    needs_attention_offer_overdue_days
                    BETWEEN ${NEEDS_ATTENTION_LIMITS.offerOverdueDays.minimum} AND ${NEEDS_ATTENTION_LIMITS.offerOverdueDays.maximum}
                ),
            needs_attention_post_interview_stale_days INTEGER NOT NULL
                DEFAULT ${DEFAULT_NEEDS_ATTENTION_SETTINGS.needs_attention_post_interview_stale_days}
                CONSTRAINT user_preferences_needs_attention_post_interview_stale_days_check
                CHECK (
                    needs_attention_post_interview_stale_days
                    BETWEEN ${NEEDS_ATTENTION_LIMITS.postInterviewStaleDays.minimum}
                        AND ${NEEDS_ATTENTION_LIMITS.postInterviewStaleDays.maximum}
                ),
            needs_attention_post_interview_follow_up_days INTEGER NOT NULL
                DEFAULT ${DEFAULT_NEEDS_ATTENTION_SETTINGS.needs_attention_post_interview_follow_up_days}
                CONSTRAINT user_preferences_needs_attention_post_interview_follow_up_days_check
                CHECK (
                    needs_attention_post_interview_follow_up_days
                    BETWEEN ${NEEDS_ATTENTION_LIMITS.postInterviewFollowUpDays.minimum}
                        AND ${NEEDS_ATTENTION_LIMITS.postInterviewFollowUpDays.maximum}
                ),
            needs_attention_application_stale_days INTEGER NOT NULL
                DEFAULT ${DEFAULT_NEEDS_ATTENTION_SETTINGS.needs_attention_application_stale_days}
                CONSTRAINT user_preferences_needs_attention_application_stale_days_check
                CHECK (
                    needs_attention_application_stale_days
                    BETWEEN ${NEEDS_ATTENTION_LIMITS.applicationStaleDays.minimum}
                        AND ${NEEDS_ATTENTION_LIMITS.applicationStaleDays.maximum}
                ),
            needs_attention_application_follow_up_days INTEGER NOT NULL
                DEFAULT ${DEFAULT_NEEDS_ATTENTION_SETTINGS.needs_attention_application_follow_up_days}
                CONSTRAINT user_preferences_needs_attention_application_follow_up_days_check
                CHECK (
                    needs_attention_application_follow_up_days
                    BETWEEN ${NEEDS_ATTENTION_LIMITS.applicationFollowUpDays.minimum}
                        AND ${NEEDS_ATTENTION_LIMITS.applicationFollowUpDays.maximum}
                )
        )`;

    const createJobApplicationArchiveIndex = `CREATE INDEX IF NOT EXISTS job_applications_user_archived_idx
        ON job_applications (user_id, is_archived)`;

    const createInterviewArchiveIndex = `CREATE INDEX IF NOT EXISTS interviews_user_archived_idx
        ON interviews (user_id, is_archived)`;

    const createInterviewJobIdIndex = `CREATE INDEX IF NOT EXISTS interviews_job_id_idx
        ON interviews (job_id)`;

    const createAuthenticationSessionsUserIdIndex = `
        CREATE INDEX IF NOT EXISTS authentication_sessions_user_id_idx
        ON authentication_sessions (user_id)`;

    const createAuthenticationSessionsExpiresAtIndex = `
        CREATE INDEX IF NOT EXISTS authentication_sessions_expires_at_idx
        ON authentication_sessions (expires_at)`;

    const populateUserPreferences = `
        INSERT INTO user_preferences (user_id)
        SELECT users.user_id
        FROM users
        WHERE NOT EXISTS (
            SELECT 1
            FROM user_preferences
            WHERE user_preferences.user_id = users.user_id
        )`;

    const setupQueries = [
        createUsersTable,
        createAuthenticationSessionsTable,
        createJobAppTable,
        createOfferEvaluationTable,
        createCounterofferPlanTable,
        createInterviewTable,
        createUserPreferencesTable,
        populateUserPreferences,
        createJobApplicationArchiveIndex,
        createInterviewArchiveIndex,
        createInterviewJobIdIndex,
        createAuthenticationSessionsUserIdIndex,
        createAuthenticationSessionsExpiresAtIndex,
    ];

    for (const query of setupQueries) {
        await pool.query(query);
    }
};

export default createTables;
