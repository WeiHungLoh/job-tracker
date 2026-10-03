import type { OpenAPIV3 } from 'openapi-types';

export const schemaRef = (name: string): OpenAPIV3.ReferenceObject => ({
    $ref: `#/components/schemas/${name}`,
});

export const jsonResponse = (
    description: string,
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): OpenAPIV3.ResponseObject => ({ description, content: { 'application/json': { schema } } });

export const jsonBody = (name: string): OpenAPIV3.RequestBodyObject => ({
    required: true,
    content: { 'application/json': { schema: schemaRef(name) } },
});

const idDescriptions: Record<string, string> = {
    jobId: 'Job application ID.',
    interviewId: 'Interview ID.',
    archivedJobId: 'Archived application ID.',
    archivedInterviewId: 'Archived interview ID.',
};

export const idParameter = (name: string): OpenAPIV3.ParameterObject => ({
    name,
    in: 'path',
    required: true,
    description: idDescriptions[name],
    schema: { type: 'integer', minimum: 1 },
});

export const errorResponse = (description: string): OpenAPIV3.ResponseObject =>
    jsonResponse(description, schemaRef('Error'));

export const protectedErrors: OpenAPIV3.ResponsesObject = {
    401: errorResponse('Missing, malformed or expired access token.'),
    403: errorResponse('Origin is not allowed.'),
    429: errorResponse('API rate limit exceeded.'),
    500: errorResponse('The operation could not be completed.'),
    503: errorResponse('Authentication is temporarily unavailable.'),
};

export const noContent: OpenAPIV3.ResponseObject = { description: 'Completed. No response body.' };

export const textResponse = (description: string): OpenAPIV3.ResponseObject => ({
    description,
    content: { 'text/html': { schema: { type: 'string', example: description } } },
});

export const timestamp: OpenAPIV3.SchemaObject = { type: 'string', format: 'date-time' };
export const positiveId: OpenAPIV3.SchemaObject = { type: 'integer', minimum: 1 };
export const count: OpenAPIV3.SchemaObject = { type: 'integer', minimum: 0 };

export const commonSchemas: Record<string, OpenAPIV3.SchemaObject> = {
    Error: {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string' }, code: { type: 'string', description: 'Present for coded errors.' } },
    },
    Message: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } },
    JobStatus: {
        type: 'string',
        enum: ['Accepted', 'Applied', 'Declined', 'Ghosted', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
    },
    NotesInput: {
        type: 'object',
        example: { notes: 'Follow up next week.' },
        required: ['notes'],
        properties: { notes: { type: 'string', maxLength: 3000, example: 'Follow up next week.' } },
    },
    PinInput: {
        type: 'object',
        example: { isPinned: true },
        required: ['isPinned'],
        properties: { isPinned: { type: 'boolean', example: true } },
    },
};
