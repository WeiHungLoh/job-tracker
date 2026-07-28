export type FallbackScreenVariant = 'authenticationError' | 'loading' | 'notFound' | 'routeError';

export type FallbackScreenProps = {
    variant?: FallbackScreenVariant;
    onAction?: () => void;
};
