import { JOB_STATUSES, type JobStatus } from './models';

export type ApplicationListNavigationState = {
    applicationListJobStatus?: JobStatus;
    applicationListTargetId?: number;
};

export const getApplicationListJobStatus = (state: unknown): JobStatus | null => {
    if (typeof state !== 'object' || state === null || !('applicationListJobStatus' in state)) {
        return null;
    }

    const status = state.applicationListJobStatus;
    return typeof status === 'string' && JOB_STATUSES.includes(status as JobStatus) ? (status as JobStatus) : null;
};

export const getApplicationListTargetId = (state: unknown): number | null => {
    if (typeof state !== 'object' || state === null || !('applicationListTargetId' in state)) {
        return null;
    }

    const applicationId = state.applicationListTargetId;
    return typeof applicationId === 'number' && Number.isInteger(applicationId) && applicationId > 0
        ? applicationId
        : null;
};

export const getApplicationListJobStatuses = (
    selectedJobStatuses: JobStatus[],
    targetJobStatus: JobStatus | null,
    targetApplicationId: number | null
): JobStatus[] => {
    if (!targetJobStatus) {
        return selectedJobStatuses;
    }
    if (targetApplicationId !== null) {
        return selectedJobStatuses.includes(targetJobStatus)
            ? selectedJobStatuses
            : [...selectedJobStatuses, targetJobStatus];
    }
    return selectedJobStatuses.length === 1 && selectedJobStatuses[0] === targetJobStatus
        ? selectedJobStatuses
        : [targetJobStatus];
};
