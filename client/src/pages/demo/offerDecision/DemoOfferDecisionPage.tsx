import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import OfferDecisionWorkspace from '../../offerDecision/OfferDecisionWorkspace';
import type {
    OfferDecisionApplication,
    OfferDecisionFilter,
    OfferDecisionStatus,
    SaveCounterofferPlanRequest,
    SaveOfferEvaluationRequest,
} from '../../offerDecision/models';
import { selectArchivedOfferDecisionWorkspace, selectOfferDecisionWorkspace } from '../state/demoSelectors';
import { useToast } from '../../../components/toast/ToastProvider';
import { JobTrackerAPIError } from '../../../api/models';
import { calculateOfferDecisionScore } from '../../offerDecision/offerEvaluation';
import { getDashboardOfferDecisionFilter, getDashboardOfferDecisionJobId } from '../../dashboard/dashboardNavigation';

type DemoOfferDecisionPageProps = {
    archived: boolean;
};

const DemoOfferDecisionPage = ({ archived }: DemoOfferDecisionPageProps) => {
    const { dispatch, state, updatePreferences } = useDemo();
    const { showSuccessToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const targetOfferJobId = archived ? null : getDashboardOfferDecisionJobId(location.state);
    const targetOfferFilter = archived
        ? null
        : getDashboardOfferDecisionFilter(location.state) ?? (targetOfferJobId === null ? null : 'Evaluated Offers');
    const selectedFilters = useMemo<OfferDecisionFilter[] | undefined>(() => {
        if (
            targetOfferJobId === null ||
            !targetOfferFilter ||
            state.preferences.offer_decision_filters.includes(targetOfferFilter)
        ) {
            return undefined;
        }
        return [...state.preferences.offer_decision_filters, targetOfferFilter];
    }, [state.preferences.offer_decision_filters, targetOfferFilter, targetOfferJobId]);
    const data = useMemo(
        () => (archived ? selectArchivedOfferDecisionWorkspace(state) : selectOfferDecisionWorkspace(state)),
        [archived, state]
    );

    const saveEvaluation = async (jobId: number, request: SaveOfferEvaluationRequest) => {
        const isNewEvaluation = !state.offerEvaluations[jobId];
        const counterofferPlan = state.counterofferPlans[jobId];
        if (
            counterofferPlan &&
            calculateOfferDecisionScore(request.ratings) < calculateOfferDecisionScore(counterofferPlan.ratings) &&
            !request.deleteCounterofferPlan
        ) {
            throw new JobTrackerAPIError('The offer evaluation is below the counteroffer plan.', 409, {
                code: 'OFFER_EVALUATION_BELOW_COUNTEROFFER',
            });
        }
        dispatch({
            type: 'SAVE_OFFER_EVALUATION',
            payload: { jobId, request },
        });
        showSuccessToast(isNewEvaluation ? 'Offer evaluation added.' : 'Offer evaluation saved.');
    };

    const deleteEvaluation = async (jobId: number) => {
        dispatch({ type: 'DELETE_OFFER_EVALUATION', payload: { jobId } });
        showSuccessToast('Offer evaluation deleted.');
    };

    const deleteAllEvaluations = async () => {
        dispatch({ type: 'DELETE_ALL_OFFER_EVALUATIONS', payload: { archived } });
        showSuccessToast(archived ? 'Archived offer evaluations deleted.' : 'Active offer evaluations deleted.');
    };

    const getCounterofferPlan = async (jobId: number) => {
        const plan = state.counterofferPlans[jobId];
        if (!plan) {
            throw new JobTrackerAPIError('Counteroffer plan was not found.', 404);
        }
        return { ...plan, ratings: { ...plan.ratings } };
    };

    const saveCounterofferPlan = async (jobId: number, request: SaveCounterofferPlanRequest) => {
        dispatch({ type: 'SAVE_COUNTEROFFER_PLAN', payload: { jobId, request } });
    };

    const deleteCounterofferPlan = async (jobId: number) => {
        dispatch({ type: 'DELETE_COUNTEROFFER_PLAN', payload: { jobId } });
    };

    const updateOfferStatus = async (application: OfferDecisionApplication, status: OfferDecisionStatus) => {
        dispatch({
            type: 'UPDATE_APPLICATION_STATUS',
            payload: { jobId: application.job_id, jobStatus: status },
        });
        showSuccessToast(status === 'Offer' ? 'Application marked as Offer.' : `Offer marked as ${status}.`);
    };

    const clearTarget = useCallback(() => {
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, navigate]);

    useEffect(() => {
        if (selectedFilters) {
            void updatePreferences({ offer_decision_filters: selectedFilters });
        }
    }, [selectedFilters, updatePreferences]);

    return (
        <OfferDecisionWorkspace
            data={data}
            onDeleteCounterofferPlan={deleteCounterofferPlan}
            onDelete={deleteEvaluation}
            onDeleteAll={deleteAllEvaluations}
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

export default DemoOfferDecisionPage;
