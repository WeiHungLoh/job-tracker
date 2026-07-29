import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardContent from './DashboardContent';
import type { JobApplication, JobStatus, JobStatusCount, WeeklyApplicationCount } from '../application/models';
import type { JobInterview } from '../interview/models';
import type { OfferEvaluation } from '../offerDecision/models';
import type {
    DashboardInterviewNavigationState,
    DashboardOfferDecisionNavigationState,
    DashboardRecordOfferDecisionFilter,
} from './dashboardNavigation';
import type { ApplicationListNavigationState } from '../application/applicationNavigation';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';
import { useJobTrackerAPI } from '../../api/useJobTrackerAPI';
import { useToast } from '../../components/toast/ToastProvider';
import { routes } from '../../routes';
import { ATTENTION_APPLICATION_STATUSES } from './attentionCenter/attentionItems';

const Dashboard = () => {
    const [statusCounts, setStatusCounts] = useState<JobStatusCount[]>([]);
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [interviews, setInterviews] = useState<JobInterview[]>([]);
    const [offerEvaluations, setOfferEvaluations] = useState<OfferEvaluation[]>([]);
    const [weeklyApplications, setWeeklyApplications] = useState<WeeklyApplicationCount[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const api = useJobTrackerAPI();
    const { showErrorToast, showSuccessToast } = useToast();
    const navigate = useNavigate();

    const handleStatusSelect = (status: JobStatus) => {
        const state: ApplicationListNavigationState = { applicationListJobStatus: status };
        navigate(routes.viewApplications, { state });
    };

    const handleInterviewSelect = (interviewId: number) => {
        const state: DashboardInterviewNavigationState = { dashboardInterviewId: interviewId };
        navigate(routes.viewInterviews, { state });
    };

    const handleAddInterview = (application: JobApplication) => {
        navigate(routes.addInterview, { state: { app: application } });
    };

    const handleOpenOfferComparison = (application: JobApplication) => {
        const state: DashboardOfferDecisionNavigationState = {
            dashboardOfferDecisionJobId: application.job_id,
            dashboardOfferDecisionFilter: 'Offers to Evaluate',
        };
        navigate(routes.offerDecisions, { state });
    };

    const handleRecordOfferDecision = (application: JobApplication, filter: DashboardRecordOfferDecisionFilter) => {
        const state: DashboardOfferDecisionNavigationState = {
            dashboardOfferDecisionJobId: application.job_id,
            dashboardOfferDecisionFilter: filter,
        };
        navigate(routes.offerDecisions, { state });
    };

    const handleMarkApplicationGhosted = async (application: JobApplication) => {
        try {
            await api.application.updateStatus({ jobId: application.job_id, jobStatus: 'Ghosted' });
            setApplications((current) =>
                current.map((item) =>
                    item.job_id === application.job_id
                        ? { ...item, application_follow_up_sent_at: null, job_status: 'Ghosted' }
                        : item
                )
            );
            setStatusCounts((current) => {
                let hasGhostedCount = false;
                const updatedCounts = current.map((statusCount) => {
                    if (statusCount.job_status === application.job_status) {
                        return { ...statusCount, count: String(Math.max(0, Number(statusCount.count) - 1)) };
                    }
                    if (statusCount.job_status === 'Ghosted') {
                        hasGhostedCount = true;
                        return { ...statusCount, count: String(Number(statusCount.count) + 1) };
                    }
                    return statusCount;
                });

                return hasGhostedCount ? updatedCounts : [...updatedCounts, { job_status: 'Ghosted', count: '1' }];
            });
            showSuccessToast('Application marked as Ghosted.');
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to mark the application as Ghosted. Please try again.'));
            throw error;
        }
    };

    const handleMarkApplicationFollowUpSent = async (application: JobApplication) => {
        const result = await api.application.markFollowUpSent({ jobId: application.job_id });
        setApplications((current) =>
            current.map((item) =>
                item.job_id === application.job_id
                    ? { ...item, application_follow_up_sent_at: result.application_follow_up_sent_at }
                    : item
            )
        );
    };

    const handleMarkInterviewFollowUpSent = async (interview: JobInterview) => {
        const result = await api.interview.markFollowUpSent({ interviewId: interview.interview_id });
        setInterviews((current) =>
            current.map((item) =>
                item.interview_id === interview.interview_id
                    ? { ...item, follow_up_sent_at: result.follow_up_sent_at }
                    : item
            )
        );
    };

    useEffect(() => {
        let isActive = true;

        const fetchDashboardData = async () => {
            try {
                const [
                    jobStatusCounts,
                    jobInterviews,
                    weeklyApplicationCounts,
                    attentionApplications,
                    evaluatedOffers,
                ] = await Promise.all([
                    api.application.listJobStatusCounts(),
                    api.interview.listInterviews({}),
                    api.application.listWeeklyApplications(),
                    api.application.listApplications({ jobStatuses: [...ATTENTION_APPLICATION_STATUSES] }),
                    api.offerDecision.getActive({ filters: ['Evaluated Offers', 'Expired Evaluated Offers'] }),
                ]);

                if (!isActive) {
                    return;
                }

                setStatusCounts(Array.isArray(jobStatusCounts) ? jobStatusCounts : []);
                setApplications(Array.isArray(attentionApplications) ? attentionApplications : []);
                setInterviews(Array.isArray(jobInterviews) ? jobInterviews : []);
                setOfferEvaluations(
                    Array.isArray(evaluatedOffers?.applications)
                        ? evaluatedOffers.applications.flatMap((application) =>
                              application.evaluation ? [application.evaluation] : []
                          )
                        : []
                );
                setWeeklyApplications(Array.isArray(weeklyApplicationCounts) ? weeklyApplicationCounts : []);
            } catch (error) {
                showErrorToast(getErrorToastMessage(error, 'Unable to load dashboard data. Please try again.'));
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        void fetchDashboardData();

        return () => {
            isActive = false;
        };
    }, []);

    return (
        <DashboardContent
            applications={applications}
            offerEvaluations={offerEvaluations}
            statusCounts={statusCounts}
            interviews={interviews}
            weeklyApplications={weeklyApplications}
            isLoading={isLoading}
            onAddInterview={handleAddInterview}
            onInterviewSelect={handleInterviewSelect}
            onOpenOfferComparison={handleOpenOfferComparison}
            onRecordOfferDecision={handleRecordOfferDecision}
            onMarkApplicationFollowUpSent={handleMarkApplicationFollowUpSent}
            onMarkApplicationGhosted={handleMarkApplicationGhosted}
            onMarkInterviewFollowUpSent={handleMarkInterviewFollowUpSent}
            onStatusSelect={handleStatusSelect}
        />
    );
};

export default Dashboard;
