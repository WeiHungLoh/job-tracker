import { DEFAULT_INTERVIEW_DURATION_MINUTES } from '../../helper/interviewTiming';

type InterviewFormValues = {
    interviewDate: string;
    interviewDurationMinutes: string;
    interviewLocation: string;
    interviewType: string;
    meetingURL: string;
    notes: string;
};

export const hasUnsavedInterviewFormChanges = ({
    interviewDate,
    interviewDurationMinutes,
    interviewLocation,
    interviewType,
    meetingURL,
    notes,
}: InterviewFormValues): boolean =>
    interviewDate !== '' ||
    interviewDurationMinutes !== String(DEFAULT_INTERVIEW_DURATION_MINUTES) ||
    interviewLocation !== '' ||
    interviewType !== '' ||
    meetingURL !== '' ||
    notes !== '';
