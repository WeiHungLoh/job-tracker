import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardContent from '../../dashboard/DashboardContent';
import type { JobApplication, JobStatus } from '../../application/models';
import type { JobInterview } from '../../interview/models';
import type {
    DashboardInterviewNavigationState,
    DashboardOfferDecisionNavigationState,
    DashboardRecordOfferDecisionFilter,
} from '../../dashboard/dashboardNavigation';
import { getDashboardAttentionTarget } from '../../dashboard/dashboardNavigation';
import type { AddInterviewNavigationState } from '../../interview/addInterviewNavigation';
import type { ApplicationCollectionNavigationState } from '../../application/applicationNavigation';
import { selectJobStatusCounts, selectOfferDecisionWorkspace, selectWeeklyApplications } from '../state/demoSelectors';
import { useDemo } from '../context/DemoContext';
import { routes } from '../../../routes';
import { useToast } from '../../../components/toast/ToastProvider';

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
    const interviewedJobIds = new Set([
        ...state.interviews.map((interview) => interview.job_id),
        ...state.archivedInterviews.map((interview) => interview.archived_job_id),
    ]);
    const interviewedApplicationCount = state.applications.filter(
        (application) =>
            ['Interview', 'Offer', 'Accepted', 'Declined'].includes(application.job_status) ||
            interviewedJobIds.has(application.job_id)
    ).length;
    const navigate = useNavigate();
    const location = useLocation();
    const attentionTarget = getDashboardAttentionTarget(location.state);
    const { showSuccessToast } = useToast();

    const handleAttentionTargetHandled = useCallback(() => {
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, navigate]);

    const handleStatusSelect = (status: JobStatus) => {
        const navigationState: ApplicationCollectionNavigationState = { applicationJobStatus: status };
        navigate(routes.demoViewApplications, { state: navigationState });
    };

    const handleInterviewSelect = (interviewId: number) => {
        const navigationState: DashboardInterviewNavigationState = { dashboardInterviewId: interviewId };
        navigate(routes.demoViewInterviews, { state: navigationState });
    };

    const handleAddInterview = (application: JobApplication) => {
        const navigationState: AddInterviewNavigationState = {
            app: application,
            origin: { kind: 'dashboard-needs-attention', category: 'interview-unscheduled' },
        };
        navigate(routes.demoAddInterview, { state: navigationState });
    };

    const handleOpenOfferComparison = (application: JobApplication) => {
        const navigationState: DashboardOfferDecisionNavigationState = {
            dashboardOfferDecisionJobId: application.job_id,
            dashboardOfferDecisionFilter: 'Offers to Evaluate',
        };
        navigate(routes.demoOfferDecisions, { state: navigationState });
    };

    const handleRecordOfferDecision = (application: JobApplication, filter: DashboardRecordOfferDecisionFilter) => {
        const navigationState: DashboardOfferDecisionNavigationState = {
            dashboardOfferDecisionJobId: application.job_id,
            dashboardOfferDecisionFilter: filter,
        };
        navigate(routes.demoOfferDecisions, { state: navigationState });
    };

    const handleMarkApplicationGhosted = async (application: JobApplication) => {
        dispatch({
            type: 'UPDATE_APPLICATION_STATUS',
            payload: { jobId: application.job_id, jobStatus: 'Ghosted' },
        });
        showSuccessToast('Application marked as Ghosted.');
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
            attentionTarget={attentionTarget}
            interviewedApplicationCount={interviewedApplicationCount}
            offerEvaluations={offerEvaluations}
            statusCounts={statusCounts}
            interviews={state.interviews}
            weeklyApplications={weeklyApplications}
            isLoading={false}
            onAddInterview={handleAddInterview}
            onAttentionTargetHandled={handleAttentionTargetHandled}
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

export default DemoDashboard;
