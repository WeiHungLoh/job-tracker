import type { ErrorResponse } from '../../shared/http/models.js';
import type { JobStatus } from '../applications/api.js';
import type { InterviewTimeFilter } from '../interviews/api.js';
import type { ArchivedOfferDecisionFilter, OfferDecisionFilter } from '../offers/api.js';

export type CollectionViewMode = 'list' | 'board';

export type OfferDecisionViewMode = 'cards' | 'table';

export type OfferDecisionTableOrientation = 'horizontal' | 'vertical';

export type NeedsAttentionCategory =
    | 'offer-decision-due'
    | 'offer-decision-overdue'
    | 'offer-evaluation'
    | 'post-interview-follow-up-stale'
    | 'post-interview'
    | 'interview-unscheduled'
    | 'application-follow-up-stale'
    | 'application-follow-up';

export const NEEDS_ATTENTION_CATEGORIES: readonly NeedsAttentionCategory[] = [
    'offer-decision-due',
    'offer-decision-overdue',
    'offer-evaluation',
    'post-interview-follow-up-stale',
    'post-interview',
    'interview-unscheduled',
    'application-follow-up-stale',
    'application-follow-up',
];

export type NeedsAttentionPreferences = {
    needs_attention_categories: NeedsAttentionCategory[];
    needs_attention_max_items: number;
    needs_attention_offer_due_days: number;
    needs_attention_offer_overdue_days: number;
    needs_attention_post_interview_stale_days: number;
    needs_attention_post_interview_follow_up_days: number;
    needs_attention_application_stale_days: number;
    needs_attention_application_follow_up_days: number;
};

export const DEFAULT_NEEDS_ATTENTION_SETTINGS: Readonly<NeedsAttentionPreferences> = {
    needs_attention_categories: [...NEEDS_ATTENTION_CATEGORIES],
    needs_attention_max_items: 10,
    needs_attention_offer_due_days: 3,
    needs_attention_offer_overdue_days: 14,
    needs_attention_post_interview_stale_days: 14,
    needs_attention_post_interview_follow_up_days: 7,
    needs_attention_application_stale_days: 14,
    needs_attention_application_follow_up_days: 7,
};

export type ApplicationListSortOrder =
    | 'job_status'
    | 'application_date_desc'
    | 'application_date_asc'
    | 'company_name_asc'
    | 'company_name_desc';

export type ApplicationBoardSortOrder =
    | 'application_date_desc'
    | 'application_date_asc'
    | 'company_name_asc'
    | 'company_name_desc';

export const APPLICATION_LIST_SORT_ORDERS: readonly ApplicationListSortOrder[] = [
    'job_status',
    'application_date_desc',
    'application_date_asc',
    'company_name_asc',
    'company_name_desc',
];

export const APPLICATION_BOARD_SORT_ORDERS: readonly ApplicationBoardSortOrder[] = APPLICATION_LIST_SORT_ORDERS.filter(
    (sortOrder): sortOrder is ApplicationBoardSortOrder => sortOrder !== 'job_status'
);

export const DEFAULT_APPLICATION_LIST_SORT_ORDER: ApplicationListSortOrder = 'job_status';

export const DEFAULT_APPLICATION_BOARD_SORT_ORDER: ApplicationBoardSortOrder = 'application_date_desc';

export type UserPreferences = {
    application_job_statuses: JobStatus[];
    application_show_notes: boolean;
    application_show_archive: boolean;
    application_enable_scroll: boolean;
    application_view_mode: CollectionViewMode;
    application_list_sort_order: ApplicationListSortOrder;
    application_board_sort_order: ApplicationBoardSortOrder;
    archived_application_job_statuses: JobStatus[];
    archived_application_show_notes: boolean;
    archived_application_view_mode: CollectionViewMode;
    archived_application_list_sort_order: ApplicationListSortOrder;
    archived_application_board_sort_order: ApplicationBoardSortOrder;
    interview_view_mode: CollectionViewMode;
    interview_show_notes: boolean;
    archived_interview_view_mode: CollectionViewMode;
    archived_interview_show_notes: boolean;
    interview_time_filters: InterviewTimeFilter[];
    archived_interview_time_filters: InterviewTimeFilter[];
    offer_decision_filters: OfferDecisionFilter[];
    archived_offer_decision_filters: ArchivedOfferDecisionFilter[];
    offer_decision_view_mode: OfferDecisionViewMode;
    archived_offer_decision_view_mode: OfferDecisionViewMode;
    offer_decision_table_orientation: OfferDecisionTableOrientation;
    archived_offer_decision_table_orientation: OfferDecisionTableOrientation;
    needs_attention_categories: NeedsAttentionCategory[];
    needs_attention_max_items: number;
    needs_attention_offer_due_days: number;
    needs_attention_offer_overdue_days: number;
    needs_attention_post_interview_stale_days: number;
    needs_attention_post_interview_follow_up_days: number;
    needs_attention_application_stale_days: number;
    needs_attention_application_follow_up_days: number;
};

export type UpdateUserPreferencesRequest = Partial<UserPreferences>;

export type GetUserPreferencesResponse = UserPreferences | ErrorResponse;

export type UpdateUserPreferencesResponse = UserPreferences | ErrorResponse;
