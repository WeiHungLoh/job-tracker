import { getInterviewTiming } from '../../../helper/interviewTiming';
import { buildCalendarFilename, sanitizeCalendarUri, type CalendarEventDetails } from '../../../helper/calendarEvent';
import type { JobInterview } from '../models';

const UID_DOMAIN = 'jobtracker.weihungloh.com';
export const BULK_INTERVIEW_ICS_FILENAME = 'job-tracker-upcoming-interviews.ics';

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

const populated = (value: string | null | undefined): string => value?.trim() ?? '';

export const buildInterviewCalendarEvent = (interview: CalendarInterview): CalendarEventDetails => {
    const timing = getInterviewTiming(interview);

    if (!timing.isValid) {
        throw new Error('Invalid interview date');
    }

    const companyName = populated(interview.company_name);
    const interviewType = populated(interview.interview_type);
    const jobTitle = populated(interview.job_title);
    const notes = populated(interview.interview_notes);
    const meetingUrl = sanitizeCalendarUri(populated(interview.meeting_url));
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
        location: populated(interview.interview_location),
        start: timing.start,
        title: `${companyName} — ${interviewType || 'Job Interview'}`,
        uid: `${interview.interview_id}@${UID_DOMAIN}`,
        ...(meetingUrl ? { url: meetingUrl } : {}),
    };
};

export const buildInterviewIcsFilename = (event: CalendarEventDetails): string =>
    buildCalendarFilename(event.title, 'job-interview');
