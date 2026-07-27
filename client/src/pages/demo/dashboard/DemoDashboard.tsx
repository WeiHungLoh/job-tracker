import { useNavigate } from 'react-router-dom';
import DashboardContent from '../../dashboard/DashboardContent';
import type { JobApplication, JobStatus } from '../../application/models';
import type { JobInterview } from '../../interview/models';
import type {
    DashboardApplicationNavigationState,
    DashboardInterviewNavigationState,
} from '../../dashboard/dashboardNavigation';
import { selectJobStatusCounts, selectOfferDecisionWorkspace, selectWeeklyApplications } from '../state/demoSelectors';
import { useDemo } from '../context/DemoContext';
import { routes } from '../../../routes';

const DemoDashboard = () => {
    const { dispatch, state } = useDemo();
    const statusCounts = selectJobStatusCounts(state);
    const weeklyApplications = selectWeeklyApplications(state);
    const offerDecisionWorkspace = selectOfferDecisionWorkspace(state);
    const applications = state.applications.map((application) => ({
        ...application,
        has_offer_evaluation: Boolean(state.offerEvaluations[application.job_id]),
    }));
    const offerEvaluations = offerDecisionWorkspace.applications.flatMap((application) =>
        application.evaluation ? [application.evaluation] : []
    );
    const navigate = useNavigate();

    const handleStatusSelect = (status: JobStatus) => {
        const navigationState: DashboardApplicationNavigationState = { dashboardJobStatus: status };
        navigate(routes.demoViewApplications, { state: navigationState });
    };

    const handleInterviewSelect = (interviewId: number) => {
        const navigationState: DashboardInterviewNavigationState = { dashboardInterviewId: interviewId };
        navigate(routes.demoViewInterviews, { state: navigationState });
    };

    const handleAddInterview = (application: JobApplication) => {
        navigate(routes.demoAddInterview, { state: { app: application } });
    };

    const handleOpenOfferComparison = () => {
        navigate(routes.demoOfferDecisions);
    };

    const handleOpenOfferDecisionApplication = (application: JobApplication) => {
        const navigationState: DashboardApplicationNavigationState = {
            dashboardJobStatus: 'Offer',
            dashboardApplicationId: application.job_id,
        };
        navigate(routes.demoViewApplications, { state: navigationState });
    };

    const handleMarkApplicationFollowUpSent = (application: JobApplication) => {
        dispatch({
            type: 'MARK_APPLICATION_FOLLOW_UP_SENT',
            payload: { jobId: application.job_id, sentAt: new Date().toISOString() },
        });
    };

    const handleMarkInterviewFollowUpSent = (interview: JobInterview) => {
        dispatch({
            type: 'MARK_INTERVIEW_FOLLOW_UP_SENT',
            payload: { interviewId: interview.interview_id, sentAt: new Date().toISOString() },
        });
    };

    return (
        <DashboardContent
            applications={applications}
            offerEvaluations={offerEvaluations}
            statusCounts={statusCounts}
            interviews={state.interviews}
            weeklyApplications={weeklyApplications}
            isLoading={false}
            onAddInterview={handleAddInterview}
            onInterviewSelect={handleInterviewSelect}
            onOpenOfferComparison={handleOpenOfferComparison}
            onOpenOfferDecisionApplication={handleOpenOfferDecisionApplication}
            onMarkApplicationFollowUpSent={handleMarkApplicationFollowUpSent}
            onMarkInterviewFollowUpSent={handleMarkInterviewFollowUpSent}
            onStatusSelect={handleStatusSelect}
        />
    );
};

export default DemoDashboard;
