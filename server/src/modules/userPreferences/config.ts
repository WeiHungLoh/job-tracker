export const NEEDS_ATTENTION_LIMITS = {
    applicationFollowUpDays: { minimum: 1, maximum: 30 },
    applicationStaleDays: { minimum: 1, maximum: 60 },
    maxItems: { minimum: 1, maximum: 50 },
    offerDueDays: { minimum: 1, maximum: 14 },
    offerOverdueDays: { minimum: 1, maximum: 30 },
    postInterviewFollowUpDays: { minimum: 1, maximum: 30 },
    postInterviewStaleDays: { minimum: 1, maximum: 60 },
} as const;
