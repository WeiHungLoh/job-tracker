import {
    OFFER_ANNUAL_LEAVE_DAYS_MAX,
    OFFER_DETAILS_MAX_LENGTHS,
    OFFER_MONTHLY_BASE_SALARY_MAX,
    OFFER_WORK_ARRANGEMENTS,
} from '../offerDecisionConfig';
import { JobTrackerAPIError } from '../../../api/models';
import { calculateOfferDecisionScore, isOfferDecisionValues } from '../offerEvaluation';
import type {
    CounterofferPlan,
    CounterofferPlanErrors,
    CounterofferPlanValidationResult,
    OfferDecisionApplication,
    OfferDecisionValues,
    OfferEvaluation,
} from '../models';

export const isCounterofferPlanDeletionRequiredError = (error: unknown): boolean =>
    error instanceof JobTrackerAPIError &&
    error.status === 409 &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'code' in error.data &&
    error.data.code === 'OFFER_EVALUATION_ABOVE_COUNTEROFFER';

export const isCounterofferPlanningEligible = (
    application: OfferDecisionApplication,
    readOnly: boolean,
    now = Date.now()
): boolean =>
    !readOnly &&
    application.job_status === 'Offer' &&
    Boolean(application.evaluation) &&
    new Date(application.evaluation?.details.decision_deadline ?? '').getTime() >= now;

export const createCounterofferPlanFromEvaluation = (evaluation: OfferEvaluation): CounterofferPlan => ({
    monthly_base_salary: evaluation.details.monthly_base_salary ?? 0,
    bonus: evaluation.details.bonus,
    annual_leave_days: evaluation.details.annual_leave_days,
    work_arrangement: evaluation.details.work_arrangement,
    ratings: { ...evaluation.ratings },
});

export type CounterofferRequestedChange = {
    key: 'monthly_base_salary' | 'bonus' | 'annual_leave_days' | 'work_arrangement';
    label: string;
    currentValue: string;
    idealValue: string;
};

const formatCurrencyAmount = (currency: string, amount: number | null): string =>
    amount === null ? '-' : `${currency} ${amount.toLocaleString()}`;

const formatAnnualLeave = (days: number | null): string => {
    if (days === null) {
        return '-';
    }
    return `${days} ${days === 1 ? 'day' : 'days'}`;
};

export const buildCounterofferRequestedChanges = (
    currentEvaluation: OfferEvaluation,
    plan: CounterofferPlan
): CounterofferRequestedChange[] => {
    const changes: CounterofferRequestedChange[] = [];
    const { details } = currentEvaluation;

    if (details.monthly_base_salary !== plan.monthly_base_salary) {
        changes.push({
            key: 'monthly_base_salary',
            label: 'Monthly base salary',
            currentValue: formatCurrencyAmount(details.currency, details.monthly_base_salary),
            idealValue: formatCurrencyAmount(details.currency, plan.monthly_base_salary),
        });
    }

    const currentBonus = details.bonus.trim();
    const idealBonus = plan.bonus.trim();
    if (currentBonus !== idealBonus) {
        changes.push({
            key: 'bonus',
            label: 'Bonus',
            currentValue: currentBonus || '-',
            idealValue: idealBonus || '-',
        });
    }

    if (details.annual_leave_days !== plan.annual_leave_days) {
        changes.push({
            key: 'annual_leave_days',
            label: 'Annual leave',
            currentValue: formatAnnualLeave(details.annual_leave_days),
            idealValue: formatAnnualLeave(plan.annual_leave_days),
        });
    }

    if (details.work_arrangement !== plan.work_arrangement) {
        changes.push({
            key: 'work_arrangement',
            label: 'Work arrangement',
            currentValue: details.work_arrangement || 'Not specified',
            idealValue: plan.work_arrangement || 'Not specified',
        });
    }

    return changes;
};

export const formatRatingDifference = (current: number, ideal: number): string => {
    const difference = ideal - current;
    if (difference === 0) {
        return 'No change';
    }

    const unit = Math.abs(difference) === 1 ? 'rating point' : 'rating points';
    return `${difference > 0 ? '+' : '−'}${Math.abs(difference)} ${unit}`;
};

export const formatFitRatingDifference = (current: number, ideal: number): string => {
    const difference = ideal - current;
    if (difference === 0) {
        return 'No change';
    }

    const unit = Math.abs(difference) === 1 ? 'percentage point' : 'percentage points';
    return `${difference > 0 ? '+' : '−'}${Math.abs(difference)} ${unit}`;
};

export const calculateCounterofferPlanResult = (currentEvaluation: OfferEvaluation, plan: CounterofferPlan) => {
    const currentFitRating = calculateOfferDecisionScore(currentEvaluation.ratings);
    const idealFitRating = calculateOfferDecisionScore(plan.ratings);
    return {
        currentFitRating,
        idealFitRating,
        difference: idealFitRating - currentFitRating,
    };
};

const ratingsAreEqual = (first: OfferDecisionValues, second: OfferDecisionValues): boolean =>
    first.career_growth === second.career_growth &&
    first.company_culture_fit === second.company_culture_fit &&
    first.work_life_balance === second.work_life_balance &&
    first.compensation === second.compensation;

export const counterofferPlanValuesAreEqual = (first: CounterofferPlan, second: CounterofferPlan): boolean =>
    first.monthly_base_salary === second.monthly_base_salary &&
    first.bonus === second.bonus &&
    first.annual_leave_days === second.annual_leave_days &&
    first.work_arrangement === second.work_arrangement &&
    ratingsAreEqual(first.ratings, second.ratings);

export const validateCounterofferPlan = (
    plan: CounterofferPlan,
    currentEvaluation: OfferEvaluation
): CounterofferPlanValidationResult => {
    const normalizedPlan = {
        ...plan,
        bonus: plan.bonus.trim(),
        ratings: { ...plan.ratings },
    };
    const errors: CounterofferPlanErrors = {};

    if (
        !Number.isInteger(normalizedPlan.monthly_base_salary) ||
        normalizedPlan.monthly_base_salary < 0 ||
        normalizedPlan.monthly_base_salary > OFFER_MONTHLY_BASE_SALARY_MAX
    ) {
        errors.monthly_base_salary = `Monthly base salary must be a whole number from 0 to ${OFFER_MONTHLY_BASE_SALARY_MAX}.`;
    }
    if (normalizedPlan.bonus.length > OFFER_DETAILS_MAX_LENGTHS.bonus) {
        errors.bonus = `Bonus must be ${OFFER_DETAILS_MAX_LENGTHS.bonus} characters or fewer.`;
    }
    if (
        normalizedPlan.annual_leave_days !== null &&
        (!Number.isInteger(normalizedPlan.annual_leave_days) ||
            normalizedPlan.annual_leave_days < 0 ||
            normalizedPlan.annual_leave_days > OFFER_ANNUAL_LEAVE_DAYS_MAX)
    ) {
        errors.annual_leave_days = `Annual leave must be a whole number from 0 to ${OFFER_ANNUAL_LEAVE_DAYS_MAX}.`;
    }
    if (
        normalizedPlan.work_arrangement !== '' &&
        !OFFER_WORK_ARRANGEMENTS.some((arrangement) => arrangement === normalizedPlan.work_arrangement)
    ) {
        errors.work_arrangement = 'Select a valid work arrangement.';
    }
    if (!isOfferDecisionValues(normalizedPlan.ratings)) {
        errors.ratings = 'Ratings must be whole numbers from 1 to 5.';
    }

    const currentFitRating = calculateOfferDecisionScore(currentEvaluation.ratings);
    if (!errors.ratings && calculateOfferDecisionScore(normalizedPlan.ratings) < currentFitRating) {
        const idealFitRating = calculateOfferDecisionScore(normalizedPlan.ratings);
        errors.fit_rating =
            'Your Ideal offer has a lower fit rating than your current offer. ' +
            'Adjust the ratings before saving. ' +
            `Current offer: ${currentFitRating}%. Ideal offer: ${idealFitRating}%.`;
    }

    const normalizedCurrentOffer = {
        ...createCounterofferPlanFromEvaluation(currentEvaluation),
        bonus: currentEvaluation.details.bonus.trim(),
    };
    if (Object.keys(errors).length === 0 && counterofferPlanValuesAreEqual(normalizedPlan, normalizedCurrentOffer)) {
        errors.unchanged = 'Change at least one term or rating for the Ideal offer.';
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors };
    }
    return { isValid: true, request: normalizedPlan };
};

const formatNameList = (names: string[]): string => {
    if (names.length <= 1) {
        return names[0] ?? '';
    }
    if (names.length === 2) {
        return `${names[0]} and ${names[1]}`;
    }
    return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};

export const buildCounterofferConclusion = (
    currentApplication: OfferDecisionApplication,
    idealFitRating: number,
    applications: OfferDecisionApplication[],
    now = Date.now()
): string => {
    const evaluation = currentApplication.evaluation;
    if (!evaluation) {
        return '';
    }

    const currentFitRating = calculateOfferDecisionScore(evaluation.ratings);
    if (idealFitRating === currentFitRating) {
        return 'Your Ideal offer has the same fit rating as the current offer.';
    }

    const otherOffers = applications
        .filter(
            (application) =>
                application.job_id !== currentApplication.job_id &&
                application.job_status === 'Offer' &&
                Boolean(application.evaluation) &&
                new Date(application.evaluation?.details.decision_deadline ?? '').getTime() >= now
        )
        .map((application) => ({
            companyName: application.company_name,
            fitRating: calculateOfferDecisionScore(application.evaluation!.ratings),
        }));

    if (otherOffers.length === 0) {
        return (
            `Your Ideal offer would change the fit rating from ${currentFitRating}% to ${idealFitRating}%. ` +
            'Add another evaluated offer to compare them.'
        );
    }

    const highestOtherFitRating = Math.max(...otherOffers.map((offer) => offer.fitRating));
    if (idealFitRating > highestOtherFitRating) {
        return `Your Ideal offer would have the highest fit rating among your currently evaluated offers at ${idealFitRating}%.`;
    }
    if (idealFitRating < highestOtherFitRating) {
        const higherNames = otherOffers
            .filter((offer) => offer.fitRating === highestOtherFitRating)
            .map((offer) => offer.companyName);
        const comparisonVerb = idealFitRating > currentFitRating ? 'improve' : 'change';
        return (
            `Your Ideal offer would ${comparisonVerb} the fit rating from ${currentFitRating}% to ${idealFitRating}%. ` +
            `${formatNameList(higherNames)} would still have the higher fit rating at ${highestOtherFitRating}%.`
        );
    }

    const tiedNames = otherOffers
        .filter((offer) => offer.fitRating === idealFitRating)
        .map((offer) => offer.companyName);
    return (
        `Your Ideal offer would give ${formatNameList([currentApplication.company_name, ...tiedNames])} ` +
        `the same fit rating of ${idealFitRating}%.`
    );
};
