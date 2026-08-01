import { buildGoogleCalendarUrl, CALENDAR_ERROR_MESSAGE, downloadIcsEvent } from '../../helper/calendarEvent';
import { buildOfferDeadlineCalendarEvent, buildOfferDeadlineIcsFilename } from './offerDeadlineCalendar';
import type { OfferDecisionApplication, OfferDecisionStatus } from './models';

export type OfferStatusAction = {
    label: string;
    status: OfferDecisionStatus;
};

export const getOfferStatusActions = (status: OfferDecisionApplication['job_status']): OfferStatusAction[] =>
    status === 'Offer'
        ? [
              { label: 'Accept offer', status: 'Accepted' },
              { label: 'Decline offer', status: 'Declined' },
          ]
        : status === 'Accepted'
        ? [
              { label: 'Change to Offer', status: 'Offer' },
              { label: 'Change to Declined', status: 'Declined' },
          ]
        : status === 'Declined'
        ? [
              { label: 'Change to Offer', status: 'Offer' },
              { label: 'Change to Accepted', status: 'Accepted' },
          ]
        : [];

export const openOfferDeadlineInGoogleCalendar = (
    application: OfferDecisionApplication,
    showErrorToast: (message: string) => void
) => {
    try {
        const event = buildOfferDeadlineCalendarEvent(application);
        window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
    } catch {
        showErrorToast(CALENDAR_ERROR_MESSAGE);
    }
};

export const downloadOfferDeadlineIcs = (
    application: OfferDecisionApplication,
    showErrorToast: (message: string) => void
) => {
    try {
        downloadIcsEvent(buildOfferDeadlineCalendarEvent(application), buildOfferDeadlineIcsFilename(application));
    } catch {
        showErrorToast(CALENDAR_ERROR_MESSAGE);
    }
};
