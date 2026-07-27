import {
    formatFollowUpCompactDate,
    formatFollowUpSentAt,
    isInvalidDatetimeLocalInput,
    toDatetimeLocalInputValue,
} from '../../helper/dateFormatter';

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
    test('formats a complete local date and time plus a compact board date', () => {
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
        const expectedCompact = date.toLocaleString('en-GB', { day: 'numeric', month: 'short' });

        expect(formatFollowUpSentAt(timestamp)).toBe(expectedFull);
        expect(formatFollowUpCompactDate(timestamp)).toBe(expectedCompact);
    });
});
