import { isInvalidDatetimeLocalInput, parseDatetimeLocal } from '../../helper/dateFormatter';
import {
    DEFAULT_OFFER_DECISION_VALUES,
    DEFAULT_OFFER_DETAILS,
    OFFER_ANNUAL_LEAVE_DAYS_MAX,
    OFFER_DECISION_CATEGORIES,
    OFFER_DECISION_VALUE_MAX,
    OFFER_DECISION_VALUE_MIN,
    OFFER_DETAILS_MAX_LENGTHS,
    OFFER_MONTHLY_BASE_SALARY_MAX,
    OFFER_WORK_ARRANGEMENTS,
} from './offerDecisionConfig';
import type {
    OfferDecisionCategory,
    OfferDecisionRating,
    OfferDecisionValues,
    OfferDetails,
    OfferEvaluation,
    OfferEvaluationFormErrors,
    OfferEvaluationValidationResult,
    SaveOfferEvaluationRequest,
} from './models';

const isOfferDecisionValue = (value: unknown): value is OfferDecisionRating =>
    Number.isInteger(value) && Number(value) >= OFFER_DECISION_VALUE_MIN && Number(value) <= OFFER_DECISION_VALUE_MAX;

export const isOfferDecisionValues = (value: unknown): value is OfferDecisionValues => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const values = value as Record<string, unknown>;
    return OFFER_DECISION_CATEGORIES.every((category) => isOfferDecisionValue(values[category.key]));
};

const isWholeNumberInRange = (value: unknown, maximum: number): value is number =>
    Number.isInteger(value) && Number(value) >= 0 && Number(value) <= maximum;

const isNormalizedTimestamp = (value: string): boolean => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString() === value;
};

const normalizeDecisionDeadline = (value: string): string => {
    const deadline = value.trim();
    if (!deadline || isInvalidDatetimeLocalInput(deadline)) {
        return deadline;
    }
    return parseDatetimeLocal(deadline).toISOString();
};

export const normalizeOfferDetails = (details: OfferDetails): OfferDetails => ({
    ...details,
    currency: details.currency.trim().toUpperCase(),
    bonus: details.bonus.trim(),
    decision_deadline: normalizeDecisionDeadline(details.decision_deadline),
    pros: details.pros.trim(),
    concerns: details.concerns.trim(),
});

export const validateOfferEvaluation = (
    request: SaveOfferEvaluationRequest,
    applicationDate: string,
    decisionDeadlineHasBadInput = false,
    monthlyBaseSalaryHasBadInput = false
): OfferEvaluationValidationResult => {
    const deadlineInput = request.details.decision_deadline.trim();
    const deadlineIsValid =
        (!decisionDeadlineHasBadInput && !isInvalidDatetimeLocalInput(deadlineInput)) ||
        isNormalizedTimestamp(deadlineInput);
    const details = normalizeOfferDetails(request.details);
    const errors: OfferEvaluationFormErrors = {};

    if (!isOfferDecisionValues(request.ratings)) {
        errors.ratings = 'Ratings must be whole numbers from 1 to 5.';
    }
    if (!details.currency) {
        errors.currency = 'Currency is required.';
    } else if (!/^[A-Z]{3}$/.test(details.currency)) {
        errors.currency = 'Currency must be a three-letter code such as SGD or USD.';
    }
    if (monthlyBaseSalaryHasBadInput) {
        errors.monthly_base_salary = 'Please enter a valid monthly base salary.';
    } else if (details.monthly_base_salary === null) {
        errors.monthly_base_salary = 'Monthly base salary is required.';
    } else if (!isWholeNumberInRange(details.monthly_base_salary, OFFER_MONTHLY_BASE_SALARY_MAX)) {
        errors.monthly_base_salary = `Monthly base salary must be a whole number from 0 to ${OFFER_MONTHLY_BASE_SALARY_MAX}.`;
    }
    if (details.bonus.length > OFFER_DETAILS_MAX_LENGTHS.bonus) {
        errors.bonus = `Bonus must be ${OFFER_DETAILS_MAX_LENGTHS.bonus} characters or fewer.`;
    }
    if (
        details.annual_leave_days !== null &&
        !isWholeNumberInRange(details.annual_leave_days, OFFER_ANNUAL_LEAVE_DAYS_MAX)
    ) {
        errors.annual_leave_days = `Annual leave must be a whole number from 0 to ${OFFER_ANNUAL_LEAVE_DAYS_MAX}.`;
    }
    if (
        details.work_arrangement &&
        !OFFER_WORK_ARRANGEMENTS.some((arrangement) => arrangement === details.work_arrangement)
    ) {
        errors.work_arrangement = 'Select a valid work arrangement.';
    }
    if (!deadlineIsValid) {
        errors.decision_deadline = 'Please enter a valid decision deadline.';
    } else if (!deadlineInput) {
        errors.decision_deadline = 'Decision deadline is required.';
    } else if (
        details.decision_deadline &&
        new Date(details.decision_deadline).getTime() < new Date(applicationDate).getTime()
    ) {
        errors.decision_deadline = 'Decision deadline cannot be earlier than the application date.';
    }
    if (details.pros.length > OFFER_DETAILS_MAX_LENGTHS.notes) {
        errors.pros = `Pros must be ${OFFER_DETAILS_MAX_LENGTHS.notes} characters or fewer.`;
    }
    if (details.concerns.length > OFFER_DETAILS_MAX_LENGTHS.notes) {
        errors.concerns = `Concerns must be ${OFFER_DETAILS_MAX_LENGTHS.notes} characters or fewer.`;
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors };
    }

    return { isValid: true, values: { ratings: { ...request.ratings }, details } };
};

export const updateOfferDecisionValue = (
    values: OfferDecisionValues,
    category: OfferDecisionCategory,
    value: OfferDecisionRating
): OfferDecisionValues => ({ ...values, [category]: value });

export const calculateOfferDecisionScore = (ratings: OfferDecisionValues): number => {
    const ratingTotal = OFFER_DECISION_CATEGORIES.reduce((total, category) => total + ratings[category.key], 0);
    const maximumTotal = OFFER_DECISION_CATEGORIES.length * OFFER_DECISION_VALUE_MAX;
    return Math.round((ratingTotal / maximumTotal) * 100);
};

export const createDefaultOfferEvaluation = (jobId: number): OfferEvaluation => ({
    job_id: jobId,
    ratings: { ...DEFAULT_OFFER_DECISION_VALUES },
    details: { ...DEFAULT_OFFER_DETAILS },
});

const valuesAreEqual = (first: OfferDecisionValues, second: OfferDecisionValues): boolean =>
    OFFER_DECISION_CATEGORIES.every((category) => first[category.key] === second[category.key]);

const detailsAreEqual = (first: OfferDetails, second: OfferDetails): boolean =>
    first.currency === second.currency &&
    first.monthly_base_salary === second.monthly_base_salary &&
    first.bonus === second.bonus &&
    first.annual_leave_days === second.annual_leave_days &&
    first.work_arrangement === second.work_arrangement &&
    (first.decision_deadline === second.decision_deadline ||
        (Boolean(first.decision_deadline) &&
            Boolean(second.decision_deadline) &&
            new Date(first.decision_deadline).getTime() === new Date(second.decision_deadline).getTime())) &&
    first.pros === second.pros &&
    first.concerns === second.concerns;

export const offerEvaluationsAreEqual = (first: OfferEvaluation, second: OfferEvaluation): boolean =>
    valuesAreEqual(first.ratings, second.ratings) && detailsAreEqual(first.details, second.details);
