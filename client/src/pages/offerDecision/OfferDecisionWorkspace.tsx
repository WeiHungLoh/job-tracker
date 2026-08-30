import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useConfirm, type ConfirmOptions } from 'material-ui-confirm';
import ActivityControls from '../../components/activityControls/ActivityControls';
import CheckboxFilter from '../../components/activityControls/checkboxFilter/CheckboxFilter';
import CollectionViewToggle from '../../components/activityControls/collectionViewToggle/CollectionViewToggle';
import ControlDropdown from '../../components/activityControls/ControlDropdown';
import MoreOptions from '../../components/activityControls/moreOptions/MoreOptions';
import PrimaryButton from '../../components/button/PrimaryButton';
import EmptyState from '../../components/emptyState/EmptyState';
import { focusFirstInvalidField } from '../../components/formPage/focusFirstInvalidField';
import SkeletonOfferComparisonTable from '../../components/skeletonLoader/skeletonOfferComparisonTable/SkeletonOfferComparisonTable';
import { createDeleteAllOfferEvaluationsConfirmation } from '../../components/confirmation/bulkConfirmations';
import { createDeleteConfirmation } from '../../components/confirmation/deleteConfirmation';
import { createDestructiveConfirmationButtonProps } from '../../components/confirmation/destructiveConfirmationButtonProps';
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
    OfferDecisionStatus,
    OfferDecisionTableOrientation,
    OfferDecisionViewMode,
} from './models';
import { createOfferEvaluationCsvData } from './offerDecisionCsv';
import { createOfferDecisionEmptyState } from './offerDecisionEmptyState';
import OfferDecisionSkeleton from './OfferDecisionSkeleton';
import OfferEvaluationCard from './OfferEvaluationCard';
import OfferEvaluationDialog, { type OfferEvaluationDialogMode } from './offerEvaluationTable/OfferEvaluationDialog';
import OfferEvaluationTable, {
    type OfferEvaluationTableActions,
    type OfferEvaluationTableLayout,
} from './offerEvaluationTable/OfferEvaluationTable';
import { type OfferFieldRefs } from './OfferEvaluationForm';
import OfferDecisionRobustnessLab from './robustness/OfferDecisionRobustnessLab';
import { isEvaluatedOfferDecisionApplication } from './robustness/offerDecisionRobustnessCalculations';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';
import { useToast } from '../../components/toast/ToastProvider';
import { useUserPreferences } from '../../components/userPreferences/UserPreferencesProvider';
import { useUnsavedChangesBlocker } from '../../hooks/useUnsavedChangesBlocker';
import { scrollAndHighlight } from '../../helper/highlightElement';
import styles from './OfferDecisionWorkspace.module.css';
import evaluationStyles from './OfferEvaluation.module.css';
import CounterofferPlanDialog from './counteroffer/CounterofferPlanDialog';
import {
    isCounterofferPlanDeletionRequiredError,
    isCounterofferPlanningEligible,
} from './counteroffer/counterofferPlan';
import { useBulkOfferDeadlineCalendarExport } from './useBulkOfferDeadlineCalendarExport';
import {
    downloadOfferDeadlineIcs,
    getOfferStatusActions,
    openOfferDeadlineInGoogleCalendar,
} from './offerEvaluationActions';
import useCurrentTime from '../../hooks/useCurrentTime';

type DraftEvaluations = Record<number, OfferEvaluation>;
type EvaluationErrors = Record<number, OfferEvaluationFormErrors>;
type EvaluationDialogState = {
    application: OfferDecisionApplication;
    expired: boolean;
    mode: OfferEvaluationDialogMode;
};
type EvaluationHighlight = {
    jobId: number;
    surface: EvaluationHighlightSurface;
};
type EvaluationHighlightSurface = 'cards' | `table-${OfferDecisionTableOrientation}`;

const OFFER_DECISION_VIEW_OPTIONS = [
    { label: 'Cards', value: 'cards' },
    { label: 'Table', value: 'table' },
] as const;

const TABLE_ORIENTATION_OPTIONS: Array<{ label: string; value: OfferDecisionTableOrientation }> = [
    { label: 'Horizontal', value: 'horizontal' },
    { label: 'Vertical', value: 'vertical' },
];

type ComparisonSectionProps = {
    applications: OfferDecisionApplication[];
    contentBeforeGrid?: ReactNode;
    description: string;
    heading: string;
    id: string;
    renderCard: (application: OfferDecisionApplication) => ReactNode;
};

type TableComparisonSectionProps = Omit<ComparisonSectionProps, 'renderCard'> & {
    getActions: (application: OfferDecisionApplication) => OfferEvaluationTableActions;
    highlightedJobId?: number;
    layout: OfferEvaluationTableLayout;
    orientation: OfferDecisionTableOrientation;
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

const getEvaluationCardId = (jobId: number): string => `offer-evaluation-${jobId}`;

const getEvaluationHighlightSurface = (
    viewMode: OfferDecisionViewMode,
    tableOrientation: OfferDecisionTableOrientation
): EvaluationHighlightSurface => (viewMode === 'cards' ? 'cards' : `table-${tableOrientation}`);

const createCounterofferDeletionConfirmation = (companyName: string): ConfirmOptions => ({
    title: 'Delete counteroffer plan?',
    description: `The edited evaluation for ${companyName} has a higher fit rating than your saved counteroffer plan. Delete the counteroffer plan and save this evaluation?`,
    confirmationText: 'Delete and save',
    cancellationText: 'Cancel',
    confirmationButtonProps: createDestructiveConfirmationButtonProps(),
});

const createOfferOutcomeConfirmation = (
    application: OfferDecisionApplication,
    status: OfferDecisionStatus
): ConfirmOptions => {
    if (status === 'Offer') {
        return {
            title: 'Change back to Offer?',
            description: `${application.company_name} — ${application.job_title} will be marked as Offer.`,
            confirmationText: 'Change to Offer',
            cancellationText: 'Cancel',
            confirmationButtonProps: { autoFocus: true },
        };
    }

    const isAccepting = status === 'Accepted';
    return {
        title: `${isAccepting ? 'Accept' : 'Decline'} this offer?`,
        description: `${application.company_name} — ${application.job_title} will be marked as ${status}.`,
        confirmationText: isAccepting ? 'Accept offer' : 'Decline offer',
        cancellationText: 'Cancel',
        confirmationButtonProps: isAccepting ? { autoFocus: true } : createDestructiveConfirmationButtonProps(),
    };
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

const TableComparisonSection = ({
    applications,
    contentBeforeGrid,
    description,
    heading,
    id,
    getActions,
    highlightedJobId,
    layout,
    orientation,
}: TableComparisonSectionProps) =>
    applications.length > 0 ? (
        <section aria-labelledby={id} className={styles.comparisonSection}>
            <div className={styles.sectionHeading}>
                <h2 id={id}>{heading}</h2>
                <p>{description}</p>
            </div>
            {contentBeforeGrid}
            <OfferEvaluationTable
                applications={applications}
                getActions={getActions}
                headingId={id}
                highlightedJobId={highlightedJobId}
                layout={layout}
                orientation={orientation}
            />
        </section>
    ) : null;

const OfferDecisionWorkspace = ({
    data,
    getDeleteAllEvaluationSummary,
    isFiltering = false,
    isLoading = false,
    loadAllEvaluatedOffers,
    onDeleteCounterofferPlan,
    onDelete,
    onDeleteAll,
    onFilterSelectionChange,
    onGetCounterofferPlan,
    onSave,
    onSaveCounterofferPlan,
    onTargetOfferProcessed,
    onUpdateOfferStatus,
    readOnly,
    selectedFilters: selectedFiltersOverride,
    targetOfferJobId,
}: OfferDecisionWorkspaceProps) => {
    const confirm = useConfirm();
    const currentTime = useCurrentTime();
    const { preferences, updatePreferences } = useUserPreferences();
    const { showErrorToast } = useToast();
    const filterOptions = readOnly ? ARCHIVED_OFFER_DECISION_FILTERS : ACTIVE_OFFER_DECISION_FILTERS;
    const selectedFilters =
        selectedFiltersOverride ??
        (readOnly ? preferences.archived_offer_decision_filters : preferences.offer_decision_filters);
    const viewMode =
        (readOnly ? preferences.archived_offer_decision_view_mode : preferences.offer_decision_view_mode) ?? 'cards';
    const [drafts, setDrafts] = useState<DraftEvaluations>({});
    const [errors, setErrors] = useState<EvaluationErrors>({});
    const [expandedJobIds, setExpandedJobIds] = useState<number[]>([]);
    const [savingJobId, setSavingJobId] = useState<number>();
    const [savedEvaluationJobId, setSavedEvaluationJobId] = useState<number>();
    const [invalidDeadlineJobIds, setInvalidDeadlineJobIds] = useState<number[]>([]);
    const [deletingJobId, setDeletingJobId] = useState<number>();
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [counterofferPlanAvailability, setCounterofferPlanAvailability] = useState<Record<number, boolean>>({});
    const [counterofferApplication, setCounterofferApplication] = useState<OfferDecisionApplication | null>(null);
    const [statusUpdatingJobId, setStatusUpdatingJobId] = useState<number>();
    const persistedTableOrientation =
        (readOnly
            ? preferences.archived_offer_decision_table_orientation
            : preferences.offer_decision_table_orientation) ?? 'horizontal';
    const [tableOrientation, setTableOrientation] = useState<OfferDecisionTableOrientation>(persistedTableOrientation);
    const [evaluationHighlight, setEvaluationHighlight] = useState<EvaluationHighlight>();
    const currentHighlightSurface = getEvaluationHighlightSurface(viewMode, tableOrientation);
    const highlightedJobId =
        evaluationHighlight?.surface === currentHighlightSurface && viewMode === 'table'
            ? evaluationHighlight.jobId
            : undefined;
    const [evaluationDialog, setEvaluationDialog] = useState<EvaluationDialogState | null>(null);
    const deleteAllPendingRef = useRef(false);
    const statusUpdatePendingRef = useRef(false);
    const highlightTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const highlightFrameRef = useRef<number | undefined>(undefined);
    const currentHighlightSurfaceRef = useRef(currentHighlightSurface);
    currentHighlightSurfaceRef.current = currentHighlightSurface;
    const processedTargetOfferJobIdRef = useRef<number | undefined>(undefined);

    const groups = groupOfferDecisionApplications(data.applications, currentTime);
    const offersToEvaluate = groups['Offers to Evaluate'];
    const evaluatedOffers = groups['Evaluated Offers'];
    const expiredEvaluatedOffers = groups['Expired Evaluated Offers'];
    const previousEvaluations = groups['Previous Evaluations'];
    const robustnessOffers = evaluatedOffers.filter(isEvaluatedOfferDecisionApplication);
    const hasCompleteEvaluatedOffers = selectedFilters.includes('Evaluated Offers') || !loadAllEvaluatedOffers;
    const {
        canExport: canExportOfferDeadlines,
        exportOfferDeadlines,
        isLoadingOffers: isLoadingOfferDeadlines,
    } = useBulkOfferDeadlineCalendarExport({
        applications: data.applications,
        hasCompleteEvaluatedOffers,
        loadAllEvaluatedOffers,
    });
    const filtersAreActive = selectedFilters.length !== filterOptions.length;
    const displayedApplicationCount = selectedFilters.reduce((count, filter) => count + groups[filter].length, 0);
    const displayedEvaluationCount = selectedFilters.reduce(
        (count, filter) => count + (OFFER_DECISION_FILTER_CONFIG[filter].exportable ? groups[filter].length : 0),
        0
    );
    const evaluationCount = evaluatedOffers.length + expiredEvaluatedOffers.length + previousEvaluations.length;
    const csvData = createOfferEvaluationCsvData(groups, selectedFilters);
    const hasUnsavedEvaluationChanges =
        invalidDeadlineJobIds.length > 0 ||
        Object.values(drafts).some((draft) => {
            const savedEvaluation = data.applications.find(
                (application) => application.job_id === draft.job_id
            )?.evaluation;
            return !offerEvaluationsAreEqual(draft, savedEvaluation ?? createDefaultOfferEvaluation(draft.job_id));
        });
    useUnsavedChangesBlocker(hasUnsavedEvaluationChanges, savingJobId !== undefined);

    useEffect(
        () => () => {
            Object.values(highlightTimeoutsRef.current).forEach(clearTimeout);
            if (highlightFrameRef.current !== undefined) {
                cancelAnimationFrame(highlightFrameRef.current);
            }
        },
        []
    );

    useEffect(() => {
        setTableOrientation(persistedTableOrientation);
    }, [persistedTableOrientation]);

    useEffect(() => {
        if (savedEvaluationJobId === undefined) {
            return;
        }
        if (viewMode === 'cards') {
            document
                .getElementById(getEvaluationCardId(savedEvaluationJobId))
                ?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
        }
        setSavedEvaluationJobId(undefined);
    }, [savedEvaluationJobId, viewMode]);

    useEffect(() => {
        if (targetOfferJobId === undefined) {
            processedTargetOfferJobIdRef.current = undefined;
            return;
        }
        if (isLoading || isFiltering || processedTargetOfferJobIdRef.current === targetOfferJobId) {
            return;
        }

        processedTargetOfferJobIdRef.current = targetOfferJobId;
        if (viewMode === 'table') {
            setEvaluationHighlight({ jobId: targetOfferJobId, surface: currentHighlightSurface });
        } else {
            const requestedSurface = currentHighlightSurface;
            scrollAndHighlight(
                getEvaluationCardId(targetOfferJobId),
                evaluationStyles.highlighted,
                highlightTimeoutsRef.current,
                'start',
                () => currentHighlightSurfaceRef.current === requestedSurface
            );
        }
        onTargetOfferProcessed?.();
    }, [currentHighlightSurface, isFiltering, isLoading, onTargetOfferProcessed, targetOfferJobId, viewMode]);

    useEffect(() => {
        if (!evaluationHighlight) {
            return;
        }

        const highlightedElementId = getEvaluationCardId(evaluationHighlight.jobId);
        if (evaluationHighlight.surface !== currentHighlightSurface) {
            const existingTimeout = highlightTimeoutsRef.current[highlightedElementId];
            if (existingTimeout) {
                clearTimeout(existingTimeout);
                delete highlightTimeoutsRef.current[highlightedElementId];
            }
            setEvaluationHighlight(undefined);
            return;
        }

        const { jobId, surface } = evaluationHighlight;

        scrollAndHighlight(
            getEvaluationCardId(jobId),
            viewMode === 'table' ? undefined : evaluationStyles.highlighted,
            highlightTimeoutsRef.current,
            'start',
            () => currentHighlightSurfaceRef.current === surface
        );
        if (viewMode !== 'table') {
            setEvaluationHighlight(undefined);
            return;
        }

        const existingTimeout = highlightTimeoutsRef.current[highlightedElementId];
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        highlightTimeoutsRef.current[highlightedElementId] = setTimeout(() => {
            setEvaluationHighlight((current) =>
                current?.jobId === jobId && current.surface === surface ? undefined : current
            );
            delete highlightTimeoutsRef.current[highlightedElementId];
        }, 4000);
    }, [currentHighlightSurface, evaluationHighlight, viewMode]);

    const clearInvalidDeadline = (jobId: number) => {
        setInvalidDeadlineJobIds((current) => current.filter((currentJobId) => currentJobId !== jobId));
    };

    const requestEvaluationHighlight = (jobId: number) => {
        const requestedSurface = currentHighlightSurface;
        setEvaluationHighlight(undefined);
        if (highlightFrameRef.current !== undefined) {
            cancelAnimationFrame(highlightFrameRef.current);
        }
        highlightFrameRef.current = requestAnimationFrame(() => {
            if (currentHighlightSurfaceRef.current === requestedSurface) {
                setEvaluationHighlight({ jobId, surface: requestedSurface });
            }
            highlightFrameRef.current = undefined;
        });
    };

    const clearEvaluationHighlight = () => {
        if (highlightFrameRef.current !== undefined) {
            cancelAnimationFrame(highlightFrameRef.current);
            highlightFrameRef.current = undefined;
        }
        Object.values(highlightTimeoutsRef.current).forEach(clearTimeout);
        highlightTimeoutsRef.current = {};
        setEvaluationHighlight(undefined);
    };

    const setInvalidDeadline = (jobId: number, hasBadInput: boolean) => {
        setInvalidDeadlineJobIds((current) => {
            const hasJobId = current.includes(jobId);
            if (hasBadInput === hasJobId) {
                return current;
            }
            return hasBadInput ? [...current, jobId] : current.filter((currentJobId) => currentJobId !== jobId);
        });
    };

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

    const handleViewModeChange = (nextViewMode: OfferDecisionViewMode) => {
        if (nextViewMode !== viewMode) {
            clearEvaluationHighlight();
        }
        void updatePreferences(
            readOnly ? { archived_offer_decision_view_mode: nextViewMode } : { offer_decision_view_mode: nextViewMode }
        ).catch((error) =>
            showErrorToast(getErrorToastMessage(error, 'Unable to save offer comparison view. Please try again.'))
        );
    };

    const handleTableOrientationChange = (nextOrientation: OfferDecisionTableOrientation) => {
        if (nextOrientation !== tableOrientation) {
            clearEvaluationHighlight();
        }
        setTableOrientation(nextOrientation);
        void updatePreferences(
            readOnly
                ? { archived_offer_decision_table_orientation: nextOrientation }
                : { offer_decision_table_orientation: nextOrientation }
        ).catch((error) => {
            setTableOrientation(persistedTableOrientation);
            showErrorToast(
                getErrorToastMessage(error, 'Unable to save the offer comparison table layout. Please try again.')
            );
        });
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
        clearInvalidDeadline(application.job_id);
    };

    const startTableEvaluation = (application: OfferDecisionApplication) => {
        startEvaluation(application);
        setEvaluationDialog({ application, expired: false, mode: 'add' });
    };

    const editEvaluation = (application: OfferDecisionApplication) => {
        const evaluation = application.evaluation;
        if (readOnly || !evaluation) {
            return;
        }

        setDrafts((current) => ({ ...current, [application.job_id]: cloneEvaluation(evaluation) }));
        setErrors((current) => removeRecordValue(current, application.job_id));
        clearInvalidDeadline(application.job_id);
    };

    const editTableEvaluation = (application: OfferDecisionApplication, expired: boolean) => {
        editEvaluation(application);
        setEvaluationDialog({ application, expired, mode: 'edit' });
    };

    const cancelEvaluation = (jobId: number) => {
        setDrafts((current) => removeRecordValue(current, jobId));
        setErrors((current) => removeRecordValue(current, jobId));
        clearInvalidDeadline(jobId);
    };

    const cancelEvaluationEdit = (application: OfferDecisionApplication) => {
        cancelEvaluation(application.job_id);
        setEvaluationDialog(null);
        if (application.evaluation) {
            setExpandedJobIds((current) =>
                current.includes(application.job_id) ? current : [...current, application.job_id]
            );
        }
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
            decisionDeadlineHasBadInput,
            Boolean(fieldRefs.monthly_base_salary.current?.validity.badInput)
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
            showErrorToast('Change at least one evaluation field before saving.');
            return;
        }
        const isNewEvaluation = application.evaluation === null;
        let deletedCounterofferPlan = false;

        setSavingJobId(application.job_id);
        try {
            try {
                await onSave(application.job_id, validation.values);
            } catch (error) {
                if (!isCounterofferPlanDeletionRequiredError(error)) {
                    return;
                }
                const { confirmed } = await confirm(createCounterofferDeletionConfirmation(application.company_name));
                if (!confirmed) {
                    return;
                }
                await onSave(application.job_id, {
                    ...validation.values,
                    deleteCounterofferPlan: true,
                });
                setCounterofferPlanAvailability((current) => ({
                    ...current,
                    [application.job_id]: false,
                }));
                deletedCounterofferPlan = true;
            }
            cancelEvaluation(application.job_id);
            setEvaluationDialog(null);
            setExpandedJobIds((current) =>
                current.includes(application.job_id) ? current : [...current, application.job_id]
            );
            if (deletedCounterofferPlan) {
                return;
            }
            if (viewMode === 'table') {
                if (preferences.application_enable_scroll) {
                    requestEvaluationHighlight(application.job_id);
                }
                return;
            }
            if (isNewEvaluation) {
                if (preferences.application_enable_scroll) {
                    requestEvaluationHighlight(application.job_id);
                }
            } else {
                setSavedEvaluationJobId(application.job_id);
            }
        } catch {
            // The page-level adapter owns user-facing API error handling.
        } finally {
            setSavingJobId(undefined);
        }
    };

    const handleDelete = async (application: OfferDecisionApplication, hasCounterofferPlan: boolean) => {
        const { job_id: jobId } = application;
        if (!onDelete || drafts[jobId] || deletingJobId !== undefined || deleteAllPendingRef.current) {
            return;
        }
        const deleteTarget = hasCounterofferPlan ? 'offer evaluation and its counteroffer plan' : 'offer evaluation';
        const { confirmed } = await confirm(createDeleteConfirmation(deleteTarget));
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
            const deletionSummary = getDeleteAllEvaluationSummary
                ? await getDeleteAllEvaluationSummary()
                : { evaluationCount, counterofferPlanCount: 0 };
            if (deletionSummary.evaluationCount === 0) {
                return;
            }

            const { confirmed } = await confirm(
                createDeleteAllOfferEvaluationsConfirmation(
                    deletionSummary.evaluationCount,
                    readOnly ? 'archived' : 'active',
                    deletionSummary.counterofferPlanCount
                )
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

    const handleOfferStatusUpdate = async (application: OfferDecisionApplication, status: OfferDecisionStatus) => {
        if (!onUpdateOfferStatus || statusUpdatePendingRef.current) {
            return;
        }

        statusUpdatePendingRef.current = true;
        setStatusUpdatingJobId(application.job_id);
        try {
            const { confirmed } = await confirm(createOfferOutcomeConfirmation(application, status));
            if (!confirmed) {
                return;
            }
            await onUpdateOfferStatus(application, status);
            setExpandedJobIds((current) => current.filter((jobId) => jobId !== application.job_id));
            if (preferences.application_enable_scroll) {
                requestEvaluationHighlight(application.job_id);
            }
        } catch {
            // The page-level adapter owns user-facing API error handling.
        } finally {
            statusUpdatePendingRef.current = false;
            setStatusUpdatingJobId(undefined);
        }
    };

    const renderCard = (
        application: OfferDecisionApplication,
        expired: boolean,
        showExpiredBadge: boolean,
        allowOfferStatusUpdate = false,
        allowCalendarExport = false
    ) => {
        const hasCounterofferPlan =
            counterofferPlanAvailability[application.job_id] ?? Boolean(application.has_counteroffer_plan);
        const canCreateCounterofferPlan = isCounterofferPlanningEligible(application, readOnly);
        const canOpenCounterofferPlan =
            Boolean(onGetCounterofferPlan) &&
            Boolean(onDeleteCounterofferPlan) &&
            Boolean(onSaveCounterofferPlan) &&
            (readOnly ? hasCounterofferPlan : hasCounterofferPlan || canCreateCounterofferPlan);

        return (
            <OfferEvaluationCard
                allowCalendarExport={allowCalendarExport}
                allowDelete={Boolean(onDelete) && !isDeletingAll}
                allowEdit={!readOnly}
                application={application}
                areStatusActionsDisabled={statusUpdatingJobId !== undefined}
                counterofferAction={
                    canOpenCounterofferPlan
                        ? {
                              hasPlan: hasCounterofferPlan,
                              onOpen: () => setCounterofferApplication(application),
                              placement: readOnly ? 'card' : 'menu',
                          }
                        : undefined
                }
                draft={drafts[application.job_id]}
                errors={errors[application.job_id] ?? {}}
                expanded={expandedJobIds.includes(application.job_id)}
                expired={showExpiredBadge && expired}
                id={getEvaluationCardId(application.job_id)}
                isDeleting={deletingJobId === application.job_id}
                isSaving={savingJobId === application.job_id}
                isStatusUpdating={statusUpdatingJobId === application.job_id}
                key={application.job_id}
                onCancel={() => cancelEvaluationEdit(application)}
                onDecisionDeadlineValidityChange={(hasBadInput) => setInvalidDeadline(application.job_id, hasBadInput)}
                onDelete={onDelete ? () => void handleDelete(application, hasCounterofferPlan) : undefined}
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
                onUpdateOfferStatus={
                    allowOfferStatusUpdate &&
                    onUpdateOfferStatus &&
                    ['Offer', 'Accepted', 'Declined'].includes(application.job_status)
                        ? (status) => void handleOfferStatusUpdate(application, status)
                        : undefined
                }
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

    const getTableActions = (
        application: OfferDecisionApplication,
        allowOfferStatusUpdate = false,
        allowCalendarExport = false,
        expired = false
    ): OfferEvaluationTableActions => {
        const hasCounterofferPlan =
            counterofferPlanAvailability[application.job_id] ?? Boolean(application.has_counteroffer_plan);
        const canCreateCounterofferPlan = isCounterofferPlanningEligible(application, readOnly);
        const canOpenCounterofferPlan =
            Boolean(onGetCounterofferPlan) &&
            Boolean(onDeleteCounterofferPlan) &&
            Boolean(onSaveCounterofferPlan) &&
            (readOnly ? hasCounterofferPlan : hasCounterofferPlan || canCreateCounterofferPlan);
        const deleteAction = {
            ariaLabel: `Delete evaluation for ${application.company_name}`,
            disabled: statusUpdatingJobId !== undefined,
            label: readOnly ? 'Delete' : 'Delete evaluation',
            onClick: () => void handleDelete(application, hasCounterofferPlan),
            variant: 'destructive' as const,
        };

        if (!application.evaluation) {
            return {
                actions: [
                    {
                        ariaLabel: `Add evaluation for ${application.company_name}`,
                        label: 'Add evaluation',
                        onClick: () => startTableEvaluation(application),
                        variant: 'compact',
                    },
                ],
                presentation: 'direct',
            };
        }

        if (readOnly) {
            if (hasCounterofferPlan && canOpenCounterofferPlan) {
                const actions: OfferEvaluationTableActions['actions'] = [
                    {
                        ariaLabel: `View counteroffer plan for ${application.company_name}`,
                        label: 'View counteroffer plan',
                        onClick: () => setCounterofferApplication(application),
                    },
                ];
                if (onDelete) {
                    actions.push({ ...deleteAction, label: 'Delete evaluation' });
                }
                return {
                    actions,
                    isPending: deletingJobId === application.job_id,
                    presentation: 'menu',
                };
            }

            return {
                actions: onDelete ? [deleteAction] : [],
                isPending: deletingJobId === application.job_id,
                presentation: 'direct',
            };
        }

        const actions: OfferEvaluationTableActions['actions'] = [];
        actions.push({
            ariaLabel: `Edit evaluation for ${application.company_name}`,
            label: 'Edit evaluation',
            onClick: () => editTableEvaluation(application, expired),
        });
        if (canOpenCounterofferPlan) {
            const counterofferLabel = hasCounterofferPlan ? 'View counteroffer plan' : 'Plan counteroffer';
            actions.push({
                ariaLabel: `${counterofferLabel} for ${application.company_name}`,
                label: counterofferLabel,
                onClick: () => setCounterofferApplication(application),
            });
        }
        if (allowCalendarExport) {
            actions.push(
                {
                    ariaLabel: `Add ${application.company_name} offer deadline to Google Calendar`,
                    label: 'Add to Google Calendar',
                    onClick: () => openOfferDeadlineInGoogleCalendar(application, showErrorToast),
                },
                {
                    ariaLabel: `Add ${application.company_name} offer deadline to Apple Calendar or Outlook`,
                    label: 'Add to Apple Calendar / Outlook (.ics)',
                    onClick: () => downloadOfferDeadlineIcs(application, showErrorToast),
                }
            );
        }
        if (allowOfferStatusUpdate && onUpdateOfferStatus) {
            actions.push(
                ...getOfferStatusActions(application.job_status).map(({ label, status }) => ({
                    ariaLabel: `${label} ${application.job_status === 'Offer' ? 'from' : 'for'} ${
                        application.company_name
                    }`,
                    disabled: statusUpdatingJobId !== undefined,
                    label,
                    onClick: () => void handleOfferStatusUpdate(application, status),
                }))
            );
        }
        if (onDelete && !isDeletingAll) {
            actions.push(deleteAction);
        }
        return {
            actions,
            isPending: deletingJobId === application.job_id || statusUpdatingJobId === application.job_id,
            presentation: 'menu',
        };
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
                        !isLoading &&
                        !isFiltering &&
                        (displayedEvaluationCount > 0 || (!readOnly && canExportOfferDeadlines)) ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename={
                                    readOnly ? 'archived_offer_evaluations.csv' : 'active_offer_evaluations.csv'
                                }
                                csvLabel='Export filtered offer evaluations as CSV'
                                deleteLabel='Delete all evaluations'
                                id={readOnly ? 'archived-offer-more-options' : 'offer-more-options'}
                                isDeleting={isDeletingAll}
                                middleAction={
                                    !readOnly && canExportOfferDeadlines
                                        ? {
                                              disabled: isLoadingOfferDeadlines,
                                              icon: 'calendar',
                                              isLoading: isLoadingOfferDeadlines,
                                              label: 'Export all active evaluated offer deadlines (.ics)',
                                              onClick: () => void exportOfferDeadlines(),
                                          }
                                        : undefined
                                }
                                onDelete={() => void handleDeleteAll()}
                            />
                        ) : undefined
                    }
                    ariaLabel={readOnly ? 'Archived offer comparison controls' : 'Offer comparison controls'}
                    mobileLayout={viewMode === 'table' ? 'collectionResponsive' : 'inlineWhenPossible'}
                >
                    <CollectionViewToggle
                        ariaLabel={readOnly ? 'Archived offer comparison view' : 'Offer comparison view'}
                        currentView={viewMode}
                        onViewChange={handleViewModeChange}
                        options={OFFER_DECISION_VIEW_OPTIONS}
                    />
                    {viewMode === 'table' && (
                        <ControlDropdown
                            closeOnSelect
                            dropdownAriaLabel='Table layout options'
                            dropdownRole='menu'
                            id='offer-comparison-table-layout'
                            label={tableOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
                            triggerAriaLabel='Table layout'
                            triggerStyle='activity'
                        >
                            <div className={evaluationStyles.cardActionOptions}>
                                {TABLE_ORIENTATION_OPTIONS.map((option) => (
                                    <PrimaryButton
                                        aria-checked={tableOrientation === option.value}
                                        className={evaluationStyles.cardActionOption}
                                        key={option.value}
                                        onClick={() => handleTableOrientationChange(option.value)}
                                        role='menuitemradio'
                                        type='button'
                                        variant='secondary'
                                    >
                                        {option.label}
                                    </PrimaryButton>
                                ))}
                            </div>
                        </ControlDropdown>
                    )}
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
                viewMode === 'table' ? (
                    <SkeletonOfferComparisonTable orientation={tableOrientation} />
                ) : (
                    <EvaluationGrid count={3}>
                        <OfferDecisionSkeleton />
                        <OfferDecisionSkeleton announceLoading={false} />
                        <OfferDecisionSkeleton announceLoading={false} />
                    </EvaluationGrid>
                )
            ) : displayedApplicationCount === 0 ? (
                <EmptyState {...emptyState} />
            ) : viewMode === 'table' ? (
                readOnly ? (
                    <>
                        {selectedFilters.includes('Evaluated Offers') && (
                            <TableComparisonSection
                                applications={evaluatedOffers}
                                description='Saved evaluations for archived applications with an active decision window.'
                                heading='Archived Evaluated Offers'
                                id='archived-evaluated-offers-heading'
                                getActions={(application) => getTableActions(application)}
                                layout='saved'
                                orientation={tableOrientation}
                            />
                        )}
                        {selectedFilters.includes('Expired Evaluated Offers') && (
                            <TableComparisonSection
                                applications={expiredEvaluatedOffers}
                                description='Archived offers whose decision deadlines have passed.'
                                heading='Archived Expired Evaluated Offers'
                                id='archived-expired-evaluated-offers-heading'
                                getActions={(application) => getTableActions(application, false, false, true)}
                                layout='saved'
                                orientation={tableOrientation}
                            />
                        )}
                        {selectedFilters.includes('Previous Evaluations') && (
                            <TableComparisonSection
                                applications={previousEvaluations}
                                description='Archived evaluations for applications that left Offer status.'
                                heading='Archived Previous Evaluations'
                                id='archived-previous-evaluations-heading'
                                getActions={(application) => getTableActions(application)}
                                layout='previous'
                                orientation={tableOrientation}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {selectedFilters.includes('Offers to Evaluate') && (
                            <TableComparisonSection
                                applications={offersToEvaluate}
                                description='Start an evaluation when you are ready. It moves after the first successful save.'
                                heading='Offers to Evaluate'
                                id='offers-to-evaluate-heading'
                                getActions={(application) => getTableActions(application)}
                                highlightedJobId={highlightedJobId}
                                layout='offersToEvaluate'
                                orientation={tableOrientation}
                            />
                        )}
                        {selectedFilters.includes('Evaluated Offers') && (
                            <TableComparisonSection
                                applications={evaluatedOffers}
                                contentBeforeGrid={
                                    robustnessOffers.length >= 2 ? (
                                        <OfferDecisionRobustnessLab applications={robustnessOffers} />
                                    ) : undefined
                                }
                                description='Sorted by the nearest decision deadline, then fit rating.'
                                heading='Evaluated Offers'
                                id='evaluated-offers-heading'
                                getActions={(application) => getTableActions(application, true, true)}
                                highlightedJobId={highlightedJobId}
                                layout='saved'
                                orientation={tableOrientation}
                            />
                        )}
                        {selectedFilters.includes('Expired Evaluated Offers') && (
                            <TableComparisonSection
                                applications={expiredEvaluatedOffers}
                                description='The decision deadline has passed. Update the evaluation if the offer is still open.'
                                heading='Expired Evaluated Offers'
                                id='expired-evaluated-offers-heading'
                                getActions={(application) => getTableActions(application, true, false, true)}
                                highlightedJobId={highlightedJobId}
                                layout='saved'
                                orientation={tableOrientation}
                            />
                        )}
                        {selectedFilters.includes('Previous Evaluations') && (
                            <TableComparisonSection
                                applications={previousEvaluations}
                                description='Review or update evaluations after an offer is accepted or declined.'
                                heading='Previous Evaluations'
                                id='previous-evaluations-heading'
                                getActions={(application) => getTableActions(application, true)}
                                highlightedJobId={highlightedJobId}
                                layout='previous'
                                orientation={tableOrientation}
                            />
                        )}
                    </>
                )
            ) : readOnly ? (
                <>
                    {selectedFilters.includes('Evaluated Offers') && (
                        <ComparisonSection
                            applications={evaluatedOffers}
                            description='Saved evaluations for archived applications with an active decision window.'
                            heading='Archived Evaluated Offers'
                            id='archived-evaluated-offers-heading'
                            renderCard={(application) => renderCard(application, false, false)}
                        />
                    )}
                    {selectedFilters.includes('Expired Evaluated Offers') && (
                        <ComparisonSection
                            applications={expiredEvaluatedOffers}
                            description='Archived offers whose decision deadlines have passed.'
                            heading='Archived Expired Evaluated Offers'
                            id='archived-expired-evaluated-offers-heading'
                            renderCard={(application) => renderCard(application, true, true)}
                        />
                    )}
                    {selectedFilters.includes('Previous Evaluations') && (
                        <ComparisonSection
                            applications={previousEvaluations}
                            description='Archived evaluations for applications that left Offer status.'
                            heading='Archived Previous Evaluations'
                            id='archived-previous-evaluations-heading'
                            renderCard={(application) => renderCard(application, false, false)}
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
                            renderCard={(application) => renderCard(application, false, false)}
                        />
                    )}
                    {selectedFilters.includes('Evaluated Offers') && (
                        <ComparisonSection
                            applications={evaluatedOffers}
                            contentBeforeGrid={
                                robustnessOffers.length >= 2 ? (
                                    <OfferDecisionRobustnessLab applications={robustnessOffers} />
                                ) : undefined
                            }
                            description='Sorted by the nearest decision deadline, then fit rating.'
                            heading='Evaluated Offers'
                            id='evaluated-offers-heading'
                            renderCard={(application) => renderCard(application, false, false, true, true)}
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
                            description='Review or update evaluations after an offer is accepted or declined.'
                            heading='Previous Evaluations'
                            id='previous-evaluations-heading'
                            renderCard={(application) => renderCard(application, false, false, true)}
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
            {evaluationDialog && drafts[evaluationDialog.application.job_id] && (
                <OfferEvaluationDialog
                    application={evaluationDialog.application}
                    errors={errors[evaluationDialog.application.job_id] ?? {}}
                    evaluation={drafts[evaluationDialog.application.job_id]}
                    expired={evaluationDialog.expired}
                    isSaving={savingJobId === evaluationDialog.application.job_id}
                    mode={evaluationDialog.mode}
                    submitOnEnterWhenUnfocused={viewMode === 'table'}
                    onCancel={() => cancelEvaluationEdit(evaluationDialog.application)}
                    onDecisionDeadlineValidityChange={(hasBadInput) =>
                        setInvalidDeadline(evaluationDialog.application.job_id, hasBadInput)
                    }
                    onDetailsChange={(details, field) => {
                        updateEvaluation(evaluationDialog.application.job_id, (evaluation) => ({
                            ...evaluation,
                            details,
                        }));
                        clearFieldError(evaluationDialog.application.job_id, field);
                    }}
                    onRatingChange={(category, value) => {
                        updateEvaluation(evaluationDialog.application.job_id, (evaluation) => ({
                            ...evaluation,
                            ratings: updateOfferDecisionValue(evaluation.ratings, category, value),
                        }));
                        clearFieldError(evaluationDialog.application.job_id, 'ratings');
                    }}
                    onSave={(badInput, refs) => void handleSave(evaluationDialog.application, badInput, refs)}
                />
            )}
        </main>
    );
};

export default OfferDecisionWorkspace;
