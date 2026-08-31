import { buildGoogleCalendarUrl, buildIcsContent } from '../../helper/calendarEvent';
import {
    buildOfferDeadlineCalendarEvent,
    buildOfferDeadlineIcsFilename,
} from '../../pages/offerDecision/offerDeadlineCalendar';
import type { OfferDecisionApplication } from '../../pages/offerDecision/models';

const application: OfferDecisionApplication = {
    job_id: 42,
    company_name: 'Acme, Inc.',
    job_title: 'Software Engineer',
    job_status: 'Offer',
    application_date: '2026-07-01T00:00:00.000Z',
    evaluation: {
        job_id: 42,
        ratings: {
            career_growth: 4,
            company_culture_fit: 4,
            work_life_balance: 4,
            compensation: 4,
        },
        details: {
            annual_leave_days: 21,
            bonus: '15%',
            concerns: 'Private concern',
            currency: 'SGD',
            decision_deadline: '2026-08-15T09:00:00.000Z',
            monthly_base_salary: 10000,
            pros: 'Private pro',
            work_arrangement: 'Hybrid',
        },
    },
};

describe('offer deadline calendar events', () => {
    test('uses the saved deadline as the start of a one-minute event', () => {
        const event = buildOfferDeadlineCalendarEvent(application);

        expect(event.start.toISOString()).toBe('2026-08-15T09:00:00.000Z');
        expect(event.end.toISOString()).toBe('2026-08-15T09:01:00.000Z');
        expect(event.title).toBe('Offer decision deadline — Acme, Inc.');
        expect(event.description).toBe(
            'Job title: Software Engineer\n\nDecision deadline for this offer. Review the saved evaluation in Job Tracker before responding.'
        );
        expect(event.location).toBe('');
        expect(event.url).toBeUndefined();
        expect(event.uid).toBe('offer-decision-42@jobtracker.weihungloh.com');
        expect(buildOfferDeadlineCalendarEvent(application).uid).toBe(event.uid);
    });

    test('uses shared Google and iCalendar serialization without private offer details', () => {
        const event = buildOfferDeadlineCalendarEvent(application);
        const googleUrl = new URL(buildGoogleCalendarUrl(event));
        const content = buildIcsContent(event, new Date('2026-07-29T00:00:00.000Z'));

        expect(googleUrl.searchParams.get('dates')).toBe('20260815T090000Z/20260815T090100Z');
        expect(googleUrl.searchParams.get('location')).toBe('');
        expect(content).toContain('UID:offer-decision-42@jobtracker.weihungloh.com\r\n');
        expect(content).toContain('DTSTART:20260815T090000Z\r\n');
        expect(content).toContain('DTEND:20260815T090100Z\r\n');
        expect(content).toContain('SUMMARY:Offer decision deadline — Acme\\, Inc.\r\n');
        expect(content).toContain('LOCATION:\r\n');
        expect(content).not.toContain('\r\nURL:');
        expect(content).not.toContain('10000');
        expect(content).not.toContain('Private pro');
        expect(content).not.toContain('Private concern');
        expect(content.replace(/\r\n/g, '')).not.toContain('\n');
    });

    test('folds long ASCII offer content to standards-compliant iCalendar lines', () => {
        const longCompanyName = 'A'.repeat(100);
        const event = buildOfferDeadlineCalendarEvent({ ...application, company_name: longCompanyName });
        const content = buildIcsContent(event, new Date('2026-07-29T00:00:00.000Z'));
        const physicalLines = content.split('\r\n').filter(Boolean);
        const unfoldedContent = content.replace(/\r\n[ \t]/g, '');

        expect(unfoldedContent).toContain(`SUMMARY:Offer decision deadline — ${longCompanyName}\r\n`);
        expect(physicalLines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
        expect(content).toContain('\r\n ');
    });

    test('creates a readable sanitized filename and rejects an invalid saved deadline', () => {
        expect(buildOfferDeadlineIcsFilename(application)).toBe('Acme-Inc-Offer-Decision-Deadline.ics');
        expect(buildOfferDeadlineIcsFilename({ ...application, company_name: ' ' })).toBe(
            'offer-decision-deadline.ics'
        );
        expect(() =>
            buildOfferDeadlineCalendarEvent({
                ...application,
                evaluation: {
                    ...application.evaluation!,
                    details: { ...application.evaluation!.details, decision_deadline: 'not-a-date' },
                },
            })
        ).toThrow('Invalid offer decision deadline');
    });
});
