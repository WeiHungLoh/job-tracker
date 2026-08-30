export type FallbackScreenVariant =
    | 'authenticationError'
    | 'loading'
    | 'notFound'
    | 'pageLoading'
    | 'preferencesError'
    | 'routeError';

export type FallbackScreenProps = {
    actionLabel?: string;
    variant?: FallbackScreenVariant;
    onAction?: () => void;
    onSecondaryAction?: () => void;
    secondaryActionLabel?: string;
};
