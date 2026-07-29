import type { OfferDecisionFilter } from '../offerDecision/models';

export type DashboardInterviewNavigationState = {
    dashboardInterviewId: number;
};

export type DashboardOfferDecisionFilter = Exclude<OfferDecisionFilter, 'Previous Evaluations'>;
export type DashboardRecordOfferDecisionFilter = Exclude<DashboardOfferDecisionFilter, 'Offers to Evaluate'>;

export type DashboardOfferDecisionNavigationState = {
    dashboardOfferDecisionJobId: number;
    dashboardOfferDecisionFilter: DashboardOfferDecisionFilter;
};

export const getDashboardInterviewId = (state: unknown): number | null => {
    if (typeof state !== 'object' || state === null || !('dashboardInterviewId' in state)) {
        return null;
    }

    const interviewId = state.dashboardInterviewId;
    return typeof interviewId === 'number' && Number.isInteger(interviewId) && interviewId > 0 ? interviewId : null;
};

export const getDashboardOfferDecisionJobId = (state: unknown): number | null => {
    if (typeof state !== 'object' || state === null || !('dashboardOfferDecisionJobId' in state)) {
        return null;
    }

    const jobId = state.dashboardOfferDecisionJobId;
    return typeof jobId === 'number' && Number.isInteger(jobId) && jobId > 0 ? jobId : null;
};

export const getDashboardOfferDecisionFilter = (state: unknown): DashboardOfferDecisionFilter | null => {
    if (typeof state !== 'object' || state === null || !('dashboardOfferDecisionFilter' in state)) {
        return null;
    }

    const filter = state.dashboardOfferDecisionFilter;
    return filter === 'Offers to Evaluate' || filter === 'Evaluated Offers' || filter === 'Expired Evaluated Offers'
        ? filter
        : null;
};
