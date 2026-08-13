import {
    formatFollowUpSentAt,
    isInvalidDatetimeLocalInput,
    toDatetimeLocalInputValue,
} from '../../helper/dateFormatter';
import formatDate from '../../helper/dateFormatter';

describe('datetime-local validation', () => {
    test('rejects impossible calendar dates instead of normalizing them', () => {
        expect(isInvalidDatetimeLocalInput('2025-02-29T10:00')).toBe(true);
        expect(isInvalidDatetimeLocalInput('2025-02-30T10:00')).toBe(true);
        expect(isInvalidDatetimeLocalInput('2025-04-31T10:00')).toBe(true);
    });

    test('accepts valid calendar dates including leap day', () => {
        expect(isInvalidDatetimeLocalInput('2024-02-29T10:00')).toBe(false);
        expect(isInvalidDatetimeLocalInput('2025-04-30T10:00')).toBe(false);
    });

    test('rejects invalid times', () => {
        expect(isInvalidDatetimeLocalInput('2025-04-30T24:00')).toBe(true);
        expect(isInvalidDatetimeLocalInput('2025-04-30T23:60')).toBe(true);
    });

    test('rejects years outside the supported range', () => {
        expect(isInvalidDatetimeLocalInput('0000-04-30T23:59')).toBe(true);
        expect(isInvalidDatetimeLocalInput('20300-03-30T00:00')).toBe(true);
        expect(isInvalidDatetimeLocalInput('9999-12-31T23:59')).toBe(false);
    });

    test('converts a stored timestamp into the local date-time input format', () => {
        const timestamp = '2026-07-18T10:30:00.000Z';
        const date = new Date(timestamp);
        const expected =
            [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0'),
            ].join('-') + `T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        expect(toDatetimeLocalInputValue(timestamp)).toBe(expected);
        expect(toDatetimeLocalInputValue('')).toBe('');
    });
});

describe('follow-up timestamp formatting', () => {
    test('formats a complete local date and time', () => {
        const timestamp = '2026-07-27T07:42:00.000Z';
        const date = new Date(timestamp);
        const expectedFull = date
            .toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            })
            .replace(',', ' at')
            .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());

        expect(formatFollowUpSentAt(timestamp)).toBe(expectedFull);
    });
});

describe('application elapsed-time formatting', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test.each([
        [0, '0 seconds'],
        [1000, '1 second'],
        [10 * 1000, '10 seconds'],
        [59 * 1000 + 999, '59 seconds'],
    ])('shows seconds only before the first full minute for %s', (elapsedMilliseconds, expected) => {
        const applicationDate = new Date('2026-01-01T00:00:00.000Z');
        vi.setSystemTime(new Date(applicationDate.getTime() + elapsedMilliseconds));

        expect(formatDate(applicationDate).timeSinceApplication).toBe(expected);
    });

    test.each([
        [60 * 1000, '1 minute'],
        [61 * 1000, '1 minute'],
        [51 * 60 * 1000, '51 minutes'],
        [60 * 60 * 1000, '1 hour'],
        [61 * 60 * 1000, '1 hour 1 minute'],
        [(24 * 2 + 2) * 60 * 60 * 1000 + 2 * 60 * 1000, '2 days 2 hours 2 minutes'],
        [24 * 60 * 60 * 1000, '1 day'],
    ])('omits zero units and uses singular labels for %s', (elapsedMilliseconds, expected) => {
        const applicationDate = new Date('2026-01-01T00:00:00.000Z');
        vi.setSystemTime(new Date(applicationDate.getTime() + elapsedMilliseconds));

        expect(formatDate(applicationDate).timeSinceApplication).toBe(expected);
    });
});
