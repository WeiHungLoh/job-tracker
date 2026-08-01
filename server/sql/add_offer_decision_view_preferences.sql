BEGIN;

ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS offer_decision_view_mode TEXT NOT NULL DEFAULT 'cards',
    ADD COLUMN IF NOT EXISTS archived_offer_decision_view_mode TEXT NOT NULL DEFAULT 'cards',
    ADD COLUMN IF NOT EXISTS offer_decision_table_orientation TEXT NOT NULL DEFAULT 'horizontal',
    ADD COLUMN IF NOT EXISTS archived_offer_decision_table_orientation TEXT NOT NULL DEFAULT 'horizontal';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_preferences_offer_decision_view_mode_check'
    ) THEN
        ALTER TABLE user_preferences
            ADD CONSTRAINT user_preferences_offer_decision_view_mode_check
            CHECK (offer_decision_view_mode IN ('cards', 'table'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_preferences_archived_offer_decision_view_mode_check'
    ) THEN
        ALTER TABLE user_preferences
            ADD CONSTRAINT user_preferences_archived_offer_decision_view_mode_check
            CHECK (archived_offer_decision_view_mode IN ('cards', 'table'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_preferences_offer_decision_table_orientation_check'
    ) THEN
        ALTER TABLE user_preferences
            ADD CONSTRAINT user_preferences_offer_decision_table_orientation_check
            CHECK (offer_decision_table_orientation IN ('horizontal', 'vertical'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_preferences_archived_offer_decision_table_orientation_check'
    ) THEN
        ALTER TABLE user_preferences
            ADD CONSTRAINT user_preferences_archived_offer_decision_table_orientation_check
            CHECK (archived_offer_decision_table_orientation IN ('horizontal', 'vertical'));
    END IF;
END $$;

COMMIT;
