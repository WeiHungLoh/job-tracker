import { isValidDate, toIntegerInRange, toSupportedQueryValues } from '../../shared/http/validation.js';
import {
    OFFER_ANNUAL_LEAVE_DAYS_MAX,
    OFFER_DECISION_VALUE_MAX,
    OFFER_DECISION_VALUE_MIN,
    OFFER_DETAILS_MAX_LENGTHS,
    OFFER_MONTHLY_BASE_SALARY_MAX,
} from './config.js';
import type {
    ArchivedOfferDecisionFilter,
    CounterofferPlanInput,
    OfferDecisionFilter,
    OfferDecisionValues,
    OfferDetails,
    SaveOfferEvaluationInput,
} from './models.js';
import { ARCHIVED_OFFER_DECISION_FILTERS, OFFER_DECISION_FILTERS, OFFER_WORK_ARRANGEMENTS } from './models.js';

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

const isOfferDecisionFilter = (value: unknown): value is OfferDecisionFilter =>
    typeof value === 'string' && OFFER_DECISION_FILTERS.includes(value as OfferDecisionFilter);

const isArchivedOfferDecisionFilter = (value: unknown): value is ArchivedOfferDecisionFilter =>
    typeof value === 'string' && ARCHIVED_OFFER_DECISION_FILTERS.includes(value as ArchivedOfferDecisionFilter);

export const isOfferDecisionFilterArray = (value: unknown): value is OfferDecisionFilter[] =>
    Array.isArray(value) && value.every(isOfferDecisionFilter) && new Set(value).size === value.length;

export const isArchivedOfferDecisionFilterArray = (value: unknown): value is ArchivedOfferDecisionFilter[] =>
    Array.isArray(value) && value.every(isArchivedOfferDecisionFilter) && new Set(value).size === value.length;

export const toOfferDecisionFilterQueryValues = (
    value: unknown,
    isArchived: boolean
): OfferDecisionFilter[] | ArchivedOfferDecisionFilter[] | undefined =>
    toSupportedQueryValues(value, isArchived ? ARCHIVED_OFFER_DECISION_FILTERS : OFFER_DECISION_FILTERS);
