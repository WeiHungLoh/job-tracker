const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const getScrollBehavior = (): ScrollBehavior =>
    window.matchMedia?.(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth';
