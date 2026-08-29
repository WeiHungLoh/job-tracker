import type { JobStatusCount, WeeklyApplicationCount } from '../application/models';
import type { JobInterview } from '../interview/models';
import { getUpcomingInterviews as getUpcomingInterviewsByTiming } from '../../helper/interviewTiming';
import type { StatusCountMap } from './dashboardTypes';
import { parseCalendarDate } from '../../helper/dateFormatter';

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

export const getWeeklyInterviewCounts = (
    interviews: readonly JobInterview[],
    weeks: readonly WeeklyApplicationCount[]
): number[] => {
    const weekStarts = weeks.map((week) => parseCalendarDate(week.start_of_week));
    const counts = weeks.map(() => 0);

    interviews.forEach((interview) => {
        const interviewStart = Date.parse(interview.interview_date);
        if (!Number.isFinite(interviewStart)) {
            return;
        }

        const weekIndex = weekStarts.findIndex((weekStart) => {
            if (Number.isNaN(weekStart.getTime())) {
                return false;
            }

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return interviewStart >= weekStart.getTime() && interviewStart < weekEnd.getTime();
        });
        if (weekIndex >= 0) {
            counts[weekIndex] += 1;
        }
    });

    return counts;
};
