import type { Request, Response } from 'express';
import express from 'express';
import type { EmptyResponse } from '../../shared/http/models.js';
import { handleRouteError, sendError } from '../../shared/http/responses.js';
import { toPositiveInteger } from '../../shared/http/validation.js';
import {
    deleteAllArchivedJobInterviews,
    deleteArchivedJobInterview,
    getArchivedJobInterviews,
} from './archivedRepository.js';
import type {
    ArchivedInterviewIdParams,
    GetArchivedInterviewCollectionSummaryResponse,
    ListArchivedInterviewsQuery,
    ListArchivedInterviewsResponse,
} from './models.js';
import { getInterviewCollectionSummary } from './summariesRepository.js';
import { toInterviewTimeFilterQueryValues } from './validation.js';

const router = express.Router();

router.get(
    '/',
    async (
        req: Request<
            Record<string, never>,
            ListArchivedInterviewsResponse,
            Record<string, never>,
            ListArchivedInterviewsQuery
        >,
        res: Response<ListArchivedInterviewsResponse>
    ): Promise<void> => {
        const timeFilters = toInterviewTimeFilterQueryValues(req.query.timeFilters);
        if (timeFilters === undefined) {
            sendError(res, 422, 'Each interview time filter must be supported.');
            return;
        }

        try {
            res.status(200).json(await getArchivedJobInterviews(req.user.id, timeFilters));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load archived interviews.');
        }
    }
);

router.get(
    '/summary',
    async (
        req: Request<Record<string, never>, GetArchivedInterviewCollectionSummaryResponse>,
        res: Response<GetArchivedInterviewCollectionSummaryResponse>
    ): Promise<void> => {
        try {
            res.status(200).json(await getInterviewCollectionSummary(req.user.id, true));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load archived interview counts.');
        }
    }
);

router.delete(
    '/',
    async (req: Request<Record<string, never>, EmptyResponse>, res: Response<EmptyResponse>): Promise<void> => {
        try {
            await deleteAllArchivedJobInterviews(req.user.id);
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to delete archived interviews.');
        }
    }
);

router.delete(
    '/:archivedInterviewId',
    async (req: Request<ArchivedInterviewIdParams, EmptyResponse>, res: Response<EmptyResponse>): Promise<void> => {
        const archivedInterviewId = toPositiveInteger(req.params.archivedInterviewId);
        if (archivedInterviewId === undefined) {
            sendError(res, 422, 'Archived interview ID must be a positive integer.');
            return;
        }

        try {
            const interviewDeleted = await deleteArchivedJobInterview(archivedInterviewId, req.user.id);
            if (!interviewDeleted) {
                sendError(res, 404, 'Archived interview not found.');
                return;
            }
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to delete the archived interview.');
        }
    }
);

export default router;
