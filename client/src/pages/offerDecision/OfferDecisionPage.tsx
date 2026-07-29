import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmptyState from '../../components/emptyState/EmptyState';
import OfferDecisionWorkspace from './OfferDecisionWorkspace';
import type {
    OfferDecisionFilter,
    OfferDecisionApplication,
    OfferDecisionStatus,
    OfferDecisionWorkspaceData,
    SaveCounterofferPlanRequest,
    SaveOfferEvaluationRequest,
} from './models';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';
import { useJobTrackerAPI } from '../../api/useJobTrackerAPI';
import { useToast } from '../../components/toast/ToastProvider';
import { useUserPreferences } from '../../components/userPreferences/UserPreferencesProvider';
import useFilterRequest from '../../hooks/useFilterRequest';
import { isArchivedOfferDecisionFilter } from './offerDecisionConfig';
import { isCounterofferPlanDeletionRequiredError } from './counteroffer/counterofferPlan';
import { getDashboardOfferDecisionFilter, getDashboardOfferDecisionJobId } from '../dashboard/dashboardNavigation';

type OfferDecisionPageProps = {
    archived: boolean;
};

const OfferDecisionPage = ({ archived }: OfferDecisionPageProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const targetOfferJobId = archived ? null : getDashboardOfferDecisionJobId(location.state);
    const targetOfferFilter = archived
        ? null
        : getDashboardOfferDecisionFilter(location.state) ?? (targetOfferJobId === null ? null : 'Evaluated Offers');
    const hasOfferDecisionTarget =
        !archived &&
        typeof location.state === 'object' &&
        location.state !== null &&
        'dashboardOfferDecisionJobId' in location.state;
    const clearTarget = useCallback(() => {
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, navigate]);
    const [data, setData] = useState<OfferDecisionWorkspaceData>();
    const [isLoading, setIsLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const requestIdRef = useRef(0);
    const api = useJobTrackerAPI();
    const { showErrorToast, showSuccessToast } = useToast();
    const { preferences, updatePreferences } = useUserPreferences();
    const filterRequest = useFilterRequest<OfferDecisionWorkspaceData>();
    const savedFilters = archived ? preferences.archived_offer_decision_filters : preferences.offer_decision_filters;
    const [navigationFilters, setNavigationFilters] = useState<OfferDecisionFilter[] | undefined>(() =>
        !archived && targetOfferJobId !== null && targetOfferFilter && !savedFilters.includes(targetOfferFilter)
            ? [...savedFilters, targetOfferFilter]
            : undefined
    );
    const selectedFilters = navigationFilters ?? savedFilters;

    const loadWorkspace = async (filters: OfferDecisionFilter[] = selectedFilters) => {
        const requestId = ++requestIdRef.current;
        setIsLoading(true);
        setLoadFailed(false);

        try {
            const workspace = archived
                ? await api.offerDecision.getArchived({ filters: filters.filter(isArchivedOfferDecisionFilter) })
                : await api.offerDecision.getActive({ filters });
            if (requestId === requestIdRef.current) {
                setData(workspace);
            }
        } catch (error) {
            if (requestId !== requestIdRef.current) {
                return;
            }

            const fallback = archived
                ? 'Unable to load archived offer comparisons. Please try again.'
                : 'Unable to load offer comparisons. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
            setLoadFailed(true);
        } finally {
            if (requestId === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        void loadWorkspace();

        if (navigationFilters) {
            setIsFiltering(true);
            void updatePreferences({ offer_decision_filters: navigationFilters })
                .catch((error) =>
                    showErrorToast(
                        getErrorToastMessage(error, 'Unable to save offer comparison filters. Please try again.')
                    )
                )
                .finally(() => setIsFiltering(false));
        }

        return () => {
            requestIdRef.current += 1;
        };
    }, [archived]);

    useEffect(() => {
        if (hasOfferDecisionTarget && targetOfferJobId === null) {
            clearTarget();
        }
    }, [clearTarget, hasOfferDecisionTarget, targetOfferJobId]);

    const handleFilterSelection = async (filters: OfferDecisionFilter[]) => {
        const requestId = filterRequest.startRequest();
        setIsFiltering(true);

        try {
            const workspace = archived
                ? await api.offerDecision.getArchived({ filters: filters.filter(isArchivedOfferDecisionFilter) })
                : await api.offerDecision.getActive({ filters });
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            await updatePreferences(
                archived
                    ? { archived_offer_decision_filters: filters.filter(isArchivedOfferDecisionFilter) }
                    : { offer_decision_filters: filters }
            );
            const savedWorkspace = filterRequest.saveResult(requestId, workspace);
            if (savedWorkspace) {
                setData(savedWorkspace);
            }
            setNavigationFilters(undefined);
            return true;
        } catch (error) {
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            const savedWorkspace = filterRequest.failRequest(requestId);
            if (savedWorkspace) {
                setData(savedWorkspace);
            }
            const fallback = archived
                ? 'Unable to filter archived offer comparisons. Please try again.'
                : 'Unable to filter offer comparisons. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
            return false;
        } finally {
            if (filterRequest.isLatestRequest(requestId)) {
                setIsFiltering(false);
            }
        }
    };

    const getDeleteAllEvaluationSummary = async () => {
        try {
            const summary = archived ? await api.archivedApplication.getSummary() : await api.application.getSummary();
            return {
                evaluationCount: summary.offer_evaluation_count,
                counterofferPlanCount: summary.counteroffer_plan_count,
            };
        } catch (error) {
            const fallback = archived
                ? 'Unable to load archived offer evaluation counts. Please try again.'
                : 'Unable to load active offer evaluation counts. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
            throw error;
        }
    };

    const loadAllEvaluatedOffers = async () =>
        (await api.offerDecision.getActive({ filters: ['Evaluated Offers'] })).applications;

    const saveEvaluation = async (jobId: number, request: SaveOfferEvaluationRequest) => {
        const isNewEvaluation =
            data?.applications.some((application) => application.job_id === jobId && !application.evaluation) ?? false;
        try {
            await api.offerDecision.saveEvaluation({ jobId, ...request });
            setData((current) => {
                if (!current) {
                    return current;
                }

                return {
                    applications: current.applications.map((application) =>
                        application.job_id === jobId
                            ? {
                                  ...application,
                                  evaluation: {
                                      job_id: jobId,
                                      ratings: { ...request.ratings },
                                      details: { ...request.details },
                                  },
                                  has_counteroffer_plan:
                                      request.deleteCounterofferPlan === true
                                          ? false
                                          : application.has_counteroffer_plan,
                                  counteroffer_plan:
                                      request.deleteCounterofferPlan === true ? null : application.counteroffer_plan,
                              }
                            : application
                    ),
                };
            });
            showSuccessToast(isNewEvaluation ? 'Offer evaluation added.' : 'Offer evaluation saved.');
        } catch (error) {
            if (isCounterofferPlanDeletionRequiredError(error)) {
                throw error;
            }
            showErrorToast(getErrorToastMessage(error, 'Unable to save the offer evaluation. Please try again.'));
            throw error;
        }
    };

    const deleteEvaluation = async (jobId: number) => {
        try {
            await api.offerDecision.deleteEvaluation({ jobId });
            setData((current) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    applications: current.applications.flatMap((application) => {
                        if (application.job_id !== jobId) {
                            return [application];
                        }
                        return !archived && application.job_status === 'Offer'
                            ? [
                                  {
                                      ...application,
                                      evaluation: null,
                                      has_counteroffer_plan: false,
                                      counteroffer_plan: null,
                                  },
                              ]
                            : [];
                    }),
                };
            });
            showSuccessToast('Offer evaluation deleted.');
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to delete offer evaluation. Please try again.'));
            throw error;
        }
    };

    const deleteAllEvaluations = async () => {
        try {
            if (archived) {
                await api.offerDecision.deleteAllArchivedEvaluations();
            } else {
                await api.offerDecision.deleteAllActiveEvaluations();
            }
            setData((current) => {
                if (!current) {
                    return current;
                }

                return {
                    applications: archived
                        ? []
                        : current.applications.flatMap((application) => {
                              if (!application.evaluation) {
                                  return [application];
                              }
                              return application.job_status === 'Offer'
                                  ? [
                                        {
                                            ...application,
                                            evaluation: null,
                                            has_counteroffer_plan: false,
                                            counteroffer_plan: null,
                                        },
                                    ]
                                  : [];
                          }),
                };
            });
            showSuccessToast(archived ? 'Archived offer evaluations deleted.' : 'Active offer evaluations deleted.');
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(
                    error,
                    archived
                        ? 'Unable to delete archived offer evaluations. Please try again.'
                        : 'Unable to delete active offer evaluations. Please try again.'
                )
            );
            throw error;
        }
    };

    const setCounterofferPlan = (jobId: number, counterofferPlan: SaveCounterofferPlanRequest | null) => {
        setData((current) => {
            if (!current) {
                return current;
            }
            return {
                applications: current.applications.map((application) =>
                    application.job_id === jobId
                        ? {
                              ...application,
                              has_counteroffer_plan: counterofferPlan !== null,
                              counteroffer_plan: counterofferPlan,
                          }
                        : application
                ),
            };
        });
    };

    const getCounterofferPlan = async (jobId: number) => {
        return await api.offerDecision.getCounterofferPlan({ jobId });
    };

    const saveCounterofferPlan = async (jobId: number, request: SaveCounterofferPlanRequest) => {
        await api.offerDecision.saveCounterofferPlan({ jobId, ...request });
        setCounterofferPlan(jobId, request);
    };

    const deleteCounterofferPlan = async (jobId: number) => {
        await api.offerDecision.deleteCounterofferPlan({ jobId });
        setCounterofferPlan(jobId, null);
    };

    const updateOfferStatus = async (application: OfferDecisionApplication, status: OfferDecisionStatus) => {
        try {
            await api.application.updateStatus({
                jobId: application.job_id,
                jobStatus: status,
            });
            setData((current) =>
                current
                    ? {
                          applications: current.applications.map((item) =>
                              item.job_id === application.job_id ? { ...item, job_status: status } : item
                          ),
                      }
                    : current
            );
            showSuccessToast(status === 'Offer' ? 'Application marked as Offer.' : `Offer marked as ${status}.`);
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(
                    error,
                    status === 'Accepted'
                        ? 'Unable to accept the offer. Please try again.'
                        : status === 'Declined'
                        ? 'Unable to decline the offer. Please try again.'
                        : 'Unable to change the application back to Offer. Please try again.'
                )
            );
            throw error;
        }
    };

    if (!isLoading && (loadFailed || !data)) {
        return (
            <EmptyState
                description='Your saved data is unchanged. Try loading the workspace again.'
                icon='briefcase'
                primaryAction={{ label: 'Try again', onClick: () => void loadWorkspace() }}
                title='Offer comparisons are unavailable'
            />
        );
    }

    return (
        <OfferDecisionWorkspace
            data={data ?? { applications: [] }}
            getDeleteAllEvaluationSummary={getDeleteAllEvaluationSummary}
            isFiltering={isFiltering}
            isLoading={isLoading}
            loadAllEvaluatedOffers={archived ? undefined : loadAllEvaluatedOffers}
            onDeleteCounterofferPlan={deleteCounterofferPlan}
            onDelete={deleteEvaluation}
            onDeleteAll={deleteAllEvaluations}
            onFilterSelectionChange={handleFilterSelection}
            onGetCounterofferPlan={getCounterofferPlan}
            onSave={archived ? undefined : saveEvaluation}
            onSaveCounterofferPlan={saveCounterofferPlan}
            onTargetOfferProcessed={targetOfferJobId === null ? undefined : clearTarget}
            onUpdateOfferStatus={archived ? undefined : updateOfferStatus}
            readOnly={archived}
            selectedFilters={selectedFilters}
            targetOfferJobId={targetOfferJobId ?? undefined}
        />
    );
};

export default OfferDecisionPage;
