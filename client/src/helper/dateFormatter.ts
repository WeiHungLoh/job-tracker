/**
 * Parse a datetime-local input value (YYYY-MM-DDThh:mm) into a local Date.
 */
export const MIN_DATETIME_LOCAL = '0001-01-01T00:00';
export const MAX_DATETIME_LOCAL = '9999-12-31T23:59';

const DATETIME_LOCAL_PATTERN = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const MAX_DATE_YEAR = 9999;

const isLeapYear = (year: number): boolean => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const isValidCalendarDate = (year: number, month: number, day: number): boolean => {
    if (year < 1 || year > MAX_DATE_YEAR || month < 1 || month > 12) {
        return false;
    }

    const daysInMonth = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
    return day >= 1 && day <= daysInMonth;
};

export const parseDatetimeLocal = (value: string): Date => {
    const [year, month, day, hour, minute] = value.split(/[-T:]/);
    const date = new Date(0);
    date.setFullYear(Number(year), Number(month) - 1, Number(day));
    date.setHours(Number(hour), Number(minute), 0, 0);
    return date;
};

const padDateTimePart = (value: number): string => String(value).padStart(2, '0');

export const formatLongDate = (value: string | Date): string =>
    new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

export const toDatetimeLocalInputValue = (value: string): string => {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return `${date.getFullYear()}-${padDateTimePart(date.getMonth() + 1)}-${padDateTimePart(
        date.getDate()
    )}T${padDateTimePart(date.getHours())}:${padDateTimePart(date.getMinutes())}`;
};

export const isInvalidDatetimeLocalInput = (value: string, validity?: ValidityState): boolean => {
    if (validity?.badInput || validity?.rangeUnderflow || validity?.rangeOverflow) {
        return true;
    }
    if (!value) {
        return false;
    }

    const match = DATETIME_LOCAL_PATTERN.exec(value);
    if (!match) {
        return true;
    }

    const [, year, month, day, hour, minute, second = '0'] = match;
    return (
        !isValidCalendarDate(Number(year), Number(month), Number(day)) ||
        Number(hour) > 23 ||
        Number(minute) > 59 ||
        Number(second) > 59 ||
        Number.isNaN(parseDatetimeLocal(value).getTime())
    );
};

const formatDate = (dueDate: string) => {
    const date = new Date(dueDate);

    const formattedDate = date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    const formattedDay = date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    // Returns the remaining time in ms
    const dateBeforeInterview = date.getTime() - Date.now();
    const dateSinceApplication = Date.now() - date.getTime();

    const formatDuration = (dateDiff: number, pastDueLabel?: string) => {
        if (pastDueLabel && dateDiff <= 0) {
            return pastDueLabel;
        }

        const seconds = Math.floor(dateDiff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        const remainingHours = hours % 24;
        const remainingMinutes = minutes % 60;
        return `${days} days ${remainingHours} hours ${remainingMinutes} minutes`;
    };

    const timeSinceApplication = formatDuration(dateSinceApplication);
    const timeBeforeInterview = formatDuration(dateBeforeInterview, 'Past due');

    return { formattedDay, formattedDate, timeSinceApplication, timeBeforeInterview };
};

export default formatDate;
