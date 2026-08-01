import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardContent from './DashboardContent';
import type {
    DashboardApplicationSummary,
    JobApplication,
    JobStatus,
    WeeklyApplicationCount,
} from '../application/models';
import type { JobInterview } from '../interview/models';
import type { OfferEvaluation } from '../offerDecision/models';
import type {
    DashboardInterviewNavigationState,
    DashboardOfferDecisionNavigationState,
    DashboardRecordOfferDecisionFilter,
} from './dashboardNavigation';
import { getDashboardAttentionTarget } from './dashboardNavigation';
import type { AddInterviewNavigationState } from '../interview/addInterviewNavigation';
import type { ApplicationCollectionNavigationState } from '../application/applicationNavigation';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';
import { useJobTrackerAPI } from '../../api/useJobTrackerAPI';
import { useToast } from '../../components/toast/ToastProvider';
import { routes } from '../../routes';
import { ATTENTION_APPLICATION_STATUSES } from './attentionCenter/attentionItems';
import { useUserPreferences } from '../../components/userPreferences/UserPreferencesProvider';
import {
    getNeedsAttentionSettings,
    needsAttentionRequiresInterviews,
    needsAttentionRequiresOfferEvaluations,
} from './attentionCenter/needsAttentionSettings';

type DatasetState<Value> = {
    data: Value | null;
    error: boolean;
    isLoading: boolean;
};

const createDatasetState = <Value,>(isLoading: boolean): DatasetState<Value> => ({
    data: null,
    error: false,
    isLoading,
});

const Dashboard = () => {
    const { preferences } = useUserPreferences();
    const initialSettingsRef = useRef(getNeedsAttentionSettings(preferences));
    const initialSettings = initialSettingsRef.current;
    const shouldLoadAttentionApplications = initialSettings.enabledCategories.length > 0;
    const shouldLoadOfferEvaluations = needsAttentionRequiresOfferEvaluations(initialSettings.enabledCategories);
    const [statusSummary, setStatusSummary] = useState<DatasetState<DashboardApplicationSummary>>(() =>
        createDatasetState(true)
    );
    const [applications, setApplications] = useState<DatasetState<JobApplication[]>>(() =>
        createDatasetState(shouldLoadAttentionApplications)
    );
    const [interviews, setInterviews] = useState<DatasetState<JobInterview[]>>(() => createDatasetState(true));
    const [offerEvaluations, setOfferEvaluations] = useState<DatasetState<OfferEvaluation[]>>(() =>
        createDatasetState(shouldLoadOfferEvaluations)
    );
    const [weeklyApplications, setWeeklyApplications] = useState<DatasetState<WeeklyApplicationCount[]>>(() =>
        createDatasetState(true)
    );
    const mountedRef = useRef(true);
    const statusPendingRef = useRef(false);
    const applicationsPendingRef = useRef(false);
    const interviewsPendingRef = useRef(false);
    const offerEvaluationsPendingRef = useRef(false);
    const weeklyApplicationsPendingRef = useRef(false);
    const settingsEffectReadyRef = useRef(false);
    const api = useJobTrackerAPI();
    const { showErrorToast, showSuccessToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const attentionTarget = getDashboardAttentionTarget(location.state);

    const handleAttentionTargetHandled = useCallback(() => {
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, navigate]);

    const handleStatusSelect = (status: JobStatus) => {
        const state: ApplicationCollectionNavigationState = { applicationJobStatus: status };
        navigate(routes.viewApplications, { state });
    };

    const handleInterviewSelect = (interviewId: number) => {
        const state: DashboardInterviewNavigationState = { dashboardInterviewId: interviewId };
        navigate(routes.viewInterviews, { state });
    };

    const handleAddInterview = (application: JobApplication) => {
        const state: AddInterviewNavigationState = {
            app: application,
            origin: { kind: 'dashboard-needs-attention', category: 'interview-unscheduled' },
        };
        navigate(routes.addInterview, { state });
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
            setApplications((current) => ({
                ...current,
                data:
                    current.data?.map((item) =>
                        item.job_id === application.job_id
                            ? { ...item, application_follow_up_sent_at: null, job_status: 'Ghosted' }
                            : item
                    ) ?? null,
            }));
            setStatusSummary((current) => {
                if (!current.data) {
                    return current;
                }
                let hasGhostedCount = false;
                const updatedCounts = current.data.statusCounts.map((statusCount) => {
                    if (statusCount.job_status === application.job_status) {
                        return { ...statusCount, count: String(Math.max(0, Number(statusCount.count) - 1)) };
                    }
                    if (statusCount.job_status === 'Ghosted') {
                        hasGhostedCount = true;
                        return { ...statusCount, count: String(Number(statusCount.count) + 1) };
                    }
                    return statusCount;
                });

                return {
                    ...current,
                    data: {
                        ...current.data,
                        statusCounts: hasGhostedCount
                            ? updatedCounts
                            : [...updatedCounts, { job_status: 'Ghosted', count: '1' }],
                    },
                };
            });
            showSuccessToast('Application marked as Ghosted.');
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to mark the application as Ghosted. Please try again.'));
            throw error;
        }
    };

    const handleMarkApplicationFollowUpSent = async (application: JobApplication) => {
        const result = await api.application.markFollowUpSent({ jobId: application.job_id });
        setApplications((current) => ({
            ...current,
            data:
                current.data?.map((item) =>
                    item.job_id === application.job_id
                        ? { ...item, application_follow_up_sent_at: result.application_follow_up_sent_at }
                        : item
                ) ?? null,
        }));
    };

    const handleMarkInterviewFollowUpSent = async (interview: JobInterview) => {
        const result = await api.interview.markFollowUpSent({ interviewId: interview.interview_id });
        setInterviews((current) => ({
            ...current,
            data:
                current.data?.map((item) =>
                    item.interview_id === interview.interview_id
                        ? { ...item, follow_up_sent_at: result.follow_up_sent_at }
                        : item
                ) ?? null,
        }));
    };

    const loadStatusSummary = async () => {
        if (statusPendingRef.current) return;
        statusPendingRef.current = true;
        setStatusSummary((current) => ({ ...current, error: false, isLoading: true }));
        try {
            const data = await api.application.getDashboardApplicationSummary();
            if (mountedRef.current) setStatusSummary({ data, error: false, isLoading: false });
        } catch (error) {
            if (mountedRef.current) setStatusSummary((current) => ({ ...current, error: true, isLoading: false }));
            throw error;
        } finally {
            statusPendingRef.current = false;
        }
    };

    const loadApplications = async () => {
        if (applicationsPendingRef.current) return;
        applicationsPendingRef.current = true;
        setApplications((current) => ({ ...current, error: false, isLoading: true }));
        try {
            const data = await api.application.listApplications({ jobStatuses: [...ATTENTION_APPLICATION_STATUSES] });
            if (mountedRef.current) setApplications({ data, error: false, isLoading: false });
        } catch (error) {
            if (mountedRef.current) setApplications((current) => ({ ...current, error: true, isLoading: false }));
            throw error;
        } finally {
            applicationsPendingRef.current = false;
        }
    };

    const loadInterviews = async () => {
        if (interviewsPendingRef.current) return;
        interviewsPendingRef.current = true;
        setInterviews((current) => ({ ...current, error: false, isLoading: true }));
        try {
            const data = await api.interview.listInterviews({});
            if (mountedRef.current) setInterviews({ data, error: false, isLoading: false });
        } catch (error) {
            if (mountedRef.current) setInterviews((current) => ({ ...current, error: true, isLoading: false }));
            throw error;
        } finally {
            interviewsPendingRef.current = false;
        }
    };

    const loadOfferEvaluations = async () => {
        if (offerEvaluationsPendingRef.current) return;
        offerEvaluationsPendingRef.current = true;
        setOfferEvaluations((current) => ({ ...current, error: false, isLoading: true }));
        try {
            const response = await api.offerDecision.getActive({
                filters: ['Evaluated Offers', 'Expired Evaluated Offers'],
            });
            const data = Array.isArray(response?.applications)
                ? response.applications.flatMap((application) =>
                      application.evaluation ? [application.evaluation] : []
                  )
                : [];
            if (mountedRef.current) setOfferEvaluations({ data, error: false, isLoading: false });
        } catch (error) {
            if (mountedRef.current) setOfferEvaluations((current) => ({ ...current, error: true, isLoading: false }));
            throw error;
        } finally {
            offerEvaluationsPendingRef.current = false;
        }
    };

    const loadWeeklyApplications = async () => {
        if (weeklyApplicationsPendingRef.current) return;
        weeklyApplicationsPendingRef.current = true;
        setWeeklyApplications((current) => ({ ...current, error: false, isLoading: true }));
        try {
            const data = await api.application.listWeeklyApplications();
            if (mountedRef.current) setWeeklyApplications({ data, error: false, isLoading: false });
        } catch (error) {
            if (mountedRef.current) setWeeklyApplications((current) => ({ ...current, error: true, isLoading: false }));
            throw error;
        } finally {
            weeklyApplicationsPendingRef.current = false;
        }
    };

    const retry = async (request: () => Promise<void>) => {
        try {
            await request();
        } catch {
            if (mountedRef.current) {
                showErrorToast('Some dashboard sections could not be loaded.');
            }
        }
    };

    const retryNeedsAttention = async () => {
        const settings = getNeedsAttentionSettings(preferences);
        const requests: Promise<void>[] = [];
        if (applications.error || applications.data === null) requests.push(loadApplications());
        if (
            needsAttentionRequiresInterviews(settings.enabledCategories) &&
            interviews.error &&
            interviews.data === null
        ) {
            requests.push(loadInterviews());
        }
        if (
            needsAttentionRequiresOfferEvaluations(settings.enabledCategories) &&
            (offerEvaluations.error || offerEvaluations.data === null)
        ) {
            requests.push(loadOfferEvaluations());
        }
        const results = await Promise.allSettled(requests);
        if (mountedRef.current && results.some((result) => result.status === 'rejected')) {
            showErrorToast('Some dashboard sections could not be loaded.');
        }
    };

    useEffect(() => {
        const requests = [loadStatusSummary(), loadInterviews(), loadWeeklyApplications()];
        if (shouldLoadAttentionApplications) {
            requests.push(loadApplications());
        }
        if (shouldLoadOfferEvaluations) {
            requests.push(loadOfferEvaluations());
        }

        void Promise.allSettled(requests).then((results) => {
            if (mountedRef.current && results.some((result) => result.status === 'rejected')) {
                showErrorToast('Some dashboard sections could not be loaded.');
            }
        });

        return () => {
            mountedRef.current = false;
        };
    }, []);

    const settings = getNeedsAttentionSettings(preferences);
    const attentionRequiresOffers = needsAttentionRequiresOfferEvaluations(settings.enabledCategories);
    const attentionRequiresInterviews = needsAttentionRequiresInterviews(settings.enabledCategories);
    const attentionHasError =
        settings.enabledCategories.length > 0 &&
        ((applications.error && applications.data === null) ||
            (attentionRequiresInterviews && interviews.error && interviews.data === null) ||
            (attentionRequiresOffers && offerEvaluations.error && offerEvaluations.data === null));
    const attentionIsLoading =
        settings.enabledCategories.length > 0 &&
        (applications.isLoading ||
            (attentionRequiresInterviews && interviews.isLoading) ||
            (attentionRequiresOffers && offerEvaluations.isLoading));

    useEffect(() => {
        if (!settingsEffectReadyRef.current) {
            settingsEffectReadyRef.current = true;
            return;
        }

        const requests: Promise<void>[] = [];
        if (settings.enabledCategories.length > 0 && applications.data === null && !applications.error) {
            requests.push(loadApplications());
        }
        if (attentionRequiresOffers && offerEvaluations.data === null && !offerEvaluations.error) {
            requests.push(loadOfferEvaluations());
        }
        if (requests.length > 0) {
            void Promise.allSettled(requests).then((results) => {
                if (mountedRef.current && results.some((result) => result.status === 'rejected')) {
                    showErrorToast('Some dashboard sections could not be loaded.');
                }
            });
        }
    }, [settings.enabledCategories.join('|')]);

    return (
        <DashboardContent
            applications={applications.data ?? []}
            attentionTarget={attentionTarget}
            applicationsError={attentionHasError}
            applicationsIsLoading={attentionIsLoading}
            interviewedApplicationCount={statusSummary.data?.interviewedApplicationCount ?? 0}
            offerEvaluations={offerEvaluations.data ?? []}
            statusCounts={statusSummary.data?.statusCounts ?? []}
            interviews={interviews.data ?? []}
            weeklyApplications={weeklyApplications.data ?? []}
            isLoading={false}
            interviewError={interviews.error && interviews.data === null}
            interviewIsLoading={interviews.isLoading}
            statusError={statusSummary.error && statusSummary.data === null}
            statusIsLoading={statusSummary.isLoading}
            weeklyError={weeklyApplications.error && weeklyApplications.data === null}
            weeklyIsLoading={weeklyApplications.isLoading}
            onRetryInterviews={() => void retry(loadInterviews)}
            onRetryNeedsAttention={() => void retryNeedsAttention()}
            onRetryStatus={() => void retry(loadStatusSummary)}
            onRetryWeeklyApplications={() => void retry(loadWeeklyApplications)}
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

export default Dashboard;
