import Icon from '../../../../components/icon/Icon';
import LoadingSpinner from '../../../../components/loadingSpinner/LoadingSpinner';
import { useState } from 'react';
import styles from './DashboardStats.module.css';
import type { DashboardStatsProps } from '../../dashboardTypes';
import { getStatusCountMap, getTotalStatusCount, getUpcomingInterviews } from '../../dashboardSelectors';

import type { JobStatus } from '../../../application/models';
const OFFER_PLUS_STATUSES: readonly JobStatus[] = ['Offer', 'Accepted', 'Declined'];
const INTERVIEW_RATE_EXPLANATION =
    'Applications with a recorded interview or later-stage status ÷ active applications.';
const OFFER_RATE_EXPLANATION = 'Offer, Accepted or Declined applications ÷ total active applications.';

const DashboardStats = ({
    currentTime = new Date(),
    interviewedApplicationCount,
    statusCounts,
    interviews,
    weeklyApplications,
    isLoading,
    interviewError = false,
    interviewIsLoading = isLoading,
    statusError = false,
    statusIsLoading = isLoading,
    weeklyError = false,
    weeklyIsLoading = isLoading,
}: DashboardStatsProps) => {
    const [revealedRate, setRevealedRate] = useState<string | null>(null);
    if (statusIsLoading && weeklyIsLoading && interviewIsLoading && !statusError && !weeklyError && !interviewError) {
        return (
            <div className={styles.loading}>
                <LoadingSpinner size='sm' />
            </div>
        );
    }

    const countByStatus = getStatusCountMap(statusCounts);
    const total = getTotalStatusCount(countByStatus);
    const fallbackInterviewedCount = (['Interview', 'Offer', 'Accepted', 'Declined'] as const).reduce(
        (sum, status) => sum + (countByStatus[status] ?? 0),
        0
    );
    const interviewedCount = interviewedApplicationCount ?? fallbackInterviewedCount;
    const offerPlus = OFFER_PLUS_STATUSES.reduce((sum, status) => sum + (countByStatus[status] ?? 0), 0);
    const interviewRate = total > 0 ? `${Math.round((interviewedCount / total) * 100)}%` : '—';
    const offerRate = total > 0 ? `${Math.round((offerPlus / total) * 100)}%` : '—';
    const latestApplicationCount = Number(weeklyApplications[weeklyApplications.length - 1]?.applications_count ?? 0);
    const applicationsThisWeek = Number.isFinite(latestApplicationCount) ? latestApplicationCount : 0;
    const upcomingInterviews = getUpcomingInterviews(interviews, currentTime).length;

    const cards = [
        {
            error: statusError,
            icon: 'briefcase' as const,
            isLoading: statusIsLoading,
            label: 'Total active applications',
            value: total,
        },
        {
            error: weeklyError,
            icon: 'activeApplications' as const,
            isLoading: weeklyIsLoading,
            label: 'Applied this week',
            value: applicationsThisWeek,
        },
        {
            error: interviewError,
            icon: 'interview' as const,
            isLoading: interviewIsLoading,
            label: 'Upcoming interviews',
            value: upcomingInterviews,
        },
        {
            error: statusError,
            explanation: INTERVIEW_RATE_EXPLANATION,
            icon: 'highlight' as const,
            isLoading: statusIsLoading,
            label: 'Interview rate',
            value: interviewRate,
        },
        {
            error: statusError,
            explanation: OFFER_RATE_EXPLANATION,
            icon: 'success' as const,
            isLoading: statusIsLoading,
            label: 'Offer rate',
            value: offerRate,
        },
    ];

    return (
        <div className={styles.statsRow}>
            {cards.map((card) => {
                const isRevealed = revealedRate === card.label;
                const displayedValue = card.error ? '—' : card.isLoading ? <LoadingSpinner size='sm' /> : card.value;
                const explanationId = `dashboard-stat-${card.label.toLowerCase().replaceAll(' ', '-')}-explanation`;

                return card.explanation ? (
                    <div className={`${styles.card} ${styles.rateCard}`} key={card.label}>
                        <button
                            aria-controls={explanationId}
                            aria-expanded={isRevealed}
                            aria-label={`About ${card.label}`}
                            className={styles.infoButton}
                            onClick={() => setRevealedRate((current) => (current === card.label ? null : card.label))}
                            title={`About ${card.label}`}
                            type='button'
                        >
                            <Icon name='info' size={18} />
                        </button>
                        <div className={styles.icon}>
                            <Icon name={card.icon} size={24} />
                        </div>
                        <div className={`${styles.statContent} ${styles.rateContent}`}>
                            <div
                                aria-hidden={isRevealed}
                                className={`${styles.crossfadePanel} ${!isRevealed ? styles.crossfadeVisible : ''}`}
                            >
                                <div className={styles.value}>{displayedValue}</div>
                                <div className={styles.label}>{card.label}</div>
                            </div>
                            <div
                                aria-hidden={!isRevealed}
                                className={`${styles.crossfadePanel} ${isRevealed ? styles.crossfadeVisible : ''}`}
                                id={explanationId}
                            >
                                <div className={styles.label}>{card.label} formula</div>
                                <p className={styles.explanation}>{card.explanation}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.card} key={card.label}>
                        <div className={styles.icon}>
                            <Icon name={card.icon} size={24} />
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.value}>{displayedValue}</div>
                            <div className={styles.label}>{card.label}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DashboardStats;
