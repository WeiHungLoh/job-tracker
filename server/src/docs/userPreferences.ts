import type { OpenAPIV3 } from 'openapi-types';
import { errorResponse, jsonBody, jsonResponse, protectedErrors, schemaRef } from './common.js';

const tags = ['User preferences'];
const preferences = jsonResponse('Saved preferences.', schemaRef('UserPreferences'));

export const userPreferencePaths: OpenAPIV3.PathsObject = {
    '/user-preferences': {
        get: {
            tags,
            summary: 'Get user preferences',
            description: 'Returns your saved display, sorting, filtering and reminder settings.',
            responses: { ...protectedErrors, 200: preferences, 404: errorResponse('User preferences not found.') },
        },
        patch: {
            tags,
            summary: 'Update user preferences',
            requestBody: jsonBody('UserPreferences'),
            description: 'Updates only the provided settings. All other preferences keep their saved values.',
            responses: {
                ...protectedErrors,
                200: preferences,
                404: errorResponse('User preferences not found.'),
                422: errorResponse('Invalid preference value.'),
            },
        },
    },
};

const boolean: OpenAPIV3.SchemaObject = { type: 'boolean' };
const collectionView: OpenAPIV3.SchemaObject = { type: 'string', enum: ['list', 'board'] };
const offerView: OpenAPIV3.SchemaObject = { type: 'string', enum: ['cards', 'table'] };
const orientation: OpenAPIV3.SchemaObject = { type: 'string', enum: ['horizontal', 'vertical'] };
const boardSortValues = ['application_date_desc', 'application_date_asc', 'company_name_asc', 'company_name_desc'];
const boardSort: OpenAPIV3.SchemaObject = { type: 'string', enum: boardSortValues };
const listSort: OpenAPIV3.SchemaObject = { type: 'string', enum: ['job_status', ...boardSortValues] };
const statuses: OpenAPIV3.SchemaObject = { type: 'array', uniqueItems: true, items: schemaRef('JobStatus') };
const interviewFilters: OpenAPIV3.SchemaObject = {
    type: 'array',
    uniqueItems: true,
    items: { type: 'string', enum: ['Upcoming Interviews', 'Past Interviews'] },
};
const archivedOfferFilters = ['Evaluated Offers', 'Expired Evaluated Offers', 'Previous Evaluations'];

export const userPreferenceSchemas: Record<string, OpenAPIV3.SchemaObject> = {
    UserPreferences: {
        type: 'object',
        example: {
            application_job_statuses: [
                'Accepted',
                'Applied',
                'Declined',
                'Ghosted',
                'Interview',
                'Offer',
                'Rejected',
                'Withdrawn',
            ],
            application_show_notes: true,
            application_show_archive: true,
            application_enable_scroll: true,
            application_view_mode: 'list',
            application_list_sort_order: 'job_status',
            application_board_sort_order: 'application_date_desc',
            archived_application_job_statuses: [
                'Accepted',
                'Applied',
                'Declined',
                'Ghosted',
                'Interview',
                'Offer',
                'Rejected',
                'Withdrawn',
            ],
            archived_application_show_notes: true,
            archived_application_view_mode: 'list',
            archived_application_list_sort_order: 'job_status',
            archived_application_board_sort_order: 'application_date_desc',
            interview_view_mode: 'list',
            interview_show_notes: true,
            archived_interview_view_mode: 'list',
            archived_interview_show_notes: true,
            interview_time_filters: ['Upcoming Interviews', 'Past Interviews'],
            archived_interview_time_filters: ['Upcoming Interviews', 'Past Interviews'],
            offer_decision_filters: [
                'Offers to Evaluate',
                'Evaluated Offers',
                'Expired Evaluated Offers',
                'Previous Evaluations',
            ],
            archived_offer_decision_filters: ['Evaluated Offers', 'Expired Evaluated Offers', 'Previous Evaluations'],
            offer_decision_view_mode: 'cards',
            archived_offer_decision_view_mode: 'cards',
            offer_decision_table_orientation: 'horizontal',
            archived_offer_decision_table_orientation: 'horizontal',
            needs_attention_categories: [
                'offer-decision-due',
                'offer-decision-overdue',
                'offer-evaluation',
                'post-interview-follow-up-stale',
                'post-interview',
                'interview-unscheduled',
                'application-follow-up-stale',
                'application-follow-up',
            ],
            needs_attention_max_items: 10,
            needs_attention_offer_due_days: 3,
            needs_attention_offer_overdue_days: 14,
            needs_attention_post_interview_stale_days: 14,
            needs_attention_post_interview_follow_up_days: 7,
            needs_attention_application_stale_days: 14,
            needs_attention_application_follow_up_days: 7,
        },
        properties: {
            application_job_statuses: statuses,
            application_show_notes: boolean,
            application_show_archive: boolean,
            application_enable_scroll: boolean,
            application_view_mode: collectionView,
            application_list_sort_order: listSort,
            application_board_sort_order: boardSort,
            archived_application_job_statuses: statuses,
            archived_application_show_notes: boolean,
            archived_application_view_mode: collectionView,
            archived_application_list_sort_order: listSort,
            archived_application_board_sort_order: boardSort,
            interview_view_mode: collectionView,
            interview_show_notes: boolean,
            archived_interview_view_mode: collectionView,
            archived_interview_show_notes: boolean,
            interview_time_filters: interviewFilters,
            archived_interview_time_filters: interviewFilters,
            offer_decision_filters: {
                type: 'array',
                uniqueItems: true,
                items: { type: 'string', enum: ['Offers to Evaluate', ...archivedOfferFilters] },
            },
            archived_offer_decision_filters: {
                type: 'array',
                uniqueItems: true,
                items: { type: 'string', enum: archivedOfferFilters },
            },
            offer_decision_view_mode: offerView,
            archived_offer_decision_view_mode: offerView,
            offer_decision_table_orientation: orientation,
            archived_offer_decision_table_orientation: orientation,
            needs_attention_categories: {
                type: 'array',
                uniqueItems: true,
                items: {
                    type: 'string',
                    enum: [
                        'offer-decision-due',
                        'offer-decision-overdue',
                        'offer-evaluation',
                        'post-interview-follow-up-stale',
                        'post-interview',
                        'interview-unscheduled',
                        'application-follow-up-stale',
                        'application-follow-up',
                    ],
                },
            },
            needs_attention_max_items: { type: 'integer', minimum: 1, maximum: 50 },
            needs_attention_offer_due_days: { type: 'integer', minimum: 1, maximum: 14 },
            needs_attention_offer_overdue_days: { type: 'integer', minimum: 1, maximum: 30 },
            needs_attention_post_interview_stale_days: { type: 'integer', minimum: 1, maximum: 60 },
            needs_attention_post_interview_follow_up_days: { type: 'integer', minimum: 1, maximum: 30 },
            needs_attention_application_stale_days: { type: 'integer', minimum: 1, maximum: 60 },
            needs_attention_application_follow_up_days: { type: 'integer', minimum: 1, maximum: 30 },
        },
    },
};
