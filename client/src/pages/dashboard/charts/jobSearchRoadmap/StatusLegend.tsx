import type { JobStatus } from '../../../application/models';
import styles from './StatusLegend.module.css';

type StatusLegendProps<Status extends JobStatus> = {
    className?: string;
    disabledStatuses?: ReadonlySet<Status>;
    itemName: 'outcome' | 'stage';
    label: string;
    statuses: readonly Status[];
    hiddenStatuses: ReadonlySet<Status>;
    onStatusToggle: (status: Status) => void;
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

function StatusLegend<Status extends JobStatus>({
    className = '',
    disabledStatuses,
    itemName,
    label,
    statuses,
    hiddenStatuses,
    onStatusToggle,
}: StatusLegendProps<Status>) {
    const classes = [styles.legend, className].filter(Boolean).join(' ');

    return (
        <ul className={classes} aria-label={label}>
            {statuses.map((status) => {
                const isHidden = hiddenStatuses.has(status);
                const isDisabled = !isHidden && (disabledStatuses?.has(status) ?? false);

                return (
                    <li key={status}>
                        <button
                            aria-label={`${isHidden ? 'Show' : 'Hide'} ${status} ${itemName}`}
                            aria-pressed={isHidden}
                            className={styles.statusButton}
                            disabled={isDisabled}
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
}

export default StatusLegend;
