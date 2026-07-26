import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardContent from './DashboardContent';
import type { JobApplication, JobStatus, JobStatusCount, WeeklyApplicationCount } from '../application/models';
import type { JobInterview } from '../interview/models';
import type { OfferEvaluation } from '../offerDecision/models';
import type {
    DashboardApplicationNavigationState,
    DashboardInterviewNavigationState,
} from './dashboardNavigation';
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
    const { showErrorToast } = useToast();
    const navigate = useNavigate();

    const handleStatusSelect = (status: JobStatus) => {
        const state: DashboardApplicationNavigationState = { dashboardJobStatus: status };
        navigate(routes.viewApplications, { state });
    };

    const handleInterviewSelect = (interviewId: number) => {
        const state: DashboardInterviewNavigationState = { dashboardInterviewId: interviewId };
        navigate(routes.viewInterviews, { state });
    };

    const handleAddInterview = (application: JobApplication) => {
        navigate(routes.addInterview, { state: { app: application } });
    };

    const handleOpenOfferComparison = () => {
        navigate(routes.offerDecisions);
    };

    const handleOpenOfferDecisionApplication = (application: JobApplication) => {
        const state: DashboardApplicationNavigationState = {
            dashboardJobStatus: 'Offer',
            dashboardApplicationId: application.job_id,
        };
        navigate(routes.viewApplications, { state });
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
                ] =
                    await Promise.all([
                        api.application.listJobStatusCounts(),
                        api.interview.listInterviews({}),
                        api.application.listWeeklyApplications(),
                        api.application.listApplications({ jobStatuses: [...ATTENTION_APPLICATION_STATUSES] }),
                        api.offerDecision.getActive({ filters: ['Evaluated Offers'] }),
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
            onOpenOfferDecisionApplication={handleOpenOfferDecisionApplication}
            onStatusSelect={handleStatusSelect}
        />
    );
};

export default Dashboard;
