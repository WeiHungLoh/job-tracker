import { JOB_STATUSES, type JobStatus } from './models';

export type ApplicationCollectionNavigationState = {
    applicationJobStatus?: JobStatus;
    applicationTargetId?: number;
};

export const getApplicationNavigationJobStatus = (state: unknown): JobStatus | null => {
    if (typeof state !== 'object' || state === null || !('applicationJobStatus' in state)) {
        return null;
    }

    const status = state.applicationJobStatus;
    return typeof status === 'string' && JOB_STATUSES.includes(status as JobStatus) ? (status as JobStatus) : null;
};

export const getApplicationNavigationTargetId = (state: unknown): number | null => {
    if (typeof state !== 'object' || state === null || !('applicationTargetId' in state)) {
        return null;
    }

    const applicationId = state.applicationTargetId;
    return typeof applicationId === 'number' && Number.isInteger(applicationId) && applicationId > 0
        ? applicationId
        : null;
};

export const resolveApplicationNavigationJobStatuses = (
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
