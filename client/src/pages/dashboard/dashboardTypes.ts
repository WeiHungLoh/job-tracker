import type { JobApplication, JobStatus, JobStatusCount, WeeklyApplicationCount } from '../application/models';
import type { JobInterview } from '../interview/models';
import type { OfferEvaluation } from '../offerDecision/models';

export type DashboardInterviewSelectHandler = (interviewId: number) => void;
export type DashboardStatusSelectHandler = (status: JobStatus) => void;
export type DashboardApplicationActionHandler = (application: JobApplication) => void;
export type DashboardApplicationFollowUpHandler = (application: JobApplication) => void | Promise<void>;
export type DashboardInterviewFollowUpHandler = (interview: JobInterview) => void | Promise<void>;
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
    onOpenOfferDecisionApplication?: DashboardApplicationActionHandler;
    onStatusSelect?: DashboardStatusSelectHandler;
    onMarkApplicationFollowUpSent?: DashboardApplicationFollowUpHandler;
    onMarkInterviewFollowUpSent?: DashboardInterviewFollowUpHandler;
};

export type DashboardContentProps = DashboardDataProps &
    DashboardNavigationProps & {
        applications: JobApplication[];
        offerEvaluations?: OfferEvaluation[];
    };
export type DashboardStatsProps = DashboardDataProps & {
    currentTime?: Date;
};

export type ApplicationsLineChartProps = {
    interviews: JobInterview[];
    weeklyApplications: WeeklyApplicationCount[];
    isLoading: boolean;
};

export type StatusChartProps = {
    statusCounts: JobStatusCount[];
    isLoading: boolean;
    onStatusSelect?: DashboardStatusSelectHandler;
};

export type UpcomingInterviewsProps = {
    currentTime?: Date;
    interviews: JobInterview[];
    isLoading: boolean;
    onInterviewSelect?: DashboardInterviewSelectHandler;
};
