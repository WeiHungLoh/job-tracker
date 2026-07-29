import type { JobStatus } from '../../../application/models';
import styles from './StatusLegend.module.css';

type StatusLegendProps = {
    label: string;
    statuses: readonly JobStatus[];
    hiddenStatuses: ReadonlySet<JobStatus>;
    onStatusToggle: (status: JobStatus) => void;
};

const statusClassNames: Record<JobStatus, string> = {
    Accepted: styles.accepted,
    Applied: styles.applied,
    Declined: styles.declined,
    Ghosted: styles.ghosted,
    Interview: styles.interview,
    Offer: styles.offer,
    Rejected: styles.rejected,
    Withdrawn: styles.withdrawn,
};

const StatusLegend = ({ label, statuses, hiddenStatuses, onStatusToggle }: StatusLegendProps) => {
    return (
        <ul className={styles.legend} aria-label={label}>
            {statuses.map((status) => {
                const isHidden = hiddenStatuses.has(status);

                return (
                    <li key={status}>
                        <button
                            aria-label={`${isHidden ? 'Show' : 'Hide'} ${status} bar`}
                            aria-pressed={isHidden}
                            className={styles.statusButton}
                            onClick={() => onStatusToggle(status)}
                            type='button'
                        >
                            <span className={`${styles.swatch} ${statusClassNames[status]}`} aria-hidden='true' />
                            <span className={isHidden ? styles.hidden : undefined}>{status}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

export default StatusLegend;
