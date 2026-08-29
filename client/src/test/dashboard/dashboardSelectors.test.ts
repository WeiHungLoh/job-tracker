import { getWeeklyInterviewCounts } from '../../pages/dashboard/dashboardSelectors';
import type { WeeklyApplicationCount } from '../../pages/application/models';
import type { JobInterview } from '../../pages/interview/models';

const weeks: WeeklyApplicationCount[] = [
    '2026-05-18',
    '2026-05-25',
    '2026-06-01',
    '2026-06-08',
    '2026-06-15',
    '2026-06-22',
    '2026-06-29',
    '2026-07-06',
].map((startOfWeek, index) => ({ start_of_week: startOfWeek, applications_count: String(index) }));

const interview = (interviewId: number, interviewDate: string): JobInterview => ({
    interview_id: interviewId,
    job_id: interviewId,
    company_name: `Company ${interviewId}`,
    job_title: `Role ${interviewId}`,
    interview_date: interviewDate,
    interview_duration_minutes: 60,
    interview_location: '',
    interview_type: '',
    interview_notes: '',
});

describe('dashboard selectors', () => {
    test('aligns interview starts to all eight existing half-open weekly buckets', () => {
        const interviews = [
            interview(1, '2026-05-18T00:00:00.000'),
            interview(2, '2026-05-24T23:59:59.999'),
            interview(3, '2026-05-25T00:00:00.000'),
            interview(4, '2026-07-06T12:00:00.000'),
        ];

        expect(getWeeklyInterviewCounts(interviews, weeks)).toEqual([2, 1, 0, 0, 0, 0, 0, 1]);
    });

    test('ignores interviews outside the supplied range and invalid dates', () => {
        const interviews = [
            interview(1, '2026-05-17T23:59:59.999'),
            interview(2, '2026-07-13T00:00:00.000'),
            interview(3, 'not-a-date'),
        ];

        expect(getWeeklyInterviewCounts(interviews, weeks)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    test('uses calendar week boundaries across a daylight-saving transition', () => {
        const daylightSavingWeeks: WeeklyApplicationCount[] = [
            { start_of_week: '2026-03-02', applications_count: '0' },
            { start_of_week: '2026-03-09', applications_count: '0' },
        ];
        const interviews = [interview(1, '2026-03-08T23:59:59.999'), interview(2, '2026-03-09T00:00:00.000')];

        expect(getWeeklyInterviewCounts(interviews, daylightSavingWeeks)).toEqual([1, 1]);
    });

    test('does not mutate weekly buckets or interview input', () => {
        const interviews = [interview(2, '2026-06-15T10:00:00.000Z'), interview(1, '2026-05-18T10:00:00.000Z')];
        const originalWeeks = structuredClone(weeks);
        const originalInterviews = structuredClone(interviews);

        getWeeklyInterviewCounts(interviews, weeks);

        expect(weeks).toEqual(originalWeeks);
        expect(interviews).toEqual(originalInterviews);
    });
});
