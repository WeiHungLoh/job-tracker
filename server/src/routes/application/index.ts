import type {
    CreateApplicationRequest,
    CreateApplicationResponse,
    EmptyResponse,
    GetApplicationCollectionSummaryResponse,
    GetApplicationRelationSummaryResponse,
    JobIdParams,
    ListApplicationsQuery,
    ListApplicationsResponse,
    ListJobStatusCountsResponse,
    ListWeeklyApplicationsResponse,
    UpdateApplicationStatusRequest,
    UpdateNotesRequest,
} from './models.js';
import type { Request, Response } from 'express';
import { FIELD_MAX_LENGTHS } from '../../config/validation.js';
import {
    deleteAllJobApplications,
    deleteJobApplication,
    editNotes,
    findPotentialDuplicateApplication,
    getApplicationsForLatestEightWeeks,
    getJobApplications,
    getJobStatusCounts,
    insertJobApplication,
    updateApplicationStatus,
} from '../../db/queries/jobApplications.js';
import { handleRouteError, sendError } from '../../http/responses.js';
import {
    isFutureDate,
    isJobStatus,
    isOptionalBoolean,
    isValidHttpURL,
    isValidDate,
    toPositiveInteger,
    toJobStatusQueryValues,
    toTrimmedString,
} from '../../http/validation.js';
import express from 'express';
import {
    getApplicationCollectionSummary,
    getApplicationRelationSummary,
} from '../../db/queries/collectionSummaries.js';

const router = express.Router();

router.post(
    '/',
    async (
        req: Request<Record<string, never>, CreateApplicationResponse, CreateApplicationRequest>,
        res: Response<CreateApplicationResponse>
    ): Promise<void> => {
        const companyName = toTrimmedString(req.body.companyName, FIELD_MAX_LENGTHS.companyName);
        const jobTitle = toTrimmedString(req.body.jobTitle, FIELD_MAX_LENGTHS.jobTitle);
        const jobLocation = toTrimmedString(req.body.jobLocation, FIELD_MAX_LENGTHS.location, true);
        const jobURL = toTrimmedString(req.body.jobURL, FIELD_MAX_LENGTHS.jobURL, true);
        const { allowDuplicate, appDate, jobStatus } = req.body;

        if (
            companyName === undefined ||
            jobTitle === undefined ||
            !isValidDate(appDate) ||
            !isJobStatus(jobStatus) ||
            jobLocation === undefined ||
            jobURL === undefined
        ) {
            sendError(res, 422, 'Job application fields are missing, invalid, or too long.');
            return;
        }
        if (isFutureDate(appDate)) {
            sendError(res, 422, 'Application date cannot be in the future.');
            return;
        }
        if (jobURL && !isValidHttpURL(jobURL)) {
            sendError(res, 422, 'URL must be in a valid format.');
            return;
        }
        if (!isOptionalBoolean(allowDuplicate)) {
            sendError(res, 422, 'Job application fields are missing, invalid, or too long.');
            return;
        }

        try {
            if (allowDuplicate !== true) {
                const duplicate = await findPotentialDuplicateApplication(req.user.id, companyName, jobTitle, jobURL);
                if (duplicate) {
                    res.status(409).json({
                        code: 'POSSIBLE_DUPLICATE_APPLICATION',
                        message: 'A possible duplicate job application already exists.',
                        duplicate: {
                            company_name: duplicate.company_name,
                            job_title: duplicate.job_title,
                            application_date: duplicate.application_date.toISOString(),
                        },
                    });
                    return;
                }
            }

            await insertJobApplication(
                req.user.id,
                companyName,
                jobTitle,
                new Date(appDate).toISOString(),
                jobStatus,
                jobLocation,
                jobURL
            );
            res.status(201).send('Successfully added a job application!');
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to create the job application.');
        }
    }
);

router.get(
    '/',
    async (
        req: Request<Record<string, never>, ListApplicationsResponse, Record<string, never>, ListApplicationsQuery>,
        res: Response<ListApplicationsResponse>
    ): Promise<void> => {
        const jobStatuses = toJobStatusQueryValues(req.query.jobStatuses);
        if (jobStatuses === undefined) {
            sendError(res, 422, 'Each job status filter must be supported.');
            return;
        }

        try {
            res.status(200).json(await getJobApplications(req.user.id, jobStatuses));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load job applications.');
        }
    }
);

router.get(
    '/status-counts',
    async (
        req: Request<Record<string, never>, ListJobStatusCountsResponse>,
        res: Response<ListJobStatusCountsResponse>
    ): Promise<void> => {
        try {
            res.status(200).json(await getJobStatusCounts(req.user.id));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load job application status counts.');
        }
    }
);

router.get(
    '/summary',
    async (
        req: Request<Record<string, never>, GetApplicationCollectionSummaryResponse>,
        res: Response<GetApplicationCollectionSummaryResponse>
    ): Promise<void> => {
        try {
            res.status(200).json(await getApplicationCollectionSummary(req.user.id, false));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load active application counts.');
        }
    }
);

router.get(
    '/weekly-counts',
    async (
        req: Request<Record<string, never>, ListWeeklyApplicationsResponse>,
        res: Response<ListWeeklyApplicationsResponse>
    ): Promise<void> => {
        try {
            res.status(200).json(await getApplicationsForLatestEightWeeks(req.user.id));
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load weekly job application counts.');
        }
    }
);

router.get(
    '/:jobId/relation-summary',
    async (
        req: Request<JobIdParams, GetApplicationRelationSummaryResponse>,
        res: Response<GetApplicationRelationSummaryResponse>
    ): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendError(res, 422, 'Job application ID must be a positive integer.');
            return;
        }

        try {
            const summary = await getApplicationRelationSummary(jobId, req.user.id, false);
            if (!summary) {
                sendError(res, 404, 'Job application not found.');
                return;
            }
            res.status(200).json(summary);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to load the job application relation summary.');
        }
    }
);

router.delete(
    '/',
    async (req: Request<Record<string, never>, EmptyResponse>, res: Response<EmptyResponse>): Promise<void> => {
        try {
            await deleteAllJobApplications(req.user.id);
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to delete job applications.');
        }
    }
);

router.delete(
    '/:jobId',
    async (req: Request<JobIdParams, EmptyResponse>, res: Response<EmptyResponse>): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendError(res, 422, 'Job application ID must be a positive integer.');
            return;
        }

        try {
            const applicationDeleted = await deleteJobApplication(jobId, req.user.id);
            if (!applicationDeleted) {
                sendError(res, 404, 'Job application not found.');
                return;
            }
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to delete the job application.');
        }
    }
);

router.patch(
    '/:jobId/notes',
    async (
        req: Request<JobIdParams, EmptyResponse, UpdateNotesRequest>,
        res: Response<EmptyResponse>
    ): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendError(res, 422, 'Job application ID must be a positive integer.');
            return;
        }
        if (typeof req.body.notes !== 'string' || req.body.notes.length > FIELD_MAX_LENGTHS.notes) {
            sendError(res, 422, `Notes must be ${FIELD_MAX_LENGTHS.notes} characters or fewer.`);
            return;
        }

        try {
            const notesUpdated = await editNotes(jobId, req.user.id, req.body.notes);
            if (!notesUpdated) {
                sendError(res, 404, 'Job application not found.');
                return;
            }
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to update job application notes.');
        }
    }
);

router.patch(
    '/:jobId/status',
    async (
        req: Request<JobIdParams, EmptyResponse, UpdateApplicationStatusRequest>,
        res: Response<EmptyResponse>
    ): Promise<void> => {
        const jobId = toPositiveInteger(req.params.jobId);
        if (jobId === undefined) {
            sendError(res, 422, 'Job application ID must be a positive integer.');
            return;
        }
        if (!isJobStatus(req.body.jobStatus)) {
            sendError(res, 422, 'A supported job status is required.');
            return;
        }

        try {
            const updateResult = await updateApplicationStatus(req.body.jobStatus, jobId, req.user.id);
            if (updateResult === 'active-interview') {
                sendError(res, 409, 'A job application with an active interview cannot be moved to Applied.');
                return;
            }
            if (updateResult === 'offer-evaluation') {
                sendError(
                    res,
                    409,
                    'Delete the offer evaluation before changing to a status other than Offer, Accepted or Declined.'
                );
                return;
            }
            if (updateResult === 'not-found') {
                sendError(res, 404, 'Job application not found.');
                return;
            }
            res.sendStatus(204);
        } catch (error: unknown) {
            handleRouteError(res, error, 'Unable to change the job application status.');
        }
    }
);

export default router;
