import { useEffect, useRef, useState } from 'react';
import EmptyState from '../../components/emptyState/EmptyState';
import OfferDecisionWorkspace from './OfferDecisionWorkspace';
import type {
    OfferDecisionFilter,
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

type OfferDecisionPageProps = {
    archived: boolean;
};

const OfferDecisionPage = ({ archived }: OfferDecisionPageProps) => {
    const [data, setData] = useState<OfferDecisionWorkspaceData>();
    const [isLoading, setIsLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const requestIdRef = useRef(0);
    const api = useJobTrackerAPI();
    const { showErrorToast, showSuccessToast } = useToast();
    const { preferences, updatePreferences } = useUserPreferences();
    const filterRequest = useFilterRequest<OfferDecisionWorkspaceData>();
    const selectedFilters = archived ? preferences.archived_offer_decision_filters : preferences.offer_decision_filters;

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

        return () => {
            requestIdRef.current += 1;
        };
    }, [archived]);

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

    const getDeleteAllEvaluationCount = async (): Promise<number> => {
        try {
            const summary = archived ? await api.archivedApplication.getSummary() : await api.application.getSummary();
            return summary.offer_evaluation_count;
        } catch (error) {
            const fallback = archived
                ? 'Unable to load archived offer evaluation counts. Please try again.'
                : 'Unable to load active offer evaluation counts. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
            throw error;
        }
    };

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
                              }
                            : application
                    ),
                };
            });
            if (isNewEvaluation) {
                showSuccessToast('Offer evaluation added.');
            }
        } catch (error) {
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
                            ? [{ ...application, evaluation: null, has_counteroffer_plan: false }]
                            : [];
                    }),
                };
            });
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
                              return application.job_status === 'Offer' ? [{ ...application, evaluation: null }] : [];
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

    const setCounterofferPlanAvailability = (jobId: number, hasCounterofferPlan: boolean) => {
        setData((current) => {
            if (!current) {
                return current;
            }
            return {
                applications: current.applications.map((application) =>
                    application.job_id === jobId
                        ? { ...application, has_counteroffer_plan: hasCounterofferPlan }
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
        setCounterofferPlanAvailability(jobId, true);
    };

    const deleteCounterofferPlan = async (jobId: number) => {
        await api.offerDecision.deleteCounterofferPlan({ jobId });
        setCounterofferPlanAvailability(jobId, false);
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
            getDeleteAllEvaluationCount={getDeleteAllEvaluationCount}
            isFiltering={isFiltering}
            isLoading={isLoading}
            onDeleteCounterofferPlan={deleteCounterofferPlan}
            onDelete={deleteEvaluation}
            onDeleteAll={deleteAllEvaluations}
            onFilterSelectionChange={handleFilterSelection}
            onGetCounterofferPlan={getCounterofferPlan}
            onSave={archived ? undefined : saveEvaluation}
            onSaveCounterofferPlan={saveCounterofferPlan}
            readOnly={archived}
        />
    );
};

export default OfferDecisionPage;
