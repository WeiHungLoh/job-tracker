import {
    APPLICATION_BOARD_SORT_ORDERS,
    APPLICATION_LIST_SORT_ORDERS,
    JOB_STATUSES,
    INTERVIEW_TIME_FILTERS,
    OFFER_DECISION_FILTERS,
    ARCHIVED_OFFER_DECISION_FILTERS,
    type ApplicationBoardSortOrder,
    type ApplicationListSortOrder,
    type CollectionViewMode,
    type JobStatus,
    type InterviewTimeFilter,
    type OfferDecisionFilter,
    type ArchivedOfferDecisionFilter,
    type OfferDecisionViewMode,
    type OfferDecisionTableOrientation,
    OFFER_WORK_ARRANGEMENTS,
    type CounterofferPlanInput,
    type OfferDetails,
    type OfferDecisionValues,
    type SaveOfferEvaluationInput,
    NEEDS_ATTENTION_CATEGORIES,
    type NeedsAttentionCategory,
} from '../db/models.js';
import {
    OFFER_ANNUAL_LEAVE_DAYS_MAX,
    OFFER_DECISION_VALUE_MAX,
    OFFER_DECISION_VALUE_MIN,
    OFFER_DETAILS_MAX_LENGTHS,
    OFFER_MONTHLY_BASE_SALARY_MAX,
    EMAIL_MAX_LENGTH,
    PASSWORD_MAX_BYTES,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
} from '../config/validation.js';

const HOSTNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/i;
const ISO_DATE_PATTERN =
    /^(\d{4,})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const MAX_DATE_YEAR = 9999;
const MAX_TIME_ZONE_LENGTH = 100;

const isLeapYear = (year: number): boolean => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const hasValidCalendarDate = (value: string): boolean => {
    const match = ISO_DATE_PATTERN.exec(value);
    if (!match) {
        return false;
    }

    const [, yearValue, monthValue, dayValue, hourValue = '0', minuteValue = '0', secondValue = '0'] = match;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const hour = Number(hourValue);
    const minute = Number(minuteValue);
    const second = Number(secondValue);
    if (year < 1 || year > MAX_DATE_YEAR || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
        return false;
    }

    const daysInMonth = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
    return day >= 1 && day <= daysInMonth;
};

export const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

export const normalizeEmail = (value: unknown): string | undefined =>
    typeof value === 'string' ? value.trim().toLowerCase() : undefined;

export const getPasswordMaximumValidationError = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const passwordLength = [...value].length;
    if (passwordLength > PASSWORD_MAX_LENGTH) {
        return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
    }
    if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) {
        return 'Password is too long when encoded. Use fewer Unicode characters.';
    }
    return undefined;
};

export const getPasswordValidationError = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || [...value].length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    return getPasswordMaximumValidationError(value);
};

export const toTrimmedString = (value: unknown, maxLength: number, allowEmpty = false): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    if ((!allowEmpty && !trimmedValue) || trimmedValue.length > maxLength) {
        return undefined;
    }

    return trimmedValue;
};

export const toTimeZone = (value: unknown): string | undefined => {
    const timeZone = toTrimmedString(value, MAX_TIME_ZONE_LENGTH);
    if (!timeZone) {
        return undefined;
    }

    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format();
        return timeZone;
    } catch {
        return undefined;
    }
};

export const toPositiveInteger = (value: unknown): number | undefined => {
    if (typeof value !== 'number' && typeof value !== 'string') {
        return undefined;
    }
    if (typeof value === 'string' && value.trim().length === 0) {
        return undefined;
    }

    const parsedValue = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
};

export const toIntegerInRange = (value: unknown, minimum: number, maximum: number): number | undefined => {
    return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
        ? value
        : undefined;
};

export const isOptionalIntegerInRange = (value: unknown, minimum: number, maximum: number): boolean =>
    value === undefined || toIntegerInRange(value, minimum, maximum) !== undefined;

const isOfferDecisionValue = (value: unknown): value is number =>
    toIntegerInRange(value, OFFER_DECISION_VALUE_MIN, OFFER_DECISION_VALUE_MAX) !== undefined;

export const isOfferDecisionValues = (value: unknown): value is OfferDecisionValues => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const values = value as Record<string, unknown>;
    return (
        isOfferDecisionValue(values.career_growth) &&
        isOfferDecisionValue(values.company_culture_fit) &&
        isOfferDecisionValue(values.work_life_balance) &&
        isOfferDecisionValue(values.compensation)
    );
};

const isNormalizedBoundedText = (value: unknown, maximum: number): value is string =>
    typeof value === 'string' && value === value.trim() && value.length <= maximum;

const isNormalizedISOString = (value: string): boolean => {
    if (!isValidDate(value)) {
        return false;
    }

    return new Date(value).toISOString() === value;
};

export const isOfferDetails = (value: unknown): value is OfferDetails => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const details = value as Record<string, unknown>;
    return (
        typeof details.currency === 'string' &&
        /^[A-Z]{3}$/.test(details.currency) &&
        toIntegerInRange(details.monthly_base_salary, 0, OFFER_MONTHLY_BASE_SALARY_MAX) !== undefined &&
        isNormalizedBoundedText(details.bonus, OFFER_DETAILS_MAX_LENGTHS.bonus) &&
        (details.annual_leave_days === null ||
            toIntegerInRange(details.annual_leave_days, 0, OFFER_ANNUAL_LEAVE_DAYS_MAX) !== undefined) &&
        typeof details.work_arrangement === 'string' &&
        (details.work_arrangement === '' ||
            OFFER_WORK_ARRANGEMENTS.some((arrangement) => arrangement === details.work_arrangement)) &&
        typeof details.decision_deadline === 'string' &&
        isNormalizedISOString(details.decision_deadline) &&
        isNormalizedBoundedText(details.pros, OFFER_DETAILS_MAX_LENGTHS.notes) &&
        isNormalizedBoundedText(details.concerns, OFFER_DETAILS_MAX_LENGTHS.notes)
    );
};

export const isSaveOfferEvaluationRequest = (value: unknown): value is SaveOfferEvaluationInput => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const request = value as Partial<SaveOfferEvaluationInput>;
    return (
        isOfferDecisionValues(request.ratings) &&
        isOfferDetails(request.details) &&
        (request.deleteCounterofferPlan === undefined || typeof request.deleteCounterofferPlan === 'boolean')
    );
};

export const isSaveCounterofferPlanRequest = (value: unknown): value is CounterofferPlanInput => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const plan = value as Record<string, unknown>;
    return (
        toIntegerInRange(plan.monthly_base_salary, 0, OFFER_MONTHLY_BASE_SALARY_MAX) !== undefined &&
        isNormalizedBoundedText(plan.bonus, OFFER_DETAILS_MAX_LENGTHS.bonus) &&
        (plan.annual_leave_days === null ||
            toIntegerInRange(plan.annual_leave_days, 0, OFFER_ANNUAL_LEAVE_DAYS_MAX) !== undefined) &&
        typeof plan.work_arrangement === 'string' &&
        (plan.work_arrangement === '' ||
            OFFER_WORK_ARRANGEMENTS.some((arrangement) => arrangement === plan.work_arrangement)) &&
        isOfferDecisionValues(plan.ratings)
    );
};

export const isValidDate = (value: unknown): value is string => {
    if (typeof value !== 'string') {
        return false;
    }

    const trimmedValue = value.trim();
    return hasValidCalendarDate(trimmedValue) && !Number.isNaN(Date.parse(trimmedValue));
};

export const isFutureDate = (value: string): boolean => Date.parse(value) > Date.now();

export const isValidHttpURL = (value: string): boolean => {
    try {
        const parsedURL = new URL(value);
        return (
            (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') &&
            HOSTNAME_PATTERN.test(parsedURL.hostname)
        );
    } catch {
        return false;
    }
};

export const isValidEmail = (value: unknown): value is string =>
    typeof value === 'string' && value.length <= EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isJobStatus = (value: unknown): value is JobStatus =>
    typeof value === 'string' && JOB_STATUSES.includes(value as JobStatus);

export const isJobStatusArray = (value: unknown): value is JobStatus[] => {
    return Array.isArray(value) && value.every(isJobStatus) && new Set(value).size === value.length;
};

const isInterviewTimeFilter = (value: unknown): value is InterviewTimeFilter =>
    typeof value === 'string' && INTERVIEW_TIME_FILTERS.includes(value as InterviewTimeFilter);

export const isInterviewTimeFilterArray = (value: unknown): value is InterviewTimeFilter[] => {
    return Array.isArray(value) && value.every(isInterviewTimeFilter) && new Set(value).size === value.length;
};

const isOfferDecisionFilter = (value: unknown): value is OfferDecisionFilter =>
    typeof value === 'string' && OFFER_DECISION_FILTERS.includes(value as OfferDecisionFilter);

const isArchivedOfferDecisionFilter = (value: unknown): value is ArchivedOfferDecisionFilter =>
    typeof value === 'string' && ARCHIVED_OFFER_DECISION_FILTERS.includes(value as ArchivedOfferDecisionFilter);

export const isOfferDecisionFilterArray = (value: unknown): value is OfferDecisionFilter[] =>
    Array.isArray(value) && value.every(isOfferDecisionFilter) && new Set(value).size === value.length;

export const isArchivedOfferDecisionFilterArray = (value: unknown): value is ArchivedOfferDecisionFilter[] =>
    Array.isArray(value) && value.every(isArchivedOfferDecisionFilter) && new Set(value).size === value.length;

const isNeedsAttentionCategory = (value: unknown): value is NeedsAttentionCategory =>
    typeof value === 'string' && NEEDS_ATTENTION_CATEGORIES.includes(value as NeedsAttentionCategory);

export const isNeedsAttentionCategoryArray = (value: unknown): value is NeedsAttentionCategory[] =>
    Array.isArray(value) && value.every(isNeedsAttentionCategory) && new Set(value).size === value.length;

const toSupportedQueryValues = <Value extends string>(
    value: unknown,
    supportedValues: readonly Value[]
): Value[] | undefined => {
    if (value === undefined) {
        return [...supportedValues];
    }

    const requestedValues = Array.isArray(value) ? value : [value];
    if (requestedValues.length === 1 && requestedValues[0] === '') {
        return [...supportedValues];
    }

    const values: Value[] = [];
    for (const requestedValue of requestedValues) {
        if (typeof requestedValue !== 'string' || !supportedValues.includes(requestedValue as Value)) {
            return undefined;
        }
        if (!values.includes(requestedValue as Value)) {
            values.push(requestedValue as Value);
        }
    }

    return values;
};

export const toJobStatusQueryValues = (value: unknown): JobStatus[] | undefined =>
    toSupportedQueryValues(value, JOB_STATUSES);

export const toInterviewTimeFilterQueryValues = (value: unknown): InterviewTimeFilter[] | undefined =>
    toSupportedQueryValues(value, INTERVIEW_TIME_FILTERS);

export const toOfferDecisionFilterQueryValues = (
    value: unknown,
    isArchived: boolean
): OfferDecisionFilter[] | ArchivedOfferDecisionFilter[] | undefined =>
    toSupportedQueryValues(value, isArchived ? ARCHIVED_OFFER_DECISION_FILTERS : OFFER_DECISION_FILTERS);

export const isOptionalBoolean = (value: unknown): value is boolean | undefined =>
    value === undefined || typeof value === 'boolean';

export const isCollectionViewMode = (value: unknown): value is CollectionViewMode =>
    value === 'list' || value === 'board';

export const isOptionalCollectionViewMode = (value: unknown): value is CollectionViewMode | undefined =>
    value === undefined || isCollectionViewMode(value);

export const isOfferDecisionViewMode = (value: unknown): value is OfferDecisionViewMode =>
    value === 'cards' || value === 'table';

export const isOptionalOfferDecisionViewMode = (value: unknown): value is OfferDecisionViewMode | undefined =>
    value === undefined || isOfferDecisionViewMode(value);

export const isOfferDecisionTableOrientation = (value: unknown): value is OfferDecisionTableOrientation =>
    value === 'horizontal' || value === 'vertical';

export const isOptionalOfferDecisionTableOrientation = (
    value: unknown
): value is OfferDecisionTableOrientation | undefined => value === undefined || isOfferDecisionTableOrientation(value);

export const isApplicationListSortOrder = (value: unknown): value is ApplicationListSortOrder =>
    typeof value === 'string' && APPLICATION_LIST_SORT_ORDERS.some((sortOrder) => sortOrder === value);

export const isApplicationBoardSortOrder = (value: unknown): value is ApplicationBoardSortOrder =>
    typeof value === 'string' && APPLICATION_BOARD_SORT_ORDERS.some((sortOrder) => sortOrder === value);

export const isOptionalApplicationListSortOrder = (value: unknown): value is ApplicationListSortOrder | undefined =>
    value === undefined || isApplicationListSortOrder(value);

export const isOptionalApplicationBoardSortOrder = (value: unknown): value is ApplicationBoardSortOrder | undefined =>
    value === undefined || isApplicationBoardSortOrder(value);
