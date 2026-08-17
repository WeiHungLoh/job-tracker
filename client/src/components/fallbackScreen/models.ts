export type FallbackScreenVariant = 'authenticationError' | 'loading' | 'notFound' | 'pageLoading' | 'routeError';

export type FallbackScreenProps = {
    variant?: FallbackScreenVariant;
    onAction?: () => void;
};
