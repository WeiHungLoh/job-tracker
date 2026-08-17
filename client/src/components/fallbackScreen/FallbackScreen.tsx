import type { FallbackScreenProps, FallbackScreenVariant } from './models';
import LoadingSpinner from '../loadingSpinner/LoadingSpinner';
import PrimaryButton from '../button/PrimaryButton';
import styles from './FallbackScreen.module.css';

type FallbackContent = {
    actionLabel?: string;
    message: string;
    title: string;
};

const FALLBACK_CONTENT: Record<FallbackScreenVariant, FallbackContent> = {
    authenticationError: {
        actionLabel: 'Try again',
        message: 'We could not verify your session. Please try again.',
        title: 'Unable to verify authentication',
    },
    loading: {
        message: 'Please wait while we verify your session.',
        title: 'Checking authentication',
    },
    notFound: {
        actionLabel: 'View job applications',
        message: 'The page you are looking for does not exist or may have moved.',
        title: 'Page not found',
    },
    pageLoading: {
        message: 'Please wait while we get this page ready.',
        title: 'Loading page',
    },
    routeError: {
        actionLabel: 'Reload page',
        message: 'Something went wrong while loading this page. Please try again.',
        title: 'Unable to load this page',
    },
};

const FallbackScreen = ({ variant = 'loading', onAction }: FallbackScreenProps) => {
    const isLoading = variant === 'loading' || variant === 'pageLoading';
    const content = FALLBACK_CONTENT[variant];

    return (
        <main className={styles.fallback} aria-live='polite' aria-busy={isLoading}>
            <div className={styles.content}>
                {isLoading && <LoadingSpinner />}
                <h1>{content.title}</h1>
                <p>{content.message}</p>
                {content.actionLabel && onAction && (
                    <PrimaryButton onClick={onAction} type='button'>
                        {content.actionLabel}
                    </PrimaryButton>
                )}
            </div>
        </main>
    );
};

export default FallbackScreen;
