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
} from '../models.js';
import {
    DEFAULT_INTERVIEW_DURATION_MINUTES,
    INTERVIEW_DURATION_MINUTES_MAX,
    INTERVIEW_DURATION_MINUTES_MIN,
    OFFER_ANNUAL_LEAVE_DAYS_MAX,
    OFFER_DECISION_VALUE_MAX,
    OFFER_DECISION_VALUE_MIN,
    OFFER_DETAILS_MAX_LENGTHS,
    OFFER_MONTHLY_BASE_SALARY_MAX,
} from '../../config/validation.js';

const toSQLTextValues = (values: readonly string[]): string => values.map((value) => `'${value}'`).join(', ');

const JOB_STATUS_SQL_VALUES = toSQLTextValues(JOB_STATUSES);
const JOB_STATUS_SQL_ARRAY = `ARRAY[${JOB_STATUS_SQL_VALUES}]::TEXT[]`;
const COLLECTION_VIEW_MODE_SQL_VALUES = "'list', 'board'";
const APPLICATION_LIST_SORT_ORDER_SQL_VALUES = toSQLTextValues(APPLICATION_LIST_SORT_ORDERS);
const APPLICATION_BOARD_SORT_ORDER_SQL_VALUES = toSQLTextValues(APPLICATION_BOARD_SORT_ORDERS);
const INTERVIEW_TIME_FILTER_SQL_VALUES = toSQLTextValues(INTERVIEW_TIME_FILTERS);
const INTERVIEW_TIME_FILTER_SQL_ARRAY = `ARRAY[${INTERVIEW_TIME_FILTER_SQL_VALUES}]::TEXT[]`;
const OFFER_DECISION_FILTER_SQL_ARRAY = `ARRAY[${toSQLTextValues(OFFER_DECISION_FILTERS)}]::TEXT[]`;
const ARCHIVED_OFFER_DECISION_FILTER_SQL_ARRAY = `ARRAY[${toSQLTextValues(ARCHIVED_OFFER_DECISION_FILTERS)}]::TEXT[]`;
const OFFER_WORK_ARRANGEMENT_SQL_VALUES = toSQLTextValues(['', ...OFFER_WORK_ARRANGEMENTS]);

const createTables = async (): Promise<void> => {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
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
            company_name TEXT NOT NULL,
            job_title TEXT NOT NULL,
            application_date TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            job_status TEXT NOT NULL CHECK (job_status IN (${JOB_STATUS_SQL_VALUES})),
            job_location TEXT NOT NULL DEFAULT '',
            job_posting_url TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
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
            CHECK (CHAR_LENGTH(bonus) <= ${OFFER_DETAILS_MAX_LENGTHS.bonus}),
        annual_leave_days INTEGER
            CHECK (annual_leave_days BETWEEN 0 AND ${OFFER_ANNUAL_LEAVE_DAYS_MAX}),
        work_arrangement TEXT NOT NULL DEFAULT ''
            CHECK (work_arrangement IN (${OFFER_WORK_ARRANGEMENT_SQL_VALUES})),
        decision_deadline TIMESTAMPTZ NOT NULL,
        pros TEXT NOT NULL DEFAULT ''
            CHECK (CHAR_LENGTH(pros) <= ${OFFER_DETAILS_MAX_LENGTHS.notes}),
        concerns TEXT NOT NULL DEFAULT ''
            CHECK (CHAR_LENGTH(concerns) <= ${OFFER_DETAILS_MAX_LENGTHS.notes}),
        PRIMARY KEY (job_id, user_id),
        CONSTRAINT offer_evaluations_job_user_fk
            FOREIGN KEY (job_id, user_id)
            REFERENCES job_applications(job_id, user_id)
            ON DELETE CASCADE
    )`;

    const createInterviewTable = `CREATE TABLE IF NOT EXISTS interviews (
            interview_id SERIAL PRIMARY KEY,
            job_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            interview_date TIMESTAMPTZ NOT NULL,
            interview_duration_minutes INTEGER NOT NULL DEFAULT ${DEFAULT_INTERVIEW_DURATION_MINUTES}
                CONSTRAINT interviews_duration_minutes_check
                CHECK (interview_duration_minutes BETWEEN ${INTERVIEW_DURATION_MINUTES_MIN} AND ${INTERVIEW_DURATION_MINUTES_MAX}),
            interview_location TEXT NOT NULL,
            interview_type TEXT NOT NULL DEFAULT '',
            interview_notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_archived BOOLEAN NOT NULL DEFAULT false,
            CONSTRAINT interviews_job_user_fk
                FOREIGN KEY (job_id, user_id)
                REFERENCES job_applications(job_id, user_id)
                ON DELETE CASCADE
        )`;

    const createUserPreferencesTable = `CREATE TABLE IF NOT EXISTS user_preferences (
            user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
            application_job_statuses TEXT[] NOT NULL DEFAULT ${JOB_STATUS_SQL_ARRAY}
                CHECK (application_job_statuses <@ ${JOB_STATUS_SQL_ARRAY}),
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
                CHECK (archived_application_job_statuses <@ ${JOB_STATUS_SQL_ARRAY}),
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
            archived_interview_view_mode TEXT NOT NULL DEFAULT 'list'
                CONSTRAINT user_preferences_archived_interview_view_mode_check
                CHECK (archived_interview_view_mode IN (${COLLECTION_VIEW_MODE_SQL_VALUES})),
            interview_time_filters TEXT[] NOT NULL DEFAULT ${INTERVIEW_TIME_FILTER_SQL_ARRAY}
                CONSTRAINT user_preferences_interview_time_filters_check
                CHECK (interview_time_filters <@ ${INTERVIEW_TIME_FILTER_SQL_ARRAY}),
            archived_interview_time_filters TEXT[] NOT NULL DEFAULT ${INTERVIEW_TIME_FILTER_SQL_ARRAY}
                CONSTRAINT user_preferences_archived_interview_time_filters_check
                CHECK (archived_interview_time_filters <@ ${INTERVIEW_TIME_FILTER_SQL_ARRAY}),
            offer_decision_filters TEXT[] NOT NULL DEFAULT ${OFFER_DECISION_FILTER_SQL_ARRAY}
                CONSTRAINT user_preferences_offer_decision_filters_check
                CHECK (offer_decision_filters <@ ${OFFER_DECISION_FILTER_SQL_ARRAY}),
            archived_offer_decision_filters TEXT[] NOT NULL DEFAULT ${ARCHIVED_OFFER_DECISION_FILTER_SQL_ARRAY}
                CONSTRAINT user_preferences_archived_offer_decision_filters_check
                CHECK (archived_offer_decision_filters <@ ${ARCHIVED_OFFER_DECISION_FILTER_SQL_ARRAY})
        )`;

    const addInterviewViewModePreferences = `
        ALTER TABLE user_preferences
            ADD COLUMN IF NOT EXISTS interview_view_mode TEXT DEFAULT 'list',
            ADD COLUMN IF NOT EXISTS archived_interview_view_mode TEXT DEFAULT 'list';

        UPDATE user_preferences
        SET
            interview_view_mode = COALESCE(interview_view_mode, 'list'),
            archived_interview_view_mode = COALESCE(archived_interview_view_mode, 'list');

        ALTER TABLE user_preferences
            ALTER COLUMN interview_view_mode SET DEFAULT 'list',
            ALTER COLUMN interview_view_mode SET NOT NULL,
            ALTER COLUMN archived_interview_view_mode SET DEFAULT 'list',
            ALTER COLUMN archived_interview_view_mode SET NOT NULL`;

    const addInterviewViewModeConstraints = `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'user_preferences_interview_view_mode_check'
                    AND conrelid = 'user_preferences'::regclass
            ) THEN
                ALTER TABLE user_preferences
                    ADD CONSTRAINT user_preferences_interview_view_mode_check
                    CHECK (interview_view_mode IN (${COLLECTION_VIEW_MODE_SQL_VALUES}));
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'user_preferences_archived_interview_view_mode_check'
                    AND conrelid = 'user_preferences'::regclass
            ) THEN
                ALTER TABLE user_preferences
                    ADD CONSTRAINT user_preferences_archived_interview_view_mode_check
                    CHECK (archived_interview_view_mode IN (${COLLECTION_VIEW_MODE_SQL_VALUES}));
            END IF;
        END
        $$`;

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
        createInterviewTable,
        createUserPreferencesTable,
        addInterviewViewModePreferences,
        addInterviewViewModeConstraints,
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
