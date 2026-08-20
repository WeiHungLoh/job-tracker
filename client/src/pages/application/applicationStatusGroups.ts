export type ApplicationPipelineStatus = 'Applied' | 'Interview' | 'Offer' | 'Accepted';
export type ClosedOutcomeStatus = 'Rejected' | 'Withdrawn' | 'Ghosted' | 'Declined';

export const APPLICATION_PIPELINE_STATUSES: readonly ApplicationPipelineStatus[] = [
    'Applied',
    'Interview',
    'Offer',
    'Accepted',
];

export const CLOSED_OUTCOME_STATUSES: readonly ClosedOutcomeStatus[] = ['Rejected', 'Withdrawn', 'Ghosted', 'Declined'];
