import { buildCalendarFilename, type CalendarEventDetails } from '../../helper/calendarEvent';
import type { OfferDecisionApplication } from './models';

const OFFER_CALENDAR_UID_DOMAIN = 'jobtracker.weihungloh.com';
const OFFER_DEADLINE_EVENT_DURATION_MS = 60_000;
export const BULK_OFFER_DEADLINE_ICS_FILENAME = 'job-tracker-active-offer-deadlines.ics';

export const buildOfferDeadlineCalendarEvent = (application: OfferDecisionApplication): CalendarEventDetails => {
    const deadline = new Date(application.evaluation?.details.decision_deadline ?? '');
    if (!application.evaluation || Number.isNaN(deadline.getTime())) {
        throw new Error('Invalid offer decision deadline');
    }

    return {
        description: `Job title: ${application.job_title.trim()}\n\nDecision deadline for this offer. Review the saved evaluation in Job Tracker before responding.`,
        end: new Date(deadline.getTime() + OFFER_DEADLINE_EVENT_DURATION_MS),
        location: '',
        start: new Date(deadline.getTime()),
        title: `Offer decision deadline — ${application.company_name.trim()}`,
        uid: `offer-decision-${application.job_id}@${OFFER_CALENDAR_UID_DOMAIN}`,
    };
};

export const buildOfferDeadlineIcsFilename = (application: OfferDecisionApplication): string =>
    buildCalendarFilename(
        application.company_name.trim() ? `${application.company_name.trim()} Offer Decision Deadline` : '',
        'offer-decision-deadline'
    );
