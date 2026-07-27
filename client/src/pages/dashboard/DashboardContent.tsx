import ApplicationPipelineChart from './charts/applicationPipeline/ApplicationPipelineChart';
import ApplicationsLineChart from './charts/applicationsTrend/ApplicationsLineChart';
import ClosedOutcomesChart from './charts/closedOutcomes/ClosedOutcomesChart';
import DashboardStats from './overview/dashboardStats/DashboardStats';
import UpcomingInterviews from './overview/upcomingInterviews/UpcomingInterviews';
import AttentionCenter from './attentionCenter/AttentionCenter';
import type { DashboardContentProps } from './dashboardTypes';
import styles from './Dashboard.module.css';
import useCurrentTime from '../../hooks/useCurrentTime';

const DashboardContent = ({
    applications,
    statusCounts,
    interviews,
    weeklyApplications,
    isLoading,
    onAddInterview,
    offerEvaluations = [],
    onInterviewSelect,
    onOpenOfferComparison,
    onOpenOfferDecisionApplication,
    onStatusSelect,
    onMarkApplicationFollowUpSent,
    onMarkInterviewFollowUpSent,
}: DashboardContentProps) => {
    const currentTime = useCurrentTime();

    return (
        <div className={styles.dashboard}>
            <section className={styles.statsSection} aria-label='Dashboard statistics'>
                <DashboardStats
                    currentTime={currentTime}
                    statusCounts={statusCounts}
                    interviews={interviews}
                    weeklyApplications={weeklyApplications}
                    isLoading={isLoading}
                />
            </section>
            <section className={styles.attentionSection}>
                <AttentionCenter
                    applications={applications}
                    currentTime={currentTime}
                    interviews={interviews}
                    isLoading={isLoading}
                    onAddInterview={onAddInterview}
                    offerEvaluations={offerEvaluations}
                    onOpenOfferComparison={onOpenOfferComparison}
                    onOpenOfferDecisionApplication={onOpenOfferDecisionApplication}
                    onMarkApplicationFollowUpSent={onMarkApplicationFollowUpSent}
                    onMarkInterviewFollowUpSent={onMarkInterviewFollowUpSent}
                />
            </section>
            <section className={styles.trendSection}>
                <ApplicationsLineChart
                    interviews={interviews}
                    weeklyApplications={weeklyApplications}
                    isLoading={isLoading}
                />
            </section>
            <section className={styles.interviewsSection}>
                <UpcomingInterviews
                    currentTime={currentTime}
                    interviews={interviews}
                    isLoading={isLoading}
                    onInterviewSelect={onInterviewSelect}
                />
            </section>
            <section className={styles.pipelineSection}>
                <ApplicationPipelineChart
                    statusCounts={statusCounts}
                    isLoading={isLoading}
                    onStatusSelect={onStatusSelect}
                />
            </section>
            <section className={styles.closedSection}>
                <ClosedOutcomesChart
                    statusCounts={statusCounts}
                    isLoading={isLoading}
                    onStatusSelect={onStatusSelect}
                />
            </section>
        </div>
    );
};

export default DashboardContent;
