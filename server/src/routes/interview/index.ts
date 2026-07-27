import type {
    CreateInterviewRequest,
    CreateInterviewResponse,
    EmptyResponse,
    GetInterviewCollectionSummaryResponse,
    InterviewIdParams,
    ListInterviewsQuery,
    ListInterviewsResponse,
    MarkInterviewFollowUpResponse,
} from './models.js';
import type { Request, Response } from 'express';
import {
    FIELD_MAX_LENGTHS,
    INTERVIEW_DURATION_MINUTES_MAX,
    INTERVIEW_DURATION_MINUTES_MIN,
} from '../../config/validation.js';
import {
    deleteAllJobInterviews,
    deleteJobInterview,
    clearInterviewFollowUpSent,
    getInterviewOfferDeadlineWarnings,
    getInterviewSchedulingConflicts,
    getInterviews,
    insertInterview,
    markInterviewFollowUpSent,
} from '../../db/queries/interviews.js';
import { handleRouteError, sendError } from '../../http/responses.js';
import {
    isOptionalBoolean,
    isValidDate,
    toInterviewTimeFilterQueryValues,
    toIntegerInRange,
    toPositiveInteger,
    toTrimmedString,
} from '../../http/validation.js';
import express from 'express';
import { getInterviewCollectionSummary } from '../../db/queries/collectionSummaries.js';

const router = express.Router();

router.post(
    '/',
    async (
        req: Request<Record<string, never>, CreateInterviewResponse, CreateInterviewRequest>,
        res: Response<CreateInterviewResponse>
    ): Promise<void> => {
        const applicationId = toPositiveInteger(req.body.jobId);
        const interviewLocation = toTrimmedString(req.body.interviewLocation, FIELD_MAX_LENGTHS.location);
        const interviewType = toTrimmedString(req.body.interviewType, FIELD_MAX_LENGTHS.interviewType, true);
        const interviewDurationMinutes = toIntegerInRange(
            req.body.interviewDurationMinutes,
            INTERVIEW_DURATION_MINUTES_MIN,
            INTERVIEW_DURATION_MINUTES_MAX
        );
        const notes = toTrimmedString(req.body.notes, FIELD_MAX_LENGTHS.notes, true);
        const { allowOfferDeadlineWarning, allowSchedulingConflict, interviewDate } = req.body;

        if (
            applicationId === undefined ||
            !isValidDate(interviewDate) ||
            interviewDurationMinutes === undefined ||
            interviewLocation === undefined ||
            interviewType === undefined ||
            notes === undefined ||
            !isOptionalBoolean(allowSchedulingConflict) ||
            !isOptionalBoolean(allowOfferDeadlineWarning)
        ) {
            sendError(res, 422, 'Interview fields are missing, invalid, or too long.');
            return;
        }

        try {
            const normalizedInterviewDate = new Date(interviewDate).toISOString();
            if (allowSchedulingConflict !== true) {
                const conflicts = await getInterviewSchedulingConflicts(
                    applicationId,
                    req.user.id,
                    normalizedInterviewDate,
                    interviewDurationMinutes
                );
                if (conflicts.length > 0) {
                    res.status(409).json({
                        code: 'INTERVIEW_SCHEDULING_CONFLICT',
                        message: 'This interview overlaps with an existing active interview.',
                        conflicts: conflicts.map((conflict) => ({
                            interview_id: conflict.interview_id,
                            job_id: conflict.job_id,
                            company_name: conflict.company_name,
                            job_title: conflict.job_title,
                            interview_date: conflict.interview_date.toISOString(),
                            interview_duration_minutes: conflict.interview_duration_minutes,
                            interview_type: conflict.interview_type,
                        })),
                    });
                    return;
                }
            }

            if (allowOfferDeadlineWarning !== true) {
                const warnings = await getInterviewOfferDeadlineWarnings(
                    applicationId,
                    req.user.id,
                    normalizedInterviewDate,
                    interviewDurationMinutes
                );
                if (warnings.length > 0) {
                    res.status(409).json({
                        code: 'INTERVIEW_OFFER_DEADLINE_WARNING',
                        message: 'This interview may finish after an active offer deadline.',
                        warnings: warnings.map((warning) => ({
                            job_id: warning.job_id,
                            company_name: warning.company_name,
                            job_title: warning.job_title,
                            decision_deadline: warning.decision_deadline.toISOString(),
                        })),
                    });
                    return;
                }
            }

            const insertResult = await insertInterview(
                applicationId,
                req.user.id,
                normalizedInterviewDate,
                interviewDurationMinutes,
                interviewLocation,
                interviewType,
                notes
            );
            if (insertResult === 'not-found') {
                sendError(res, 404, 'Job application not found.');
                return;
            }
            if (insertResult === 'invalid-date') {
                sendError(res, 422, 'Interview date must be after the application date.');
                return;
            }
            res.status(201).send('Successfully added an interview!');
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to create the interview.');
        }
    }
);

router.get(
    '/',
    async (
        req: Request<Record<string, never>, ListInterviewsResponse, Record<string, never>, ListInterviewsQuery>,
        res: Response<ListInterviewsResponse>
    ): Promise<void> => {
        const timeFilters = toInterviewTimeFilterQueryValues(req.query.timeFilters);
        if (timeFilters === undefined) {
            sendError(res, 422, 'Each interview time filter must be supported.');
            return;
        }

        try {
            res.status(200).json(await getInterviews(req.user.id, timeFilters));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load interviews.');
        }
    }
);

router.get(
    '/summary',
    async (
        req: Request<Record<string, never>, GetInterviewCollectionSummaryResponse>,
        res: Response<GetInterviewCollectionSummaryResponse>
    ): Promise<void> => {
        try {
            res.status(200).json(await getInterviewCollectionSummary(req.user.id, false));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load active interview counts.');
        }
    }
);

router.delete(
    '/',
    async (req: Request<Record<string, never>, EmptyResponse>, res: Response<EmptyResponse>): Promise<void> => {
        try {
            await deleteAllJobInterviews(req.user.id);
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to delete interviews.');
        }
    }
);

router.put(
    '/:interviewId/follow-up',
    async (
        req: Request<InterviewIdParams, MarkInterviewFollowUpResponse>,
        res: Response<MarkInterviewFollowUpResponse>
    ): Promise<void> => {
        const interviewId = toPositiveInteger(req.params.interviewId);
        if (interviewId === undefined) {
            sendError(res, 422, 'Interview ID must be a positive integer.');
            return;
        }

        try {
            const sentAt = await markInterviewFollowUpSent(interviewId, req.user.id);
            if (!sentAt) {
                sendError(res, 404, 'Active interview not found.');
                return;
            }
            res.status(200).json({ follow_up_sent_at: sentAt });
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to mark the interview follow-up as sent.');
        }
    }
);

router.delete(
    '/:interviewId/follow-up',
    async (req: Request<InterviewIdParams, EmptyResponse>, res: Response<EmptyResponse>): Promise<void> => {
        const interviewId = toPositiveInteger(req.params.interviewId);
        if (interviewId === undefined) {
            sendError(res, 422, 'Interview ID must be a positive integer.');
            return;
        }

        try {
            if (!(await clearInterviewFollowUpSent(interviewId, req.user.id))) {
                sendError(res, 404, 'Active interview not found.');
                return;
            }
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to undo the interview follow-up.');
        }
    }
);

router.delete(
    '/:interviewId',
    async (req: Request<InterviewIdParams, EmptyResponse>, res: Response<EmptyResponse>): Promise<void> => {
        const interviewId = toPositiveInteger(req.params.interviewId);
        if (interviewId === undefined) {
            sendError(res, 422, 'Interview ID must be a positive integer.');
            return;
        }

        try {
            const interviewDeleted = await deleteJobInterview(interviewId, req.user.id);
            if (!interviewDeleted) {
                sendError(res, 404, 'Interview not found.');
                return;
            }
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to delete the interview.');
        }
    }
);

export default router;
