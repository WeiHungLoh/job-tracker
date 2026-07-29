import type { KeyboardEvent } from 'react';
import type { ConfirmOptions } from 'material-ui-confirm';

export const formatCountLabel = (count: number, singular: string, plural = `${singular}s`) =>
    `${count} ${count === 1 ? singular : plural}`;

export type CollectionState = 'active' | 'archived';

export const PERMANENT_DELETION_WARNING = 'This action is permanent and cannot be undone.';

const preventEnterConfirmation = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
    }
};

const bulkOptions = (title: string, description: string, confirmationText: string): ConfirmOptions => ({
    title,
    description,
    confirmationText,
    cancellationText: 'Cancel',
    confirmationButtonProps: { autoFocus: false, onKeyDown: preventEnterConfirmation },
});

const applicationDescription = (
    action: 'Archive' | 'Delete' | 'Unarchive',
    applicationCount: number,
    interviewCount: number,
    offerEvaluationCount: number,
    counterofferPlanCount: number,
    state: CollectionState
) => {
    const applicationLabel = formatCountLabel(applicationCount, `${state} job application`);
    const interviewLabel = formatCountLabel(interviewCount, `related ${state} interview`);
    const filterLabel = state === 'archived' ? 'archived job-status filters' : 'job-status filters';
    const permanence = action === 'Delete' ? ` ${PERMANENT_DELETION_WARNING}` : '';

    if (offerEvaluationCount > 0 || counterofferPlanCount > 0) {
        const possessive = applicationCount === 1 ? 'its' : 'their';
        const relations = [
            `${possessive} ${interviewLabel}`,
            ...(offerEvaluationCount > 0
                ? [`${possessive} ${formatCountLabel(offerEvaluationCount, 'saved offer evaluation')}`]
                : []),
            ...(counterofferPlanCount > 0
                ? [`${possessive} ${formatCountLabel(counterofferPlanCount, 'counteroffer plan')}`]
                : []),
        ];
        const finalRelation = relations.at(-1);
        const relationDescription = `${relations.slice(0, -1).join(', ')}, and ${finalRelation}`;
        const savedItemLabel =
            offerEvaluationCount > 0 && counterofferPlanCount > 0
                ? 'Saved offer evaluations and counteroffer plans'
                : offerEvaluationCount > 0
                ? 'Saved offer evaluations'
                : 'Counteroffer plans';
        const lifecycle =
            action === 'Archive'
                ? ` ${savedItemLabel} become read-only while archived.`
                : action === 'Unarchive'
                ? ` ${savedItemLabel} become editable again.`
                : permanence;

        return `${action} all ${applicationLabel}, ${relationDescription}? This affects every ${state} application you own, including applications not visible under the current ${filterLabel}.${lifecycle}`;
    }

    return `${action} all ${applicationLabel} and ${
        applicationCount === 1 ? 'its' : 'their'
    } ${interviewLabel}? This affects every ${state} application you own, including applications not visible under the current ${filterLabel}.${permanence}`;
};

export const createArchiveAllConfirmation = (
    applicationCount: number,
    interviewCount: number,
    offerEvaluationCount = 0,
    counterofferPlanCount = 0
): ConfirmOptions =>
    bulkOptions(
        'Confirm Archive All',
        applicationDescription(
            'Archive',
            applicationCount,
            interviewCount,
            offerEvaluationCount,
            counterofferPlanCount,
            'active'
        ),
        'Archive All'
    );

export const createUnarchiveAllConfirmation = (
    applicationCount: number,
    interviewCount: number,
    offerEvaluationCount = 0,
    counterofferPlanCount = 0
): ConfirmOptions =>
    bulkOptions(
        'Confirm Unarchive All',
        applicationDescription(
            'Unarchive',
            applicationCount,
            interviewCount,
            offerEvaluationCount,
            counterofferPlanCount,
            'archived'
        ),
        'Unarchive All'
    );

export const createDeleteAllApplicationsConfirmation = (
    applicationCount: number,
    interviewCount: number,
    offerEvaluationCount: number,
    state: CollectionState,
    counterofferPlanCount = 0
): ConfirmOptions =>
    bulkOptions(
        'Confirm Delete All',
        applicationDescription(
            'Delete',
            applicationCount,
            interviewCount,
            offerEvaluationCount,
            counterofferPlanCount,
            state
        ),
        'Delete All'
    );

export const createDeleteAllInterviewsConfirmation = (
    interviewCount: number,
    state: CollectionState
): ConfirmOptions => {
    const interviewLabel = formatCountLabel(interviewCount, `${state} interview`);

    return bulkOptions(
        'Confirm Delete All',
        `Delete all ${interviewLabel} you own? This affects every ${state} interview in your account. ${PERMANENT_DELETION_WARNING}`,
        'Delete All'
    );
};

export const createDeleteAllOfferEvaluationsConfirmation = (
    evaluationCount: number,
    state: CollectionState,
    counterofferPlanCount = 0
): ConfirmOptions => {
    const evaluationLabel = formatCountLabel(evaluationCount, `${state} offer evaluation`);
    const counterofferDescription =
        counterofferPlanCount > 0
            ? ` This also deletes ${formatCountLabel(counterofferPlanCount, 'corresponding counteroffer plan')}.`
            : '';

    return bulkOptions(
        'Confirm Delete All',
        `Delete all ${evaluationLabel} you own? This removes only saved evaluations for ${state} applications.${counterofferDescription} Applications and offers without evaluations are not deleted. ${PERMANENT_DELETION_WARNING}`,
        'Delete All'
    );
};

export const createBulkCalendarExportConfirmation = (interviewCount: number): ConfirmOptions => {
    const interviewLabel = formatCountLabel(interviewCount, 'upcoming interview');

    return bulkOptions(
        'Export all upcoming interviews?',
        `This will download one .ics file containing all ${interviewLabel}, including interviews you may already have added to your calendar. Importing the file again may create duplicate calendar events.`,
        'Export All'
    );
};
