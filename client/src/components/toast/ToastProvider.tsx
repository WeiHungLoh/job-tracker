import {
    type PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ToastContextValue, ToastMessage, ToastType } from './models';
import ToastContainer from './ToastContainer';
import OfflineBanner from '../offlineBanner/OfflineBanner';
import styles from './ToastProvider.module.css';

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
const ERROR_TOAST_DURATION_MS = 8000;
const SUCCESS_TOAST_DURATION_MS = 3000;
const TOAST_DURATION_MS: Record<ToastType, number | null> = {
    error: ERROR_TOAST_DURATION_MS,
    neutral: null,
    success: SUCCESS_TOAST_DURATION_MS,
};

const removeTrailingToastPunctuation = (message: string): string => message.replace(/[.!]+\s*$/, '');

export const ToastProvider = ({ children }: PropsWithChildren) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const nextToastId = useRef(0);
    const toastTimeouts = useRef(new Map<number, number>());

    const dismissToast = useCallback((id: number) => {
        const timeout = toastTimeouts.current.get(id);
        if (timeout !== undefined) {
            window.clearTimeout(timeout);
            toastTimeouts.current.delete(id);
        }
        setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, type: ToastType): number => {
            nextToastId.current += 1;
            const id = nextToastId.current;
            const durationMs = TOAST_DURATION_MS[type];
            const normalizedMessage = type === 'neutral' ? message : removeTrailingToastPunctuation(message);

            setToasts((currentToasts) => [...currentToasts, { durationMs, id, message: normalizedMessage, type }]);
            if (durationMs !== null) {
                const timeout = window.setTimeout(() => dismissToast(id), durationMs);
                toastTimeouts.current.set(id, timeout);
            }
            return id;
        },
        [dismissToast]
    );

    useEffect(() => {
        const timeouts = toastTimeouts.current;

        return () => {
            timeouts.forEach((timeout) => window.clearTimeout(timeout));
            timeouts.clear();
        };
    }, []);

    const contextValue = useMemo<ToastContextValue>(
        () => ({
            showErrorToast: (message) => {
                showToast(message, 'error');
            },
            showNeutralToast: (message) => {
                const id = showToast(message, 'neutral');
                return () => dismissToast(id);
            },
            showSuccessToast: (message) => {
                showToast(message, 'success');
            },
        }),
        [dismissToast, showToast]
    );

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div className={styles.notificationStack}>
                <OfflineBanner />
                <ToastContainer onDismiss={dismissToast} toasts={toasts} />
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }

    return context;
};
