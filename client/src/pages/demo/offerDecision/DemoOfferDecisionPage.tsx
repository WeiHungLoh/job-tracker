import { useMemo } from 'react';
import { useDemo } from '../context/DemoContext';
import OfferDecisionWorkspace from '../../offerDecision/OfferDecisionWorkspace';
import type { SaveCounterofferPlanRequest, SaveOfferEvaluationRequest } from '../../offerDecision/models';
import { selectArchivedOfferDecisionWorkspace, selectOfferDecisionWorkspace } from '../state/demoSelectors';
import { useToast } from '../../../components/toast/ToastProvider';
import { JobTrackerAPIError } from '../../../api/models';

type DemoOfferDecisionPageProps = {
    archived: boolean;
};

const DemoOfferDecisionPage = ({ archived }: DemoOfferDecisionPageProps) => {
    const { dispatch, state } = useDemo();
    const { showSuccessToast } = useToast();
    const data = useMemo(
        () => (archived ? selectArchivedOfferDecisionWorkspace(state) : selectOfferDecisionWorkspace(state)),
        [archived, state]
    );

    const saveEvaluation = async (jobId: number, request: SaveOfferEvaluationRequest) => {
        const isNewEvaluation = !state.offerEvaluations[jobId];
        dispatch({
            type: 'SAVE_OFFER_EVALUATION',
            payload: { jobId, request },
        });
        if (isNewEvaluation) {
            showSuccessToast('Offer evaluation added.');
        }
    };

    const deleteEvaluation = async (jobId: number) => {
        dispatch({ type: 'DELETE_OFFER_EVALUATION', payload: { jobId } });
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

    return (
        <OfferDecisionWorkspace
            data={data}
            onDeleteCounterofferPlan={deleteCounterofferPlan}
            onDelete={deleteEvaluation}
            onDeleteAll={deleteAllEvaluations}
            onGetCounterofferPlan={getCounterofferPlan}
            onSave={archived ? undefined : saveEvaluation}
            onSaveCounterofferPlan={saveCounterofferPlan}
            readOnly={archived}
        />
    );
};

export default DemoOfferDecisionPage;
