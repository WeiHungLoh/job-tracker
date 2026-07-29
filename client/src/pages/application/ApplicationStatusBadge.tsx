import type { JobStatus } from './models';
import styles from './ApplicationCard.module.css';
import boardStyles from './applicationBoard/ApplicationBoard.module.css';
import { getApplicationBoardStatusClassName } from './applicationBoard/statusClassNames';

const JOB_STATUS_CLASS_MAP: Record<JobStatus, string> = {
    Accepted: styles.accepted,
    Applied: styles.applied,
    Declined: styles.declined,
    Ghosted: styles.ghosted,
    Interview: styles.interview,
    Offer: styles.offer,
    Rejected: styles.rejected,
    Withdrawn: styles.withdrawn,
};

type ApplicationStatusBadgeProps = {
    compact?: boolean;
    jobStatus: JobStatus;
    showLabel?: boolean;
};

const ApplicationStatusBadge = ({ compact = false, jobStatus, showLabel = false }: ApplicationStatusBadgeProps) => {
    const className = compact
        ? `${boardStyles.statusBadge} ${getApplicationBoardStatusClassName(jobStatus)}`
        : JOB_STATUS_CLASS_MAP[jobStatus];

    return <span className={className}>{showLabel ? `Job Status: ${jobStatus}` : jobStatus}</span>;
};

export default ApplicationStatusBadge;
