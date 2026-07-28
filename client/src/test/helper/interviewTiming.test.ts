import {
    filterAndSortInterviews,
    findInterviewSchedulingConflicts,
    formatInterviewCountdown,
    getInterviewTiming,
    getUpcomingInterviews,
    interviewTimesOverlap,
} from '../../helper/interviewTiming';

const interview = (date: Date, duration = 60) => ({
    interview_date: date.toISOString(),
    interview_duration_minutes: duration,
});

describe('interview timing', () => {
    const now = new Date(2026, 6, 13, 12, 0, 0, 0);

    test('calculates end time and formats a same-day local range', () => {
        const timing = getInterviewTiming(interview(new Date(2026, 6, 13, 11, 30, 0, 0)), now);

        expect(timing.end).toEqual(new Date(2026, 6, 13, 12, 30, 0, 0));
        expect(timing.formattedRange).toBe('13 July 2026 from 11:30 am to 12:30 pm');
        expect(timing.isInProgress).toBe(true);
        expect(timing.hasNotEnded).toBe(true);
        expect(timing.hasEnded).toBe(false);
    });

    test.each([
        [new Date(2026, 6, 13, 23, 30), 60, '13 July 2026 at 11:30 pm to 14 July 2026 at 12:30 am'],
        [new Date(2026, 11, 31, 23, 30), 60, '31 December 2026 at 11:30 pm to 1 January 2027 at 12:30 am'],
    ])('formats ranges across date boundaries', (start, duration, expected) => {
        expect(getInterviewTiming(interview(start, duration), now).formattedRange).toBe(expected);
    });

    test('classifies future, in-progress, and exact-end interviews deterministically', () => {
        const future = getInterviewTiming(interview(new Date(2026, 6, 13, 12, 30)), now);
        const inProgress = getInterviewTiming(interview(new Date(2026, 6, 13, 11, 30)), now);
        const endedNow = getInterviewTiming(interview(new Date(2026, 6, 13, 11, 0)), now);

        expect(future.hasNotEnded).toBe(true);
        expect(future.hasStarted).toBe(false);
        expect(inProgress.hasNotEnded).toBe(true);
        expect(inProgress.isInProgress).toBe(true);
        expect(endedNow.hasEnded).toBe(true);
        expect(endedNow.hasNotEnded).toBe(false);
    });

    test('filters and sorts one collection for Show All, Upcoming, Past, and both selections', () => {
        const ended = { ...interview(new Date(2026, 6, 13, 10, 0)), id: 'ended' };
        const inProgress = { ...interview(new Date(2026, 6, 13, 11, 30)), id: 'in progress' };
        const future = { ...interview(new Date(2026, 6, 13, 13, 0)), id: 'future' };
        const interviews = [future, ended, inProgress];

        expect(filterAndSortInterviews(interviews, [], now).map(({ id }) => id)).toEqual([
            'in progress',
            'future',
            'ended',
        ]);
        expect(filterAndSortInterviews(interviews, ['Upcoming Interviews'], now).map(({ id }) => id)).toEqual([
            'in progress',
            'future',
        ]);
        expect(filterAndSortInterviews(interviews, ['Past Interviews'], now).map(({ id }) => id)).toEqual(['ended']);
        expect(
            filterAndSortInterviews(interviews, ['Upcoming Interviews', 'Past Interviews'], now).map(({ id }) => id)
        ).toEqual(['in progress', 'future', 'ended']);
        expect(getUpcomingInterviews(interviews, now).map(({ id }) => id)).toEqual(['in progress', 'future']);
        expect(interviews.map(({ id }) => id)).toEqual(['future', 'ended', 'in progress']);
    });

    test('filters by interview time before placing pinned interviews first', () => {
        const interviews = [
            { ...interview(new Date(2026, 6, 13, 13, 0)), id: 'unpinned future', is_pinned: false },
            { ...interview(new Date(2026, 6, 13, 14, 0)), id: 'pinned future', is_pinned: true },
            { ...interview(new Date(2026, 6, 13, 9, 0)), id: 'unpinned past', is_pinned: false },
            { ...interview(new Date(2026, 6, 13, 10, 0)), id: 'pinned past', is_pinned: true },
        ];

        expect(
            filterAndSortInterviews(interviews, ['Upcoming Interviews', 'Past Interviews'], now).map(({ id }) => id)
        ).toEqual(['pinned future', 'pinned past', 'unpinned future', 'unpinned past']);
        expect(filterAndSortInterviews(interviews, ['Upcoming Interviews'], now).map(({ id }) => id)).toEqual([
            'pinned future',
            'unpinned future',
        ]);
        expect(filterAndSortInterviews(interviews, ['Past Interviews'], now).map(({ id }) => id)).toEqual([
            'pinned past',
            'unpinned past',
        ]);
    });

    test('formats a deterministic countdown and handles invalid values safely', () => {
        const future = getInterviewTiming(interview(new Date(2026, 6, 14, 14, 30)), now);
        const inProgress = getInterviewTiming(interview(new Date(2026, 6, 13, 11, 30)), now);
        const invalid = getInterviewTiming({ interview_date: 'invalid', interview_duration_minutes: 60 }, now);

        expect(formatInterviewCountdown(future, now)).toBe('1 days 2 hours 30 minutes');
        expect(formatInterviewCountdown(inProgress, now)).toBe('0 days 0 hours 30 minutes');
        expect(invalid.isValid).toBe(false);
        expect(invalid.formattedRange).toBe('Invalid interview date');
    });

    test.each([
        ['same interval', 120, 60, 120, 60],
        ['new interval contained by existing', 120, 120, 150, 30],
        ['existing interval contained by new', 150, 30, 120, 120],
        ['left-side overlap', 150, 30, 120, 45],
        ['right-side overlap', 120, 60, 150, 60],
        ['same end time', 150, 30, 170, 10],
    ])(
        'detects %s using half-open interview ranges',
        (_name, existingStart, existingDuration, newStart, newDuration) => {
            const base = new Date(2026, 6, 25, 0, 0).getTime();
            const existing = interview(new Date(base + existingStart * 60_000), existingDuration);
            const proposed = interview(new Date(base + newStart * 60_000), newDuration);

            expect(interviewTimesOverlap(proposed, existing)).toBe(true);
        }
    );

    test.each([
        ['new starts when existing ends', 120, 60, 180, 60],
        ['new ends when existing starts', 180, 60, 120, 60],
    ])('allows boundary contact when %s', (_name, existingStart, existingDuration, newStart, newDuration) => {
        const base = new Date(2026, 6, 25, 0, 0).getTime();
        const existing = interview(new Date(base + existingStart * 60_000), existingDuration);
        const proposed = interview(new Date(base + newStart * 60_000), newDuration);

        expect(interviewTimesOverlap(proposed, existing)).toBe(false);
    });

    test('returns valid conflicts in chronological order without mutating the active interview input', () => {
        const currentTime = new Date(2026, 6, 25, 12, 0);
        const interviews = [
            { ...interview(new Date(2026, 6, 25, 15, 0), 60), interview_id: 3 },
            { ...interview(new Date(2026, 6, 25, 14, 30), 60), interview_id: 2 },
            { interview_date: 'invalid', interview_duration_minutes: 60, interview_id: 1 },
            { ...interview(new Date(2026, 6, 25, 13, 0), 60), interview_id: 4 },
        ];
        const originalOrder = interviews.map(({ interview_id }) => interview_id);

        expect(
            findInterviewSchedulingConflicts(interviews, interview(new Date(2026, 6, 25, 14, 45), 45), currentTime).map(
                ({ interview_id }) => interview_id
            )
        ).toEqual([2, 3]);
        expect(interviews.map(({ interview_id }) => interview_id)).toEqual(originalOrder);
    });

    test('skips scheduling conflicts when the proposed interview starts before the supplied current time', () => {
        const currentTime = new Date(2026, 6, 25, 16, 0);
        const interviews = [{ ...interview(new Date(2026, 6, 25, 14, 30), 60), interview_id: 1 }];
        const proposedInterview = interview(new Date(2026, 6, 25, 14, 45), 30);

        expect(findInterviewSchedulingConflicts(interviews, proposedInterview, currentTime)).toEqual([]);
    });

    test('checks scheduling conflicts when the proposed interview starts exactly at the supplied current time', () => {
        const currentTime = new Date(2026, 6, 25, 16, 0);
        const interviews = [{ ...interview(new Date(2026, 6, 25, 15, 30), 60), interview_id: 1 }];
        const proposedInterview = interview(currentTime, 30);

        expect(
            findInterviewSchedulingConflicts(interviews, proposedInterview, currentTime).map(
                ({ interview_id }) => interview_id
            )
        ).toEqual([1]);
    });
});
