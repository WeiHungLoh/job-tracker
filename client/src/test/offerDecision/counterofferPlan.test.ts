import {
    buildCounterofferRequestedChanges,
    buildCounterofferConclusion,
    calculateCounterofferPlanResult,
    createCounterofferPlanFromEvaluation,
    formatFitRatingDifference,
    formatRatingDifference,
    validateCounterofferPlan,
} from '../../pages/offerDecision/counteroffer/counterofferPlan';
import type { CounterofferPlan, OfferDecisionApplication, OfferEvaluation } from '../../pages/offerDecision/models';

const currentEvaluation: OfferEvaluation = {
    job_id: 11,
    ratings: {
        career_growth: 4,
        company_culture_fit: 4,
        work_life_balance: 3,
        compensation: 4,
    },
    details: {
        currency: 'SGD',
        monthly_base_salary: 10000,
        bonus: '10% target',
        annual_leave_days: 20,
        work_arrangement: 'Hybrid',
        decision_deadline: '2099-08-15T10:00:00.000Z',
        pros: 'Strong ownership',
        concerns: 'Two office days',
    },
};

const currentApplication: OfferDecisionApplication = {
    job_id: 11,
    company_name: 'Acme',
    job_title: 'Engineer',
    job_status: 'Offer',
    application_date: '2026-07-01T10:00:00.000Z',
    evaluation: currentEvaluation,
    has_counteroffer_plan: false,
};

const createPlan = (changes: Partial<CounterofferPlan> = {}): CounterofferPlan => ({
    monthly_base_salary: 11000,
    bonus: '10% target',
    annual_leave_days: 20,
    work_arrangement: 'Hybrid',
    ratings: {
        career_growth: 4,
        company_culture_fit: 4,
        work_life_balance: 4,
        compensation: 4,
    },
    ...changes,
});

const createOtherOffer = (companyName: string, jobId: number, ratings: OfferEvaluation['ratings']) => ({
    ...currentApplication,
    job_id: jobId,
    company_name: companyName,
    evaluation: {
        ...currentEvaluation,
        job_id: jobId,
        ratings,
        details: {
            ...currentEvaluation.details,
            decision_deadline: '2099-09-01T10:00:00.000Z',
        },
    },
});

describe('counteroffer plan calculations and validation', () => {
    test('prefills the Ideal offer from every current term and rating without evaluation-only fields', () => {
        expect(createCounterofferPlanFromEvaluation(currentEvaluation)).toEqual({
            monthly_base_salary: 10000,
            bonus: '10% target',
            annual_leave_days: 20,
            work_arrangement: 'Hybrid',
            ratings: {
                career_growth: 4,
                company_culture_fit: 4,
                work_life_balance: 3,
                compensation: 4,
            },
        });
    });

    test.each([
        [3, 4, '+1 rating point'],
        [3, 5, '+2 rating points'],
        [4, 3, '−1 rating point'],
        [4, 4, 'No change'],
    ])('formats an individual %s to %s rating change unambiguously', (current, ideal, expected) => {
        expect(formatRatingDifference(current, ideal)).toBe(expected);
    });

    test.each([
        [70, 80, '+10 percentage points'],
        [80, 75, '−5 percentage points'],
        [79, 80, '+1 percentage point'],
        [75, 75, 'No change'],
    ])('formats an overall %s to %s fit change unambiguously', (current, ideal, expected) => {
        expect(formatFitRatingDifference(current, ideal)).toBe(expected);
    });

    test('calculates Current and Ideal Fit ratings from ratings only', () => {
        const result = calculateCounterofferPlanResult(currentEvaluation, createPlan());

        expect(result).toEqual({
            currentFitRating: 75,
            idealFitRating: 80,
            difference: 5,
        });
        expect(
            calculateCounterofferPlanResult(
                currentEvaluation,
                createPlan({ monthly_base_salary: 50000, bonus: 'Very large bonus' })
            )
        ).toEqual(result);
    });

    test('builds requested offer-field changes in a fixed order with Current and Ideal values only', () => {
        expect(
            buildCounterofferRequestedChanges(
                currentEvaluation,
                createPlan({
                    monthly_base_salary: 11500,
                    bonus: ' 15% target ',
                    annual_leave_days: 22,
                    work_arrangement: 'Remote',
                })
            )
        ).toEqual([
            {
                key: 'monthly_base_salary',
                label: 'Monthly base salary',
                currentValue: 'SGD 10,000',
                idealValue: 'SGD 11,500',
            },
            {
                key: 'bonus',
                label: 'Bonus',
                currentValue: '10% target',
                idealValue: '15% target',
            },
            {
                key: 'annual_leave_days',
                label: 'Annual leave',
                currentValue: '20 days',
                idealValue: '22 days',
            },
            {
                key: 'work_arrangement',
                label: 'Work arrangement',
                currentValue: 'Hybrid',
                idealValue: 'Remote',
            },
        ]);
    });

    test('formats salary and annual-leave values without treating missing leave as zero', () => {
        expect(
            buildCounterofferRequestedChanges(
                currentEvaluation,
                createPlan({
                    monthly_base_salary: 9500,
                    annual_leave_days: 18,
                })
            )
        ).toEqual([
            {
                key: 'monthly_base_salary',
                label: 'Monthly base salary',
                currentValue: 'SGD 10,000',
                idealValue: 'SGD 9,500',
            },
            {
                key: 'annual_leave_days',
                label: 'Annual leave',
                currentValue: '20 days',
                idealValue: '18 days',
            },
        ]);

        expect(
            buildCounterofferRequestedChanges(
                {
                    ...currentEvaluation,
                    details: { ...currentEvaluation.details, annual_leave_days: null },
                },
                createPlan({ monthly_base_salary: 10000, annual_leave_days: 1 })
            )
        ).toEqual([
            {
                key: 'annual_leave_days',
                label: 'Annual leave',
                currentValue: '-',
                idealValue: '1 day',
            },
        ]);

        expect(
            buildCounterofferRequestedChanges(
                currentEvaluation,
                createPlan({ monthly_base_salary: 10000, annual_leave_days: null })
            )
        ).toEqual([
            {
                key: 'annual_leave_days',
                label: 'Annual leave',
                currentValue: '20 days',
                idealValue: '-',
            },
        ]);

        expect(
            buildCounterofferRequestedChanges(
                currentEvaluation,
                createPlan({ monthly_base_salary: 10000, annual_leave_days: 21 })
            )
        ).toEqual([
            {
                key: 'annual_leave_days',
                label: 'Annual leave',
                currentValue: '20 days',
                idealValue: '21 days',
            },
        ]);
    });

    test('treats bonus as trimmed text and formats both empty-value transitions', () => {
        const longBonus = 'Performance-based-bonus-with-an-unusually-long-unbroken-value';

        expect(
            buildCounterofferRequestedChanges(
                {
                    ...currentEvaluation,
                    details: { ...currentEvaluation.details, bonus: '   ' },
                },
                createPlan({ monthly_base_salary: 10000, bonus: longBonus })
            )
        ).toEqual([
            {
                key: 'bonus',
                label: 'Bonus',
                currentValue: '-',
                idealValue: longBonus,
            },
        ]);

        expect(
            buildCounterofferRequestedChanges(
                currentEvaluation,
                createPlan({ monthly_base_salary: 10000, bonus: '   ' })
            )
        ).toEqual([
            {
                key: 'bonus',
                label: 'Bonus',
                currentValue: '10% target',
                idealValue: '-',
            },
        ]);

        expect(
            buildCounterofferRequestedChanges(
                {
                    ...currentEvaluation,
                    details: { ...currentEvaluation.details, bonus: ' 10% target ' },
                },
                createPlan({ monthly_base_salary: 10000, bonus: '10% target' })
            )
        ).toEqual([]);
    });

    test('formats both work-arrangement empty-value transitions without a numeric difference', () => {
        expect(
            buildCounterofferRequestedChanges(
                {
                    ...currentEvaluation,
                    details: { ...currentEvaluation.details, work_arrangement: '' },
                },
                createPlan({ monthly_base_salary: 10000, work_arrangement: 'Hybrid' })
            )
        ).toEqual([
            {
                key: 'work_arrangement',
                label: 'Work arrangement',
                currentValue: 'Not specified',
                idealValue: 'Hybrid',
            },
        ]);

        expect(
            buildCounterofferRequestedChanges(
                currentEvaluation,
                createPlan({ monthly_base_salary: 10000, work_arrangement: '' })
            )
        ).toEqual([
            {
                key: 'work_arrangement',
                label: 'Work arrangement',
                currentValue: 'Hybrid',
                idealValue: 'Not specified',
            },
        ]);
    });

    test('returns no requested offer-field changes when only ratings differ', () => {
        expect(
            buildCounterofferRequestedChanges(currentEvaluation, {
                ...createCounterofferPlanFromEvaluation(currentEvaluation),
                ratings: createPlan().ratings,
            })
        ).toEqual([]);
    });

    test('blocks an unchanged Ideal offer and a lower fit while allowing an equal-fit trade-off', () => {
        const unchanged = createCounterofferPlanFromEvaluation(currentEvaluation);
        const lowerFit = createPlan({
            ratings: {
                career_growth: 3,
                company_culture_fit: 3,
                work_life_balance: 3,
                compensation: 3,
            },
        });

        expect(validateCounterofferPlan(unchanged, currentEvaluation)).toEqual({
            isValid: false,
            errors: {
                unchanged: 'Change at least one term or rating for the Ideal offer.',
            },
        });
        expect(validateCounterofferPlan(lowerFit, currentEvaluation)).toMatchObject({
            isValid: false,
            errors: {
                fit_rating:
                    'Your Ideal offer has a lower fit rating than your current offer. Adjust the ratings before saving. Current offer: 75%. Ideal offer: 60%.',
            },
        });

        const equalFitTradeOff = createPlan({
            ratings: {
                career_growth: 4,
                company_culture_fit: 4,
                work_life_balance: 5,
                compensation: 2,
            },
        });
        expect(validateCounterofferPlan(equalFitTradeOff, currentEvaluation)).toEqual({
            isValid: true,
            request: equalFitTradeOff,
        });
    });

    test('validates Ideal offer fields with the shared configured bounds', () => {
        const invalid = createPlan({
            monthly_base_salary: -1,
            bonus: 'x'.repeat(201),
            annual_leave_days: 366,
            work_arrangement: 'Unsupported' as CounterofferPlan['work_arrangement'],
            ratings: { ...createPlan().ratings, compensation: 2.5 as never },
        });

        expect(validateCounterofferPlan(invalid, currentEvaluation)).toMatchObject({
            isValid: false,
            errors: {
                monthly_base_salary: 'Monthly base salary must be a whole number from 0 to 1000000000.',
                bonus: 'Bonus must be 200 characters or fewer.',
                annual_leave_days: 'Annual leave must be a whole number from 0 to 365.',
                work_arrangement: 'Select a valid work arrangement.',
                ratings: 'Ratings must be whole numbers from 1 to 5.',
            },
        });
    });

    test('writes conclusions for highest, another higher, ties, no comparison and unchanged fit', () => {
        const higherOffer = createOtherOffer('Microsoft', 12, {
            career_growth: 5,
            company_culture_fit: 4,
            work_life_balance: 4,
            compensation: 4,
        });
        const tiedOffer = createOtherOffer('Microsoft', 12, {
            career_growth: 4,
            company_culture_fit: 4,
            work_life_balance: 4,
            compensation: 4,
        });

        expect(buildCounterofferConclusion(currentApplication, 85, [tiedOffer])).toBe(
            'Your Ideal offer would have the highest fit rating among your currently evaluated offers at 85%.'
        );
        expect(buildCounterofferConclusion(currentApplication, 78, [higherOffer])).toBe(
            'Your Ideal offer would improve the fit rating from 75% to 78%. Microsoft would still have the higher fit rating at 85%.'
        );
        expect(buildCounterofferConclusion(currentApplication, 80, [tiedOffer])).toBe(
            'Your Ideal offer would give Acme and Microsoft the same fit rating of 80%.'
        );
        expect(buildCounterofferConclusion(currentApplication, 80, [])).toBe(
            'Your Ideal offer would change the fit rating from 75% to 80%. Add another evaluated offer to compare them.'
        );
        expect(buildCounterofferConclusion(currentApplication, 75, [higherOffer])).toBe(
            'Your Ideal offer has the same fit rating as the current offer.'
        );
    });

    test('handles multiple tied offers without awkward repeated names', () => {
        const microsoft = createOtherOffer('Microsoft', 12, {
            career_growth: 4,
            company_culture_fit: 4,
            work_life_balance: 4,
            compensation: 4,
        });
        const google = createOtherOffer('Google', 13, {
            career_growth: 4,
            company_culture_fit: 4,
            work_life_balance: 4,
            compensation: 4,
        });

        expect(buildCounterofferConclusion(currentApplication, 80, [microsoft, google])).toBe(
            'Your Ideal offer would give Acme, Microsoft and Google the same fit rating of 80%.'
        );
    });
});
