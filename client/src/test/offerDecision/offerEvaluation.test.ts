import {
    DEFAULT_OFFER_DECISION_VALUES,
    DEFAULT_OFFER_DETAILS,
    OFFER_DETAILS_MAX_LENGTHS,
} from '../../pages/offerDecision/offerDecisionConfig';
import {
    calculateOfferDecisionScore,
    createDefaultOfferEvaluation,
    normalizeOfferDetails,
    offerEvaluationsAreEqual,
    updateOfferDecisionValue,
    validateOfferEvaluation,
} from '../../pages/offerDecision/offerEvaluation';
import { parseDatetimeLocal, toDatetimeLocalInputValue } from '../../helper/dateFormatter';
import type { OfferDetails, OfferEvaluation, SaveOfferEvaluationRequest } from '../../pages/offerDecision/models';

const validDeadlineInput = '2026-07-18T18:00';
const validDeadlineTimestamp = parseDatetimeLocal(validDeadlineInput).toISOString();

const validDetails: OfferDetails = {
    currency: 'SGD',
    monthly_base_salary: 10000,
    bonus: '15% target',
    annual_leave_days: 21,
    work_arrangement: 'Hybrid',
    decision_deadline: validDeadlineInput,
    pros: 'Strong product ownership',
    concerns: 'Two office days each week',
};

const validRequest: SaveOfferEvaluationRequest = {
    ratings: {
        career_growth: 5,
        company_culture_fit: 4,
        work_life_balance: 3,
        compensation: 4,
    },
    details: validDetails,
};

const createEvaluation = (
    jobId: number,
    ratings: OfferEvaluation['ratings'],
    decisionDeadline: string
): OfferEvaluation => ({
    job_id: jobId,
    ratings,
    details: { ...validDetails, decision_deadline: decisionDeadline },
});

describe('offer evaluation', () => {
    test('calculates an equal-weight percentage from the four ratings', () => {
        expect(calculateOfferDecisionScore(validRequest.ratings)).toBe(80);
        expect(calculateOfferDecisionScore(DEFAULT_OFFER_DECISION_VALUES)).toBe(60);
    });

    test('creates independent neutral evaluations with SGD as the draft currency', () => {
        const first = createDefaultOfferEvaluation(11);
        const second = createDefaultOfferEvaluation(12);

        expect(first).toEqual({
            job_id: 11,
            ratings: DEFAULT_OFFER_DECISION_VALUES,
            details: DEFAULT_OFFER_DETAILS,
        });
        expect(DEFAULT_OFFER_DETAILS).toEqual({
            currency: 'SGD',
            monthly_base_salary: null,
            bonus: '',
            annual_leave_days: null,
            work_arrangement: '',
            decision_deadline: '',
            pros: '',
            concerns: '',
        });
        expect(first.ratings).not.toBe(DEFAULT_OFFER_DECISION_VALUES);
        expect(first.details).not.toBe(DEFAULT_OFFER_DETAILS);
        expect(first.ratings).not.toBe(second.ratings);
        expect(first.details).not.toBe(second.details);
    });

    test('updates one rating without mutating the original object', () => {
        const original = { ...DEFAULT_OFFER_DECISION_VALUES };
        const updated = updateOfferDecisionValue(original, 'company_culture_fit', 5);

        expect(updated).toEqual({ ...DEFAULT_OFFER_DECISION_VALUES, company_culture_fit: 5 });
        expect(original).toEqual(DEFAULT_OFFER_DECISION_VALUES);
        expect(updated).not.toBe(original);
    });

    test('normalizes optional text and the local decision deadline without changing numeric values', () => {
        expect(
            normalizeOfferDetails({
                ...validDetails,
                currency: ' usd ',
                bonus: '  15% target ',
                pros: '  Strong product ownership  ',
            })
        ).toEqual({
            ...validDetails,
            currency: 'USD',
            bonus: '15% target',
            decision_deadline: validDeadlineTimestamp,
            pros: 'Strong product ownership',
        });
    });

    test('formats stored timestamps for the shared local date-time input', () => {
        expect(toDatetimeLocalInputValue(validDeadlineTimestamp)).toBe(validDeadlineInput);
    });

    test('accepts every optional detail as empty and accepts zero monthly salary', () => {
        const validation = validateOfferEvaluation(
            {
                ratings: DEFAULT_OFFER_DECISION_VALUES,
                details: {
                    currency: 'SGD',
                    monthly_base_salary: 0,
                    bonus: '',
                    annual_leave_days: 0,
                    work_arrangement: '',
                    decision_deadline: validDeadlineInput,
                    pros: '',
                    concerns: '',
                },
            },
            '2026-07-18T08:00:00.000Z'
        );

        expect(validation).toEqual({
            isValid: true,
            values: {
                ratings: DEFAULT_OFFER_DECISION_VALUES,
                details: {
                    currency: 'SGD',
                    monthly_base_salary: 0,
                    bonus: '',
                    annual_leave_days: 0,
                    work_arrangement: '',
                    decision_deadline: validDeadlineTimestamp,
                    pros: '',
                    concerns: '',
                },
            },
        });
    });

    test('accepts a decision deadline at the application timestamp and normalizes it for the API', () => {
        expect(validateOfferEvaluation(validRequest, validDeadlineTimestamp)).toEqual({
            isValid: true,
            values: {
                ...validRequest,
                details: { ...validDetails, decision_deadline: validDeadlineTimestamp },
            },
        });
    });

    test.each([
        {
            name: 'missing currency',
            request: { ...validRequest, details: { ...validDetails, currency: '   ' } },
            field: 'currency',
            message: 'Currency is required.',
        },
        {
            name: 'missing monthly salary',
            request: { ...validRequest, details: { ...validDetails, monthly_base_salary: null } },
            field: 'monthly_base_salary',
            message: 'Monthly base salary is required.',
        },
        {
            name: 'missing decision deadline',
            request: { ...validRequest, details: { ...validDetails, decision_deadline: '' } },
            field: 'decision_deadline',
            message: 'Decision deadline is required.',
        },
        {
            name: 'invalid currency',
            request: { ...validRequest, details: { ...validDetails, currency: 'Singapore dollars' } },
            field: 'currency',
            message: 'Currency must be a three-letter code such as SGD or USD.',
        },
        {
            name: 'negative monthly salary',
            request: { ...validRequest, details: { ...validDetails, monthly_base_salary: -1 } },
            field: 'monthly_base_salary',
            message: 'Monthly base salary must be a whole number from 0 to 1000000000.',
        },
        {
            name: 'fractional monthly salary',
            request: { ...validRequest, details: { ...validDetails, monthly_base_salary: 1.5 } },
            field: 'monthly_base_salary',
            message: 'Monthly base salary must be a whole number from 0 to 1000000000.',
        },
        {
            name: 'negative annual leave',
            request: { ...validRequest, details: { ...validDetails, annual_leave_days: -1 } },
            field: 'annual_leave_days',
            message: 'Annual leave must be a whole number from 0 to 365.',
        },
        {
            name: 'fractional annual leave',
            request: { ...validRequest, details: { ...validDetails, annual_leave_days: 1.5 } },
            field: 'annual_leave_days',
            message: 'Annual leave must be a whole number from 0 to 365.',
        },
        {
            name: 'overlong bonus',
            request: {
                ...validRequest,
                details: { ...validDetails, bonus: 'x'.repeat(OFFER_DETAILS_MAX_LENGTHS.bonus + 1) },
            },
            field: 'bonus',
            message: `Bonus must be ${OFFER_DETAILS_MAX_LENGTHS.bonus} characters or fewer.`,
        },
        {
            name: 'invalid arrangement',
            request: {
                ...validRequest,
                details: { ...validDetails, work_arrangement: 'Sometimes remote' },
            },
            field: 'work_arrangement',
            message: 'Select a valid work arrangement.',
        },
        {
            name: 'impossible deadline',
            request: { ...validRequest, details: { ...validDetails, decision_deadline: '2026-02-30T10:00' } },
            field: 'decision_deadline',
            message: 'Please enter a valid decision deadline.',
        },
        {
            name: 'earlier deadline',
            request: { ...validRequest, details: { ...validDetails, decision_deadline: '2026-07-17T23:59' } },
            field: 'decision_deadline',
            message: 'Decision deadline cannot be earlier than the application date.',
        },
        {
            name: 'overlong concerns',
            request: {
                ...validRequest,
                details: { ...validDetails, concerns: 'x'.repeat(OFFER_DETAILS_MAX_LENGTHS.notes + 1) },
            },
            field: 'concerns',
            message: `Concerns must be ${OFFER_DETAILS_MAX_LENGTHS.notes} characters or fewer.`,
        },
        {
            name: 'out-of-range rating',
            request: { ...validRequest, ratings: { ...validRequest.ratings, company_culture_fit: 6 } },
            field: 'ratings',
            message: 'Ratings must be whole numbers from 1 to 5.',
        },
    ])('rejects $name with a field-specific error', ({ request, field, message }) => {
        const validation = validateOfferEvaluation(request as SaveOfferEvaluationRequest, '2026-07-18T08:00:00.000Z');

        expect(validation).toEqual({ isValid: false, errors: { [field]: message } });
    });

    test('rejects a partially entered decision deadline reported by native input validity', () => {
        const validation = validateOfferEvaluation(validRequest, '2026-07-18T08:00:00.000Z', true);

        expect(validation).toEqual({
            isValid: false,
            errors: { decision_deadline: 'Please enter a valid decision deadline.' },
        });
    });

    test('rejects malformed monthly salary input reported by native input validity', () => {
        const request = {
            ...validRequest,
            details: { ...validRequest.details, monthly_base_salary: null },
        };
        const validation = validateOfferEvaluation(request, '2026-07-18T08:00:00.000Z', false, true);

        expect(validation).toEqual({
            isValid: false,
            errors: { monthly_base_salary: 'Please enter a valid monthly base salary.' },
        });
    });

    test('compares every rating and detail field without using object identity', () => {
        const first = createEvaluation(11, validRequest.ratings, validDeadlineTimestamp);
        const clone = { ...first, ratings: { ...first.ratings }, details: { ...first.details } };

        expect(offerEvaluationsAreEqual(first, clone)).toBe(true);
        expect(
            offerEvaluationsAreEqual(first, {
                ...clone,
                details: { ...clone.details, decision_deadline: toDatetimeLocalInputValue(validDeadlineTimestamp) },
            })
        ).toBe(true);
        expect(
            offerEvaluationsAreEqual(first, {
                ...clone,
                details: { ...clone.details, monthly_base_salary: 11000 },
            })
        ).toBe(false);
        expect(
            offerEvaluationsAreEqual(first, { ...clone, ratings: { ...clone.ratings, company_culture_fit: 5 } })
        ).toBe(false);
    });
});
