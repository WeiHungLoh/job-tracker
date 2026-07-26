import { JOB_STATUSES, type JobStatus } from '../application/models';

export type DashboardApplicationNavigationState = {
    dashboardJobStatus: JobStatus;
    dashboardApplicationId?: number;
};

export type DashboardInterviewNavigationState = {
    dashboardInterviewId: number;
};

export const getDashboardJobStatus = (state: unknown): JobStatus | null => {
    if (typeof state !== 'object' || state === null || !('dashboardJobStatus' in state)) {
        return null;
    }

    const status = state.dashboardJobStatus;
    return typeof status === 'string' && JOB_STATUSES.includes(status as JobStatus) ? (status as JobStatus) : null;
};

export const getDashboardApplicationId = (state: unknown): number | null => {
    if (typeof state !== 'object' || state === null || !('dashboardApplicationId' in state)) {
        return null;
    }

    const applicationId = state.dashboardApplicationId;
    return typeof applicationId === 'number' && Number.isInteger(applicationId) && applicationId > 0
        ? applicationId
        : null;
};

export const getDashboardInterviewId = (state: unknown): number | null => {
    if (typeof state !== 'object' || state === null || !('dashboardInterviewId' in state)) {
        return null;
    }

    const interviewId = state.dashboardInterviewId;
    return typeof interviewId === 'number' && Number.isInteger(interviewId) && interviewId > 0 ? interviewId : null;
};
