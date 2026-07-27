import type { ArchivedJobApplication, JobApplication, JobStatus } from '../../application/models';
import type { ArchivedJobInterview, JobInterview } from '../../interview/models';
import { createDemoInitialState } from './demoInitialState';
import type { DemoState } from '../models';
import type { UpdateUserPreferencesRequest } from '../../../components/userPreferences/models';
import type {
    CounterofferPlan,
    OfferEvaluation,
    SaveCounterofferPlanRequest,
    SaveOfferEvaluationRequest,
} from '../../offerDecision/models';
import { isApplicationStatusDisabled } from '../../application/applicationStatusRestrictions';

type CreateApplicationPayload = {
    applicationDate: Date;
    companyName: string;
    jobLocation: string;
    jobStatus: JobStatus;
    jobTitle: string;
    jobURL: string;
};

type CreateInterviewPayload = {
    interviewDate: Date;
    interviewDurationMinutes: number;
    interviewLocation: string;
    interviewType: string;
    jobId: number;
    notes: string;
};

type SaveOfferEvaluationPayload = {
    jobId: number;
    request: SaveOfferEvaluationRequest;
};

type SaveCounterofferPlanPayload = {
    jobId: number;
    request: SaveCounterofferPlanRequest;
};

export type DemoAction =
    | { type: 'CREATE_APPLICATION'; payload: CreateApplicationPayload }
    | { type: 'UPDATE_APPLICATION_STATUS'; payload: { jobId: number; jobStatus: JobStatus } }
    | { type: 'MARK_APPLICATION_FOLLOW_UP_SENT'; payload: { jobId: number; sentAt: string } }
    | { type: 'UNDO_APPLICATION_FOLLOW_UP'; payload: { jobId: number } }
    | { type: 'UPDATE_APPLICATION_NOTES'; payload: { jobId: number; notes: string } }
    | { type: 'DELETE_APPLICATION'; payload: { jobId: number } }
    | { type: 'DELETE_ALL_APPLICATIONS' }
    | { type: 'ARCHIVE_APPLICATION'; payload: { jobId: number } }
    | { type: 'ARCHIVE_ALL_APPLICATIONS' }
    | { type: 'RESTORE_APPLICATION'; payload: { archivedJobId: number } }
    | { type: 'UNARCHIVE_ALL_APPLICATIONS' }
    | { type: 'DELETE_ARCHIVED_APPLICATION'; payload: { archivedJobId: number } }
    | { type: 'DELETE_ALL_ARCHIVED_APPLICATIONS' }
    | { type: 'CREATE_INTERVIEW'; payload: CreateInterviewPayload }
    | { type: 'DELETE_INTERVIEW'; payload: { interviewId: number } }
    | { type: 'MARK_INTERVIEW_FOLLOW_UP_SENT'; payload: { interviewId: number; sentAt: string } }
    | { type: 'UNDO_INTERVIEW_FOLLOW_UP'; payload: { interviewId: number } }
    | { type: 'DELETE_ALL_INTERVIEWS' }
    | { type: 'DELETE_ARCHIVED_INTERVIEW'; payload: { archivedInterviewId: number } }
    | { type: 'DELETE_ALL_ARCHIVED_INTERVIEWS' }
    | { type: 'SAVE_OFFER_EVALUATION'; payload: SaveOfferEvaluationPayload }
    | { type: 'DELETE_OFFER_EVALUATION'; payload: { jobId: number } }
    | { type: 'DELETE_ALL_OFFER_EVALUATIONS'; payload: { archived: boolean } }
    | { type: 'SAVE_COUNTEROFFER_PLAN'; payload: SaveCounterofferPlanPayload }
    | { type: 'DELETE_COUNTEROFFER_PLAN'; payload: { jobId: number } }
    | { type: 'UPDATE_PREFERENCES'; payload: UpdateUserPreferencesRequest }
    | { type: 'RESET_DEMO'; payload?: { now?: Date } };

const toArchivedApplication = (application: JobApplication): ArchivedJobApplication => ({
    archived_job_id: application.job_id,
    company_name: application.company_name,
    job_title: application.job_title,
    application_date: application.application_date,
    job_status: application.job_status,
    job_location: application.job_location,
    job_posting_url: application.job_posting_url,
    notes: application.notes,
    application_follow_up_sent_at: application.application_follow_up_sent_at ?? null,
});

const toActiveApplication = (application: ArchivedJobApplication): JobApplication => ({
    job_id: application.archived_job_id,
    company_name: application.company_name,
    job_title: application.job_title,
    application_date: application.application_date,
    job_status: application.job_status,
    job_location: application.job_location,
    job_posting_url: application.job_posting_url,
    notes: application.notes,
    application_follow_up_sent_at: application.application_follow_up_sent_at ?? null,
});

const toArchivedInterview = (interview: JobInterview, application: JobApplication): ArchivedJobInterview => ({
    archived_interview_id: interview.interview_id,
    archived_job_id: interview.job_id,
    company_name: application.company_name,
    job_title: application.job_title,
    job_status: application.job_status,
    interview_date: interview.interview_date,
    interview_duration_minutes: interview.interview_duration_minutes,
    interview_location: interview.interview_location,
    interview_type: interview.interview_type,
    interview_notes: interview.interview_notes,
    follow_up_sent_at: interview.follow_up_sent_at ?? null,
});

const toActiveInterview = (interview: ArchivedJobInterview, application: ArchivedJobApplication): JobInterview => ({
    interview_id: interview.archived_interview_id,
    job_id: interview.archived_job_id,
    company_name: application.company_name,
    job_title: application.job_title,
    job_status: application.job_status,
    interview_date: interview.interview_date,
    interview_duration_minutes: interview.interview_duration_minutes,
    interview_location: interview.interview_location,
    interview_type: interview.interview_type,
    interview_notes: interview.interview_notes,
    follow_up_sent_at: interview.follow_up_sent_at ?? null,
});

const mergePreferences = (state: DemoState, updatedPreferences: UpdateUserPreferencesRequest): DemoState => {
    const preferences = {
        ...state.preferences,
        ...updatedPreferences,
    };

    return { ...state, preferences };
};

const removeOfferEvaluations = (
    offerEvaluations: Record<number, OfferEvaluation>,
    jobIds: readonly number[]
): Record<number, OfferEvaluation> => {
    const remainingEvaluations = { ...offerEvaluations };
    jobIds.forEach((jobId) => delete remainingEvaluations[jobId]);
    return remainingEvaluations;
};

const removeCounterofferPlans = (
    counterofferPlans: Record<number, CounterofferPlan>,
    jobIds: readonly number[]
): Record<number, CounterofferPlan> => {
    const remainingPlans = { ...counterofferPlans };
    jobIds.forEach((jobId) => delete remainingPlans[jobId]);
    return remainingPlans;
};

export const demoReducer = (state: DemoState, action: DemoAction): DemoState => {
    switch (action.type) {
        case 'CREATE_APPLICATION': {
            const { applicationDate, companyName, jobLocation, jobStatus, jobTitle, jobURL } = action.payload;
            const application: JobApplication = {
                job_id: state.nextApplicationId,
                company_name: companyName,
                job_title: jobTitle,
                application_date: applicationDate.toISOString(),
                job_status: jobStatus,
                job_location: jobLocation,
                job_posting_url: jobURL,
                notes: '',
            };

            return {
                ...state,
                applications: [...state.applications, application],
                nextApplicationId: state.nextApplicationId + 1,
            };
        }

        case 'UPDATE_APPLICATION_STATUS': {
            const hasInterview = state.interviews.some((interview) => interview.job_id === action.payload.jobId);
            if (
                isApplicationStatusDisabled(
                    action.payload.jobStatus,
                    hasInterview,
                    Boolean(state.offerEvaluations[action.payload.jobId])
                )
            ) {
                return state;
            }
            return {
                ...state,
                applications: state.applications.map((application) =>
                    application.job_id === action.payload.jobId
                        ? {
                              ...application,
                              job_status: action.payload.jobStatus,
                              application_follow_up_sent_at:
                                  action.payload.jobStatus === 'Applied'
                                      ? application.application_follow_up_sent_at ?? null
                                      : null,
                          }
                        : application
                ),
            };
        }

        case 'MARK_APPLICATION_FOLLOW_UP_SENT':
            return {
                ...state,
                applications: state.applications.map((application) =>
                    application.job_id === action.payload.jobId && application.job_status === 'Applied'
                        ? { ...application, application_follow_up_sent_at: action.payload.sentAt }
                        : application
                ),
            };

        case 'UNDO_APPLICATION_FOLLOW_UP':
            return {
                ...state,
                applications: state.applications.map((application) =>
                    application.job_id === action.payload.jobId && application.job_status === 'Applied'
                        ? { ...application, application_follow_up_sent_at: null }
                        : application
                ),
            };

        case 'UPDATE_APPLICATION_NOTES':
            return {
                ...state,
                applications: state.applications.map((application) =>
                    application.job_id === action.payload.jobId
                        ? { ...application, notes: action.payload.notes }
                        : application
                ),
            };

        case 'DELETE_APPLICATION':
            return {
                ...state,
                applications: state.applications.filter((application) => application.job_id !== action.payload.jobId),
                interviews: state.interviews.filter((interview) => interview.job_id !== action.payload.jobId),
                offerEvaluations: removeOfferEvaluations(state.offerEvaluations, [action.payload.jobId]),
                counterofferPlans: removeCounterofferPlans(state.counterofferPlans, [action.payload.jobId]),
            };

        case 'DELETE_ALL_APPLICATIONS':
            return {
                ...state,
                applications: [],
                interviews: [],
                offerEvaluations: removeOfferEvaluations(
                    state.offerEvaluations,
                    state.applications.map((application) => application.job_id)
                ),
                counterofferPlans: removeCounterofferPlans(
                    state.counterofferPlans,
                    state.applications.map((application) => application.job_id)
                ),
            };

        case 'ARCHIVE_APPLICATION': {
            const application = state.applications.find((item) => item.job_id === action.payload.jobId);
            if (!application) {
                return state;
            }

            const linkedInterviews = state.interviews
                .filter((interview) => interview.job_id === application.job_id)
                .map((interview) => toArchivedInterview(interview, application));

            return {
                ...state,
                applications: state.applications.filter((item) => item.job_id !== application.job_id),
                archivedApplications: [...state.archivedApplications, toArchivedApplication(application)],
                interviews: state.interviews.filter((interview) => interview.job_id !== application.job_id),
                archivedInterviews: [...state.archivedInterviews, ...linkedInterviews],
            };
        }

        case 'ARCHIVE_ALL_APPLICATIONS': {
            const applicationsById = new Map(
                state.applications.map((application) => [application.job_id, application])
            );
            const archivedInterviews = state.interviews.flatMap((interview) => {
                const application = applicationsById.get(interview.job_id);
                return application ? [toArchivedInterview(interview, application)] : [];
            });

            return {
                ...state,
                applications: [],
                archivedApplications: [...state.archivedApplications, ...state.applications.map(toArchivedApplication)],
                interviews: [],
                archivedInterviews: [...state.archivedInterviews, ...archivedInterviews],
            };
        }

        case 'RESTORE_APPLICATION': {
            const application = state.archivedApplications.find(
                (item) => item.archived_job_id === action.payload.archivedJobId
            );
            if (!application) {
                return state;
            }

            const linkedInterviews = state.archivedInterviews
                .filter((interview) => interview.archived_job_id === application.archived_job_id)
                .map((interview) => toActiveInterview(interview, application));

            return {
                ...state,
                applications: [...state.applications, toActiveApplication(application)],
                archivedApplications: state.archivedApplications.filter(
                    (item) => item.archived_job_id !== application.archived_job_id
                ),
                interviews: [...state.interviews, ...linkedInterviews],
                archivedInterviews: state.archivedInterviews.filter(
                    (interview) => interview.archived_job_id !== application.archived_job_id
                ),
            };
        }

        case 'UNARCHIVE_ALL_APPLICATIONS': {
            const applicationsById = new Map(
                state.archivedApplications.map((application) => [application.archived_job_id, application])
            );
            const interviews = state.archivedInterviews.flatMap((interview) => {
                const application = applicationsById.get(interview.archived_job_id);
                return application ? [toActiveInterview(interview, application)] : [];
            });

            return {
                ...state,
                applications: [...state.applications, ...state.archivedApplications.map(toActiveApplication)],
                archivedApplications: [],
                interviews: [...state.interviews, ...interviews],
                archivedInterviews: [],
            };
        }

        case 'DELETE_ARCHIVED_APPLICATION':
            return {
                ...state,
                archivedApplications: state.archivedApplications.filter(
                    (application) => application.archived_job_id !== action.payload.archivedJobId
                ),
                archivedInterviews: state.archivedInterviews.filter(
                    (interview) => interview.archived_job_id !== action.payload.archivedJobId
                ),
                offerEvaluations: removeOfferEvaluations(state.offerEvaluations, [action.payload.archivedJobId]),
                counterofferPlans: removeCounterofferPlans(state.counterofferPlans, [action.payload.archivedJobId]),
            };

        case 'DELETE_ALL_ARCHIVED_APPLICATIONS':
            return {
                ...state,
                archivedApplications: [],
                archivedInterviews: [],
                offerEvaluations: removeOfferEvaluations(
                    state.offerEvaluations,
                    state.archivedApplications.map((application) => application.archived_job_id)
                ),
                counterofferPlans: removeCounterofferPlans(
                    state.counterofferPlans,
                    state.archivedApplications.map((application) => application.archived_job_id)
                ),
            };

        case 'CREATE_INTERVIEW': {
            const application = state.applications.find((item) => item.job_id === action.payload.jobId);
            if (!application) {
                return state;
            }

            const interview: JobInterview = {
                interview_id: state.nextInterviewId,
                job_id: application.job_id,
                company_name: application.company_name,
                job_title: application.job_title,
                job_status: application.job_status,
                interview_date: action.payload.interviewDate.toISOString(),
                interview_duration_minutes: action.payload.interviewDurationMinutes,
                interview_location: action.payload.interviewLocation,
                interview_type: action.payload.interviewType,
                interview_notes: action.payload.notes,
            };

            return {
                ...state,
                interviews: [...state.interviews, interview],
                nextInterviewId: state.nextInterviewId + 1,
            };
        }

        case 'DELETE_INTERVIEW':
            return {
                ...state,
                interviews: state.interviews.filter(
                    (interview) => interview.interview_id !== action.payload.interviewId
                ),
            };

        case 'MARK_INTERVIEW_FOLLOW_UP_SENT':
            return {
                ...state,
                interviews: state.interviews.map((interview) =>
                    interview.interview_id === action.payload.interviewId
                        ? { ...interview, follow_up_sent_at: action.payload.sentAt }
                        : interview
                ),
            };

        case 'UNDO_INTERVIEW_FOLLOW_UP':
            return {
                ...state,
                interviews: state.interviews.map((interview) =>
                    interview.interview_id === action.payload.interviewId
                        ? { ...interview, follow_up_sent_at: null }
                        : interview
                ),
            };

        case 'DELETE_ALL_INTERVIEWS':
            return { ...state, interviews: [] };

        case 'DELETE_ARCHIVED_INTERVIEW':
            return {
                ...state,
                archivedInterviews: state.archivedInterviews.filter(
                    (interview) => interview.archived_interview_id !== action.payload.archivedInterviewId
                ),
            };

        case 'DELETE_ALL_ARCHIVED_INTERVIEWS':
            return { ...state, archivedInterviews: [] };

        case 'SAVE_OFFER_EVALUATION': {
            const { jobId, request } = action.payload;
            const application = state.applications.find((candidate) => candidate.job_id === jobId);
            if (application?.job_status !== 'Offer') {
                return state;
            }

            return {
                ...state,
                offerEvaluations: {
                    ...state.offerEvaluations,
                    [jobId]: {
                        job_id: jobId,
                        ratings: { ...request.ratings },
                        details: { ...request.details },
                    },
                },
            };
        }

        case 'DELETE_OFFER_EVALUATION':
            return {
                ...state,
                offerEvaluations: removeOfferEvaluations(state.offerEvaluations, [action.payload.jobId]),
                counterofferPlans: removeCounterofferPlans(state.counterofferPlans, [action.payload.jobId]),
            };

        case 'DELETE_ALL_OFFER_EVALUATIONS': {
            const jobIds = action.payload.archived
                ? state.archivedApplications.map((application) => application.archived_job_id)
                : state.applications.map((application) => application.job_id);
            return {
                ...state,
                offerEvaluations: removeOfferEvaluations(state.offerEvaluations, jobIds),
                counterofferPlans: removeCounterofferPlans(state.counterofferPlans, jobIds),
            };
        }

        case 'SAVE_COUNTEROFFER_PLAN':
            return {
                ...state,
                counterofferPlans: {
                    ...state.counterofferPlans,
                    [action.payload.jobId]: {
                        ...action.payload.request,
                        ratings: { ...action.payload.request.ratings },
                    },
                },
            };

        case 'DELETE_COUNTEROFFER_PLAN':
            return {
                ...state,
                counterofferPlans: removeCounterofferPlans(state.counterofferPlans, [action.payload.jobId]),
            };

        case 'UPDATE_PREFERENCES':
            return mergePreferences(state, action.payload);

        case 'RESET_DEMO':
            return createDemoInitialState(action.payload?.now);

        default:
            return state;
    }
};
