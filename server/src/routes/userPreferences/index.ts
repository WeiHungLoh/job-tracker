import type {
    GetUserPreferencesResponse,
    UpdateUserPreferencesRequest,
    UpdateUserPreferencesResponse,
} from './models.js';
import type { Request, Response } from 'express';
import { getUserPreferences, updateUserPreferences } from '../../db/queries/userPreferences.js';
import { handleRouteError, sendError } from '../../http/responses.js';
import {
    isJobStatusArray,
    isArchivedOfferDecisionFilterArray,
    isInterviewTimeFilterArray,
    isOfferDecisionFilterArray,
    isOptionalApplicationBoardSortOrder,
    isOptionalApplicationListSortOrder,
    isOptionalCollectionViewMode,
    isOptionalBoolean,
    isNeedsAttentionCategoryArray,
    isOptionalIntegerInRange,
} from '../../http/validation.js';
import express from 'express';
import { NEEDS_ATTENTION_LIMITS } from '../../config/validation.js';

const router = express.Router();

router.get(
    '/',
    async (
        req: Request<Record<string, never>, GetUserPreferencesResponse>,
        res: Response<GetUserPreferencesResponse>
    ): Promise<void> => {
        try {
            const preferences = await getUserPreferences(req.user.id);
            if (!preferences) {
                sendError(res, 404, 'User preferences not found.');
                return;
            }

            res.status(200).json(preferences);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load user preferences.');
        }
    }
);

router.patch(
    '/',
    async (
        req: Request<Record<string, never>, UpdateUserPreferencesResponse, UpdateUserPreferencesRequest>,
        res: Response<UpdateUserPreferencesResponse>
    ): Promise<void> => {
        const {
            application_job_statuses,
            application_show_notes,
            application_show_archive,
            application_enable_scroll,
            application_view_mode,
            application_list_sort_order,
            application_board_sort_order,
            archived_application_job_statuses,
            archived_application_show_notes,
            archived_application_view_mode,
            archived_application_list_sort_order,
            archived_application_board_sort_order,
            interview_view_mode,
            interview_show_notes,
            archived_interview_view_mode,
            archived_interview_show_notes,
            interview_time_filters,
            archived_interview_time_filters,
            offer_decision_filters,
            archived_offer_decision_filters,
            needs_attention_categories,
            needs_attention_max_items,
            needs_attention_offer_due_days,
            needs_attention_offer_overdue_days,
            needs_attention_post_interview_stale_days,
            needs_attention_post_interview_follow_up_days,
            needs_attention_application_stale_days,
            needs_attention_application_follow_up_days,
        } = req.body;

        if (application_job_statuses !== undefined && !isJobStatusArray(application_job_statuses)) {
            sendError(res, 422, 'Application job status preferences must contain only supported job statuses.');
            return;
        }
        if (archived_application_job_statuses !== undefined && !isJobStatusArray(archived_application_job_statuses)) {
            sendError(
                res,
                422,
                'Archived application job status preferences must contain only supported job statuses.'
            );
            return;
        }
        if (interview_time_filters !== undefined && !isInterviewTimeFilterArray(interview_time_filters)) {
            sendError(res, 422, 'Interview time filter preferences must contain only supported values.');
            return;
        }
        if (
            archived_interview_time_filters !== undefined &&
            !isInterviewTimeFilterArray(archived_interview_time_filters)
        ) {
            sendError(res, 422, 'Archived interview time filter preferences must contain only supported values.');
            return;
        }
        if (offer_decision_filters !== undefined && !isOfferDecisionFilterArray(offer_decision_filters)) {
            sendError(res, 422, 'Offer comparison filter preferences must contain only supported values.');
            return;
        }
        if (
            archived_offer_decision_filters !== undefined &&
            !isArchivedOfferDecisionFilterArray(archived_offer_decision_filters)
        ) {
            sendError(res, 422, 'Archived offer comparison filter preferences must contain only supported values.');
            return;
        }
        if (needs_attention_categories !== undefined && !isNeedsAttentionCategoryArray(needs_attention_categories)) {
            sendError(res, 422, 'Needs Attention categories must contain only unique supported values.');
            return;
        }
        if (
            !isOptionalIntegerInRange(
                needs_attention_max_items,
                NEEDS_ATTENTION_LIMITS.maxItems.minimum,
                NEEDS_ATTENTION_LIMITS.maxItems.maximum
            )
        ) {
            sendError(res, 422, 'Needs Attention maximum items must be a whole number from 1 to 50.');
            return;
        }
        if (
            !isOptionalIntegerInRange(
                needs_attention_offer_due_days,
                NEEDS_ATTENTION_LIMITS.offerDueDays.minimum,
                NEEDS_ATTENTION_LIMITS.offerDueDays.maximum
            ) ||
            !isOptionalIntegerInRange(
                needs_attention_offer_overdue_days,
                NEEDS_ATTENTION_LIMITS.offerOverdueDays.minimum,
                NEEDS_ATTENTION_LIMITS.offerOverdueDays.maximum
            ) ||
            !isOptionalIntegerInRange(
                needs_attention_post_interview_stale_days,
                NEEDS_ATTENTION_LIMITS.postInterviewStaleDays.minimum,
                NEEDS_ATTENTION_LIMITS.postInterviewStaleDays.maximum
            ) ||
            !isOptionalIntegerInRange(
                needs_attention_post_interview_follow_up_days,
                NEEDS_ATTENTION_LIMITS.postInterviewFollowUpDays.minimum,
                NEEDS_ATTENTION_LIMITS.postInterviewFollowUpDays.maximum
            ) ||
            !isOptionalIntegerInRange(
                needs_attention_application_stale_days,
                NEEDS_ATTENTION_LIMITS.applicationStaleDays.minimum,
                NEEDS_ATTENTION_LIMITS.applicationStaleDays.maximum
            ) ||
            !isOptionalIntegerInRange(
                needs_attention_application_follow_up_days,
                NEEDS_ATTENTION_LIMITS.applicationFollowUpDays.minimum,
                NEEDS_ATTENTION_LIMITS.applicationFollowUpDays.maximum
            )
        ) {
            sendError(res, 422, 'Needs Attention timing preferences must be whole days within the supported ranges.');
            return;
        }
        if (
            !isOptionalCollectionViewMode(application_view_mode) ||
            !isOptionalCollectionViewMode(archived_application_view_mode) ||
            !isOptionalCollectionViewMode(interview_view_mode) ||
            !isOptionalCollectionViewMode(archived_interview_view_mode)
        ) {
            sendError(res, 422, 'View mode preferences must be list or board.');
            return;
        }
        if (!isOptionalApplicationListSortOrder(application_list_sort_order)) {
            sendError(res, 422, 'Application list sort order preference must use a supported value.');
            return;
        }
        if (!isOptionalApplicationBoardSortOrder(application_board_sort_order)) {
            sendError(res, 422, 'Application board sort order preference must use a supported value.');
            return;
        }
        if (!isOptionalApplicationListSortOrder(archived_application_list_sort_order)) {
            sendError(res, 422, 'Archived application list sort order preference must use a supported value.');
            return;
        }
        if (!isOptionalApplicationBoardSortOrder(archived_application_board_sort_order)) {
            sendError(res, 422, 'Archived application board sort order preference must use a supported value.');
            return;
        }
        if (
            !isOptionalBoolean(application_show_notes) ||
            !isOptionalBoolean(application_show_archive) ||
            !isOptionalBoolean(application_enable_scroll) ||
            !isOptionalBoolean(archived_application_show_notes) ||
            !isOptionalBoolean(interview_show_notes) ||
            !isOptionalBoolean(archived_interview_show_notes)
        ) {
            sendError(res, 422, 'Show notes and show archive preferences must be boolean values.');
            return;
        }

        try {
            const preferences = await updateUserPreferences(req.user.id, req.body);
            if (!preferences) {
                sendError(res, 404, 'User preferences not found.');
                return;
            }

            res.status(200).json(preferences);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to update user preferences.');
        }
    }
);

export default router;
