export const FIELD_MAX_LENGTHS = {
    companyName: 150,
    jobTitle: 150,
    location: 200,
    interviewType: 100,
    jobURL: 2048,
    meetingURL: 2048,
    notes: 3000,
} as const;

export const INTERVIEW_DURATION_MINUTES_MIN = 1;
export const INTERVIEW_DURATION_MINUTES_MAX = 1440;
export const DEFAULT_INTERVIEW_DURATION_MINUTES = 60;

export const OFFER_DECISION_VALUE_MIN = 1;
export const OFFER_DECISION_VALUE_MAX = 5;
export const OFFER_MONTHLY_BASE_SALARY_MAX = 1_000_000_000;
export const OFFER_ANNUAL_LEAVE_DAYS_MAX = 365;
export const OFFER_DETAILS_MAX_LENGTHS = {
    bonus: 200,
    notes: 1000,
} as const;

export const NEEDS_ATTENTION_LIMITS = {
    applicationFollowUpDays: { minimum: 1, maximum: 30 },
    applicationStaleDays: { minimum: 1, maximum: 60 },
    maxItems: { minimum: 1, maximum: 50 },
    offerDueDays: { minimum: 1, maximum: 14 },
    offerOverdueDays: { minimum: 1, maximum: 30 },
    postInterviewFollowUpDays: { minimum: 1, maximum: 30 },
    postInterviewStaleDays: { minimum: 1, maximum: 60 },
} as const;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MAX_BYTES = 72;
