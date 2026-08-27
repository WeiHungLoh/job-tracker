export type FallbackScreenVariant = 'authenticationError' | 'loading' | 'notFound' | 'pageLoading' | 'routeError';

export type FallbackScreenProps = {
    actionLabel?: string;
    variant?: FallbackScreenVariant;
    onAction?: () => void;
    onSecondaryAction?: () => void;
    secondaryActionLabel?: string;
};
