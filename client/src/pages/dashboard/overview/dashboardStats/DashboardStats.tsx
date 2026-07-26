import Icon from '../../../../components/icon/Icon';
import LoadingSpinner from '../../../../components/loadingSpinner/LoadingSpinner';
import { useState } from 'react';
import type { ReactNode } from 'react';
import styles from './DashboardStats.module.css';
import type { DashboardStatsProps } from '../../dashboardTypes';
import type { JobStatus } from '../../../application/models';
import { getStatusCountMap, getTotalStatusCount, getUpcomingInterviews } from '../../dashboardSelectors';

const INTERVIEW_PLUS_STATUSES: readonly JobStatus[] = ['Interview', 'Offer', 'Accepted', 'Declined'];
const OFFER_PLUS_STATUSES: readonly JobStatus[] = ['Offer', 'Accepted', 'Declined'];
const INTERVIEW_RATE_EXPLANATION = 'Interview, Offer, Accepted or Declined applications ÷ total active applications.';
const OFFER_RATE_EXPLANATION = 'Offer, Accepted or Declined applications ÷ total active applications.';

const DashboardStats = ({
    currentTime = new Date(),
    statusCounts,
    interviews,
    weeklyApplications,
    isLoading,
}: DashboardStatsProps) => {
    const [revealedRate, setRevealedRate] = useState<string | null>(null);
    if (isLoading) {
        return (
            <div className={styles.loading}>
                <LoadingSpinner size='sm' />
            </div>
        );
    }

    const countByStatus = getStatusCountMap(statusCounts);
    const total = getTotalStatusCount(countByStatus);
    const interviewPlus = INTERVIEW_PLUS_STATUSES.reduce((sum, status) => sum + (countByStatus[status] ?? 0), 0);
    const offerPlus = OFFER_PLUS_STATUSES.reduce((sum, status) => sum + (countByStatus[status] ?? 0), 0);
    const interviewRate = total > 0 ? `${Math.round((interviewPlus / total) * 100)}%` : '—';
    const offerRate = total > 0 ? `${Math.round((offerPlus / total) * 100)}%` : '—';
    const latestApplicationCount = Number(weeklyApplications[weeklyApplications.length - 1]?.applications_count ?? 0);
    const applicationsThisWeek = Number.isFinite(latestApplicationCount) ? latestApplicationCount : 0;
    const upcomingInterviews = getUpcomingInterviews(interviews, currentTime).length;

    const cards = [
        { icon: 'briefcase' as const, label: 'Total Active Applications', value: total },
        { icon: 'activeApplications' as const, label: 'Applied This Week', value: applicationsThisWeek },
        { icon: 'interview' as const, label: 'Upcoming Interviews', value: upcomingInterviews },
        {
            explanation: INTERVIEW_RATE_EXPLANATION,
            icon: 'highlight' as const,
            label: 'Interview Rate',
            value: interviewRate,
        },
        { explanation: OFFER_RATE_EXPLANATION, icon: 'success' as const, label: 'Offer Rate', value: offerRate },
    ];

    return (
        <div className={styles.statsRow}>
            {cards.map((card) => {
                const isRevealed = revealedRate === card.label;
                const renderContent = (children: ReactNode) => (
                    <>
                        <div className={styles.icon}>
                            <Icon name={card.icon} size={24} />
                        </div>
                        <div className={styles.statContent}>{children}</div>
                    </>
                );
                const frontContent = renderContent(
                    <>
                        <div className={styles.value}>{card.value}</div>
                        <div className={styles.label}>{card.label}</div>
                    </>
                );

                return card.explanation ? (
                    <button
                        aria-label={`${card.label}: ${isRevealed ? card.explanation : card.value}`}
                        aria-pressed={isRevealed}
                        className={`${styles.card} ${styles.interactiveCard}`}
                        key={card.label}
                        onClick={() => setRevealedRate((current) => (current === card.label ? null : card.label))}
                        type='button'
                    >
                        <div className={`${styles.flipInner} ${isRevealed ? styles.flipped : ''}`}>
                            <div aria-hidden={isRevealed} className={styles.flipFace}>
                                {frontContent}
                            </div>
                            <div aria-hidden={!isRevealed} className={`${styles.flipFace} ${styles.flipBack}`}>
                                {renderContent(<p className={styles.explanation}>{card.explanation}</p>)}
                            </div>
                        </div>
                    </button>
                ) : (
                    <div className={styles.card} key={card.label}>
                        {frontContent}
                    </div>
                );
            })}
        </div>
    );
};

export default DashboardStats;
