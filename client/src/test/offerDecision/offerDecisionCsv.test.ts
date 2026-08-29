import { createOfferEvaluationCsvData } from '../../pages/offerDecision/offerDecisionCsv';
import { groupOfferDecisionApplications } from '../../pages/offerDecision/offerDecisionGrouping';
import type { CounterofferPlan, OfferDecisionApplication, OfferEvaluation } from '../../pages/offerDecision/models';

const TEST_NOW = new Date('2026-08-01T00:00:00.000Z');

const createEvaluation = (jobId: number, overrides: Partial<OfferEvaluation['details']> = {}): OfferEvaluation => ({
    job_id: jobId,
    ratings: {
        career_growth: 5,
        company_culture_fit: 4,
        work_life_balance: 3,
        compensation: 4,
    },
    details: {
        currency: 'SGD',
        monthly_base_salary: 10000,
        bonus: '',
        annual_leave_days: null,
        work_arrangement: '',
        decision_deadline: '2026-08-15T10:00:00.000Z',
        pros: '=Strong, ownership',
        concerns: 'Line one\n"Line two"',
        ...overrides,
    },
});

const createApplication = (
    jobId: number,
    jobStatus: OfferDecisionApplication['job_status'],
    evaluation: OfferEvaluation | null,
    counterofferPlan: CounterofferPlan | null = null
): OfferDecisionApplication => ({
    job_id: jobId,
    company_name: jobId === 1 ? 'Acme, Inc.' : jobId === 3 ? 'No Plan Co' : 'Beta',
    job_title: 'Engineer',
    job_status: jobStatus,
    application_date: '2026-07-01T08:00:00.000Z',
    evaluation,
    has_counteroffer_plan: counterofferPlan !== null,
    counteroffer_plan: counterofferPlan,
});

const counterofferPlan: CounterofferPlan = {
    monthly_base_salary: 12000,
    bonus: '20% target',
    annual_leave_days: 24,
    work_arrangement: 'Remote',
    ratings: {
        career_growth: 5,
        company_culture_fit: 5,
        work_life_balance: 5,
        compensation: 5,
    },
};

describe('offer evaluation CSV data', () => {
    test('omits the counteroffer table when the selected category has no counteroffer plans', () => {
        const groups = groupOfferDecisionApplications(
            [createApplication(1, 'Offer', createEvaluation(1)), createApplication(2, 'Offer', null)],
            TEST_NOW
        );
        const csvData = createOfferEvaluationCsvData(groups, ['Evaluated Offers']);

        expect(csvData).toHaveLength(3);
        expect(csvData[0]).toEqual(['Evaluated Offers']);
        expect(csvData[1][0]).toBe('Company');
        expect(csvData[1]).not.toContain('Updated Date');
        expect(csvData[2][0]).toBe('Acme, Inc.');
        expect(csvData.flat()).not.toContain('Counteroffer Plan for Evaluated Offers');
        expect(csvData.flat()).not.toContain('Offers to Evaluate');
        expect(csvData.flat()).not.toContain(2);
    });

    test('exports two selected categories as separate tables with headers and a blank separator', () => {
        const groups = groupOfferDecisionApplications(
            [
                createApplication(1, 'Offer', createEvaluation(1), counterofferPlan),
                createApplication(2, 'Accepted', createEvaluation(2)),
                createApplication(3, 'Offer', createEvaluation(3)),
            ],
            TEST_NOW
        );
        const csvData = createOfferEvaluationCsvData(groups, ['Evaluated Offers', 'Previous Evaluations']);
        const flattened = csvData.flat();

        expect(csvData.map((row) => row[0])).toEqual([
            'Evaluated Offers',
            'Company',
            'Acme, Inc.',
            'No Plan Co',
            '',
            'Counteroffer Plan for Evaluated Offers',
            'Company',
            'Acme, Inc.',
            '',
            'Previous Evaluations',
            'Company',
            'Beta',
        ]);
        expect(csvData.filter((row) => row[0] === 'Company')).toHaveLength(3);
        expect(csvData[4]).toHaveLength(csvData[1].length);
        expect(csvData[4].every((value) => value === '')).toBe(true);
        expect(flattened).toContain('Increase by 20 percentage points');
        expect(flattened).not.toContain('Counteroffer Plan for Previous Evaluations');
        const counterofferTableStart = csvData.findIndex((row) => row[0] === 'Counteroffer Plan for Evaluated Offers');
        const previousEvaluationTableStart = csvData.findIndex((row) => row[0] === 'Previous Evaluations');
        expect(csvData.slice(counterofferTableStart, previousEvaluationTableStart).flat()).not.toContain('No Plan Co');
        expect(flattened).toContain("'=Strong, ownership");
        expect(flattened).toContain('Line one\n""Line two""');
        expect(flattened).not.toContain('job_id');
    });

    test('exports three non-empty categories in canonical order and skips empty selected categories', () => {
        const groups = groupOfferDecisionApplications(
            [
                createApplication(1, 'Offer', createEvaluation(1)),
                createApplication(2, 'Offer', createEvaluation(2, { decision_deadline: '2026-07-01T10:00:00.000Z' })),
                createApplication(3, 'Accepted', createEvaluation(3)),
            ],
            TEST_NOW
        );
        const csvData = createOfferEvaluationCsvData(groups, [
            'Previous Evaluations',
            'Offers to Evaluate',
            'Expired Evaluated Offers',
            'Evaluated Offers',
        ]);

        expect(csvData.filter((row) => row.every((value) => value === ''))).toHaveLength(2);
        expect(csvData.filter((row) => row[0] === 'Company')).toHaveLength(3);
        expect(csvData.filter((row) => row.length === 1 && typeof row[0] === 'string').map((row) => row[0])).toEqual([
            'Evaluated Offers',
            'Expired Evaluated Offers',
            'Previous Evaluations',
        ]);
        expect(csvData.flat()).not.toContain('Offers to Evaluate');

        const onlyPrevious = createOfferEvaluationCsvData(groups, ['Offers to Evaluate', 'Previous Evaluations']);
        expect(onlyPrevious[0]).toEqual(['Previous Evaluations']);
        expect(onlyPrevious.filter((row) => row[0] === 'Company')).toHaveLength(1);
        expect(onlyPrevious.filter((row) => row.every((value) => value === ''))).toHaveLength(0);
    });

    test('returns no export rows when only Offers to Evaluate is selected', () => {
        const groups = groupOfferDecisionApplications([createApplication(2, 'Offer', null)], TEST_NOW);

        expect(createOfferEvaluationCsvData(groups, ['Offers to Evaluate'])).toEqual([]);
    });
});
