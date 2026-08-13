const setLocalTime = (date: Date, hour: number, minute = 0): Date => {
    const nextDate = new Date(date);
    nextDate.setHours(hour, minute, 0, 0);
    return nextDate;
};

export const daysAgo = (now: Date, days: number, hour = 12): Date => {
    const date = setLocalTime(now, hour);
    date.setDate(date.getDate() - days);
    return date;
};

export const daysFromNow = (now: Date, days: number, hour = 10): Date => {
    const date = setLocalTime(now, hour);
    date.setDate(date.getDate() + days);
    return date;
};

export const weeksAgo = (now: Date, weeks: number, hour = 12): Date => daysAgo(now, weeks * 7, hour);

export const toDateString = (date: Date): string => date.toISOString();

export const startOfLocalWeek = (date: Date): Date => {
    const start = setLocalTime(date, 0);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    return start;
};
