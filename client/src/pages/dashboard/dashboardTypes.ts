import type { JobApplication, JobStatus, JobStatusCount, WeeklyApplicationCount } from '../application/models';
import type { JobInterview } from '../interview/models';
import type { OfferEvaluation } from '../offerDecision/models';
import type { DashboardRecordOfferDecisionFilter } from './dashboardNavigation';

export type DashboardInterviewSelectHandler = (interviewId: number) => void;
export type DashboardStatusSelectHandler = (status: JobStatus) => void;
export type DashboardApplicationActionHandler = (application: JobApplication) => void;
export type DashboardApplicationFollowUpHandler = (application: JobApplication) => void | Promise<void>;
export type DashboardInterviewFollowUpHandler = (interview: JobInterview) => void | Promise<void>;
export type DashboardMarkApplicationGhostedHandler = (application: JobApplication) => Promise<void>;
export type DashboardRecordOfferDecisionHandler = (
    application: JobApplication,
    filter: DashboardRecordOfferDecisionFilter
) => void;
export type StatusCountMap = Partial<Record<JobStatus, number>>;

export type DashboardDataProps = {
    statusCounts: JobStatusCount[];
    interviews: JobInterview[];
    weeklyApplications: WeeklyApplicationCount[];
    isLoading: boolean;
};

export type DashboardNavigationProps = {
    onAddInterview?: DashboardApplicationActionHandler;
    onInterviewSelect?: DashboardInterviewSelectHandler;
    onOpenOfferComparison?: DashboardApplicationActionHandler;
    onRecordOfferDecision?: DashboardRecordOfferDecisionHandler;
    onStatusSelect?: DashboardStatusSelectHandler;
    onMarkApplicationFollowUpSent?: DashboardApplicationFollowUpHandler;
    onMarkInterviewFollowUpSent?: DashboardInterviewFollowUpHandler;
    onMarkApplicationGhosted?: DashboardMarkApplicationGhostedHandler;
};

export type DashboardContentProps = DashboardDataProps &
    DashboardNavigationProps & {
        applications: JobApplication[];
        applicationsError?: boolean;
        applicationsIsLoading?: boolean;
        interviewedApplicationCount?: number;
        interviewError?: boolean;
        interviewIsLoading?: boolean;
        offerEvaluations?: OfferEvaluation[];
        onRetryInterviews?: () => void;
        onRetryNeedsAttention?: () => void;
        onRetryStatus?: () => void;
        onRetryWeeklyApplications?: () => void;
        statusError?: boolean;
        statusIsLoading?: boolean;
        weeklyError?: boolean;
        weeklyIsLoading?: boolean;
    };
export type DashboardStatsProps = DashboardDataProps & {
    currentTime?: Date;
    interviewedApplicationCount?: number;
    interviewError?: boolean;
    interviewIsLoading?: boolean;
    statusError?: boolean;
    statusIsLoading?: boolean;
    weeklyError?: boolean;
    weeklyIsLoading?: boolean;
};

export type ApplicationsLineChartProps = {
    interviews: JobInterview[];
    weeklyApplications: WeeklyApplicationCount[];
    isLoading: boolean;
    hasError?: boolean;
    interviewsAvailable?: boolean;
    onRetry?: () => void;
};

export type StatusChartProps = {
    statusCounts: JobStatusCount[];
    isLoading: boolean;
    hasError?: boolean;
    onRetry?: () => void;
    onStatusSelect?: DashboardStatusSelectHandler;
};

export type UpcomingInterviewsProps = {
    currentTime?: Date;
    interviews: JobInterview[];
    isLoading: boolean;
    hasError?: boolean;
    onRetry?: () => void;
    onInterviewSelect?: DashboardInterviewSelectHandler;
};
