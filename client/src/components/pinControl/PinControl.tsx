import Icon from '../icon/Icon';
import styles from './PinControl.module.css';

type PinControlSubject = 'application' | 'interview';

type PinControlProps = {
    itemLabel: string;
    subject: PinControlSubject;
    isPending?: boolean;
    isPinned: boolean;
    onToggle?: () => void | Promise<void>;
    size: 'board' | 'list';
};

const PinControl = ({ itemLabel, subject, isPending = false, isPinned, onToggle, size }: PinControlProps) => {
    if (!onToggle) {
        return isPinned ? (
            <span
                aria-label={`${itemLabel} ${subject} is pinned`}
                className={`${styles.staticPin} ${styles[size]}`}
                title='Pinned'
            >
                <Icon name='pin' size={15} />
            </span>
        ) : null;
    }

    const action = isPinned ? 'Unpin' : 'Pin';

    return (
        <button
            aria-label={`${action} ${itemLabel} ${subject}`}
            aria-pressed={isPinned}
            className={`${styles.button} ${styles[size]} ${isPinned ? styles.pinned : styles.unpinned}`}
            disabled={isPending}
            onClick={(event) => {
                event.stopPropagation();
                void onToggle();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            title={`${action} ${subject}`}
            type='button'
        >
            <Icon name='pin' size={15} />
        </button>
    );
};

export default PinControl;
