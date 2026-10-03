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

const tags = ['Interviews'];
const timeFilters: OpenAPIV3.ParameterObject = {
    name: 'timeFilters',
    in: 'query',
    style: 'form',
    explode: true,
    description: 'Repeat to select multiple time filters. Omit to include all interviews.',
    schema: { type: 'array', items: { type: 'string', enum: ['Upcoming Interviews', 'Past Interviews'] } },
};
const invalid = errorResponse('Invalid ID or interview fields.');
const notFound = errorResponse('Interview or application not found for this user.');
const summary = jsonResponse('Interview count.', schemaRef('InterviewSummary'));

export const interviewPaths: OpenAPIV3.PathsObject = {
    '/job-interviews': {
        get: {
            tags,
            summary: 'List active interviews',
            description: 'Returns your active interviews, optionally filtered as upcoming or past.',
            parameters: [timeFilters],
            responses: {
                ...protectedErrors,
                200: jsonResponse('Active interviews.', { type: 'array', items: schemaRef('Interview') }),
                422: invalid,
            },
        },
        post: {
            tags,
            summary: 'Schedule an interview',
            requestBody: jsonBody('CreateInterview'),
            description:
                'Adds an interview to an application with Interview status. Scheduling conflicts and offer deadlines may require confirmation.',
            responses: {
                ...protectedErrors,
                201: textResponse('Successfully added an interview!'),
                404: notFound,
                422: invalid,
                409: jsonResponse('Scheduling conflict, offer deadline warning or ineligible application status.', {
                    anyOf: [
                        schemaRef('InterviewSchedulingConflict'),
                        schemaRef('InterviewOfferDeadlineWarning'),
                        schemaRef('Error'),
                    ],
                }),
            },
        },
        delete: {
            tags,
            summary: 'Delete all active interviews',
            description: 'Permanently removes your active interviews while keeping their applications.',
            responses: { ...protectedErrors, 204: noContent },
        },
    },
    '/job-interviews/summary': {
        get: {
            tags,
            summary: 'Count active interviews',
            description: 'Returns the total number of your active interviews.',
            responses: { ...protectedErrors, 200: summary },
        },
    },
    '/job-interviews/{interviewId}': {
        parameters: [idParameter('interviewId')],
        delete: {
            tags,
            summary: 'Delete an active interview',
            description: 'Permanently removes the interview while keeping its application.',
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/job-interviews/{interviewId}/notes': {
        parameters: [idParameter('interviewId')],
        patch: {
            tags,
            summary: 'Update interview notes',
            description: "Replaces the interview's notes. Send an empty string to clear them.",
            requestBody: jsonBody('NotesInput'),
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/job-interviews/{interviewId}/pin': {
        parameters: [idParameter('interviewId')],
        patch: {
            tags,
            summary: 'Pin or unpin an interview',
            description: 'Sets whether the interview is pinned.',
            requestBody: jsonBody('PinInput'),
            responses: {
                ...protectedErrors,
                200: jsonResponse('Updated pin.', schemaRef('InterviewPin')),
                404: notFound,
                422: invalid,
            },
        },
    },
    '/job-interviews/{interviewId}/follow-up': {
        parameters: [idParameter('interviewId')],
        put: {
            tags,
            summary: 'Mark interview follow-up as sent',
            description: 'Records a follow-up after the interview ends without sending an email.',
            responses: {
                ...protectedErrors,
                200: jsonResponse('Follow-up timestamp.', {
                    type: 'object',
                    properties: { follow_up_sent_at: timestamp },
                }),
                404: notFound,
                409: errorResponse('The interview has not finished.'),
                422: invalid,
            },
        },
        delete: {
            tags,
            summary: 'Clear interview follow-up',
            description: "Clears the interview's follow-up timestamp.",
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
    '/archived-job-interviews': {
        get: {
            tags,
            summary: 'List archived interviews',
            parameters: [timeFilters],
            description:
                'Returns interviews archived with their applications, optionally filtered as upcoming or past.',
            responses: {
                ...protectedErrors,
                200: jsonResponse('Archived interviews.', { type: 'array', items: schemaRef('ArchivedInterview') }),
                422: invalid,
            },
        },
        delete: {
            tags,
            summary: 'Delete all archived interviews',
            description: 'Permanently removes your archived interviews while keeping their applications.',
            responses: { ...protectedErrors, 204: noContent },
        },
    },
    '/archived-job-interviews/summary': {
        get: {
            tags,
            summary: 'Count archived interviews',
            description: 'Returns the total number of your archived interviews.',
            responses: { ...protectedErrors, 200: summary },
        },
    },
    '/archived-job-interviews/{archivedInterviewId}': {
        parameters: [idParameter('archivedInterviewId')],
        delete: {
            tags,
            summary: 'Delete an archived interview',
            description: 'Permanently removes the archived interview while keeping its application.',
            responses: { ...protectedErrors, 204: noContent, 404: notFound, 422: invalid },
        },
    },
};

const interviewProperties: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {
    interview_date: timestamp,
    interview_duration_minutes: { type: 'integer', minimum: 1, maximum: 1440 },
    interview_location: { type: 'string' },
    interview_type: { type: 'string' },
    interview_notes: { type: 'string' },
    meeting_url: { type: 'string' },
    company_name: { type: 'string' },
    job_title: { type: 'string' },
    job_status: schemaRef('JobStatus'),
    is_pinned: { type: 'boolean' },
    follow_up_sent_at: { ...timestamp, nullable: true },
};

export const interviewSchemas: Record<string, OpenAPIV3.SchemaObject> = {
    CreateInterview: {
        type: 'object',
        example: {
            jobId: 1,
            interviewDate: '2027-01-15T02:00:00.000Z',
            interviewDurationMinutes: 60,
            interviewLocation: 'Zoom',
            interviewType: 'Technical',
            meetingURL: 'https://example.com/meeting',
            notes: 'Prepare project walkthrough.',
            allowSchedulingConflict: false,
            allowOfferDeadlineWarning: false,
        },
        required: ['jobId', 'interviewDate', 'interviewDurationMinutes', 'interviewLocation', 'interviewType', 'notes'],
        properties: {
            jobId: positiveId,
            interviewDate: timestamp,
            interviewDurationMinutes: { type: 'integer', minimum: 1, maximum: 1440, example: 60 },
            interviewLocation: { type: 'string', minLength: 1, maxLength: 200, example: 'Zoom' },
            interviewType: { type: 'string', maxLength: 100, example: 'Technical' },
            meetingURL: {
                type: 'string',
                maxLength: 2048,
                example: '',
                description: 'HTTP(S) URL or an empty string.',
            },
            notes: { type: 'string', maxLength: 3000, example: '' },
            allowSchedulingConflict: {
                type: 'boolean',
                default: false,
                description: 'Set to true to confirm an overlapping interview.',
            },
            allowOfferDeadlineWarning: {
                type: 'boolean',
                default: false,
                description: 'Set to true to confirm an interview after an offer deadline.',
            },
        },
    },
    Interview: { type: 'object', properties: { interview_id: positiveId, job_id: positiveId, ...interviewProperties } },
    ArchivedInterview: {
        type: 'object',
        properties: { archived_interview_id: positiveId, archived_job_id: positiveId, ...interviewProperties },
    },
    InterviewPin: { type: 'object', properties: { interview_id: positiveId, is_pinned: { type: 'boolean' } } },
    InterviewSummary: { type: 'object', properties: { interview_count: count } },
    InterviewSchedulingConflict: {
        type: 'object',
        properties: {
            code: { type: 'string', enum: ['INTERVIEW_SCHEDULING_CONFLICT'] },
            message: { type: 'string' },
            conflicts: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        interview_id: positiveId,
                        job_id: positiveId,
                        company_name: { type: 'string' },
                        job_title: { type: 'string' },
                        interview_date: timestamp,
                        interview_duration_minutes: { type: 'integer' },
                        interview_type: { type: 'string' },
                    },
                },
            },
        },
    },
    InterviewOfferDeadlineWarning: {
        type: 'object',
        properties: {
            code: { type: 'string', enum: ['INTERVIEW_OFFER_DEADLINE_WARNING'] },
            message: { type: 'string' },
            warnings: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        job_id: positiveId,
                        company_name: { type: 'string' },
                        job_title: { type: 'string' },
                        decision_deadline: timestamp,
                    },
                },
            },
        },
    },
};
