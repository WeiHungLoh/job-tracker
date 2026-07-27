import type {
    ArchiveApplicationRequest,
    ArchiveApplicationResponse,
    ArchiveAllApplicationsRequest,
    ArchiveAllApplicationsResponse,
    DeleteAllArchivedApplicationsRequest,
    DeleteAllArchivedApplicationsResponse,
    DeleteArchivedApplicationRequest,
    DeleteArchivedApplicationResponse,
    ListArchivedApplicationsRequest,
    ListArchivedApplicationsResponse,
    GetApplicationCollectionSummaryRequest,
    GetApplicationCollectionSummaryResponse,
    GetArchivedApplicationRelationSummaryRequest,
    GetArchivedApplicationRelationSummaryResponse,
    UnarchiveAllApplicationsRequest,
    UnarchiveAllApplicationsResponse,
    UnarchiveApplicationRequest,
    UnarchiveApplicationResponse,
} from '../pages/application/models';
import type {
    CreateApplicationRequest,
    CreateApplicationResponse,
    DeleteAllApplicationsRequest,
    DeleteAllApplicationsResponse,
    DeleteApplicationRequest,
    DeleteApplicationResponse,
    ListApplicationsRequest,
    ListApplicationsResponse,
    ListJobStatusCountsRequest,
    ListJobStatusCountsResponse,
    ListWeeklyApplicationsRequest,
    ListWeeklyApplicationsResponse,
    GetApplicationRelationSummaryRequest,
    GetApplicationRelationSummaryResponse,
    UpdateApplicationStatusRequest,
    UpdateApplicationStatusResponse,
    MarkApplicationFollowUpRequest,
    MarkApplicationFollowUpResponse,
    UndoApplicationFollowUpRequest,
    UndoApplicationFollowUpResponse,
    UpdateNotesRequest,
    UpdateNotesResponse,
} from '../pages/application/models';
import type {
    CreateInterviewRequest,
    CreateInterviewResponse,
    DeleteAllInterviewsRequest,
    DeleteAllInterviewsResponse,
    DeleteAllArchivedInterviewsRequest,
    DeleteAllArchivedInterviewsResponse,
    DeleteArchivedInterviewRequest,
    DeleteArchivedInterviewResponse,
    DeleteInterviewRequest,
    DeleteInterviewResponse,
    ListArchivedInterviewsRequest,
    ListArchivedInterviewsResponse,
    ListInterviewsRequest,
    ListInterviewsResponse,
    GetInterviewCollectionSummaryRequest,
    GetInterviewCollectionSummaryResponse,
    MarkInterviewFollowUpRequest,
    MarkInterviewFollowUpResponse,
    UndoInterviewFollowUpRequest,
    UndoInterviewFollowUpResponse,
} from '../pages/interview/models';
import type {
    GetUserPreferencesRequest,
    GetUserPreferencesResponse,
    UpdateUserPreferencesRequest,
    UpdateUserPreferencesResponse,
} from '../components/userPreferences/models';
import type {
    LogoutRequest,
    LogoutResponse,
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    SignUpResponse,
    VerifyAuthenticationRequest,
    VerifyAuthenticationResponse,
} from '../pages/authentication/models';
import type {
    DeleteAllOfferEvaluationsRequest,
    DeleteAllOfferEvaluationsResponse,
    DeleteOfferEvaluationRequest,
    DeleteOfferEvaluationResponse,
    DeleteCounterofferPlanRequest,
    DeleteCounterofferPlanResponse,
    GetActiveOfferDecisionsRequest,
    GetArchivedOfferDecisionsRequest,
    GetOfferDecisionsResponse,
    GetCounterofferPlanRequest,
    GetCounterofferPlanResponse,
    SaveOfferEvaluationAPIRequest,
    SaveOfferEvaluationResponse,
    SaveCounterofferPlanAPIRequest,
    SaveCounterofferPlanResponse,
} from '../pages/offerDecision/models';
import { endpointConfig } from './endpointConfig';
import { makeAuthenticatedJobTrackerAPIRequest, makeJobTrackerAPIRequest } from './api';
import { useMemo } from 'react';

export const useJobTrackerAPI = () => {
    const jobTrackerAPI = useMemo(() => {
        const signIn = async (req: SignInRequest) => {
            return await makeJobTrackerAPIRequest<SignInRequest, SignInResponse>(
                req,
                endpointConfig.authentication.signIn
            );
        };

        const signUp = async (req: SignUpRequest) => {
            return await makeJobTrackerAPIRequest<SignUpRequest, SignUpResponse>(
                req,
                endpointConfig.authentication.signUp
            );
        };

        const verify = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                VerifyAuthenticationRequest,
                VerifyAuthenticationResponse
            >(null, endpointConfig.authentication.verify);
        };

        const logout = async () => {
            return await makeJobTrackerAPIRequest<LogoutRequest, LogoutResponse>(
                null,
                endpointConfig.authentication.logout
            );
        };

        const listApplications = async (req: ListApplicationsRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<ListApplicationsRequest, ListApplicationsResponse>(
                req,
                endpointConfig.application.listApplications
            );
        };

        const listWeeklyApplications = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                ListWeeklyApplicationsRequest,
                ListWeeklyApplicationsResponse
            >(null, endpointConfig.application.listWeeklyApplications);
        };

        const listJobStatusCounts = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<ListJobStatusCountsRequest, ListJobStatusCountsResponse>(
                null,
                endpointConfig.application.listJobStatusCounts
            );
        };

        const getApplicationSummary = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                GetApplicationCollectionSummaryRequest,
                GetApplicationCollectionSummaryResponse
            >(null, endpointConfig.application.getSummary);
        };

        const getApplicationRelationSummary = async (req: GetApplicationRelationSummaryRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                GetApplicationRelationSummaryRequest,
                GetApplicationRelationSummaryResponse
            >(req, endpointConfig.application.getRelationSummary);
        };

        const createApplication = async (req: CreateApplicationRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<CreateApplicationRequest, CreateApplicationResponse>(
                req,
                endpointConfig.application.createApplication
            );
        };

        const deleteApplication = async (req: DeleteApplicationRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<DeleteApplicationRequest, DeleteApplicationResponse>(
                req,
                endpointConfig.application.deleteApplication
            );
        };

        const deleteAllApplications = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteAllApplicationsRequest,
                DeleteAllApplicationsResponse
            >(null, endpointConfig.application.deleteAllApplications);
        };

        const updateNotes = async (req: UpdateNotesRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<UpdateNotesRequest, UpdateNotesResponse>(
                req,
                endpointConfig.application.updateNotes
            );
        };

        const updateApplicationStatus = async (req: UpdateApplicationStatusRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                UpdateApplicationStatusRequest,
                UpdateApplicationStatusResponse
            >(req, endpointConfig.application.updateStatus);
        };

        const markApplicationFollowUpSent = async (req: MarkApplicationFollowUpRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                MarkApplicationFollowUpRequest,
                MarkApplicationFollowUpResponse
            >(req, endpointConfig.application.markFollowUpSent);
        };

        const undoApplicationFollowUp = async (req: UndoApplicationFollowUpRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                UndoApplicationFollowUpRequest,
                UndoApplicationFollowUpResponse
            >(req, endpointConfig.application.undoFollowUp);
        };

        const listInterviews = async (req: ListInterviewsRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<ListInterviewsRequest, ListInterviewsResponse>(
                req,
                endpointConfig.interview.listInterviews
            );
        };

        const getInterviewSummary = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                GetInterviewCollectionSummaryRequest,
                GetInterviewCollectionSummaryResponse
            >(null, endpointConfig.interview.getSummary);
        };

        const createInterview = async (req: CreateInterviewRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<CreateInterviewRequest, CreateInterviewResponse>(
                req,
                endpointConfig.interview.createInterview
            );
        };

        const deleteInterview = async (req: DeleteInterviewRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<DeleteInterviewRequest, DeleteInterviewResponse>(
                req,
                endpointConfig.interview.deleteInterview
            );
        };

        const deleteAllInterviews = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<DeleteAllInterviewsRequest, DeleteAllInterviewsResponse>(
                null,
                endpointConfig.interview.deleteAllInterviews
            );
        };

        const markInterviewFollowUpSent = async (req: MarkInterviewFollowUpRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                MarkInterviewFollowUpRequest,
                MarkInterviewFollowUpResponse
            >(req, endpointConfig.interview.markFollowUpSent);
        };

        const undoInterviewFollowUp = async (req: UndoInterviewFollowUpRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                UndoInterviewFollowUpRequest,
                UndoInterviewFollowUpResponse
            >(req, endpointConfig.interview.undoFollowUp);
        };

        const listArchivedApplications = async (req: ListArchivedApplicationsRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                ListArchivedApplicationsRequest,
                ListArchivedApplicationsResponse
            >(req, endpointConfig.archivedApplication.listApplications);
        };

        const archiveApplication = async (req: ArchiveApplicationRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<ArchiveApplicationRequest, ArchiveApplicationResponse>(
                req,
                endpointConfig.archivedApplication.archiveApplication
            );
        };

        const archiveAllApplications = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                ArchiveAllApplicationsRequest,
                ArchiveAllApplicationsResponse
            >(null, endpointConfig.archivedApplication.archiveAllApplications);
        };

        const unarchiveAllApplications = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                UnarchiveAllApplicationsRequest,
                UnarchiveAllApplicationsResponse
            >(null, endpointConfig.archivedApplication.unarchiveAllApplications);
        };

        const getArchivedApplicationSummary = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                GetApplicationCollectionSummaryRequest,
                GetApplicationCollectionSummaryResponse
            >(null, endpointConfig.archivedApplication.getSummary);
        };

        const getArchivedApplicationRelationSummary = async (req: GetArchivedApplicationRelationSummaryRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                GetArchivedApplicationRelationSummaryRequest,
                GetArchivedApplicationRelationSummaryResponse
            >(req, endpointConfig.archivedApplication.getRelationSummary);
        };

        const deleteArchivedApplication = async (req: DeleteArchivedApplicationRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteArchivedApplicationRequest,
                DeleteArchivedApplicationResponse
            >(req, endpointConfig.archivedApplication.deleteApplication);
        };

        const deleteAllArchivedApplications = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteAllArchivedApplicationsRequest,
                DeleteAllArchivedApplicationsResponse
            >(null, endpointConfig.archivedApplication.deleteAllApplications);
        };

        const unarchiveApplication = async (req: UnarchiveApplicationRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                UnarchiveApplicationRequest,
                UnarchiveApplicationResponse
            >(req, endpointConfig.archivedApplication.unarchiveApplication);
        };

        const listArchivedInterviews = async (req: ListArchivedInterviewsRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                ListArchivedInterviewsRequest,
                ListArchivedInterviewsResponse
            >(req, endpointConfig.archivedInterview.listInterviews);
        };

        const getArchivedInterviewSummary = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                GetInterviewCollectionSummaryRequest,
                GetInterviewCollectionSummaryResponse
            >(null, endpointConfig.archivedInterview.getSummary);
        };

        const deleteArchivedInterview = async (req: DeleteArchivedInterviewRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteArchivedInterviewRequest,
                DeleteArchivedInterviewResponse
            >(req, endpointConfig.archivedInterview.deleteInterview);
        };

        const deleteAllArchivedInterviews = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteAllArchivedInterviewsRequest,
                DeleteAllArchivedInterviewsResponse
            >(null, endpointConfig.archivedInterview.deleteAllInterviews);
        };

        const getActiveOfferDecisions = async (req: GetActiveOfferDecisionsRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                GetActiveOfferDecisionsRequest,
                GetOfferDecisionsResponse
            >(req, endpointConfig.offerDecision.getActive);
        };

        const getArchivedOfferDecisions = async (req: GetArchivedOfferDecisionsRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                GetArchivedOfferDecisionsRequest,
                GetOfferDecisionsResponse
            >(req, endpointConfig.offerDecision.getArchived);
        };

        const saveOfferEvaluation = async (req: SaveOfferEvaluationAPIRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                SaveOfferEvaluationAPIRequest,
                SaveOfferEvaluationResponse
            >(req, endpointConfig.offerDecision.saveEvaluation);
        };

        const deleteOfferEvaluation = async (req: DeleteOfferEvaluationRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteOfferEvaluationRequest,
                DeleteOfferEvaluationResponse
            >(req, endpointConfig.offerDecision.deleteEvaluation);
        };

        const deleteAllActiveOfferEvaluations = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteAllOfferEvaluationsRequest,
                DeleteAllOfferEvaluationsResponse
            >(null, endpointConfig.offerDecision.deleteAllActiveEvaluations);
        };

        const deleteAllArchivedOfferEvaluations = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteAllOfferEvaluationsRequest,
                DeleteAllOfferEvaluationsResponse
            >(null, endpointConfig.offerDecision.deleteAllArchivedEvaluations);
        };

        const getCounterofferPlan = async (req: GetCounterofferPlanRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<GetCounterofferPlanRequest, GetCounterofferPlanResponse>(
                req,
                endpointConfig.offerDecision.getCounterofferPlan
            );
        };

        const saveCounterofferPlan = async (req: SaveCounterofferPlanAPIRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                SaveCounterofferPlanAPIRequest,
                SaveCounterofferPlanResponse
            >(req, endpointConfig.offerDecision.saveCounterofferPlan);
        };

        const deleteCounterofferPlan = async (req: DeleteCounterofferPlanRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                DeleteCounterofferPlanRequest,
                DeleteCounterofferPlanResponse
            >(req, endpointConfig.offerDecision.deleteCounterofferPlan);
        };

        const getUserPreferences = async () => {
            return await makeAuthenticatedJobTrackerAPIRequest<GetUserPreferencesRequest, GetUserPreferencesResponse>(
                null,
                endpointConfig.userPreferences.get
            );
        };

        const updateUserPreferences = async (req: UpdateUserPreferencesRequest) => {
            return await makeAuthenticatedJobTrackerAPIRequest<
                UpdateUserPreferencesRequest,
                UpdateUserPreferencesResponse
            >(req, endpointConfig.userPreferences.update);
        };

        return {
            authentication: { signIn, signUp, verify, logout },
            application: {
                listApplications,
                listWeeklyApplications,
                listJobStatusCounts,
                getSummary: getApplicationSummary,
                getRelationSummary: getApplicationRelationSummary,
                createApplication,
                deleteApplication,
                deleteAllApplications,
                updateNotes,
                updateStatus: updateApplicationStatus,
                markFollowUpSent: markApplicationFollowUpSent,
                undoFollowUp: undoApplicationFollowUp,
            },
            interview: {
                listInterviews,
                getSummary: getInterviewSummary,
                createInterview,
                deleteInterview,
                deleteAllInterviews,
                markFollowUpSent: markInterviewFollowUpSent,
                undoFollowUp: undoInterviewFollowUp,
            },
            archivedApplication: {
                listApplications: listArchivedApplications,
                archiveApplication,
                archiveAllApplications,
                unarchiveAllApplications,
                getSummary: getArchivedApplicationSummary,
                getRelationSummary: getArchivedApplicationRelationSummary,
                deleteApplication: deleteArchivedApplication,
                deleteAllApplications: deleteAllArchivedApplications,
                unarchiveApplication,
            },
            archivedInterview: {
                listInterviews: listArchivedInterviews,
                getSummary: getArchivedInterviewSummary,
                deleteInterview: deleteArchivedInterview,
                deleteAllInterviews: deleteAllArchivedInterviews,
            },
            offerDecision: {
                deleteAllActiveEvaluations: deleteAllActiveOfferEvaluations,
                deleteAllArchivedEvaluations: deleteAllArchivedOfferEvaluations,
                getActive: getActiveOfferDecisions,
                getArchived: getArchivedOfferDecisions,
                saveEvaluation: saveOfferEvaluation,
                deleteEvaluation: deleteOfferEvaluation,
                getCounterofferPlan,
                saveCounterofferPlan,
                deleteCounterofferPlan,
            },
            userPreferences: {
                get: getUserPreferences,
                update: updateUserPreferences,
            },
        };
    }, []);

    return jobTrackerAPI;
};
