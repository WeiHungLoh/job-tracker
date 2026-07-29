import type { JobStatus } from '../models';
import styles from './ApplicationBoard.module.css';

const STATUS_CLASS_MAP: Record<JobStatus, string> = {
    Accepted: styles.accepted,
    Applied: styles.applied,
    Declined: styles.declined,
    Ghosted: styles.ghosted,
    Interview: styles.interview,
    Offer: styles.offer,
    Rejected: styles.rejected,
    Withdrawn: styles.withdrawn,
};

const STATUS_COLOR_MAP: Record<JobStatus, string> = {
    Accepted: 'var(--colorStatusAccepted)',
    Applied: 'var(--colorStatusApplied)',
    Declined: 'var(--colorStatusDeclined)',
    Ghosted: 'var(--colorStatusGhosted)',
    Interview: 'var(--colorStatusInterview)',
    Offer: 'var(--colorStatusOffer)',
    Rejected: 'var(--colorStatusRejected)',
    Withdrawn: 'var(--colorStatusWithdrawn)',
};

export const getApplicationBoardStatusClassName = (jobStatus: JobStatus): string => STATUS_CLASS_MAP[jobStatus];

export const getApplicationBoardStatusColor = (jobStatus: JobStatus): string => STATUS_COLOR_MAP[jobStatus];
