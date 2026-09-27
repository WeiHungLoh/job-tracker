import { EMAIL_MAX_LENGTH, PASSWORD_MAX_BYTES, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './config.js';

export const normalizeEmail = (value: unknown): string | undefined =>
    typeof value === 'string' ? value.trim().toLowerCase() : undefined;

export const getPasswordMaximumValidationError = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const passwordLength = [...value].length;
    if (passwordLength > PASSWORD_MAX_LENGTH) {
        return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
    }
    if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) {
        return 'Password is too long when encoded. Use fewer Unicode characters.';
    }
    return undefined;
};

export const getPasswordValidationError = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || [...value].length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    return getPasswordMaximumValidationError(value);
};

export const isValidEmail = (value: unknown): value is string =>
    typeof value === 'string' && value.length <= EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
