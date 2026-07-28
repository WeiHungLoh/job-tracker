import PrimaryButton from '../button/PrimaryButton';
import Icon from '../icon/Icon';
import Tooltip from '../tooltip/Tooltip';
import { formatFollowUpSentAt } from '../../helper/dateFormatter';
import styles from './FollowUpSentBadge.module.css';

type FollowUpSentBadgeProps = {
    className?: string;
    compact?: boolean;
    contextLabel: string;
    isUndoing?: boolean;
    onUndo?: () => void | Promise<void>;
    sentAt: string;
};

const FollowUpSentBadge = ({
    className,
    compact = false,
    contextLabel,
    isUndoing = false,
    onUndo,
    sentAt,
}: FollowUpSentBadgeProps) => {
    const formattedSentAt = formatFollowUpSentAt(sentAt);

    return (
        <div
            aria-label={`Follow-up sent on ${formattedSentAt}`}
            className={[styles.badge, compact ? styles.compact : '', className].filter(Boolean).join(' ')}
            role='status'
        >
            <Tooltip mobileOnly={!compact} placement='top' title={formattedSentAt}>
                <span className={styles.statusTrigger}>
                    <Icon className={styles.marker} name='success' size={15} />
                    {compact ? (
                        <span className={styles.compactLabel}>Follow-up sent</span>
                    ) : (
                        <>
                            <span className={styles.copy}>
                                Follow-up sent on{' '}
                                <time className={styles.time} dateTime={sentAt}>
                                    {formattedSentAt}
                                </time>
                            </span>
                            <span aria-hidden='true' className={styles.mobileLabel}>
                                Follow-up sent
                            </span>
                        </>
                    )}
                </span>
            </Tooltip>
            {onUndo && (
                <Tooltip placement='top' title='Undo'>
                    <PrimaryButton
                        aria-label={`Undo follow-up for ${contextLabel}`}
                        className={styles.undo}
                        isLoading={isUndoing}
                        onClick={() => void onUndo()}
                        onPointerDown={(event) => event.stopPropagation()}
                        type='button'
                        variant='icon'
                    >
                        <Icon name='undo' size={15} />
                    </PrimaryButton>
                </Tooltip>
            )}
        </div>
    );
};

export default FollowUpSentBadge;
