import {
    buildCalendarEventDetails,
    buildGoogleCalendarUrl,
    buildIcsContent,
    formatGoogleCalendarTimestamp,
    buildBulkIcsContent,
    downloadBulkIcsEvents,
} from '../../pages/interview/calendarOptions/calendarEvent';

const interview = {
    company_name: 'Acme, Inc.',
    interview_date: '2026-08-15T09:30:00+08:00',
    interview_duration_minutes: 90,
    interview_id: 42,
    interview_location: 'Room 5, HQ; Singapore',
    interview_notes: 'Review C:\\projects\\demo\nBring examples, questions; and notes.',
    interview_type: 'Technical Interview',
    job_title: 'Software Engineer',
    meeting_url: 'https://meet.example.com/interview?candidate=42&stage=technical',
};

describe('calendar event helpers', () => {
    test('builds an encoded Google Calendar URL using the stored duration', () => {
        const calendarUrl = buildGoogleCalendarUrl(buildCalendarEventDetails(interview));
        const url = new URL(calendarUrl);

        expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
        expect(calendarUrl).toContain('text=Acme%2C+Inc.+%E2%80%94+Technical+Interview');
        expect(url.searchParams.get('action')).toBe('TEMPLATE');
        expect(url.searchParams.get('text')).toBe('Acme, Inc. — Technical Interview');
        expect(url.searchParams.get('dates')).toBe('20260815T013000Z/20260815T030000Z');
        expect(url.searchParams.get('location')).toBe('Room 5, HQ; Singapore');
        expect(url.searchParams.get('details')).toBe(
            'Job title: Software Engineer\nInterview type: Technical Interview\n' +
                'Meeting link: https://meet.example.com/interview?candidate=42&stage=technical\n\nNotes:\n' +
                'Review C:\\projects\\demo\nBring examples, questions; and notes.'
        );
    });

    test('builds escaped iCalendar content with CRLF line endings and a stable UID', () => {
        const content = buildIcsContent(buildCalendarEventDetails(interview), new Date('2026-07-04T00:00:00Z'));

        expect(content).toContain('BEGIN:VCALENDAR\r\n');
        expect(content).toContain('BEGIN:VEVENT\r\n');
        expect(content).toContain('UID:42@jobtracker.weihungloh.com\r\n');
        expect(content).toContain('DTSTAMP:20260704T000000Z\r\n');
        expect(content).toContain('DTSTART:20260815T013000Z\r\n');
        expect(content).toContain('DTEND:20260815T030000Z\r\n');
        expect(content).toContain('SUMMARY:Acme\\, Inc. — Technical Interview\r\n');
        expect(content).toContain(
            'DESCRIPTION:Job title: Software Engineer\\nInterview type: Technical Interview\\nMeeting link: ' +
                'https://meet.example.com/interview?candidate=42&stage=technical\\n\\nNotes:\\n' +
                'Review C:\\\\projects\\\\demo\\nBring examples\\, questions\\; and notes.\r\n'
        );
        expect(content).toContain('URL:https://meet.example.com/interview?candidate=42&stage=technical\r\n');
        expect(content).toContain('LOCATION:Room 5\\, HQ\\; Singapore\r\n');
        expect(content).toContain('END:VEVENT\r\nEND:VCALENDAR\r\n');
        expect(content.replace(/\r\n/g, '')).not.toContain('\n');
    });

    test('formats timestamps without locale-dependent date formatting', () => {
        expect(formatGoogleCalendarTimestamp(new Date('2026-08-15T01:30:45.123Z'))).toBe('20260815T013045Z');
    });

    test('builds one calendar containing one event per interview', () => {
        const firstEvent = buildCalendarEventDetails(interview);
        const secondEvent = buildCalendarEventDetails({ ...interview, interview_id: 43 });
        const content = buildBulkIcsContent([firstEvent, secondEvent], new Date('2026-07-04T00:00:00Z'));

        expect(content.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
        expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(2);
        expect(content).toContain('UID:42@jobtracker.weihungloh.com');
        expect(content).toContain('UID:43@jobtracker.weihungloh.com');
    });

    test('refuses to build an empty bulk calendar', () => {
        expect(() => buildBulkIcsContent([])).toThrow('Cannot create an empty calendar');
    });

    test('downloads the bulk calendar with the stable filename and revokes its object URL', () => {
        const createObjectURL = vi.fn(() => 'blob:bulk-calendar');
        const revokeObjectURL = vi.fn();
        let downloadedFilename = '';
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            downloadedFilename = this.download;
        });

        downloadBulkIcsEvents([buildCalendarEventDetails(interview)]);

        expect(downloadedFilename).toBe('job-tracker-upcoming-interviews.ics');
        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:bulk-calendar');
    });

    test('uses the fallback title and omits empty optional values', () => {
        const event = buildCalendarEventDetails({
            ...interview,
            interview_location: '',
            interview_notes: '',
            interview_type: '',
            meeting_url: '',
        });
        const content = buildIcsContent(event, new Date('2026-07-04T00:00:00Z'));

        expect(event.title).toBe('Acme, Inc. — Job Interview');
        expect(event.description).toBe('Job title: Software Engineer');
        expect(content).toContain('LOCATION:\r\n');
        expect(content).not.toContain('\r\nURL:');
        expect(content).not.toMatch(/undefined|null/);
    });

    test('prevents meeting URL line injection without changing valid query parameters', () => {
        const event = buildCalendarEventDetails({
            ...interview,
            meeting_url: 'https://meet.example.com/room?token=a&mode=video\r\nX-INJECTED:true',
        });
        const content = buildIcsContent(event, new Date('2026-07-04T00:00:00Z'));

        expect(event.meetingUrl).toBe('https://meet.example.com/room?token=a&mode=videoX-INJECTED:true');
        expect(content).toContain('URL:https://meet.example.com/room?token=a&mode=videoX-INJECTED:true\r\n');
        expect(content).not.toContain('\r\nX-INJECTED:true\r\n');
    });

    test('rejects malformed interview dates', () => {
        expect(() => buildCalendarEventDetails({ ...interview, interview_date: 'not-a-date' })).toThrow(
            'Invalid interview date'
        );
    });
});
