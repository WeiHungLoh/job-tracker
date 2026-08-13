import type { ConfirmOptions } from 'material-ui-confirm';
import {
    formatCountLabel,
    PERMANENT_DELETION_WARNING,
    type CollectionState,
} from '../../components/confirmation/bulkConfirmations';
import { createDestructiveConfirmationButtonProps } from '../../components/confirmation/destructiveConfirmationButtonProps';

export type ApplicationRelationAction = 'archive' | 'delete' | 'unarchive';

const ACTION_LABELS: Record<ApplicationRelationAction, string> = {
    archive: 'Archive',
    delete: 'Delete',
    unarchive: 'Unarchive',
};

const CONFIRMATION_TITLES: Record<ApplicationRelationAction, string> = {
    archive: 'Confirm Archive',
    delete: 'Confirm Deletion',
    unarchive: 'Confirm Unarchive',
};

export const createApplicationRelationConfirmation = (
    action: ApplicationRelationAction,
    state: CollectionState,
    relatedInterviewCount: number,
    offerEvaluationCount = 0,
    counterofferPlanCount = 0
): ConfirmOptions => {
    const actionLabel = ACTION_LABELS[action];
    const relatedInterviewLabel = formatCountLabel(relatedInterviewCount, `related ${state} interview`);
    const relatedInterviews = relatedInterviewCount > 0 ? ` and its ${relatedInterviewLabel}` : '';
    const permanence = action === 'delete' ? ` ${PERMANENT_DELETION_WARNING}` : '';
    const confirmationButtonProps =
        action === 'delete' ? createDestructiveConfirmationButtonProps() : { autoFocus: true };

    if (offerEvaluationCount > 0 || counterofferPlanCount > 0) {
        const evaluationLabel =
            offerEvaluationCount === 1
                ? 'saved offer evaluation'
                : formatCountLabel(offerEvaluationCount, 'saved offer evaluation');
        const relations = [
            ...(relatedInterviewCount > 0 ? [`its ${relatedInterviewLabel}`] : []),
            ...(offerEvaluationCount > 0 ? [`its ${evaluationLabel}`] : []),
            ...(counterofferPlanCount > 0 ? ['its counteroffer plan'] : []),
        ];
        const finalRelation = relations.at(-1);
        const precedingRelations = relations.slice(0, -1);
        const relationDescription =
            relations.length === 1
                ? ` and ${finalRelation}`
                : `, ${precedingRelations.join(', ')}, and ${finalRelation}`;
        const savedItems =
            offerEvaluationCount > 0 && counterofferPlanCount > 0
                ? 'The saved offer evaluation and counteroffer plan'
                : offerEvaluationCount > 0
                ? 'The saved offer evaluation'
                : 'The counteroffer plan';
        const lifecycle =
            action === 'archive'
                ? ` ${savedItems} ${
                      offerEvaluationCount + counterofferPlanCount === 1 ? 'becomes' : 'become'
                  } read-only while archived.`
                : action === 'unarchive'
                ? ` ${savedItems} ${
                      offerEvaluationCount + counterofferPlanCount === 1 ? 'becomes' : 'become'
                  } editable again.`
                : permanence;

        return {
            title: CONFIRMATION_TITLES[action],
            description: `${actionLabel} this ${state} job application${relationDescription}?${lifecycle}`,
            confirmationText: actionLabel,
            cancellationText: 'Cancel',
            confirmationButtonProps,
        };
    }

    return {
        title: CONFIRMATION_TITLES[action],
        description: `${actionLabel} this ${state} job application${relatedInterviews}?${permanence}`,
        confirmationText: actionLabel,
        cancellationText: 'Cancel',
        confirmationButtonProps,
    };
};
