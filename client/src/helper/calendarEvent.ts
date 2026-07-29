const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/render';
const ICS_CONTENT_LINE_MAX_OCTETS = 75;
const textEncoder = new TextEncoder();

export const CALENDAR_ERROR_MESSAGE = 'Unable to create the calendar event. Please try again.';

export type CalendarEventDetails = {
    description: string;
    end: Date;
    location: string;
    start: Date;
    title: string;
    uid: string;
    url?: string;
};

export const sanitizeCalendarUri = (value: string): string => value.replace(/\r\n|\r|\n/g, '');

export const formatGoogleCalendarTimestamp = (date: Date): string => {
    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid calendar date');
    }

    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
};

export const buildGoogleCalendarUrl = (event: CalendarEventDetails): string => {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        dates: `${formatGoogleCalendarTimestamp(event.start)}/${formatGoogleCalendarTimestamp(event.end)}`,
        details: event.description,
        location: event.location,
        text: event.title,
    });

    return `${GOOGLE_CALENDAR_URL}?${params.toString()}`;
};

const escapeIcsText = (value: string): string =>
    value
        .replace(/\\/g, '\\\\')
        .replace(/\r\n|\r|\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

const foldIcsContentLine = (line: string): string[] => {
    const foldedLines: string[] = [];
    let currentLine = '';
    let currentOctets = 0;

    for (const character of line) {
        const characterOctets = textEncoder.encode(character).length;
        if (currentLine && currentOctets + characterOctets > ICS_CONTENT_LINE_MAX_OCTETS) {
            foldedLines.push(currentLine);
            currentLine = ` ${character}`;
            currentOctets = 1 + characterOctets;
        } else {
            currentLine += character;
            currentOctets += characterOctets;
        }
    }

    foldedLines.push(currentLine);
    return foldedLines;
};

const buildIcsEventLines = (event: CalendarEventDetails, createdAt: Date): string[] => {
    const lines = [
        'BEGIN:VEVENT',
        `UID:${event.uid}`,
        `DTSTAMP:${formatGoogleCalendarTimestamp(createdAt)}`,
        `DTSTART:${formatGoogleCalendarTimestamp(event.start)}`,
        `DTEND:${formatGoogleCalendarTimestamp(event.end)}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(event.description)}`,
        `LOCATION:${escapeIcsText(event.location)}`,
    ];
    if (event.url) {
        lines.push(`URL:${sanitizeCalendarUri(event.url)}`);
    }
    lines.push('STATUS:CONFIRMED', 'END:VEVENT');
    return lines;
};

export const buildIcsContent = (event: CalendarEventDetails, createdAt = new Date()): string =>
    buildBulkIcsContent([event], createdAt);

export const buildBulkIcsContent = (events: readonly CalendarEventDetails[], createdAt = new Date()): string => {
    if (events.length === 0) {
        throw new Error('Cannot create an empty calendar');
    }

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Job Tracker//Calendar Export//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        ...events.flatMap((calendarEvent) => buildIcsEventLines(calendarEvent, createdAt)),
        'END:VCALENDAR',
    ];

    return `${lines.flatMap(foldIcsContentLine).join('\r\n')}\r\n`;
};

export const buildCalendarFilename = (value: string, fallback: string): string => {
    const safeValue = value
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    return `${safeValue || fallback}.ics`;
};

const downloadIcsContent = (content: string, filename: string): void => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    try {
        downloadLink.href = objectUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
    } finally {
        downloadLink.remove();
        URL.revokeObjectURL(objectUrl);
    }
};

export const downloadIcsEvent = (event: CalendarEventDetails, filename: string): void => {
    downloadIcsContent(buildIcsContent(event), filename);
};

export const downloadBulkIcsEvents = (events: readonly CalendarEventDetails[], filename: string): void => {
    downloadIcsContent(buildBulkIcsContent(events), filename);
};
