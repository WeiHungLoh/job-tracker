const PRODUCTION_ORIGINS = [
    'https://jobtracker-whloh.netlify.app',
    'https://jobtracker.weihungloh.com',
    'https://weihungloh.com',
] as const;

const DEVELOPMENT_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.1.74:3000',
] as const;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', '[::1]', 'localhost']);

export const ALLOWED_ORIGINS = new Set<string>(
    IS_PRODUCTION ? PRODUCTION_ORIGINS : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS]
);

export const isAllowedOrigin = (origin: string): boolean => {
    if (ALLOWED_ORIGINS.has(origin)) {
        return true;
    }
    if (IS_PRODUCTION) {
        return false;
    }

    try {
        const url = new URL(origin);
        return url.protocol === 'http:' && LOOPBACK_HOSTNAMES.has(url.hostname);
    } catch {
        return false;
    }
};

export const AUTHENTICATED_API_RATE_LIMIT = 500;
export const AUTHENTICATED_API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const SIGN_IN_EMAIL_IP_LIMIT = 10;
export const SIGN_IN_IP_LIMIT = 50;
export const SIGN_IN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const SIGN_UP_HOURLY_IP_LIMIT = 5;
export const SIGN_UP_HOURLY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const SIGN_UP_DAILY_IP_LIMIT = 10;
export const SIGN_UP_DAILY_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
