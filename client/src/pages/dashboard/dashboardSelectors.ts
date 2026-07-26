import type { JobStatusCount, WeeklyApplicationCount } from '../application/models';
import type { JobInterview } from '../interview/models';
import { getUpcomingInterviews as getUpcomingInterviewsByTiming } from '../../helper/interviewTiming';
import type { StatusCountMap } from './dashboardTypes';

export const getStatusCountMap = (statusCounts: JobStatusCount[]): StatusCountMap => {
    const countByStatus: StatusCountMap = {};

    statusCounts.forEach(({ job_status, count }) => {
        const numericCount = Number(count);
        countByStatus[job_status] = Number.isFinite(numericCount) ? numericCount : 0;
    });

    return countByStatus;
};

export const getTotalStatusCount = (countByStatus: StatusCountMap): number => {
    return Object.values(countByStatus).reduce((total, count) => total + count, 0);
};

export const getUpcomingInterviews = (interviews: JobInterview[], now = new Date()): JobInterview[] => {
    return getUpcomingInterviewsByTiming(interviews, now);
};

const WEEK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const getWeeklyInterviewCounts = (
    interviews: readonly JobInterview[],
    weeks: readonly WeeklyApplicationCount[]
): number[] => {
    const weekStarts = weeks.map((week) => Date.parse(week.start_of_week));
    const counts = weeks.map(() => 0);

    interviews.forEach((interview) => {
        const interviewStart = Date.parse(interview.interview_date);
        if (!Number.isFinite(interviewStart)) {
            return;
        }

        const weekIndex = weekStarts.findIndex(
            (weekStart) =>
                Number.isFinite(weekStart) &&
                interviewStart >= weekStart &&
                interviewStart < weekStart + WEEK_DURATION_MS
        );
        if (weekIndex >= 0) {
            counts[weekIndex] += 1;
        }
    });

    return counts;
};
