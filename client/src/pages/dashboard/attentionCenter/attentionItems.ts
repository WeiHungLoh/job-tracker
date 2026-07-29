import type { JobApplication, JobStatus } from '../../application/models';
import type { JobInterview } from '../../interview/models';
import type { OfferEvaluation } from '../../offerDecision/models';
import { getInterviewTiming } from '../../../helper/interviewTiming';
import { formatLongDate } from '../../../helper/dateFormatter';

export const FOLLOW_UP_AFTER_DAYS = 7;
export const STALE_FOLLOW_UP_AFTER_DAYS = 14;
export const OFFER_DECISION_ATTENTION_HOURS = 72;
export const OFFER_DECISION_OVERDUE_DAYS = 14;
export const MAX_ATTENTION_ITEMS = 10;
export const ATTENTION_APPLICATION_STATUSES = ['Applied', 'Interview', 'Offer'] as const satisfies readonly JobStatus[];

export type AttentionItemCategory =
    | 'post-interview'
    | 'post-interview-follow-up-stale'
    | 'interview-unscheduled'
    | 'offer-decision-overdue'
    | 'offer-decision-due'
    | 'offer-evaluation'
    | 'application-follow-up-stale'
    | 'application-follow-up';

export type AttentionItem = {
    application: JobApplication;
    category: AttentionItemCategory;
    latestCompletedInterview?: JobInterview;
    message: string;
};

type AttentionCandidate = AttentionItem & {
    priority: number;
    sortValue: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CATEGORY_PRIORITY: Record<AttentionItemCategory, number> = {
    'offer-decision-due': 0,
    'offer-decision-overdue': 1,
    'offer-evaluation': 2,
    'post-interview-follow-up-stale': 3,
    'post-interview': 4,
    'interview-unscheduled': 5,
    'application-follow-up-stale': 6,
    'application-follow-up': 7,
};
const OFFER_DECISION_ATTENTION_MS = OFFER_DECISION_ATTENTION_HOURS * 60 * 60 * 1000;
const OFFER_DECISION_OVERDUE_MS = OFFER_DECISION_OVERDUE_DAYS * DAY_MS;

const getElapsedDays = (startTime: number, now: Date): number | null => {
    const elapsed = now.getTime() - startTime;

    return Number.isFinite(startTime) && elapsed >= 0 ? Math.floor(elapsed / DAY_MS) : null;
};

const getApplicationAgeDays = (application: JobApplication, now: Date): number | null => {
    return getElapsedDays(Date.parse(application.application_date), now);
};

const formatDeadlineTiming = (remainingMs: number): string => {
    if (remainingMs === 0) {
        return 'due now';
    }

    const absoluteMs = Math.abs(remainingMs);
    const direction = remainingMs > 0 ? 'away' : 'overdue';
    if (absoluteMs < 60 * 1000) {
        return `less than 1 minute ${direction}`;
    }

    const totalMinutes = Math.ceil(absoluteMs / (60 * 1000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];

    if (days > 0) {
        parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    }
    if (hours > 0 && parts.length < 2) {
        parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }
    if (minutes > 0 && parts.length < 2) {
        parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }

    return `${parts.join(' ')} ${direction}`;
};

export const getAttentionItems = (
    applications: readonly JobApplication[],
    interviews: readonly JobInterview[],
    now = new Date(),
    offerEvaluations: readonly OfferEvaluation[] = []
): AttentionItem[] => {
    const interviewsByJobId = new Map<number, JobInterview[]>();
    const offerEvaluationByJobId = new Map(offerEvaluations.map((evaluation) => [evaluation.job_id, evaluation]));

    interviews.forEach((interview) => {
        const linked = interviewsByJobId.get(interview.job_id) ?? [];
        linked.push(interview);
        interviewsByJobId.set(interview.job_id, linked);
    });

    const candidates = applications.flatMap<AttentionCandidate>((application) => {
        const ageDays = getApplicationAgeDays(application, now);
        const linkedInterviews = interviewsByJobId.get(application.job_id) ?? [];

        if (application.job_status === 'Interview' && linkedInterviews.length > 0) {
            const interviewsWithTimings = linkedInterviews.map((interview) => ({
                interview,
                timing: getInterviewTiming(interview, now),
            }));
            if (interviewsWithTimings.every(({ timing }) => timing.isValid && timing.hasEnded)) {
                const latestCompletedInterview = interviewsWithTimings.reduce((latest, current) =>
                    current.timing.end.getTime() > latest.timing.end.getTime() ? current : latest
                );
                const latestEnd = latestCompletedInterview.timing.end.getTime();
                const interviewAgeDays = getElapsedDays(latestEnd, now);
                const followUpSentAt = latestCompletedInterview.interview.follow_up_sent_at;

                if (followUpSentAt) {
                    const sentAgeDays = getElapsedDays(Date.parse(followUpSentAt), now);
                    if (sentAgeDays !== null && sentAgeDays >= STALE_FOLLOW_UP_AFTER_DAYS) {
                        const category: AttentionItemCategory = 'post-interview-follow-up-stale';
                        return [
                            {
                                application,
                                category,
                                latestCompletedInterview: latestCompletedInterview.interview,
                                message: `The follow-up for your latest recorded interview was marked as sent on ${formatLongDate(
                                    followUpSentAt
                                )} (${sentAgeDays} days ago). The application is still at Interview.`,
                                priority: CATEGORY_PRIORITY[category],
                                sortValue: sentAgeDays,
                            },
                        ];
                    }

                    return [];
                }

                if (interviewAgeDays !== null && interviewAgeDays >= FOLLOW_UP_AFTER_DAYS) {
                    const category: AttentionItemCategory = 'post-interview';
                    return [
                        {
                            application,
                            category,
                            latestCompletedInterview: latestCompletedInterview.interview,
                            message: `Your latest recorded interview ended on ${formatLongDate(
                                latestCompletedInterview.timing.end
                            )} (${interviewAgeDays} days ago), and the application is still at Interview.`,
                            priority: CATEGORY_PRIORITY[category],
                            sortValue: interviewAgeDays,
                        },
                    ];
                }
            }

            return [];
        }

        if (application.job_status === 'Interview') {
            const category: AttentionItemCategory = 'interview-unscheduled';
            return [
                {
                    application,
                    category,
                    message: 'This application is at Interview, but no interview has been scheduled.',
                    priority: CATEGORY_PRIORITY[category],
                    sortValue: ageDays ?? Number.NEGATIVE_INFINITY,
                },
            ];
        }

        if (application.job_status === 'Offer') {
            if (!application.has_offer_evaluation) {
                const category: AttentionItemCategory = 'offer-evaluation';
                return [
                    {
                        application,
                        category,
                        message:
                            'This offer has not been evaluated yet. Add its details to compare it and record a deadline.',
                        priority: CATEGORY_PRIORITY[category],
                        sortValue: ageDays ?? 0,
                    },
                ];
            }

            const decisionDeadline = offerEvaluationByJobId.get(application.job_id)?.details.decision_deadline ?? '';
            const deadlineTime = Date.parse(decisionDeadline);
            const remainingMs = deadlineTime - now.getTime();
            if (
                !Number.isFinite(deadlineTime) ||
                remainingMs > OFFER_DECISION_ATTENTION_MS ||
                remainingMs < -OFFER_DECISION_OVERDUE_MS
            ) {
                return [];
            }

            const isExpired = remainingMs <= 0;
            const isOverdue = remainingMs < 0;
            const category: AttentionItemCategory = isExpired ? 'offer-decision-overdue' : 'offer-decision-due';
            const deadlineTiming = formatDeadlineTiming(remainingMs);
            return [
                {
                    application,
                    category,
                    message: `The decision deadline ${isOverdue ? 'was' : 'is'} ${formatLongDate(
                        decisionDeadline
                    )} (${deadlineTiming}). Review the evaluated offer and mark it as Accepted or Declined once decided.`,
                    priority: CATEGORY_PRIORITY[category],
                    sortValue: isOverdue ? Math.abs(remainingMs) : -remainingMs,
                },
            ];
        }

        if (application.job_status !== 'Applied' || linkedInterviews.length > 0) {
            return [];
        }

        if (application.application_follow_up_sent_at) {
            const sentTime = Date.parse(application.application_follow_up_sent_at);
            const sentAgeDays = getElapsedDays(sentTime, now);
            if (sentAgeDays === null || sentAgeDays < STALE_FOLLOW_UP_AFTER_DAYS) {
                return [];
            }

            const category: AttentionItemCategory = 'application-follow-up-stale';
            return [
                {
                    application,
                    category,
                    message: `The application follow-up was marked as sent on ${formatLongDate(
                        application.application_follow_up_sent_at
                    )} (${sentAgeDays} days ago). The application is still Applied and no interview has been recorded.`,
                    priority: CATEGORY_PRIORITY[category],
                    sortValue: sentAgeDays,
                },
            ];
        }

        if (ageDays === null) {
            return [];
        }

        if (ageDays < FOLLOW_UP_AFTER_DAYS) {
            return [];
        }

        const category: AttentionItemCategory = 'application-follow-up';
        return [
            {
                application,
                category,
                message: `Applied on ${formatLongDate(
                    application.application_date
                )} (${ageDays} days ago). No interview has been recorded.`,
                priority: CATEGORY_PRIORITY[category],
                sortValue: ageDays,
            },
        ];
    });

    return candidates
        .sort((first, second) => {
            const priorityDifference = first.priority - second.priority;
            if (priorityDifference !== 0) return priorityDifference;

            const valueDifference = second.sortValue - first.sortValue;
            return valueDifference || first.application.job_id - second.application.job_id;
        })
        .slice(0, MAX_ATTENTION_ITEMS)
        .map(({ application, category, latestCompletedInterview, message }) => ({
            application,
            category,
            latestCompletedInterview,
            message,
        }));
};
