import type { JobApplication, JobStatus } from '../../pages/application/models';
import type { JobInterview } from '../../pages/interview/models';
import type { OfferEvaluation } from '../../pages/offerDecision/models';
import {
    ATTENTION_APPLICATION_STATUSES,
    FOLLOW_UP_AFTER_DAYS,
    MAX_ATTENTION_ITEMS,
    getAttentionItems,
} from '../../pages/dashboard/attentionCenter/attentionItems';
import { DEFAULT_NEEDS_ATTENTION_SETTINGS } from '../../pages/dashboard/attentionCenter/needsAttentionSettings';

const now = new Date('2026-07-18T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const createApplication = (
    jobId: number,
    status: JobStatus,
    ageDays: number,
    companyName = `Company ${jobId}`
): JobApplication => ({
    job_id: jobId,
    company_name: companyName,
    job_title: `Role ${jobId}`,
    application_date: new Date(now.getTime() - ageDays * DAY_MS).toISOString(),
    job_status: status,
    job_location: '',
    job_posting_url: '',
    notes: '',
});

const createOfferEvaluation = (jobId: number, decisionDeadline: string): OfferEvaluation => ({
    job_id: jobId,
    ratings: {
        career_growth: 3,
        company_culture_fit: 3,
        work_life_balance: 3,
        compensation: 3,
    },
    details: {
        currency: 'SGD',
        monthly_base_salary: 8000,
        bonus: '',
        annual_leave_days: 18,
        work_arrangement: 'Hybrid',
        decision_deadline: decisionDeadline,
        pros: '',
        concerns: '',
    },
});

const createInterview = (interviewId: number, jobId: number, start: string, duration = 60): JobInterview => ({
    interview_id: interviewId,
    job_id: jobId,
    company_name: `Company ${jobId}`,
    job_title: `Role ${jobId}`,
    job_status: 'Interview',
    interview_date: start,
    interview_duration_minutes: duration,
    interview_location: '',
    interview_type: '',
    interview_notes: '',
});

const createInterviewEndingDaysAgo = (
    interviewId: number,
    jobId: number,
    ageDays: number,
    duration = 60,
    endOffsetMinutes = 0
): JobInterview => {
    const endTime = now.getTime() - ageDays * DAY_MS + endOffsetMinutes * MINUTE_MS;
    return createInterview(interviewId, jobId, new Date(endTime - duration * MINUTE_MS).toISOString(), duration);
};

describe('getAttentionItems', () => {
    test('uses only the three active statuses needed by the dashboard request', () => {
        expect(ATTENTION_APPLICATION_STATUSES).toEqual(['Applied', 'Interview', 'Offer']);
        expect(FOLLOW_UP_AFTER_DAYS).toBe(7);
        expect(MAX_ATTENTION_ITEMS).toBe(10);
    });

    test('uses custom timing values independently at their exact boundaries', () => {
        const settings = {
            ...DEFAULT_NEEDS_ATTENTION_SETTINGS,
            offerDueDays: 1,
            offerOverdueDays: 2,
            postInterviewStaleDays: 3,
            postInterviewFollowUpDays: 4,
            applicationStaleDays: 5,
            applicationFollowUpDays: 6,
        };
        const applications = [
            {
                ...createApplication(1, 'Offer', 10),
                has_offer_evaluation: true,
            },
            {
                ...createApplication(2, 'Offer', 10),
                has_offer_evaluation: true,
            },
            createApplication(3, 'Interview', 20),
            createApplication(4, 'Interview', 20),
            {
                ...createApplication(5, 'Applied', 20),
                application_follow_up_sent_at: new Date(now.getTime() - 5 * DAY_MS).toISOString(),
            },
            createApplication(6, 'Applied', 6),
        ];
        const interviews = [
            {
                ...createInterviewEndingDaysAgo(3, 3, 10),
                follow_up_sent_at: new Date(now.getTime() - 3 * DAY_MS).toISOString(),
            },
            createInterviewEndingDaysAgo(4, 4, 4),
        ];
        const evaluations = [
            createOfferEvaluation(1, new Date(now.getTime() + DAY_MS).toISOString()),
            createOfferEvaluation(2, new Date(now.getTime() - 2 * DAY_MS).toISOString()),
        ];

        expect(
            getAttentionItems(applications, interviews, now, evaluations, settings).map((item) => item.category)
        ).toEqual([
            'offer-decision-due',
            'offer-decision-overdue',
            'post-interview-follow-up-stale',
            'post-interview',
            'application-follow-up-stale',
            'application-follow-up',
        ]);
    });

    test('uses the configured item cap without changing fixed priority', () => {
        const applications = [
            createApplication(1, 'Applied', 30),
            createApplication(2, 'Applied', 29),
            createApplication(3, 'Applied', 28),
            { ...createApplication(4, 'Offer', 10), has_offer_evaluation: false },
        ];

        expect(
            getAttentionItems(applications, [], now, [], {
                ...DEFAULT_NEEDS_ATTENTION_SETTINGS,
                maxItems: 2,
            }).map((item) => item.category)
        ).toEqual(['offer-evaluation', 'application-follow-up']);
    });

    test('disabled categories produce no items and stored category order cannot change fixed priority', () => {
        const applications = [
            createApplication(1, 'Applied', 30),
            { ...createApplication(2, 'Offer', 10), has_offer_evaluation: false },
            createApplication(3, 'Interview', 30),
        ];
        const settings = {
            ...DEFAULT_NEEDS_ATTENTION_SETTINGS,
            enabledCategories: ['application-follow-up', 'offer-evaluation'] as const,
        };

        expect(getAttentionItems(applications, [], now, [], settings).map((item) => item.category)).toEqual([
            'offer-evaluation',
            'application-follow-up',
        ]);
        expect(
            getAttentionItems(applications, [], now, [], {
                ...settings,
                enabledCategories: [],
            })
        ).toEqual([]);
    });

    test('includes Applied applications at seven full days without a separate stale category', () => {
        const items = getAttentionItems(
            [
                createApplication(1, 'Applied', 6),
                createApplication(2, 'Applied', 7),
                createApplication(3, 'Applied', 21),
                createApplication(4, 'Applied', 30),
            ],
            [],
            now
        );

        expect(
            items.map(({ application, category, message }) => ({
                jobId: application.job_id,
                category,
                message,
            }))
        ).toEqual([
            {
                jobId: 4,
                category: 'application-follow-up',
                message: 'Applied on 18 June 2026 (30 days ago). No interview has been recorded.',
            },
            {
                jobId: 3,
                category: 'application-follow-up',
                message: 'Applied on 27 June 2026 (21 days ago). No interview has been recorded.',
            },
            {
                jobId: 2,
                category: 'application-follow-up',
                message: 'Applied on 11 July 2026 (7 days ago). No interview has been recorded.',
            },
        ]);
    });

    test('does not flag an Applied application when any interview is linked', () => {
        const application = createApplication(1, 'Applied', 30);
        const interview = createInterviewEndingDaysAgo(1, 1, 20);

        expect(getAttentionItems([application], [interview], now)).toEqual([]);
    });

    test('suppresses only the follow-up item whose persisted timestamp is set', () => {
        const sentApplication = {
            ...createApplication(1, 'Applied', 30),
            application_follow_up_sent_at: '2026-07-17T12:00:00.000Z',
        };
        const pendingApplication = createApplication(2, 'Applied', 30);
        const sentInterview = {
            ...createInterviewEndingDaysAgo(10, 3, 10),
            follow_up_sent_at: '2026-07-17T12:00:00.000Z',
        };
        const pendingInterview = createInterviewEndingDaysAgo(11, 4, 10);

        const items = getAttentionItems(
            [
                sentApplication,
                pendingApplication,
                createApplication(3, 'Interview', 30),
                createApplication(4, 'Interview', 30),
            ],
            [sentInterview, pendingInterview],
            now
        );

        expect(items.map((item) => [item.category, item.application.job_id])).toEqual([
            ['post-interview', 4],
            ['application-follow-up', 2],
        ]);
    });

    test('suggests Ghosted after exactly fourteen full days since an application follow-up was sent', () => {
        const beforeBoundary = {
            ...createApplication(1, 'Applied', 30),
            application_follow_up_sent_at: new Date(now.getTime() - 14 * DAY_MS + 1).toISOString(),
        };
        const atBoundary = {
            ...createApplication(2, 'Applied', 30),
            application_follow_up_sent_at: new Date(now.getTime() - 14 * DAY_MS).toISOString(),
        };
        const older = {
            ...createApplication(3, 'Applied', 30),
            application_follow_up_sent_at: new Date(now.getTime() - 15 * DAY_MS).toISOString(),
        };

        const items = getAttentionItems([beforeBoundary, atBoundary, older], [], now);

        expect(items.map((item) => [item.category, item.application.job_id])).toEqual([
            ['application-follow-up-stale', 3],
            ['application-follow-up-stale', 2],
        ]);
        expect(items[0].message).toBe(
            'The application follow-up was marked as sent on 3 July 2026 (15 days ago). ' +
                'The application is still Applied and no interview has been recorded.'
        );
    });

    test('suggests Ghosted after exactly fourteen full days since the latest interview follow-up was sent', () => {
        const beforeBoundary = {
            ...createInterviewEndingDaysAgo(1, 1, 21),
            follow_up_sent_at: new Date(now.getTime() - 14 * DAY_MS + 1).toISOString(),
        };
        const atBoundary = {
            ...createInterviewEndingDaysAgo(2, 2, 21),
            follow_up_sent_at: new Date(now.getTime() - 14 * DAY_MS).toISOString(),
        };
        const older = {
            ...createInterviewEndingDaysAgo(3, 3, 21),
            follow_up_sent_at: new Date(now.getTime() - 15 * DAY_MS).toISOString(),
        };

        const items = getAttentionItems(
            [
                createApplication(1, 'Interview', 30),
                createApplication(2, 'Interview', 30),
                createApplication(3, 'Interview', 30),
            ],
            [beforeBoundary, atBoundary, older],
            now
        );

        expect(items.map((item) => [item.category, item.application.job_id])).toEqual([
            ['post-interview-follow-up-stale', 3],
            ['post-interview-follow-up-stale', 2],
        ]);
        expect(items[0]).toMatchObject({
            latestCompletedInterview: { interview_id: 3 },
            message:
                'The follow-up for your latest recorded interview was marked as sent on 3 July 2026 (15 days ago). ' +
                'The application is still at Interview.',
        });
    });

    test('allows a later qualifying interview when an earlier interview follow-up was sent', () => {
        const earlier = {
            ...createInterviewEndingDaysAgo(10, 1, 14),
            follow_up_sent_at: '2026-07-01T12:00:00.000Z',
        };
        const later = createInterviewEndingDaysAgo(11, 1, 7);

        const [item] = getAttentionItems([createApplication(1, 'Interview', 30)], [earlier, later], now);

        expect(item).toMatchObject({
            category: 'post-interview',
            latestCompletedInterview: { interview_id: 11 },
        });
    });

    test('does not reuse a stale older interview follow-up when a newer interview is not yet follow-up eligible', () => {
        const staleEarlierFollowUp = (interviewId: number, jobId: number) => ({
            ...createInterviewEndingDaysAgo(interviewId, jobId, 30),
            follow_up_sent_at: '2026-06-25T12:00:00.000Z',
        });

        const items = getAttentionItems(
            [createApplication(1, 'Interview', 40), createApplication(2, 'Interview', 40)],
            [
                staleEarlierFollowUp(10, 1),
                createInterviewEndingDaysAgo(11, 1, 6),
                staleEarlierFollowUp(20, 2),
                createInterview(21, 2, '2026-07-19T12:00:00.000Z'),
            ],
            now
        );

        expect(items).toEqual([]);
    });

    test('includes completed interview follow-ups at exactly seven full days but not six days', () => {
        const items = getAttentionItems(
            [createApplication(1, 'Interview', 30), createApplication(2, 'Interview', 30)],
            [createInterviewEndingDaysAgo(1, 1, 6), createInterviewEndingDaysAgo(2, 2, 7)],
            now
        );

        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
            application: { job_id: 2 },
            category: 'post-interview',
            latestCompletedInterview: { interview_id: 2 },
            message:
                'Your latest recorded interview ended on 11 July 2026 (7 days ago), and the application is still at Interview.',
        });
    });

    test('counts from interview end time including duration instead of the start time', () => {
        const startedOverSevenDaysAgo = createInterviewEndingDaysAgo(1, 1, 7, 240, 60);
        const endedExactlySevenDaysAgo = createInterviewEndingDaysAgo(2, 2, 7, 120);

        const items = getAttentionItems(
            [createApplication(1, 'Interview', 30), createApplication(2, 'Interview', 30)],
            [startedOverSevenDaysAgo, endedExactlySevenDaysAgo],
            now
        );

        expect(items.map((item) => item.application.job_id)).toEqual([2]);
        expect(items[0].message).toContain('ended on 11 July 2026 (7 days ago)');
    });

    test('uses the latest end time across every linked interview', () => {
        const items = getAttentionItems(
            [createApplication(1, 'Interview', 30), createApplication(2, 'Interview', 30)],
            [
                createInterviewEndingDaysAgo(1, 1, 14),
                createInterviewEndingDaysAgo(2, 1, 7),
                createInterviewEndingDaysAgo(3, 2, 14),
                createInterviewEndingDaysAgo(4, 2, 6),
            ],
            now
        );

        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
            application: { job_id: 1 },
            latestCompletedInterview: { interview_id: 2 },
        });
        expect(items[0].message).toContain('ended on 11 July 2026 (7 days ago)');
    });

    test('excludes an application when any linked interview is future or ongoing', () => {
        const items = getAttentionItems(
            [createApplication(1, 'Interview', 30), createApplication(2, 'Interview', 30)],
            [
                createInterviewEndingDaysAgo(1, 1, 14),
                createInterview(2, 1, '2026-07-19T12:00:00.000Z'),
                createInterviewEndingDaysAgo(3, 2, 14),
                createInterview(4, 2, '2026-07-18T11:30:00.000Z'),
            ],
            now
        );

        expect(items).toEqual([]);
    });

    test('does not treat invalid interview dates or durations as completed', () => {
        const applications = Array.from({ length: 4 }, (_, index) => createApplication(index + 1, 'Interview', 30));
        const interviews = [
            createInterview(1, 1, 'invalid'),
            createInterviewEndingDaysAgo(2, 2, 14, 0),
            createInterviewEndingDaysAgo(3, 3, 14, 1.5),
            createInterviewEndingDaysAgo(4, 4, 14, 1441),
        ];

        expect(getAttentionItems(applications, interviews, now)).toEqual([]);
    });

    test('ranks longer completed-interview waits first and reports full elapsed days', () => {
        const items = getAttentionItems(
            [createApplication(1, 'Interview', 30), createApplication(2, 'Interview', 30)],
            [createInterviewEndingDaysAgo(1, 1, 7), createInterviewEndingDaysAgo(2, 2, 14)],
            now
        );

        expect(items.map((item) => item.application.job_id)).toEqual([2, 1]);
        expect(items.map((item) => item.message)).toEqual([
            'Your latest recorded interview ended on 4 July 2026 (14 days ago), and the application is still at Interview.',
            'Your latest recorded interview ended on 11 July 2026 (7 days ago), and the application is still at Interview.',
        ]);
    });

    test('includes Interview applications with no linked interview and orders valid older dates first', () => {
        const invalidDate = { ...createApplication(1, 'Interview', 10), application_date: 'invalid' };
        const items = getAttentionItems(
            [invalidDate, createApplication(2, 'Interview', 20), createApplication(3, 'Interview', 10)],
            [],
            now
        );

        expect(items.map((item) => item.application.job_id)).toEqual([2, 3, 1]);
        expect(items.every((item) => item.category === 'interview-unscheduled')).toBe(true);
        expect(items[0].message).toBe('This application is at Interview, but no interview has been scheduled.');
    });

    test('does not classify an Interview application as unscheduled when any interview is linked', () => {
        const application = createApplication(1, 'Interview', 30);
        const recentInterview = createInterviewEndingDaysAgo(1, 1, 6);

        expect(getAttentionItems([application], [recentInterview], now)).toEqual([]);
    });

    test('uses the complete category priority order', () => {
        const applications = [
            {
                ...createApplication(1, 'Applied', 30),
                application_follow_up_sent_at: new Date(now.getTime() - 14 * DAY_MS).toISOString(),
            },
            { ...createApplication(2, 'Offer', 30), has_offer_evaluation: false },
            createApplication(3, 'Interview', 30),
            createApplication(4, 'Interview', 30),
            createApplication(5, 'Interview', 30),
            createApplication(6, 'Applied', 30),
        ];
        const interviews = [
            {
                ...createInterviewEndingDaysAgo(1, 4, 21),
                follow_up_sent_at: new Date(now.getTime() - 14 * DAY_MS).toISOString(),
            },
            createInterviewEndingDaysAgo(2, 5, 7),
        ];

        expect(getAttentionItems(applications, interviews, now).map((item) => item.category)).toEqual([
            'offer-evaluation',
            'post-interview-follow-up-stale',
            'post-interview',
            'interview-unscheduled',
            'application-follow-up-stale',
            'application-follow-up',
        ]);
    });

    test('always includes unevaluated offers without relying on a decision deadline', () => {
        const application = { ...createApplication(1, 'Offer', 10), has_offer_evaluation: false };
        const [item] = getAttentionItems([application], [], now);

        expect(item).toMatchObject({
            category: 'offer-evaluation',
            message: 'This offer has not been evaluated yet. Add its details to compare it and record a deadline.',
        });
    });

    test('includes evaluated offers from the exact 72-hour due boundary through exactly fourteen days overdue', () => {
        const applications = [1, 2, 3, 4, 5, 6, 7].map((jobId) => ({
            ...createApplication(jobId, 'Offer', 10),
            has_offer_evaluation: true,
        }));
        const evaluations = [
            createOfferEvaluation(1, new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString()),
            createOfferEvaluation(2, new Date(now.getTime() + 72 * 60 * 60 * 1000 + 1).toISOString()),
            createOfferEvaluation(3, now.toISOString()),
            createOfferEvaluation(4, new Date(now.getTime() - MINUTE_MS).toISOString()),
            createOfferEvaluation(5, new Date(now.getTime() - 14 * DAY_MS).toISOString()),
            createOfferEvaluation(6, new Date(now.getTime() - 14 * DAY_MS - 1).toISOString()),
            createOfferEvaluation(7, 'invalid'),
        ];

        const items = getAttentionItems(applications, [], now, evaluations);

        expect(items.map((item) => [item.category, item.application.job_id])).toEqual([
            ['offer-decision-due', 1],
            ['offer-decision-overdue', 5],
            ['offer-decision-overdue', 4],
            ['offer-decision-overdue', 3],
        ]);
        expect(items[1].message).toBe(
            'The decision deadline was 4 July 2026 (14 days overdue). Review the evaluated offer and mark it as Accepted or Declined once decided.'
        );
        expect(items[3].message).toBe(
            'The decision deadline is 18 July 2026 (due now). Review the evaluated offer and mark it as Accepted or Declined once decided.'
        );
        expect(items[0].message).toBe(
            'The decision deadline is 21 July 2026 (3 days away). Review the evaluated offer and mark it as Accepted or Declined once decided.'
        );
    });

    test.each([
        { remainingMinutes: 3 * 24 * 60, expectedTiming: '3 days away' },
        { remainingMinutes: 30 * 60, expectedTiming: '1 day 6 hours away' },
        { remainingMinutes: 24 * 60, expectedTiming: '1 day away' },
        { remainingMinutes: 23 * 60 + 30, expectedTiming: '23 hours 30 minutes away' },
        { remainingMinutes: 90, expectedTiming: '1 hour 30 minutes away' },
        { remainingMinutes: 61, expectedTiming: '1 hour 1 minute away' },
        { remainingMinutes: 60, expectedTiming: '1 hour away' },
        { remainingMinutes: 1, expectedTiming: '1 minute away' },
        { remainingMinutes: 0.5, expectedTiming: 'less than 1 minute away' },
        { remainingMinutes: -30, expectedTiming: '30 minutes overdue' },
        { remainingMinutes: -90, expectedTiming: '1 hour 30 minutes overdue' },
        { remainingMinutes: -(30 * 60), expectedTiming: '1 day 6 hours overdue' },
    ])('formats a decision deadline $expectedTiming', ({ remainingMinutes, expectedTiming }) => {
        const application = {
            ...createApplication(1, 'Offer', 10),
            has_offer_evaluation: true,
        };
        const evaluation = createOfferEvaluation(
            1,
            new Date(now.getTime() + remainingMinutes * MINUTE_MS).toISOString()
        );

        const [item] = getAttentionItems([application], [], now, [evaluation]);

        expect(item.message).toContain(`(${expectedTiming})`);
    });

    test('orders evaluated offers by the nearest decision deadline', () => {
        const applications = [1, 2, 3].map((jobId) => ({
            ...createApplication(jobId, 'Offer', 10),
            has_offer_evaluation: true,
        }));
        const evaluations = [
            createOfferEvaluation(1, new Date(now.getTime() + 3 * DAY_MS).toISOString()),
            createOfferEvaluation(2, new Date(now.getTime() + 1 * DAY_MS).toISOString()),
            createOfferEvaluation(3, new Date(now.getTime() + 2 * DAY_MS).toISOString()),
        ];

        expect(getAttentionItems(applications, [], now, evaluations).map((item) => item.application.job_id)).toEqual([
            2, 3, 1,
        ]);
    });

    test('uses job_id as the stable tie-breaker for equal primary sorting values', () => {
        const applications = [
            createApplication(4, 'Interview', 30),
            createApplication(2, 'Interview', 30),
            createApplication(8, 'Interview', 20),
            createApplication(6, 'Interview', 20),
            { ...createApplication(12, 'Offer', 10), has_offer_evaluation: false },
            { ...createApplication(10, 'Offer', 10), has_offer_evaluation: false },
        ];
        const interviews = [createInterviewEndingDaysAgo(1, 4, 7), createInterviewEndingDaysAgo(2, 2, 7)];

        expect(getAttentionItems(applications, interviews, now).map((item) => item.application.job_id)).toEqual([
            10, 12, 2, 4, 6, 8,
        ]);
        expect(
            getAttentionItems(
                [createApplication(14, 'Applied', 10), createApplication(13, 'Applied', 10)],
                [],
                now
            ).map((item) => item.application.job_id)
        ).toEqual([13, 14]);
    });

    test('caps the result at ten', () => {
        const applications = Array.from({ length: 12 }, (_, index) =>
            createApplication(index + 1, 'Applied', 21 + index)
        );

        expect(getAttentionItems(applications, [], now).map((item) => item.application.job_id)).toEqual([
            12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
        ]);
    });

    test('ignores unsupported statuses, future application dates, and invalid application dates for follow-ups', () => {
        const invalid = { ...createApplication(1, 'Applied', 7), application_date: 'invalid' };
        const future = { ...createApplication(2, 'Applied', 7), application_date: '2026-07-19T12:00:00.000Z' };
        const rejected = createApplication(3, 'Rejected', 30);

        expect(getAttentionItems([invalid, future, rejected], [], now)).toEqual([]);
    });
});
