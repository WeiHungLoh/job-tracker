import type { JobInterview } from '../models';
import { getInterviewTiming } from '../../../helper/interviewTiming';

const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/render';
const UID_DOMAIN = 'jobtracker.weihungloh.com';
export const BULK_INTERVIEW_ICS_FILENAME = 'job-tracker-upcoming-interviews.ics';
export const CALENDAR_ERROR_MESSAGE = 'Unable to create the calendar event. Please try again.';

type CalendarInterview = Pick<
    JobInterview,
    | 'company_name'
    | 'interview_date'
    | 'interview_duration_minutes'
    | 'interview_id'
    | 'interview_location'
    | 'interview_notes'
    | 'interview_type'
    | 'job_title'
    | 'meeting_url'
>;

export type CalendarEventDetails = {
    description: string;
    end: Date;
    interviewId: number;
    location: string;
    meetingUrl: string;
    start: Date;
    title: string;
};

const populated = (value: string | null | undefined): string => value?.trim() ?? '';
const sanitizeIcsUri = (value: string): string => value.replace(/\r\n|\r|\n/g, '');

export const formatGoogleCalendarTimestamp = (date: Date): string => {
    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid calendar date');
    }

    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
};

export const buildCalendarEventDetails = (interview: CalendarInterview): CalendarEventDetails => {
    const timing = getInterviewTiming(interview);

    if (!timing.isValid) {
        throw new Error('Invalid interview date');
    }

    const companyName = populated(interview.company_name);
    const interviewType = populated(interview.interview_type);
    const jobTitle = populated(interview.job_title);
    const notes = populated(interview.interview_notes);
    const meetingUrl = sanitizeIcsUri(populated(interview.meeting_url));
    const descriptionLines: string[] = [];

    if (jobTitle) {
        descriptionLines.push(`Job title: ${jobTitle}`);
    }
    if (interviewType) {
        descriptionLines.push(`Interview type: ${interviewType}`);
    }
    if (meetingUrl) {
        descriptionLines.push(`Meeting link: ${meetingUrl}`);
    }
    if (notes) {
        if (descriptionLines.length > 0) {
            descriptionLines.push('');
        }
        descriptionLines.push('Notes:', notes);
    }

    return {
        description: descriptionLines.join('\n'),
        end: timing.end,
        interviewId: interview.interview_id,
        location: populated(interview.interview_location),
        meetingUrl,
        start: timing.start,
        title: `${companyName} — ${interviewType || 'Job Interview'}`,
    };
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

const buildIcsEventLines = (event: CalendarEventDetails, createdAt: Date): string[] => {
    const lines = [
        'BEGIN:VEVENT',
        `UID:${event.interviewId}@${UID_DOMAIN}`,
        `DTSTAMP:${formatGoogleCalendarTimestamp(createdAt)}`,
        `DTSTART:${formatGoogleCalendarTimestamp(event.start)}`,
        `DTEND:${formatGoogleCalendarTimestamp(event.end)}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(event.description)}`,
        `LOCATION:${escapeIcsText(event.location)}`,
    ];
    if (event.meetingUrl) {
        lines.push(`URL:${sanitizeIcsUri(event.meetingUrl)}`);
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
        'PRODID:-//Job Tracker//Interview Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        ...events.flatMap((calendarEvent) => buildIcsEventLines(calendarEvent, createdAt)),
        'END:VCALENDAR',
    ];

    return `${lines.join('\r\n')}\r\n`;
};

const buildIcsFilename = (event: CalendarEventDetails): string => {
    const safeTitle = event.title
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    return `${safeTitle || 'job-interview'}.ics`;
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

export const downloadIcsEvent = (event: CalendarEventDetails): void => {
    downloadIcsContent(buildIcsContent(event), buildIcsFilename(event));
};

export const downloadBulkIcsEvents = (events: readonly CalendarEventDetails[]): void => {
    downloadIcsContent(buildBulkIcsContent(events), BULK_INTERVIEW_ICS_FILENAME);
};
