import formatDate from '../../helper/dateFormatter';
import { escapeCsvFormula } from '../../helper/csvExport';
import { calculateOfferDecisionScore } from './offerEvaluation';
import { OFFER_DECISION_FILTER_CONFIG } from './offerDecisionConfig';
import type { OfferDecisionApplication, OfferDecisionFilter, OfferDecisionGroups } from './models';

const OFFER_EVALUATION_CSV_HEADERS = [
    'Company',
    'Job Title',
    'Status',
    'Application Date',
    'Currency',
    'Monthly Base Salary',
    'Bonus',
    'Annual Leave Days',
    'Work Arrangement',
    'Decision Deadline',
    'Pros',
    'Concerns',
    'Career Growth Rating',
    'Company/Culture Fit Rating',
    'Work-Life Balance Rating',
    'Compensation Rating',
    'Fit Rating (%)',
] as const;

const OFFER_EVALUATION_CSV_SEPARATOR = OFFER_EVALUATION_CSV_HEADERS.map(() => '');

const COUNTEROFFER_PLAN_CSV_HEADERS = [
    'Company',
    'Job Title',
    'Status',
    'Current Currency',
    'Ideal Currency',
    'Current Monthly Base Salary',
    'Ideal Monthly Base Salary',
    'Current Bonus',
    'Ideal Bonus',
    'Current Annual Leave Days',
    'Ideal Annual Leave Days',
    'Current Work Arrangement',
    'Ideal Work Arrangement',
    'Current Career Growth Rating',
    'Ideal Career Growth Rating',
    'Current Company/Culture Fit Rating',
    'Ideal Company/Culture Fit Rating',
    'Current Work-Life Balance Rating',
    'Ideal Work-Life Balance Rating',
    'Current Compensation Rating',
    'Ideal Compensation Rating',
    'Current Fit Rating (%)',
    'Ideal Fit Rating (%)',
    'Overall Fit Rating Change',
] as const;

const EXPORTABLE_FILTERS = (Object.keys(OFFER_DECISION_FILTER_CONFIG) as OfferDecisionFilter[]).filter(
    (filter) => OFFER_DECISION_FILTER_CONFIG[filter].exportable
);

const textValue = (value: string): string => String(escapeCsvFormula(value || 'N/A')).replaceAll('"', '""');

const dateValue = (value: string): string => (value ? formatDate(value).formattedDate : 'N/A');

const createEvaluationRow = (application: OfferDecisionApplication): Array<string | number> => {
    const evaluation = application.evaluation;
    if (!evaluation) {
        return [];
    }

    return [
        textValue(application.company_name),
        textValue(application.job_title),
        textValue(application.job_status),
        dateValue(application.application_date),
        textValue(evaluation.details.currency),
        evaluation.details.monthly_base_salary ?? 'N/A',
        textValue(evaluation.details.bonus),
        evaluation.details.annual_leave_days ?? 'N/A',
        textValue(evaluation.details.work_arrangement),
        dateValue(evaluation.details.decision_deadline),
        textValue(evaluation.details.pros),
        textValue(evaluation.details.concerns),
        evaluation.ratings.career_growth,
        evaluation.ratings.company_culture_fit,
        evaluation.ratings.work_life_balance,
        evaluation.ratings.compensation,
        calculateOfferDecisionScore(evaluation.ratings),
    ];
};

const createCounterofferRow = (application: OfferDecisionApplication): Array<string | number> => {
    const evaluation = application.evaluation;
    const plan = application.counteroffer_plan;
    if (!evaluation) {
        return [];
    }

    const currentFitRating = calculateOfferDecisionScore(evaluation.ratings);
    const idealFitRating = plan ? calculateOfferDecisionScore(plan.ratings) : null;
    const difference = idealFitRating === null ? null : idealFitRating - currentFitRating;
    const fitChange =
        difference === null
            ? 'N/A'
            : difference === 0
            ? 'No change'
            : `${difference > 0 ? 'Increase' : 'Decrease'} by ${Math.abs(difference)} ${
                  Math.abs(difference) === 1 ? 'percentage point' : 'percentage points'
              }`;

    return [
        textValue(application.company_name),
        textValue(application.job_title),
        textValue(application.job_status),
        textValue(evaluation.details.currency),
        plan ? textValue(evaluation.details.currency) : 'N/A',
        evaluation.details.monthly_base_salary ?? 'N/A',
        plan?.monthly_base_salary ?? 'N/A',
        textValue(evaluation.details.bonus),
        plan ? textValue(plan.bonus) : 'N/A',
        evaluation.details.annual_leave_days ?? 'N/A',
        plan?.annual_leave_days ?? 'N/A',
        textValue(evaluation.details.work_arrangement),
        plan ? textValue(plan.work_arrangement) : 'N/A',
        evaluation.ratings.career_growth,
        plan?.ratings.career_growth ?? 'N/A',
        evaluation.ratings.company_culture_fit,
        plan?.ratings.company_culture_fit ?? 'N/A',
        evaluation.ratings.work_life_balance,
        plan?.ratings.work_life_balance ?? 'N/A',
        evaluation.ratings.compensation,
        plan?.ratings.compensation ?? 'N/A',
        currentFitRating,
        idealFitRating ?? 'N/A',
        fitChange,
    ];
};

export const createOfferEvaluationCsvData = (
    groups: OfferDecisionGroups,
    selectedFilters: readonly OfferDecisionFilter[]
): Array<Array<string | number>> => {
    const selectedGroups = EXPORTABLE_FILTERS.filter(
        (filter) => selectedFilters.includes(filter) && groups[filter].length > 0
    );
    if (selectedGroups.length === 0) {
        return [];
    }

    return selectedGroups.flatMap((filter, index) => {
        const applications = groups[filter];
        const applicationsWithCounterofferPlans = applications.filter((application) => application.counteroffer_plan);
        const counterofferRows =
            applicationsWithCounterofferPlans.length > 0
                ? [
                      [...OFFER_EVALUATION_CSV_SEPARATOR],
                      [`Counteroffer Plan for ${filter}`],
                      [...COUNTEROFFER_PLAN_CSV_HEADERS],
                      ...applicationsWithCounterofferPlans.map(createCounterofferRow),
                  ]
                : [];

        return [
            ...(index === 0 ? [] : [OFFER_EVALUATION_CSV_SEPARATOR]),
            [filter],
            [...OFFER_EVALUATION_CSV_HEADERS],
            ...applications.map(createEvaluationRow),
            ...counterofferRows,
        ];
    });
};
