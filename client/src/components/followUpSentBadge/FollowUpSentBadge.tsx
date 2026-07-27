import PrimaryButton from '../button/PrimaryButton';
import Icon from '../icon/Icon';
import { formatFollowUpCompactDate, formatFollowUpSentAt } from '../../helper/dateFormatter';
import styles from './FollowUpSentBadge.module.css';

type FollowUpSentBadgeProps = {
    compact?: boolean;
    contextLabel: string;
    isUndoing?: boolean;
    onUndo?: () => void | Promise<void>;
    sentAt: string;
    undoText?: string;
};

const FollowUpSentBadge = ({
    compact = false,
    contextLabel,
    isUndoing = false,
    onUndo,
    sentAt,
    undoText = 'Undo',
}: FollowUpSentBadgeProps) => {
    if (compact) {
        return (
            <span className={styles.compact} role='status'>
                Follow-up sent · {formatFollowUpCompactDate(sentAt)}
            </span>
        );
    }

    return (
        <div className={styles.badge} role='status'>
            <Icon className={styles.marker} name='success' size={15} />
            <span className={styles.copy}>
                Follow-up sent on{' '}
                <time className={styles.time} dateTime={sentAt}>
                    {formatFollowUpSentAt(sentAt)}
                </time>
            </span>
            {onUndo && (
                <PrimaryButton
                    aria-label={`Undo follow-up for ${contextLabel}`}
                    className={styles.undo}
                    isLoading={isUndoing}
                    onClick={() => void onUndo()}
                    onPointerDown={(event) => event.stopPropagation()}
                    title={undoText}
                    type='button'
                    variant='icon'
                >
                    <Icon name='undo' size={15} />
                </PrimaryButton>
            )}
        </div>
    );
};

export default FollowUpSentBadge;
