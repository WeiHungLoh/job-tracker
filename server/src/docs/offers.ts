import type { OpenAPIV3 } from 'openapi-types';
import {
    errorResponse,
    idParameter,
    jsonBody,
    jsonResponse,
    noContent,
    positiveId,
    protectedErrors,
    schemaRef,
    timestamp,
} from './common.js';

const tags = ['Offers'];
const filterValues = ['Offers to Evaluate', 'Evaluated Offers', 'Expired Evaluated Offers', 'Previous Evaluations'];
const filters: OpenAPIV3.ParameterObject = {
    name: 'filters',
    in: 'query',
    style: 'form',
    explode: true,
    description: 'Repeat to select multiple groups. Omit to include every supported group.',
    schema: { type: 'array', items: { type: 'string', enum: filterValues } },
};
const invalid = errorResponse('Invalid application ID, fields or counteroffer ratings.');
const notFound = errorResponse('Offer evaluation or counteroffer plan not found for this user.');

export const offerPaths: OpenAPIV3.PathsObject = {
    '/offer-decisions': {
        get: {
            tags,
            summary: 'List active offers',
            description: 'Returns applications, evaluations and counteroffer plans for offer comparison.',
            parameters: [filters],
            responses: {
                ...protectedErrors,
                200: jsonResponse('Applications and saved evaluations/plans.', schemaRef('OfferWorkspace')),
                422: invalid,
            },
        },
        delete: {
            tags,
            summary: 'Delete all active evaluations',
            description: 'Removes active offer evaluations and their counteroffer plans while keeping applications.',
            responses: { ...protectedErrors, 204: noContent },
        },
    },
    '/offer-decisions/archived': {
        get: {
            tags,
            summary: 'List archived offers',
            description: 'Returns archived applications with their saved evaluations and counteroffer plans.',
            parameters: [
                { ...filters, schema: { type: 'array', items: { type: 'string', enum: filterValues.slice(1) } } },
            ],
            responses: {
                ...protectedErrors,
                200: jsonResponse('Archived evaluations and plans.', schemaRef('OfferWorkspace')),
                422: invalid,
            },
        },
        delete: {
            tags,
            summary: 'Delete all archived evaluations',
            description: 'Removes archived offer evaluations and their counteroffer plans while keeping applications.',
            responses: { ...protectedErrors, 204: noContent },
        },
    },
    '/offer-decisions/{jobId}': {
        parameters: [idParameter('jobId')],
        put: {
            tags,
            summary: 'Save an offer evaluation',
            requestBody: jsonBody('SaveOfferEvaluation'),
            description: 'Creates or updates an evaluation for an active Offer, Accepted or Declined application.',
            responses: {
                ...protectedErrors,
                204: noContent,
                409: errorResponse('Application unavailable/ineligible, or counteroffer deletion must be confirmed.'),
                422: invalid,
            },
        },
        delete: {
            tags,
            summary: 'Delete an offer evaluation',
            description: 'Removes the evaluation and its counteroffer plan while keeping the application.',
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/offer-decisions/{jobId}/counteroffer-plan': {
        parameters: [idParameter('jobId')],
        get: {
            tags,
            summary: 'Get a counteroffer plan',
            description: 'Returns the saved proposed terms and ratings for an evaluated offer.',
            responses: {
                ...protectedErrors,
                200: jsonResponse('Saved plan.', schemaRef('CounterofferPlan')),
                404: notFound,
                422: invalid,
            },
        },
        put: {
            tags,
            summary: 'Save a counteroffer plan',
            requestBody: jsonBody('CounterofferPlan'),
            description:
                'Proposes improved terms for an evaluated active Offer before its decision deadline. Ratings cannot be lower than the current offer.',
            responses: {
                ...protectedErrors,
                204: noContent,
                404: notFound,
                409: errorResponse('Application ineligible or decision window expired.'),
                422: invalid,
            },
        },
        delete: {
            tags,
            summary: 'Delete a counteroffer plan',
            description: 'Removes the plan while keeping the offer evaluation and application.',
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
};

const salary: OpenAPIV3.SchemaObject = { type: 'integer', minimum: 0, maximum: 1_000_000_000, example: 6000 };
const bonus: OpenAPIV3.SchemaObject = {
    type: 'string',
    maxLength: 200,
    example: '1 month',
    description: 'Trimmed text.',
};
const annualLeave: OpenAPIV3.SchemaObject = { type: 'integer', minimum: 0, maximum: 365, nullable: true, example: 18 };
const workArrangement: OpenAPIV3.SchemaObject = {
    type: 'string',
    enum: ['', 'Remote', 'Hybrid', 'On-site', 'Flexible'],
    example: 'Hybrid',
};
const rating: OpenAPIV3.SchemaObject = { type: 'integer', minimum: 1, maximum: 5, example: 3 };

export const offerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
    OfferRatings: {
        type: 'object',
        required: ['career_growth', 'company_culture_fit', 'work_life_balance', 'compensation'],
        properties: {
            career_growth: rating,
            company_culture_fit: rating,
            work_life_balance: rating,
            compensation: rating,
        },
    },
    OfferDetails: {
        type: 'object',
        required: [
            'currency',
            'monthly_base_salary',
            'bonus',
            'annual_leave_days',
            'work_arrangement',
            'decision_deadline',
            'pros',
            'concerns',
        ],
        properties: {
            currency: { type: 'string', pattern: '^[A-Z]{3}$', example: 'SGD' },
            monthly_base_salary: salary,
            bonus,
            annual_leave_days: annualLeave,
            work_arrangement: workArrangement,
            decision_deadline: {
                ...timestamp,
                description: 'UTC ISO timestamp with milliseconds. Must not precede the application date.',
            },
            pros: { type: 'string', maxLength: 1000, example: '', description: 'Trimmed text.' },
            concerns: { type: 'string', maxLength: 1000, example: '', description: 'Trimmed text.' },
        },
    },
    SaveOfferEvaluation: {
        type: 'object',
        example: {
            ratings: { career_growth: 3, company_culture_fit: 3, work_life_balance: 3, compensation: 3 },
            details: {
                currency: 'SGD',
                monthly_base_salary: 6000,
                bonus: '1 month',
                annual_leave_days: 18,
                work_arrangement: 'Hybrid',
                decision_deadline: '2027-01-22T10:00:00.000Z',
                pros: 'Good learning opportunities.',
                concerns: 'Long commute.',
            },
            deleteCounterofferPlan: false,
        },
        required: ['ratings', 'details'],
        properties: {
            ratings: schemaRef('OfferRatings'),
            details: schemaRef('OfferDetails'),
            deleteCounterofferPlan: {
                type: 'boolean',
                default: false,
                description: 'Set to true to remove a saved counteroffer plan when updated ratings exceed it.',
            },
        },
    },
    OfferEvaluation: {
        type: 'object',
        properties: { job_id: positiveId, ratings: schemaRef('OfferRatings'), details: schemaRef('OfferDetails') },
    },
    CounterofferPlan: {
        type: 'object',
        example: {
            monthly_base_salary: 6500,
            bonus: '1 month',
            annual_leave_days: 21,
            work_arrangement: 'Hybrid',
            ratings: { career_growth: 3, company_culture_fit: 3, work_life_balance: 4, compensation: 4 },
        },
        required: ['monthly_base_salary', 'bonus', 'annual_leave_days', 'work_arrangement', 'ratings'],
        properties: {
            monthly_base_salary: salary,
            bonus,
            annual_leave_days: annualLeave,
            work_arrangement: workArrangement,
            ratings: schemaRef('OfferRatings'),
        },
    },
    OfferWorkspace: {
        type: 'object',
        properties: {
            applications: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        job_id: positiveId,
                        company_name: { type: 'string' },
                        job_title: { type: 'string' },
                        job_status: schemaRef('JobStatus'),
                        application_date: timestamp,
                        evaluation: { type: 'object', nullable: true, allOf: [schemaRef('OfferEvaluation')] },
                        has_counteroffer_plan: { type: 'boolean' },
                        counteroffer_plan: { type: 'object', nullable: true, allOf: [schemaRef('CounterofferPlan')] },
                    },
                },
            },
        },
    },
};
