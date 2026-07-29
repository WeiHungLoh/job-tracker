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
    applicationsError = false,
    applicationsIsLoading,
    interviewedApplicationCount,
    statusCounts,
    interviews,
    weeklyApplications,
    isLoading,
    interviewError = false,
    interviewIsLoading,
    onAddInterview,
    offerEvaluations = [],
    onInterviewSelect,
    onOpenOfferComparison,
    onRecordOfferDecision,
    onStatusSelect,
    onMarkApplicationFollowUpSent,
    onMarkApplicationGhosted,
    onMarkInterviewFollowUpSent,
    onRetryInterviews,
    onRetryNeedsAttention,
    onRetryStatus,
    onRetryWeeklyApplications,
    statusError = false,
    statusIsLoading,
    weeklyError = false,
    weeklyIsLoading,
}: DashboardContentProps) => {
    const currentTime = useCurrentTime();

    return (
        <div className={styles.dashboard}>
            <section className={styles.statsSection} aria-label='Dashboard statistics'>
                <DashboardStats
                    currentTime={currentTime}
                    interviewedApplicationCount={interviewedApplicationCount}
                    statusCounts={statusCounts}
                    interviews={interviews}
                    weeklyApplications={weeklyApplications}
                    isLoading={isLoading}
                    interviewError={interviewError}
                    interviewIsLoading={interviewIsLoading}
                    statusError={statusError}
                    statusIsLoading={statusIsLoading}
                    weeklyError={weeklyError}
                    weeklyIsLoading={weeklyIsLoading}
                />
            </section>
            <section className={styles.attentionSection}>
                <AttentionCenter
                    applications={applications}
                    currentTime={currentTime}
                    interviews={interviews}
                    hasError={applicationsError}
                    isLoading={applicationsIsLoading ?? isLoading}
                    onRetry={onRetryNeedsAttention}
                    onAddInterview={onAddInterview}
                    offerEvaluations={offerEvaluations}
                    onOpenOfferComparison={onOpenOfferComparison}
                    onRecordOfferDecision={onRecordOfferDecision}
                    onMarkApplicationFollowUpSent={onMarkApplicationFollowUpSent}
                    onMarkApplicationGhosted={onMarkApplicationGhosted}
                    onMarkInterviewFollowUpSent={onMarkInterviewFollowUpSent}
                />
            </section>
            <section className={styles.trendSection}>
                <ApplicationsLineChart
                    interviews={interviews}
                    weeklyApplications={weeklyApplications}
                    hasError={weeklyError}
                    interviewsAvailable={!interviewError}
                    isLoading={weeklyIsLoading ?? isLoading}
                    onRetry={onRetryWeeklyApplications}
                />
            </section>
            <section className={styles.interviewsSection}>
                <UpcomingInterviews
                    currentTime={currentTime}
                    interviews={interviews}
                    hasError={interviewError}
                    isLoading={interviewIsLoading ?? isLoading}
                    onRetry={onRetryInterviews}
                    onInterviewSelect={onInterviewSelect}
                />
            </section>
            <section className={styles.pipelineSection}>
                <ApplicationPipelineChart
                    statusCounts={statusCounts}
                    hasError={statusError}
                    isLoading={statusIsLoading ?? isLoading}
                    onRetry={onRetryStatus}
                    onStatusSelect={onStatusSelect}
                />
            </section>
            <section className={styles.closedSection}>
                <ClosedOutcomesChart
                    statusCounts={statusCounts}
                    hasError={statusError}
                    isLoading={statusIsLoading ?? isLoading}
                    onRetry={onRetryStatus}
                    onStatusSelect={onStatusSelect}
                />
            </section>
        </div>
    );
};

export default DashboardContent;
