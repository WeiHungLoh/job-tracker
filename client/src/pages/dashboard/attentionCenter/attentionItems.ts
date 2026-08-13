import type { JobApplication, JobStatus } from '../../application/models';
import type { JobInterview } from '../../interview/models';
import type { OfferEvaluation } from '../../offerDecision/models';
import { getInterviewTiming } from '../../../helper/interviewTiming';
import { formatLongDate } from '../../../helper/dateFormatter';
import type { NeedsAttentionCategory } from '../../../components/userPreferences/models';
import { DEFAULT_NEEDS_ATTENTION_SETTINGS, type NeedsAttentionSettings } from './needsAttentionSettings';

export const ATTENTION_APPLICATION_STATUSES = ['Applied', 'Interview', 'Offer'] as const satisfies readonly JobStatus[];

export type AttentionItemCategory = NeedsAttentionCategory;

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
    offerEvaluations: readonly OfferEvaluation[] = [],
    settings: NeedsAttentionSettings = DEFAULT_NEEDS_ATTENTION_SETTINGS
): AttentionItem[] => {
    const interviewsByJobId = new Map<number, JobInterview[]>();
    const offerEvaluationByJobId = new Map(offerEvaluations.map((evaluation) => [evaluation.job_id, evaluation]));
    const enabledCategories = new Set(settings.enabledCategories);

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
                    if (
                        enabledCategories.has('post-interview-follow-up-stale') &&
                        sentAgeDays !== null &&
                        sentAgeDays >= settings.postInterviewStaleDays
                    ) {
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

                if (
                    enabledCategories.has('post-interview') &&
                    interviewAgeDays !== null &&
                    interviewAgeDays >= settings.postInterviewFollowUpDays
                ) {
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

        if (application.job_status === 'Interview' && enabledCategories.has('interview-unscheduled')) {
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
                if (!enabledCategories.has('offer-evaluation')) {
                    return [];
                }
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
            const offerDecisionAttentionMs = settings.offerDueDays * DAY_MS;
            const offerDecisionOverdueMs = settings.offerOverdueDays * DAY_MS;
            if (
                !Number.isFinite(deadlineTime) ||
                remainingMs > offerDecisionAttentionMs ||
                remainingMs < -offerDecisionOverdueMs
            ) {
                return [];
            }

            const isExpired = remainingMs <= 0;
            const isOverdue = remainingMs < 0;
            const category: AttentionItemCategory = isExpired ? 'offer-decision-overdue' : 'offer-decision-due';
            if (!enabledCategories.has(category)) {
                return [];
            }
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
            if (
                !enabledCategories.has('application-follow-up-stale') ||
                sentAgeDays === null ||
                sentAgeDays < settings.applicationStaleDays
            ) {
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

        if (!enabledCategories.has('application-follow-up') || ageDays < settings.applicationFollowUpDays) {
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
        .slice(0, settings.maxItems)
        .map(({ application, category, latestCompletedInterview, message }) => ({
            application,
            category,
            latestCompletedInterview,
            message,
        }));
};
