import type { JobApplication } from '../application/models';

export type AddInterviewOrigin =
    | { kind: 'application-collection' }
    | { kind: 'dashboard-needs-attention'; category: 'interview-unscheduled' };

export type AddInterviewNavigationState = {
    app?: JobApplication;
    origin?: AddInterviewOrigin;
};

const APPLICATION_COLLECTION_ORIGIN: AddInterviewOrigin = { kind: 'application-collection' };

export const getAddInterviewOrigin = (state: AddInterviewNavigationState | null): AddInterviewOrigin => {
    const origin = state?.origin;
    if (origin?.kind === 'dashboard-needs-attention' && origin.category === 'interview-unscheduled') {
        return origin;
    }

    return APPLICATION_COLLECTION_ORIGIN;
};
