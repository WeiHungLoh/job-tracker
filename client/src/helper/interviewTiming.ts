import { formatLongDate } from './dateFormatter';

export const INTERVIEW_DURATION_MINUTES_MIN = 1;
export const INTERVIEW_DURATION_MINUTES_MAX = 1440;
export const DEFAULT_INTERVIEW_DURATION_MINUTES = 60;

export type InterviewTimeFilter = 'Upcoming Interviews' | 'Past Interviews';

export const INTERVIEW_TIME_FILTERS: readonly InterviewTimeFilter[] = ['Upcoming Interviews', 'Past Interviews'];

export type InterviewTimingSource = {
    interview_date: string;
    interview_duration_minutes: number;
};

type PinnableInterviewTimingSource = InterviewTimingSource & {
    is_pinned?: boolean;
};

export type InterviewTiming = {
    end: Date;
    formattedRange: string;
    hasEnded: boolean;
    hasNotEnded: boolean;
    hasStarted: boolean;
    isInProgress: boolean;
    isValid: boolean;
    start: Date;
};

const invalidDate = () => new Date(Number.NaN);

const formatLocalTime = (date: Date): string => {
    const hours = date.getHours();
    const twelveHour = hours % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'pm' : 'am';

    return `${twelveHour}:${minutes} ${period}`;
};

const isSameLocalDate = (firstDate: Date, secondDate: Date): boolean =>
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate();

const formatInterviewRange = (start: Date, end: Date): string => {
    if (isSameLocalDate(start, end)) {
        return `${formatLongDate(start)} from ${formatLocalTime(start)} to ${formatLocalTime(end)}`;
    }

    return `${formatLongDate(start)} at ${formatLocalTime(start)} to ${formatLongDate(end)} at ${formatLocalTime(end)}`;
};

export const getInterviewTiming = (interview: InterviewTimingSource, now = new Date()): InterviewTiming => {
    const start = new Date(interview.interview_date);
    const durationIsValid =
        Number.isInteger(interview.interview_duration_minutes) &&
        interview.interview_duration_minutes >= INTERVIEW_DURATION_MINUTES_MIN &&
        interview.interview_duration_minutes <= INTERVIEW_DURATION_MINUTES_MAX;
    const startTime = start.getTime();

    if (Number.isNaN(startTime) || !durationIsValid) {
        return {
            end: invalidDate(),
            formattedRange: 'Invalid interview date',
            hasEnded: false,
            hasNotEnded: false,
            hasStarted: false,
            isInProgress: false,
            isValid: false,
            start,
        };
    }

    const end = new Date(startTime + interview.interview_duration_minutes * 60 * 1000);
    const nowTime = now.getTime();
    const hasStarted = nowTime >= startTime;
    const hasEnded = nowTime >= end.getTime();

    return {
        end,
        formattedRange: formatInterviewRange(start, end),
        hasEnded,
        hasNotEnded: !hasEnded,
        hasStarted,
        isInProgress: hasStarted && !hasEnded,
        isValid: true,
        start,
    };
};

export const formatInterviewCountdown = (timing: InterviewTiming, now = new Date()): string => {
    if (!timing.isValid || timing.hasEnded) {
        return '';
    }

    const countdownTarget = timing.hasStarted ? timing.end : timing.start;
    const remainingMinutes = Math.max(0, Math.floor((countdownTarget.getTime() - now.getTime()) / (60 * 1000)));
    const days = Math.floor(remainingMinutes / (24 * 60));
    const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
    const minutes = remainingMinutes % 60;

    return `${days} days ${hours} hours ${minutes} minutes`;
};

export const filterAndSortInterviews = <Interview extends PinnableInterviewTimingSource>(
    interviews: readonly Interview[],
    selectedFilters: readonly InterviewTimeFilter[],
    now = new Date()
): Interview[] => {
    const filteredInterviews =
        selectedFilters.length === 1
            ? interviews.filter((interview) => {
                  const timing = getInterviewTiming(interview, now);
                  return selectedFilters[0] === 'Upcoming Interviews' ? timing.hasNotEnded : timing.hasEnded;
              })
            : interviews;

    return [...filteredInterviews].sort((firstInterview, secondInterview) => {
        if (Boolean(firstInterview.is_pinned) !== Boolean(secondInterview.is_pinned)) {
            return firstInterview.is_pinned ? -1 : 1;
        }

        const firstTiming = getInterviewTiming(firstInterview, now);
        const secondTiming = getInterviewTiming(secondInterview, now);

        if (firstTiming.hasNotEnded !== secondTiming.hasNotEnded) {
            return firstTiming.hasNotEnded ? -1 : 1;
        }
        if (firstTiming.isValid !== secondTiming.isValid) {
            return firstTiming.isValid ? -1 : 1;
        }

        return firstTiming.start.getTime() - secondTiming.start.getTime();
    });
};

export const getUpcomingInterviews = <Interview extends InterviewTimingSource>(
    interviews: readonly Interview[],
    now = new Date()
): Interview[] => filterAndSortInterviews(interviews, ['Upcoming Interviews'], now);

export const interviewTimesOverlap = (
    firstInterview: InterviewTimingSource,
    secondInterview: InterviewTimingSource,
    now = new Date()
): boolean => {
    const firstTiming = getInterviewTiming(firstInterview, now);
    const secondTiming = getInterviewTiming(secondInterview, now);

    return (
        firstTiming.isValid &&
        secondTiming.isValid &&
        firstTiming.start.getTime() < secondTiming.end.getTime() &&
        secondTiming.start.getTime() < firstTiming.end.getTime()
    );
};

type IdentifiedInterviewTimingSource = InterviewTimingSource & {
    interview_id: number;
};

export const findInterviewSchedulingConflicts = <Interview extends IdentifiedInterviewTimingSource>(
    interviews: readonly Interview[],
    proposedInterview: InterviewTimingSource,
    now = new Date()
): Interview[] => {
    const proposedTiming = getInterviewTiming(proposedInterview, now);
    if (!proposedTiming.isValid || proposedTiming.start.getTime() < now.getTime()) {
        return [];
    }

    return interviews
        .filter((interview) => interviewTimesOverlap(proposedInterview, interview, now))
        .sort((firstInterview, secondInterview) => {
            const startDifference =
                getInterviewTiming(firstInterview, now).start.getTime() -
                getInterviewTiming(secondInterview, now).start.getTime();
            return startDifference || firstInterview.interview_id - secondInterview.interview_id;
        });
};
