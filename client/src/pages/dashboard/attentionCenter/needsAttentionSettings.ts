import type {
    NeedsAttentionCategory,
    UpdateUserPreferencesRequest,
    UserPreferences,
} from '../../../components/userPreferences/models';

export type NeedsAttentionSettings = {
    enabledCategories: readonly NeedsAttentionCategory[];
    maxItems: number;
    offerDueDays: number;
    offerOverdueDays: number;
    postInterviewStaleDays: number;
    postInterviewFollowUpDays: number;
    applicationStaleDays: number;
    applicationFollowUpDays: number;
};

export const NEEDS_ATTENTION_LIMITS = {
    applicationFollowUpDays: { minimum: 1, maximum: 30 },
    applicationStaleDays: { minimum: 1, maximum: 60 },
    maxItems: { minimum: 1, maximum: 50 },
    offerDueDays: { minimum: 1, maximum: 14 },
    offerOverdueDays: { minimum: 1, maximum: 30 },
    postInterviewFollowUpDays: { minimum: 1, maximum: 30 },
    postInterviewStaleDays: { minimum: 1, maximum: 60 },
} as const;

export type NeedsAttentionTimingKey =
    | 'offerDueDays'
    | 'offerOverdueDays'
    | 'postInterviewStaleDays'
    | 'postInterviewFollowUpDays'
    | 'applicationStaleDays'
    | 'applicationFollowUpDays';

type NeedsAttentionOption = {
    category: NeedsAttentionCategory;
    description: string;
    label: string;
    timing?: {
        key: NeedsAttentionTimingKey;
        label: string;
        maximum: number;
        minimum: number;
    };
};

export const NEEDS_ATTENTION_OPTIONS: readonly NeedsAttentionOption[] = [
    {
        category: 'offer-decision-due',
        description: 'Evaluated offers before their decision deadline.',
        label: 'Offer decision due soon',
        timing: {
            key: 'offerDueDays',
            label: `Start showing this many days before the deadline (${NEEDS_ATTENTION_LIMITS.offerDueDays.minimum}–${NEEDS_ATTENTION_LIMITS.offerDueDays.maximum})`,
            ...NEEDS_ATTENTION_LIMITS.offerDueDays,
        },
    },
    {
        category: 'offer-decision-overdue',
        description: 'Evaluated offers whose decision deadline has passed.',
        label: 'Offer decision overdue',
        timing: {
            key: 'offerOverdueDays',
            label: `Keep showing until this many days overdue (${NEEDS_ATTENTION_LIMITS.offerOverdueDays.minimum}–${NEEDS_ATTENTION_LIMITS.offerOverdueDays.maximum})`,
            ...NEEDS_ATTENTION_LIMITS.offerOverdueDays,
        },
    },
    {
        category: 'offer-evaluation',
        description: 'Applications at Offer with no saved evaluation.',
        label: 'Offer needs evaluation',
    },
    {
        category: 'post-interview-follow-up-stale',
        description: 'Interview follow-ups still unanswered after being marked as sent.',
        label: 'Interview follow-up unanswered',
        timing: {
            key: 'postInterviewStaleDays',
            label: `Start showing this many days after it was sent (${NEEDS_ATTENTION_LIMITS.postInterviewStaleDays.minimum}–${NEEDS_ATTENTION_LIMITS.postInterviewStaleDays.maximum})`,
            ...NEEDS_ATTENTION_LIMITS.postInterviewStaleDays,
        },
    },
    {
        category: 'post-interview',
        description: 'Completed interviews ready for a follow-up.',
        label: 'Interview follow-up due',
        timing: {
            key: 'postInterviewFollowUpDays',
            label: `Start showing this many days after the interview (${NEEDS_ATTENTION_LIMITS.postInterviewFollowUpDays.minimum}–${NEEDS_ATTENTION_LIMITS.postInterviewFollowUpDays.maximum})`,
            ...NEEDS_ATTENTION_LIMITS.postInterviewFollowUpDays,
        },
    },
    {
        category: 'interview-unscheduled',
        description: 'Applications at Interview with nothing scheduled.',
        label: 'Interview not scheduled',
    },
    {
        category: 'application-follow-up-stale',
        description: 'Application follow-ups still unanswered after being marked as sent.',
        label: 'Application follow-up unanswered',
        timing: {
            key: 'applicationStaleDays',
            label: `Start showing this many days after it was sent (${NEEDS_ATTENTION_LIMITS.applicationStaleDays.minimum}–${NEEDS_ATTENTION_LIMITS.applicationStaleDays.maximum})`,
            ...NEEDS_ATTENTION_LIMITS.applicationStaleDays,
        },
    },
    {
        category: 'application-follow-up',
        description: 'Applied applications ready for an initial follow-up.',
        label: 'Application follow-up due',
        timing: {
            key: 'applicationFollowUpDays',
            label: `Start showing this many days after applying (${NEEDS_ATTENTION_LIMITS.applicationFollowUpDays.minimum}–${NEEDS_ATTENTION_LIMITS.applicationFollowUpDays.maximum})`,
            ...NEEDS_ATTENTION_LIMITS.applicationFollowUpDays,
        },
    },
];

export const NEEDS_ATTENTION_CATEGORIES: readonly NeedsAttentionCategory[] = [
    'offer-decision-due',
    'offer-decision-overdue',
    'offer-evaluation',
    'post-interview-follow-up-stale',
    'post-interview',
    'interview-unscheduled',
    'application-follow-up-stale',
    'application-follow-up',
];

export const DEFAULT_NEEDS_ATTENTION_SETTINGS: Readonly<NeedsAttentionSettings> = {
    enabledCategories: [...NEEDS_ATTENTION_CATEGORIES],
    maxItems: 10,
    offerDueDays: 3,
    offerOverdueDays: 14,
    postInterviewStaleDays: 14,
    postInterviewFollowUpDays: 7,
    applicationStaleDays: 14,
    applicationFollowUpDays: 7,
};

export const getNeedsAttentionSettings = (preferences: UserPreferences): NeedsAttentionSettings => ({
    enabledCategories: Array.isArray(preferences.needs_attention_categories)
        ? preferences.needs_attention_categories
        : DEFAULT_NEEDS_ATTENTION_SETTINGS.enabledCategories,
    maxItems: preferences.needs_attention_max_items ?? DEFAULT_NEEDS_ATTENTION_SETTINGS.maxItems,
    offerDueDays: preferences.needs_attention_offer_due_days ?? DEFAULT_NEEDS_ATTENTION_SETTINGS.offerDueDays,
    offerOverdueDays:
        preferences.needs_attention_offer_overdue_days ?? DEFAULT_NEEDS_ATTENTION_SETTINGS.offerOverdueDays,
    postInterviewStaleDays:
        preferences.needs_attention_post_interview_stale_days ??
        DEFAULT_NEEDS_ATTENTION_SETTINGS.postInterviewStaleDays,
    postInterviewFollowUpDays:
        preferences.needs_attention_post_interview_follow_up_days ??
        DEFAULT_NEEDS_ATTENTION_SETTINGS.postInterviewFollowUpDays,
    applicationStaleDays:
        preferences.needs_attention_application_stale_days ?? DEFAULT_NEEDS_ATTENTION_SETTINGS.applicationStaleDays,
    applicationFollowUpDays:
        preferences.needs_attention_application_follow_up_days ??
        DEFAULT_NEEDS_ATTENTION_SETTINGS.applicationFollowUpDays,
});

export const getNeedsAttentionPreferenceUpdate = (settings: NeedsAttentionSettings): UpdateUserPreferencesRequest => ({
    needs_attention_categories: [...settings.enabledCategories],
    needs_attention_max_items: settings.maxItems,
    needs_attention_offer_due_days: settings.offerDueDays,
    needs_attention_offer_overdue_days: settings.offerOverdueDays,
    needs_attention_post_interview_stale_days: settings.postInterviewStaleDays,
    needs_attention_post_interview_follow_up_days: settings.postInterviewFollowUpDays,
    needs_attention_application_stale_days: settings.applicationStaleDays,
    needs_attention_application_follow_up_days: settings.applicationFollowUpDays,
});

export const needsAttentionRequiresInterviews = (categories: readonly NeedsAttentionCategory[]): boolean =>
    categories.some((category) =>
        [
            'post-interview-follow-up-stale',
            'post-interview',
            'interview-unscheduled',
            'application-follow-up-stale',
            'application-follow-up',
        ].includes(category)
    );

export const needsAttentionRequiresOfferEvaluations = (categories: readonly NeedsAttentionCategory[]): boolean =>
    categories.includes('offer-decision-due') || categories.includes('offer-decision-overdue');
