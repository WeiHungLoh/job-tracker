import type { OpenAPIV3 } from 'openapi-types';
import {
    count,
    errorResponse,
    idParameter,
    jsonBody,
    jsonResponse,
    noContent,
    positiveId,
    protectedErrors,
    schemaRef,
    textResponse,
    timestamp,
} from './common.js';

const tags = ['Applications'];
const jobStatuses: OpenAPIV3.ParameterObject = {
    name: 'jobStatuses',
    in: 'query',
    style: 'form',
    explode: true,
    description: 'Repeat the parameter to select multiple statuses. Omit it to include all statuses.',
    schema: { type: 'array', items: schemaRef('JobStatus') },
};
const invalid = errorResponse('Invalid ID or request fields.');
const notFound = errorResponse('Application not found for this user.');
const relations = jsonResponse(
    'Counts of related interviews, evaluations and counteroffer plans.',
    schemaRef('ApplicationRelations')
);
const summary = jsonResponse('Application and related-record counts.', schemaRef('ApplicationSummary'));

export const applicationPaths: OpenAPIV3.PathsObject = {
    '/job-applications': {
        get: {
            tags,
            summary: 'List active applications',
            description: 'Returns your active applications, optionally filtered by status.',
            parameters: [jobStatuses],
            responses: {
                ...protectedErrors,
                200: jsonResponse('Active applications.', { type: 'array', items: schemaRef('Application') }),
                422: invalid,
            },
        },
        post: {
            tags,
            summary: 'Create an application',
            requestBody: jsonBody('CreateApplication'),
            description: 'Adds an application. Set allowDuplicate to true to confirm a possible duplicate.',
            responses: {
                ...protectedErrors,
                201: textResponse('Successfully added a job application!'),
                409: jsonResponse('Possible duplicate application.', schemaRef('DuplicateApplication')),
                422: invalid,
            },
        },
        delete: {
            tags,
            summary: 'Delete all active applications',
            description: 'Permanently removes active applications and their related interviews and offer records.',
            responses: { ...protectedErrors, 204: noContent },
        },
    },
    '/job-applications/status-counts': {
        get: {
            tags,
            summary: 'Get dashboard status counts',
            description: 'Returns application counts grouped by status for the dashboard.',
            responses: {
                ...protectedErrors,
                200: jsonResponse('Dashboard application summary.', schemaRef('DashboardApplicationSummary')),
            },
        },
    },
    '/job-applications/summary': {
        get: {
            tags,
            summary: 'Count active application records',
            description: 'Returns totals for active applications, interviews, evaluations and counteroffer plans.',
            responses: { ...protectedErrors, 200: summary },
        },
    },
    '/job-applications/weekly-counts': {
        get: {
            tags,
            summary: 'Get weekly application counts',
            description: 'Returns application totals for the latest eight weeks in the selected time zone.',
            parameters: [
                {
                    name: 'timeZone',
                    in: 'query',
                    schema: { type: 'string', example: 'Asia/Singapore' },
                    description: 'IANA time zone used to group weeks.',
                },
            ],
            responses: {
                ...protectedErrors,
                422: invalid,
                200: jsonResponse('Weekly counts.', { type: 'array', items: schemaRef('WeeklyApplicationCount') }),
            },
        },
    },
    '/job-applications/{jobId}/relation-summary': {
        parameters: [idParameter('jobId')],
        get: {
            tags,
            summary: 'Count related application records',
            description: 'Returns interview, evaluation and counteroffer plan counts for one application.',
            responses: { ...protectedErrors, 200: relations, 404: notFound, 422: invalid },
        },
    },
    '/job-applications/{jobId}': {
        parameters: [idParameter('jobId')],
        delete: {
            tags,
            summary: 'Delete an active application',
            description: 'Permanently removes the application and its related interviews and offer records.',
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/job-applications/{jobId}/notes': {
        parameters: [idParameter('jobId')],
        patch: {
            tags,
            summary: 'Update application notes',
            description: "Replaces the application's notes. Send an empty string to clear them.",
            requestBody: jsonBody('NotesInput'),
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/job-applications/{jobId}/status': {
        parameters: [idParameter('jobId')],
        patch: {
            tags,
            summary: 'Change application status',
            requestBody: jsonBody('ApplicationStatusInput'),
            description:
                'Active interviews prevent a return to Applied. Evaluated offers must stay Offer, Accepted or Declined.',
            responses: {
                ...protectedErrors,
                204: noContent,
                404: notFound,
                409: errorResponse('Related interviews or an offer evaluation prevent this status change.'),
                422: invalid,
            },
        },
    },
    '/job-applications/{jobId}/pin': {
        parameters: [idParameter('jobId')],
        patch: {
            tags,
            summary: 'Pin or unpin an application',
            description: 'Sets whether the application is pinned.',
            requestBody: jsonBody('PinInput'),
            responses: {
                ...protectedErrors,
                200: jsonResponse('Updated pin.', schemaRef('ApplicationPin')),
                404: notFound,
                422: invalid,
            },
        },
    },
    '/job-applications/{jobId}/follow-up': {
        parameters: [idParameter('jobId')],
        put: {
            tags,
            summary: 'Mark application follow-up as sent',
            description: 'Records a follow-up for an Applied application without sending an email.',
            responses: {
                ...protectedErrors,
                200: jsonResponse('Follow-up timestamp.', {
                    type: 'object',
                    properties: { application_follow_up_sent_at: timestamp },
                }),
                404: notFound,
                422: invalid,
            },
        },
        delete: {
            tags,
            summary: 'Clear application follow-up',
            description: "Clears the application's follow-up timestamp.",
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/archived-job-applications': {
        get: {
            tags,
            summary: 'List archived applications',
            description: 'Returns your archived applications, optionally filtered by status.',
            parameters: [jobStatuses],
            responses: {
                ...protectedErrors,
                200: jsonResponse('Archived applications.', { type: 'array', items: schemaRef('ArchivedApplication') }),
                422: invalid,
            },
        },
        patch: {
            tags,
            summary: 'Archive an application',
            requestBody: jsonBody('ArchiveApplication'),
            description: 'Archives the application with its interviews and makes its offer records read-only.',
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
        delete: {
            tags,
            summary: 'Delete all archived applications',
            description: 'Permanently removes archived applications and their related interviews and offer records.',
            responses: { ...protectedErrors, 204: noContent },
        },
    },
    '/archived-job-applications/summary': {
        get: {
            tags,
            summary: 'Count archived application records',
            description: 'Returns totals for archived applications, interviews, evaluations and counteroffer plans.',
            responses: { ...protectedErrors, 200: summary },
        },
    },
    '/archived-job-applications/archive-all': {
        patch: {
            tags,
            summary: 'Archive all active applications',
            description: 'Archives all active applications and their interviews. Offer records become read-only.',
            responses: { ...protectedErrors, 204: noContent },
        },
    },
    '/archived-job-applications/unarchive-all': {
        patch: {
            tags,
            summary: 'Restore all archived applications',
            description: 'Moves all archived applications and their interviews back to active records.',
            responses: { ...protectedErrors, 204: noContent },
        },
    },
    '/archived-job-applications/{archivedJobId}': {
        parameters: [idParameter('archivedJobId')],
        delete: {
            tags,
            summary: 'Delete an archived application',
            description: 'Permanently removes the archived application and its related interviews and offer records.',
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/archived-job-applications/{archivedJobId}/restore': {
        parameters: [idParameter('archivedJobId')],
        patch: {
            tags,
            summary: 'Restore an archived application',
            description: 'Moves the application and its archived interviews back to active records.',
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/archived-job-applications/{archivedJobId}/relation-summary': {
        parameters: [idParameter('archivedJobId')],
        get: {
            tags,
            summary: 'Count related archived application records',
            description: 'Returns interview, evaluation and counteroffer plan counts for one archived application.',
            responses: { ...protectedErrors, 200: relations, 404: notFound, 422: invalid },
        },
    },
};

const applicationProperties: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {
    company_name: { type: 'string' },
    job_title: { type: 'string' },
    application_date: timestamp,
    job_status: schemaRef('JobStatus'),
    job_location: { type: 'string' },
    job_posting_url: { type: 'string' },
    notes: { type: 'string' },
    is_pinned: { type: 'boolean' },
    application_follow_up_sent_at: { ...timestamp, nullable: true },
};
const relationProperties = {
    related_interview_count: count,
    offer_evaluation_count: count,
    counteroffer_plan_count: count,
};

export const applicationSchemas: Record<string, OpenAPIV3.SchemaObject> = {
    CreateApplication: {
        type: 'object',
        example: {
            companyName: 'Example Company',
            jobTitle: 'Software Engineer',
            appDate: null,
            jobStatus: 'Applied',
            jobLocation: 'Singapore',
            jobURL: 'https://example.com/jobs/engineer',
            allowDuplicate: false,
        },
        required: ['companyName', 'jobTitle', 'appDate', 'jobStatus', 'jobLocation', 'jobURL'],
        properties: {
            companyName: { type: 'string', minLength: 1, maxLength: 150, example: 'Example Company' },
            jobTitle: { type: 'string', minLength: 1, maxLength: 150, example: 'Software Engineer' },
            appDate: {
                ...timestamp,
                nullable: true,
                example: null,
                description: 'Cannot be in the future. Set to null to use the current time.',
            },
            jobStatus: schemaRef('JobStatus'),
            jobLocation: { type: 'string', maxLength: 200, example: 'Singapore' },
            jobURL: {
                type: 'string',
                maxLength: 2048,
                example: 'https://example.com/jobs/engineer',
                description: 'HTTP(S) URL or an empty string.',
            },
            allowDuplicate: {
                type: 'boolean',
                default: false,
                description: 'Set to true to save a possible duplicate.',
            },
        },
    },
    Application: {
        type: 'object',
        properties: { job_id: positiveId, ...applicationProperties, has_offer_evaluation: { type: 'boolean' } },
    },
    ArchivedApplication: { type: 'object', properties: { archived_job_id: positiveId, ...applicationProperties } },
    ApplicationStatusInput: {
        type: 'object',
        example: { jobStatus: 'Interview' },
        required: ['jobStatus'],
        properties: { jobStatus: schemaRef('JobStatus') },
    },
    ArchiveApplication: {
        type: 'object',
        example: { jobId: 1 },
        required: ['jobId'],
        properties: { jobId: positiveId },
    },
    ApplicationPin: { type: 'object', properties: { job_id: positiveId, is_pinned: { type: 'boolean' } } },
    ApplicationRelations: { type: 'object', properties: relationProperties },
    ApplicationSummary: { type: 'object', properties: { application_count: count, ...relationProperties } },
    DashboardApplicationSummary: {
        type: 'object',
        properties: {
            statusCounts: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: { job_status: schemaRef('JobStatus'), count: { type: 'string', example: '3' } },
                },
            },
            interviewedApplicationCount: count,
        },
    },
    WeeklyApplicationCount: {
        type: 'object',
        properties: {
            start_of_week: { type: 'string', format: 'date' },
            applications_count: { type: 'string', example: '2' },
        },
    },
    DuplicateApplication: {
        type: 'object',
        properties: {
            code: { type: 'string', enum: ['POSSIBLE_DUPLICATE_APPLICATION'] },
            message: { type: 'string' },
            duplicate: {
                type: 'object',
                properties: {
                    company_name: { type: 'string' },
                    job_title: { type: 'string' },
                    application_date: timestamp,
                },
            },
        },
    },
};
