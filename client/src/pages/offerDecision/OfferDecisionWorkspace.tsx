import { useRef, useState, type ReactNode } from 'react';
import { useConfirm } from 'material-ui-confirm';
import ActivityControls from '../../components/activityControls/ActivityControls';
import CheckboxFilter from '../../components/activityControls/checkboxFilter/CheckboxFilter';
import MoreOptions from '../../components/activityControls/moreOptions/MoreOptions';
import EmptyState from '../../components/emptyState/EmptyState';
import { focusFirstInvalidField } from '../../components/formPage/focusFirstInvalidField';
import { createDeleteAllOfferEvaluationsConfirmation } from '../../components/confirmation/bulkConfirmations';
import { createDeleteConfirmation } from '../../components/confirmation/deleteConfirmation';
import { toDatetimeLocalInputValue } from '../../helper/dateFormatter';
import {
    ACTIVE_OFFER_DECISION_FILTERS,
    ARCHIVED_OFFER_DECISION_FILTERS,
    OFFER_DECISION_FILTER_CONFIG,
    isArchivedOfferDecisionFilter,
} from './offerDecisionConfig';
import {
    createDefaultOfferEvaluation,
    offerEvaluationsAreEqual,
    updateOfferDecisionValue,
    validateOfferEvaluation,
} from './offerEvaluation';
import { groupOfferDecisionApplications } from './offerDecisionGrouping';
import type {
    OfferDecisionApplication,
    OfferDecisionFilter,
    OfferDecisionWorkspaceProps,
    OfferEvaluation,
    OfferEvaluationFormErrors,
} from './models';
import { createOfferEvaluationCsvData } from './offerDecisionCsv';
import { createOfferDecisionEmptyState } from './offerDecisionEmptyState';
import OfferDecisionSkeleton from './OfferDecisionSkeleton';
import OfferEvaluationCard from './OfferEvaluationCard';
import { type OfferFieldRefs } from './OfferEvaluationForm';
import OfferDecisionRobustnessLab from './robustness/OfferDecisionRobustnessLab';
import { isEvaluatedOfferDecisionApplication } from './robustness/offerDecisionRobustnessCalculations';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';
import { useToast } from '../../components/toast/ToastProvider';
import { useUserPreferences } from '../../components/userPreferences/UserPreferencesProvider';
import styles from './OfferDecisionWorkspace.module.css';
import CounterofferPlanDialog from './counteroffer/CounterofferPlanDialog';
import { isCounterofferPlanningEligible } from './counteroffer/counterofferPlan';

type DraftEvaluations = Record<number, OfferEvaluation>;
type EvaluationErrors = Record<number, OfferEvaluationFormErrors>;

type ComparisonSectionProps = {
    applications: OfferDecisionApplication[];
    contentBeforeGrid?: ReactNode;
    description: string;
    heading: string;
    id: string;
    renderCard: (application: OfferDecisionApplication) => ReactNode;
};

const cloneEvaluation = (evaluation: OfferEvaluation): OfferEvaluation => ({
    ...evaluation,
    ratings: { ...evaluation.ratings },
    details: {
        ...evaluation.details,
        decision_deadline: toDatetimeLocalInputValue(evaluation.details.decision_deadline),
    },
});

const removeRecordValue = <T,>(record: Record<number, T>, jobId: number): Record<number, T> => {
    const updatedRecord = { ...record };
    delete updatedRecord[jobId];
    return updatedRecord;
};

const getCardCount = (count: number): 'one' | 'two' | 'many' => {
    if (count === 1) {
        return 'one';
    }
    return count === 2 ? 'two' : 'many';
};

const EvaluationGrid = ({ children, count }: { children: ReactNode; count: number }) => (
    <div className={styles.evaluationGrid} data-card-count={getCardCount(count)} data-testid='offer-evaluation-grid'>
        {children}
    </div>
);

const ComparisonSection = ({
    applications,
    contentBeforeGrid,
    description,
    heading,
    id,
    renderCard,
}: ComparisonSectionProps) =>
    applications.length > 0 ? (
        <section aria-labelledby={id} className={styles.comparisonSection}>
            <div className={styles.sectionHeading}>
                <h2 id={id}>{heading}</h2>
                <p>{description}</p>
            </div>
            {contentBeforeGrid}
            <EvaluationGrid count={applications.length}>{applications.map(renderCard)}</EvaluationGrid>
        </section>
    ) : null;

const OfferDecisionWorkspace = ({
    data,
    getDeleteAllEvaluationCount,
    isFiltering = false,
    isLoading = false,
    onDeleteCounterofferPlan,
    onDelete,
    onDeleteAll,
    onFilterSelectionChange,
    onGetCounterofferPlan,
    onSave,
    onSaveCounterofferPlan,
    readOnly,
}: OfferDecisionWorkspaceProps) => {
    const confirm = useConfirm();
    const { preferences, updatePreferences } = useUserPreferences();
    const { showErrorToast } = useToast();
    const filterOptions = readOnly ? ARCHIVED_OFFER_DECISION_FILTERS : ACTIVE_OFFER_DECISION_FILTERS;
    const selectedFilters = readOnly ? preferences.archived_offer_decision_filters : preferences.offer_decision_filters;
    const [drafts, setDrafts] = useState<DraftEvaluations>({});
    const [errors, setErrors] = useState<EvaluationErrors>({});
    const [expandedJobIds, setExpandedJobIds] = useState<number[]>([]);
    const [savingJobId, setSavingJobId] = useState<number>();
    const [deletingJobId, setDeletingJobId] = useState<number>();
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [counterofferPlanAvailability, setCounterofferPlanAvailability] = useState<Record<number, boolean>>({});
    const [counterofferApplication, setCounterofferApplication] = useState<OfferDecisionApplication | null>(null);
    const deleteAllPendingRef = useRef(false);

    const groups = groupOfferDecisionApplications(data.applications);
    const offersToEvaluate = groups['Offers to Evaluate'];
    const evaluatedOffers = groups['Evaluated Offers'];
    const expiredEvaluatedOffers = groups['Expired Evaluated Offers'];
    const previousEvaluations = groups['Previous Evaluations'];
    const robustnessOffers = evaluatedOffers.filter(isEvaluatedOfferDecisionApplication);
    const hasOpenEvaluationDraft = Object.keys(drafts).length > 0;
    const filtersAreActive = selectedFilters.length !== filterOptions.length;
    const displayedApplicationCount = selectedFilters.reduce((count, filter) => count + groups[filter].length, 0);
    const displayedEvaluationCount = selectedFilters.reduce(
        (count, filter) => count + (OFFER_DECISION_FILTER_CONFIG[filter].exportable ? groups[filter].length : 0),
        0
    );
    const evaluationCount = evaluatedOffers.length + expiredEvaluatedOffers.length + previousEvaluations.length;
    const csvData = createOfferEvaluationCsvData(groups, selectedFilters);

    const handleFilterSelection = async (filters: OfferDecisionFilter[]) => {
        if (onFilterSelectionChange) {
            return await onFilterSelectionChange(filters);
        }

        try {
            if (readOnly) {
                await updatePreferences({
                    archived_offer_decision_filters: filters.filter(isArchivedOfferDecisionFilter),
                });
            } else {
                await updatePreferences({ offer_decision_filters: filters });
            }
            return true;
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to save offer comparison filters. Please try again.'));
            return false;
        }
    };

    const clearFieldError = (jobId: number, field: keyof OfferEvaluationFormErrors) => {
        setErrors((current) => {
            const jobErrors = current[jobId];
            return jobErrors?.[field] ? { ...current, [jobId]: { ...jobErrors, [field]: undefined } } : current;
        });
    };

    const startEvaluation = (application: OfferDecisionApplication) => {
        setDrafts((current) => ({
            ...current,
            [application.job_id]: createDefaultOfferEvaluation(application.job_id),
        }));
        setErrors((current) => removeRecordValue(current, application.job_id));
    };

    const editEvaluation = (application: OfferDecisionApplication) => {
        const evaluation = application.evaluation;
        if (readOnly || !evaluation) {
            return;
        }

        setDrafts((current) => ({ ...current, [application.job_id]: cloneEvaluation(evaluation) }));
        setErrors((current) => removeRecordValue(current, application.job_id));
    };

    const cancelEvaluation = (jobId: number) => {
        setDrafts((current) => removeRecordValue(current, jobId));
        setErrors((current) => removeRecordValue(current, jobId));
    };

    const updateEvaluation = (jobId: number, update: (evaluation: OfferEvaluation) => OfferEvaluation) => {
        setDrafts((current) => {
            const evaluation = current[jobId];
            return evaluation ? { ...current, [jobId]: update(evaluation) } : current;
        });
    };

    const handleSave = async (
        application: OfferDecisionApplication,
        decisionDeadlineHasBadInput: boolean,
        fieldRefs: OfferFieldRefs
    ) => {
        const draft = drafts[application.job_id];
        if (!draft || !onSave || savingJobId !== undefined) {
            return;
        }
        const validation = validateOfferEvaluation(
            { ratings: draft.ratings, details: draft.details },
            application.application_date,
            decisionDeadlineHasBadInput
        );
        if (!validation.isValid) {
            setErrors((current) => ({ ...current, [application.job_id]: validation.errors }));
            focusFirstInvalidField(validation.errors, [
                ['decision_deadline', fieldRefs.decision_deadline],
                ['currency', fieldRefs.currency],
                ['monthly_base_salary', fieldRefs.monthly_base_salary],
                ['bonus', fieldRefs.bonus],
                ['annual_leave_days', fieldRefs.annual_leave_days],
                ['work_arrangement', fieldRefs.work_arrangement],
                ['pros', fieldRefs.pros],
                ['concerns', fieldRefs.concerns],
            ]);
            return;
        }
        if (application.evaluation && offerEvaluationsAreEqual(draft, application.evaluation)) {
            cancelEvaluation(application.job_id);
            return;
        }

        setSavingJobId(application.job_id);
        try {
            await onSave(application.job_id, validation.values);
            cancelEvaluation(application.job_id);
            setExpandedJobIds((current) =>
                current.includes(application.job_id) ? current : [...current, application.job_id]
            );
        } catch {
            // The page-level adapter owns user-facing API error handling.
        } finally {
            setSavingJobId(undefined);
        }
    };

    const handleDelete = async (jobId: number) => {
        if (!onDelete || drafts[jobId] || deletingJobId !== undefined || deleteAllPendingRef.current) {
            return;
        }
        const { confirmed } = await confirm(createDeleteConfirmation('offer evaluation'));
        if (!confirmed) {
            return;
        }
        setDeletingJobId(jobId);
        try {
            await onDelete(jobId);
            setExpandedJobIds((current) => current.filter((currentJobId) => currentJobId !== jobId));
        } catch {
            // The page-level adapter owns user-facing API error handling.
        } finally {
            setDeletingJobId(undefined);
        }
    };

    const handleDeleteAll = async () => {
        if (!onDeleteAll || evaluationCount === 0 || deleteAllPendingRef.current || deletingJobId !== undefined) {
            return;
        }

        deleteAllPendingRef.current = true;
        setIsDeletingAll(true);
        try {
            const deleteAllEvaluationCount = getDeleteAllEvaluationCount
                ? await getDeleteAllEvaluationCount()
                : evaluationCount;
            if (deleteAllEvaluationCount === 0) {
                return;
            }

            const { confirmed } = await confirm(
                createDeleteAllOfferEvaluationsConfirmation(deleteAllEvaluationCount, readOnly ? 'archived' : 'active')
            );
            if (!confirmed) {
                return;
            }

            await onDeleteAll();
            setDrafts({});
            setErrors({});
            setExpandedJobIds([]);
        } catch {
            // The page-level adapter owns user-facing API error handling.
        } finally {
            deleteAllPendingRef.current = false;
            setIsDeletingAll(false);
        }
    };

    const renderCard = (
        application: OfferDecisionApplication,
        allowEdit: boolean,
        expired: boolean,
        showExpiredBadge: boolean
    ) => {
        const hasCounterofferPlan =
            counterofferPlanAvailability[application.job_id] ?? Boolean(application.has_counteroffer_plan);
        const canCreateCounterofferPlan = isCounterofferPlanningEligible(application, readOnly);
        const canOpenCounterofferPlan =
            Boolean(onGetCounterofferPlan) &&
            Boolean(onDeleteCounterofferPlan) &&
            Boolean(onSaveCounterofferPlan) &&
            (hasCounterofferPlan || canCreateCounterofferPlan);

        return (
            <OfferEvaluationCard
                allowDelete={Boolean(onDelete) && !isDeletingAll}
                allowEdit={allowEdit}
                application={application}
                counterofferAction={
                    canOpenCounterofferPlan
                        ? {
                              hasPlan: hasCounterofferPlan,
                              onOpen: () => setCounterofferApplication(application),
                          }
                        : undefined
                }
                draft={drafts[application.job_id]}
                errors={errors[application.job_id] ?? {}}
                expanded={expandedJobIds.includes(application.job_id)}
                expired={showExpiredBadge && expired}
                isDeleting={deletingJobId === application.job_id}
                isSaving={savingJobId === application.job_id}
                key={application.job_id}
                onCancel={() => cancelEvaluation(application.job_id)}
                onDelete={onDelete ? () => void handleDelete(application.job_id) : undefined}
                onDetailsChange={(details, field) => {
                    updateEvaluation(application.job_id, (evaluation) => ({ ...evaluation, details }));
                    clearFieldError(application.job_id, field);
                }}
                onEdit={() => editEvaluation(application)}
                onRatingChange={(category, value) => {
                    updateEvaluation(application.job_id, (evaluation) => ({
                        ...evaluation,
                        ratings: updateOfferDecisionValue(evaluation.ratings, category, value),
                    }));
                    clearFieldError(application.job_id, 'ratings');
                }}
                onSave={(badInput, refs) => void handleSave(application, badInput, refs)}
                onStart={() => startEvaluation(application)}
                onToggleExpanded={() =>
                    setExpandedJobIds((current) =>
                        current.includes(application.job_id)
                            ? current.filter((jobId) => jobId !== application.job_id)
                            : [...current, application.job_id]
                    )
                }
            />
        );
    };

    const emptyState = createOfferDecisionEmptyState({
        filtersAreActive,
        onClearFilters: () => void handleFilterSelection([...filterOptions]),
        readOnly,
    });

    return (
        <main className={styles.workspace}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        !isLoading && !isFiltering && displayedEvaluationCount > 0 ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename={
                                    readOnly ? 'archived_offer_evaluations.csv' : 'active_offer_evaluations.csv'
                                }
                                deleteLabel='Delete all evaluations'
                                id={readOnly ? 'archived-offer-more-options' : 'offer-more-options'}
                                isDeleting={isDeletingAll}
                                onDelete={() => void handleDeleteAll()}
                            />
                        ) : undefined
                    }
                    ariaLabel={readOnly ? 'Archived offer comparison controls' : 'Offer comparison controls'}
                    mobileLayout='inlineWhenPossible'
                >
                    <CheckboxFilter
                        buttonLabel='Filter by'
                        disabled={isLoading}
                        id={readOnly ? 'archived-offer-evaluation-filter' : 'offer-evaluation-filter'}
                        onSelectionChange={handleFilterSelection}
                        options={filterOptions}
                        selectedOptions={selectedFilters}
                    />
                </ActivityControls>
            </div>

            {isLoading || isFiltering ? (
                <EvaluationGrid count={3}>
                    <OfferDecisionSkeleton />
                    <OfferDecisionSkeleton announceLoading={false} />
                    <OfferDecisionSkeleton announceLoading={false} />
                </EvaluationGrid>
            ) : displayedApplicationCount === 0 ? (
                <EmptyState {...emptyState} />
            ) : readOnly ? (
                <>
                    {selectedFilters.includes('Evaluated Offers') && (
                        <ComparisonSection
                            applications={evaluatedOffers}
                            description='Saved evaluations for archived applications with an active decision window.'
                            heading='Archived Evaluated Offers'
                            id='archived-evaluated-offers-heading'
                            renderCard={(application) => renderCard(application, false, false, false)}
                        />
                    )}
                    {selectedFilters.includes('Expired Evaluated Offers') && (
                        <ComparisonSection
                            applications={expiredEvaluatedOffers}
                            description='Archived offers whose decision deadlines have passed.'
                            heading='Archived Expired Evaluated Offers'
                            id='archived-expired-evaluated-offers-heading'
                            renderCard={(application) => renderCard(application, false, true, true)}
                        />
                    )}
                    {selectedFilters.includes('Previous Evaluations') && (
                        <ComparisonSection
                            applications={previousEvaluations}
                            description='Archived evaluations for applications that left Offer status.'
                            heading='Archived Previous Evaluations'
                            id='archived-previous-evaluations-heading'
                            renderCard={(application) => renderCard(application, false, false, false)}
                        />
                    )}
                </>
            ) : (
                <>
                    {selectedFilters.includes('Offers to Evaluate') && (
                        <ComparisonSection
                            applications={offersToEvaluate}
                            description='Start an evaluation when you are ready. It moves after the first successful save.'
                            heading='Offers to Evaluate'
                            id='offers-to-evaluate-heading'
                            renderCard={(application) => renderCard(application, true, false, false)}
                        />
                    )}
                    {selectedFilters.includes('Evaluated Offers') && (
                        <ComparisonSection
                            applications={evaluatedOffers}
                            contentBeforeGrid={
                                robustnessOffers.length >= 2 ? (
                                    <OfferDecisionRobustnessLab
                                        applications={robustnessOffers}
                                        disabled={hasOpenEvaluationDraft}
                                    />
                                ) : undefined
                            }
                            description='Sorted by the nearest decision deadline, then fit rating.'
                            heading='Evaluated Offers'
                            id='evaluated-offers-heading'
                            renderCard={(application) => renderCard(application, true, false, false)}
                        />
                    )}
                    {selectedFilters.includes('Expired Evaluated Offers') && (
                        <ComparisonSection
                            applications={expiredEvaluatedOffers}
                            description='The decision deadline has passed. Update the evaluation if the offer is still open.'
                            heading='Expired Evaluated Offers'
                            id='expired-evaluated-offers-heading'
                            renderCard={(application) => renderCard(application, true, true, true)}
                        />
                    )}
                    {selectedFilters.includes('Previous Evaluations') && (
                        <ComparisonSection
                            applications={previousEvaluations}
                            description='These records stay read-only after the application leaves Offer status.'
                            heading='Previous Evaluations'
                            id='previous-evaluations-heading'
                            renderCard={(application) => renderCard(application, false, false, false)}
                        />
                    )}
                </>
            )}
            {counterofferApplication && onGetCounterofferPlan && onDeleteCounterofferPlan && onSaveCounterofferPlan && (
                <CounterofferPlanDialog
                    application={counterofferApplication}
                    applications={data.applications}
                    hasPlan={
                        counterofferPlanAvailability[counterofferApplication.job_id] ??
                        Boolean(counterofferApplication.has_counteroffer_plan)
                    }
                    onClose={() => setCounterofferApplication(null)}
                    onDelete={onDeleteCounterofferPlan}
                    onGet={onGetCounterofferPlan}
                    onPlanAvailabilityChange={(jobId, hasCounterofferPlan) =>
                        setCounterofferPlanAvailability((current) => ({
                            ...current,
                            [jobId]: hasCounterofferPlan,
                        }))
                    }
                    onSave={onSaveCounterofferPlan}
                    readOnly={readOnly}
                />
            )}
        </main>
    );
};

export default OfferDecisionWorkspace;
