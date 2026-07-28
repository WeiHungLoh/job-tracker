import Icon from '../icon/Icon';
import PrimaryButton from '../button/PrimaryButton';
import type { CSSProperties } from 'react';
import type { ToastContainerProps, ToastType } from './models';
import styles from './ToastContainer.module.css';

const toastStyles: Record<ToastType, string> = {
    error: styles.errorToast,
    neutral: styles.neutralToast,
    success: styles.successToast,
};

const ToastContainer = ({ toasts, onDismiss }: ToastContainerProps) => {
    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className={styles.toastContainer} data-testid='toast-container'>
            {toasts.map((toast) => (
                <div
                    className={`${styles.toast} ${toastStyles[toast.type]}`}
                    data-testid='toast'
                    key={toast.id}
                    role={toast.type === 'error' ? 'alert' : 'status'}
                    style={
                        toast.durationMs === null
                            ? undefined
                            : ({ '--toast-duration': `${toast.durationMs}ms` } as CSSProperties)
                    }
                >
                    <span className={styles.iconTile}>
                        <Icon
                            className={styles.statusIcon}
                            data-testid={`toast-${toast.type}-icon`}
                            name={toast.type === 'neutral' ? 'info' : toast.type}
                        />
                    </span>
                    <span className={styles.message}>{toast.message}</span>
                    <PrimaryButton
                        aria-label='Dismiss notification'
                        className={styles.dismissButton}
                        onClick={() => onDismiss(toast.id)}
                        type='button'
                        variant='icon'
                    >
                        <span aria-hidden='true'>&times;</span>
                    </PrimaryButton>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
