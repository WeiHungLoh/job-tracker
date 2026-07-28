import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createApplicationCsvData } from '../../../../../helper/csvExport';
import { createApplicationRelationConfirmation } from '../../../../application/applicationRelationConfirmation';
import {
    createArchiveAllConfirmation,
    createDeleteAllApplicationsConfirmation,
} from '../../../../../components/confirmation/bulkConfirmations';
import {
    APPLICATION_BOARD_SORT_OPTIONS,
    APPLICATION_CSV_HEADERS,
    APPLICATION_LIST_SORT_OPTIONS,
    JOB_STATUSES,
    type ApplicationBoardSortOrder,
    type ApplicationListSortOrder,
    type JobApplication,
    type JobStatus,
} from '../../../../application/models';
import { scrollAndHighlight } from '../../../../../helper/highlightElement';
import ToggleButton from '../../../../../components/toggleButton/ToggleButton';
import { useConfirm } from 'material-ui-confirm';
import { useDemo } from '../../../context/DemoContext';
import { useToast } from '../../../../../components/toast/ToastProvider';
import { useUserPreferences } from '../../../../../components/userPreferences/UserPreferencesProvider';
import { FIELD_MAX_LENGTHS } from '../../../../../helper/formValidation';
import ActivityControls from '../../../../../components/activityControls/ActivityControls';
import CheckboxFilter from '../../../../../components/activityControls/checkboxFilter/CheckboxFilter';
import DisplayOptions from '../../../../../components/activityControls/displayOptions/DisplayOptions';
import MoreOptions from '../../../../../components/activityControls/moreOptions/MoreOptions';
import SortOptions from '../../../../../components/activityControls/sortOptions/SortOptions';
import ApplicationBoard from '../../../../application/jobApplication/applicationBoard/ApplicationBoard';
import DemoApplicationCard from '../../DemoApplicationCard';
import CollectionViewToggle from '../../../../../components/activityControls/collectionViewToggle/CollectionViewToggle';
import type { CollectionViewMode } from '../../../../../components/activityControls/collectionViewToggle/models';
import {
    selectApplications,
    selectInterviewJobIdSet,
    selectUpcomingInterviewCountByJob,
} from '../../../state/demoSelectors';
import styles from './DemoViewApplication.module.css';
import { useDemoHashHighlight } from '../../../hooks/useDemoHashHighlight';
import EmptyState from '../../../../../components/emptyState/EmptyState';
import { routes } from '../../../../../routes';
import { createApplicationEmptyState } from '../../../../application/applicationEmptyState';
import { getApplicationsInBoardOrder } from '../../../../application/applicationBoard/applicationBoardUtils';
import { getDashboardApplicationId, getDashboardJobStatus } from '../../../../dashboard/dashboardNavigation';
import useCurrentTime from '../../../../../hooks/useCurrentTime';
import { shouldAutoScrollAfterStatusChange } from '../../../../application/applicationSorting';
import usePendingIds from '../../../../../hooks/usePendingIds';
import useAutosaveNotes from '../../../../../hooks/useAutosaveNotes';

const isDemoApplicationStatusUpdating = () => false;

const DemoViewApplication = () => {
    const currentTime = useCurrentTime();
    const { dispatch, state } = useDemo();
    const { preferences, updatePreferences } = useUserPreferences();
    const location = useLocation();
    const navigate = useNavigate();
    const dashboardJobStatusRef = useRef(getDashboardJobStatus(location.state));
    const dashboardApplicationIdRef = useRef(getDashboardApplicationId(location.state));
    const [editingApplicationId, setEditingApplicationId] = useState<number | null>(null);
    const [editedJobStatus, setEditedJobStatus] = useState<JobStatus | null>(null);
    const confirm = useConfirm();
    const applicationHighlightTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const showCorrespondingAppTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const { showErrorToast, showSuccessToast } = useToast();
    const saveApplicationNotes = useCallback(
        (jobId: number, notes: string) => {
            dispatch({ type: 'UPDATE_APPLICATION_NOTES', payload: { jobId, notes } });
            return Promise.resolve();
        },
        [dispatch]
    );
    const notesAutosave = useAutosaveNotes({ saveNotes: saveApplicationNotes });
    const [pendingBulkAction, setPendingBulkAction] = useState<'archive' | 'delete' | null>(null);
    const bulkActionPendingRef = useRef(false);
    const pendingApplicationActionIdsRef = useRef<Set<number>>(new Set());
    const updatingPinApplicationIdRef = useRef<Set<number>>(new Set());
    const {
        pendingIds: deletingApplicationIds,
        startPending: startDeletingApplication,
        stopPending: stopDeletingApplication,
    } = usePendingIds();
    const {
        pendingIds: archivingApplicationIds,
        startPending: startArchivingApplication,
        stopPending: stopArchivingApplication,
    } = usePendingIds();
    const {
        pendingIds: updatingPinApplicationIds,
        startPending: startUpdatingApplicationPin,
        stopPending: stopUpdatingApplicationPin,
    } = usePendingIds();
    const applications = useMemo(() => selectApplications(state), [state]);
    const interviewJobIdSet = useMemo(() => selectInterviewJobIdSet(state), [state]);
    const upcomingInterviewCountByJob = useMemo(
        () => selectUpcomingInterviewCountByJob(state, currentTime),
        [currentTime, state]
    );
    const selectedJobStatuses = preferences.application_job_statuses;
    const showArchive = preferences.application_show_archive;
    const showNotes = preferences.application_show_notes;
    const enableScroll = preferences.application_enable_scroll;
    const viewMode = preferences.application_view_mode;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const isBoardView = viewMode === 'board';
    const csvApplications = isBoardView ? getApplicationsInBoardOrder(applications, selectedJobStatuses) : applications;
    const csvData = createApplicationCsvData(csvApplications);
    const visibleApplicationIds = useMemo(
        () => applications.map((application) => String(application.job_id)),
        [applications]
    );

    useDemoHashHighlight({
        disabled: isBoardView,
        highlightClass: styles.highlighted,
        timeouts: showCorrespondingAppTimeout.current,
        visibleIds: visibleApplicationIds,
    });

    useEffect(() => {
        const dashboardJobStatus = dashboardJobStatusRef.current;
        if (!dashboardJobStatus) {
            return;
        }

        dashboardJobStatusRef.current = null;
        const preferenceUpdates: {
            application_job_statuses?: JobStatus[];
            application_view_mode?: CollectionViewMode;
        } = {};
        if (selectedJobStatuses.length !== 1 || selectedJobStatuses[0] !== dashboardJobStatus) {
            preferenceUpdates.application_job_statuses = [dashboardJobStatus];
        }
        if (dashboardApplicationIdRef.current && isBoardView) {
            preferenceUpdates.application_view_mode = 'list';
        }
        if (Object.keys(preferenceUpdates).length > 0) {
            void updatePreferences(preferenceUpdates);
        }
        if (!dashboardApplicationIdRef.current) {
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [isBoardView, location.pathname, navigate, selectedJobStatuses, updatePreferences]);

    useEffect(() => {
        const targetApplicationId = dashboardApplicationIdRef.current;
        if (isBoardView || !targetApplicationId) {
            return;
        }

        if (visibleApplicationIds.includes(String(targetApplicationId))) {
            scrollAndHighlight(String(targetApplicationId), styles.highlighted, showCorrespondingAppTimeout.current);
        }

        dashboardApplicationIdRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
    }, [isBoardView, location.pathname, navigate, visibleApplicationIds]);

    const closeStatusEditor = () => {
        setEditingApplicationId(null);
        setEditedJobStatus(null);
    };

    const handleViewModeChange = (nextViewMode: CollectionViewMode) => {
        if (nextViewMode === 'board') {
            closeStatusEditor();
            notesAutosave.setAllNotesVisibility(false);
        } else if (showNotes) {
            notesAutosave.setAllNotesVisibility(true);
        }
        void updatePreferences({ application_view_mode: nextViewMode });
    };

    const handleJobStatusChange = async (jobStatuses: JobStatus[]) => {
        closeStatusEditor();
        await updatePreferences({ application_job_statuses: jobStatuses });
        return true;
    };

    const handleListSortOrderChange = async (sortOrder: ApplicationListSortOrder) => {
        await updatePreferences({ application_list_sort_order: sortOrder });
        return true;
    };

    const handleBoardSortOrderChange = async (sortOrder: ApplicationBoardSortOrder) => {
        await updatePreferences({ application_board_sort_order: sortOrder });
        return true;
    };

    const handleShowNotesToggle = () => {
        const nextShowNotes = !showNotes;
        notesAutosave.setAllNotesVisibility(nextShowNotes);
        void updatePreferences({ application_show_notes: nextShowNotes });
    };

    const handleEditNotes = (jobId: number, editedNotes: string) => {
        if (editedNotes.length > FIELD_MAX_LENGTHS.notes) {
            showErrorToast(`Notes must be ${FIELD_MAX_LENGTHS.notes} characters or fewer.`);
            return;
        }

        notesAutosave.editNotes(jobId, editedNotes);
    };

    const handleApplicationAction = async (action: 'archive' | 'delete', jobId: number) => {
        if (
            pendingApplicationActionIdsRef.current.has(jobId) ||
            !state.applications.some((application) => application.job_id === jobId)
        ) {
            return;
        }

        pendingApplicationActionIdsRef.current.add(jobId);
        if (action === 'archive') {
            startArchivingApplication(jobId);
        } else {
            startDeletingApplication(jobId);
        }

        try {
            const relatedInterviewCount = state.interviews.filter((interview) => interview.job_id === jobId).length;
            const offerEvaluationCount = state.offerEvaluations[jobId] ? 1 : 0;
            const confirmationResult = await confirm(
                createApplicationRelationConfirmation(action, 'active', relatedInterviewCount, offerEvaluationCount)
            );

            if (!confirmationResult?.confirmed) {
                return;
            }

            if (action === 'archive' && !(await notesAutosave.flushNote(jobId))) {
                return;
            }

            dispatch({
                type: action === 'archive' ? 'ARCHIVE_APPLICATION' : 'DELETE_APPLICATION',
                payload: { jobId },
            });
            notesAutosave.clearNoteState(jobId);
        } finally {
            pendingApplicationActionIdsRef.current.delete(jobId);
            if (action === 'archive') {
                stopArchivingApplication(jobId);
            } else {
                stopDeletingApplication(jobId);
            }
        }
    };

    const handleDelete = (jobId: number) => handleApplicationAction('delete', jobId);
    const handleArchive = (jobId: number) => handleApplicationAction('archive', jobId);

    const handleBulkAction = async (action: 'archive' | 'delete') => {
        if (bulkActionPendingRef.current) {
            return;
        }

        bulkActionPendingRef.current = true;
        setPendingBulkAction(action);
        const applicationIds = new Set(state.applications.map((application) => application.job_id));
        const interviewCount = state.interviews.filter((interview) => applicationIds.has(interview.job_id)).length;
        const offerEvaluationCount = state.applications.filter(
            (application) => state.offerEvaluations[application.job_id]
        ).length;

        try {
            if (state.applications.length === 0) {
                return;
            }

            const confirmation =
                action === 'archive'
                    ? createArchiveAllConfirmation(state.applications.length, interviewCount, offerEvaluationCount)
                    : createDeleteAllApplicationsConfirmation(
                          state.applications.length,
                          interviewCount,
                          offerEvaluationCount,
                          'active'
                      );
            const { confirmed } = await confirm(confirmation);

            if (!confirmed) {
                return;
            }

            if (action === 'archive' && !(await notesAutosave.flushAllNotes())) {
                return;
            }

            dispatch({ type: action === 'archive' ? 'ARCHIVE_ALL_APPLICATIONS' : 'DELETE_ALL_APPLICATIONS' });
            notesAutosave.clearAllNoteStates();
        } finally {
            bulkActionPendingRef.current = false;
            setPendingBulkAction(null);
        }
    };

    const handleStatusEditorToggle = (application: JobApplication) => {
        const isEditing = editingApplicationId === application.job_id;

        if (!isEditing) {
            setEditingApplicationId(application.job_id);
            setEditedJobStatus(application.job_status);
            return;
        }

        const newStatus = editedJobStatus ?? application.job_status;
        const statusChanged = newStatus !== application.job_status;

        closeStatusEditor();
        if (!statusChanged) {
            return;
        }

        dispatch({
            type: 'UPDATE_APPLICATION_STATUS',
            payload: {
                jobId: application.job_id,
                jobStatus: newStatus,
            },
        });

        if (shouldAutoScrollAfterStatusChange(enableScroll, preferences.application_list_sort_order)) {
            setTimeout(() => {
                scrollAndHighlight(String(application.job_id), styles.highlighted, applicationHighlightTimeout.current);
            }, 100);
        }
    };

    const updateApplicationStatusFromBoard = (application: JobApplication, newStatus: JobStatus) => {
        if (newStatus === application.job_status) {
            return;
        }

        dispatch({
            type: 'UPDATE_APPLICATION_STATUS',
            payload: { jobId: application.job_id, jobStatus: newStatus },
        });
    };

    const handleUndoFollowUp = (application: JobApplication) => {
        dispatch({ type: 'UNDO_APPLICATION_FOLLOW_UP', payload: { jobId: application.job_id } });
        showSuccessToast('Application follow-up undone.');
    };

    const handlePinToggle = async (application: JobApplication) => {
        if (updatingPinApplicationIdRef.current.has(application.job_id)) {
            return;
        }

        const isPinned = !application.is_pinned;
        updatingPinApplicationIdRef.current.add(application.job_id);
        startUpdatingApplicationPin(application.job_id);

        try {
            await Promise.resolve();
            dispatch({
                type: 'UPDATE_APPLICATION_PIN',
                payload: { jobId: application.job_id, isPinned },
            });
            showSuccessToast(isPinned ? 'Job application pinned.' : 'Job application unpinned.');

            if (enableScroll && viewModeRef.current === 'list') {
                setTimeout(() => {
                    if (viewModeRef.current === 'list') {
                        scrollAndHighlight(
                            String(application.job_id),
                            styles.highlighted,
                            applicationHighlightTimeout.current
                        );
                    }
                }, 100);
            }
        } finally {
            updatingPinApplicationIdRef.current.delete(application.job_id);
            stopUpdatingApplicationPin(application.job_id);
        }
    };

    const hasApplications = applications.length > 0;
    const filtersAreActive = selectedJobStatuses.length !== JOB_STATUSES.length;
    const emptyState = createApplicationEmptyState({
        actionRoute: routes.demoAddApplication,
        filtersAreActive,
        onClearFilters: () => void handleJobStatusChange([...JOB_STATUSES]),
        variant: 'active',
    });

    return (
        <div className={`${styles.applicationList} ${isBoardView ? styles.boardLayout : ''}`}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        hasApplications ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename='demo_job_applications.csv'
                                csvHeaders={APPLICATION_CSV_HEADERS}
                                deleteLabel='Delete all applications'
                                id='demo-application-more-options'
                                deleteDisabled={pendingBulkAction === 'archive'}
                                isDeleting={pendingBulkAction === 'delete'}
                                middleAction={{
                                    disabled: pendingBulkAction === 'delete',
                                    icon: 'archive',
                                    isLoading: pendingBulkAction === 'archive',
                                    label: 'Archive all applications',
                                    onClick: () => void handleBulkAction('archive'),
                                }}
                                onDelete={() => void handleBulkAction('delete')}
                            />
                        ) : undefined
                    }
                    ariaLabel='Demo application view and management controls'
                    mobileLayout={isBoardView || !hasApplications ? 'applicationCompact' : 'applicationWithDisplay'}
                >
                    <CollectionViewToggle
                        ariaLabel='Application view'
                        currentView={viewMode}
                        onViewChange={handleViewModeChange}
                    />
                    <CheckboxFilter
                        buttonLabel='Filter by'
                        id='demo-application-job-status-filter'
                        onSelectionChange={handleJobStatusChange}
                        options={JOB_STATUSES}
                        selectedOptions={selectedJobStatuses}
                    />
                    {hasApplications &&
                        (isBoardView ? (
                            <SortOptions
                                id='demo-application-board-sort-options'
                                onSelectionChange={handleBoardSortOrderChange}
                                options={APPLICATION_BOARD_SORT_OPTIONS}
                                selectedOption={preferences.application_board_sort_order}
                            />
                        ) : (
                            <SortOptions
                                id='demo-application-list-sort-options'
                                onSelectionChange={handleListSortOrderChange}
                                options={APPLICATION_LIST_SORT_OPTIONS}
                                selectedOption={preferences.application_list_sort_order}
                            />
                        ))}
                    {hasApplications && !isBoardView && (
                        <DisplayOptions id='demo-application-display-options'>
                            <ToggleButton toggled={showNotes} onToggle={handleShowNotesToggle} label='Show notes' />
                            <ToggleButton
                                toggled={showArchive}
                                onToggle={() =>
                                    void updatePreferences({
                                        application_show_archive: !showArchive,
                                    })
                                }
                                label='Show archive'
                            />
                            <ToggleButton
                                toggled={enableScroll}
                                onToggle={() =>
                                    void updatePreferences({
                                        application_enable_scroll: !enableScroll,
                                    })
                                }
                                label='Auto scroll after application moves'
                            />
                        </DisplayOptions>
                    )}
                </ActivityControls>
            </div>

            {!hasApplications && <EmptyState {...emptyState} />}

            {hasApplications && isBoardView && (
                <ApplicationBoard
                    applications={applications}
                    deletingApplicationIds={deletingApplicationIds}
                    editedNotes={notesAutosave.draftNotes}
                    hasInterview={(jobId) => interviewJobIdSet.has(jobId)}
                    hasOfferEvaluation={(jobId) => Boolean(state.offerEvaluations[jobId])}
                    isArchivingApplication={(jobId) =>
                        pendingBulkAction === 'archive' || archivingApplicationIds.has(jobId)
                    }
                    isUpdatingApplicationPin={(jobId) => updatingPinApplicationIds.has(jobId)}
                    isUpdatingApplicationStatus={isDemoApplicationStatusUpdating}
                    isUndoingApplicationFollowUp={() => false}
                    noteSaveStatuses={notesAutosave.noteSaveStatuses}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onEditNotes={handleEditNotes}
                    onNotesBlur={notesAutosave.flushNote}
                    onNotesVisibilityChange={notesAutosave.setNoteVisibility}
                    onPinToggle={handlePinToggle}
                    onRetryNotes={notesAutosave.retryNotes}
                    onStatusChange={updateApplicationStatusFromBoard}
                    onUndoFollowUp={handleUndoFollowUp}
                    selectedJobStatuses={selectedJobStatuses}
                    upcomingInterviewCountByJob={upcomingInterviewCountByJob}
                />
            )}

            {!isBoardView &&
                applications.map((application, index) => (
                    <DemoApplicationCard
                        application={application}
                        editedJobStatus={
                            editingApplicationId === application.job_id && editedJobStatus
                                ? editedJobStatus
                                : application.job_status
                        }
                        hasInterview={interviewJobIdSet.has(application.job_id)}
                        hasOfferEvaluation={Boolean(state.offerEvaluations[application.job_id])}
                        index={index}
                        isArchiving={pendingBulkAction === 'archive' || archivingApplicationIds.has(application.job_id)}
                        isDeleting={deletingApplicationIds.has(application.job_id)}
                        isEditingStatus={editingApplicationId === application.job_id}
                        isUpdatingPin={updatingPinApplicationIds.has(application.job_id)}
                        isUndoingFollowUp={false}
                        key={application.job_id}
                        note={notesAutosave.draftNotes[application.job_id] ?? application.notes}
                        noteSaveStatus={notesAutosave.noteSaveStatuses[application.job_id] ?? 'idle'}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onEditNotes={handleEditNotes}
                        onNotesBlur={notesAutosave.flushNote}
                        onRetryNotes={notesAutosave.retryNotes}
                        onJobStatusChange={setEditedJobStatus}
                        onPinToggle={handlePinToggle}
                        onToggleStatusEditor={handleStatusEditorToggle}
                        onUndoFollowUp={handleUndoFollowUp}
                        showArchive={showArchive}
                        showNotes={showNotes}
                        upcomingInterviewCount={upcomingInterviewCountByJob[application.job_id] ?? 0}
                        variant='job'
                    />
                ))}
        </div>
    );
};

export default DemoViewApplication;
