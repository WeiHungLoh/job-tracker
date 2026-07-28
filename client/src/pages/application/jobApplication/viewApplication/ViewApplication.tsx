import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createApplicationCsvData } from '../../../../helper/csvExport';
import { createApplicationRelationConfirmation } from '../../applicationRelationConfirmation';
import {
    createArchiveAllConfirmation,
    createDeleteAllApplicationsConfirmation,
} from '../../../../components/confirmation/bulkConfirmations';
import type { JobInterview } from '../../../interview/models';
import SkeletonCard from '../../../../components/skeletonLoader/skeletonCard/SkeletonCard';
import {
    APPLICATION_CSV_HEADERS,
    APPLICATION_BOARD_SORT_OPTIONS,
    APPLICATION_LIST_SORT_OPTIONS,
    JOB_STATUSES,
    type ApplicationBoardSortOrder,
    type ApplicationListSortOrder,
    type JobApplication,
    type JobStatus,
} from '../../models';
import { scrollAndHighlight } from '../../../../helper/highlightElement';
import { getInterviewTiming } from '../../../../helper/interviewTiming';
import styles from './ViewApplication.module.css';
import ToggleButton from '../../../../components/toggleButton/ToggleButton';
import { useConfirm } from 'material-ui-confirm';
import { useJobTrackerAPI } from '../../../../api/useJobTrackerAPI';
import { useToast } from '../../../../components/toast/ToastProvider';
import { useUserPreferences } from '../../../../components/userPreferences/UserPreferencesProvider';
import { getErrorToastMessage } from '../../../../helper/getErrorToastMessage';
import { FIELD_MAX_LENGTHS } from '../../../../helper/formValidation';
import CheckboxFilter from '../../../../components/activityControls/checkboxFilter/CheckboxFilter';
import type { UpdateUserPreferencesRequest } from '../../../../components/userPreferences/models';
import usePendingIds from '../../../../hooks/usePendingIds';
import ApplicationCard from '../../ApplicationCard';
import ActivityControls from '../../../../components/activityControls/ActivityControls';
import DisplayOptions from '../../../../components/activityControls/displayOptions/DisplayOptions';
import MoreOptions from '../../../../components/activityControls/moreOptions/MoreOptions';
import ApplicationBoard from '../applicationBoard/ApplicationBoard';
import CollectionViewToggle from '../../../../components/activityControls/collectionViewToggle/CollectionViewToggle';
import type { CollectionViewMode } from '../../../../components/activityControls/collectionViewToggle/models';
import SkeletonBoard from '../../../../components/skeletonLoader/skeletonBoard/SkeletonBoard';
import EmptyState from '../../../../components/emptyState/EmptyState';
import { routes } from '../../../../routes';
import { createApplicationEmptyState } from '../../applicationEmptyState';
import SortOptions from '../../../../components/activityControls/sortOptions/SortOptions';
import { shouldAutoScrollAfterStatusChange, sortApplications } from '../../applicationSorting';
import { getApplicationsInBoardOrder } from '../../applicationBoard/applicationBoardUtils';
import { getDashboardApplicationId, getDashboardJobStatus } from '../../../dashboard/dashboardNavigation';
import useCurrentTime from '../../../../hooks/useCurrentTime';
import useAutosaveNotes from '../../../../hooks/useAutosaveNotes';
import useFilterRequest from '../../../../hooks/useFilterRequest';

const ViewApplication = () => {
    const currentTime = useCurrentTime();
    const api = useJobTrackerAPI();
    const { preferences, updatePreferences } = useUserPreferences();
    const location = useLocation();
    const navigate = useNavigate();
    const dashboardJobStatusRef = useRef(getDashboardJobStatus(location.state));
    const dashboardApplicationIdRef = useRef(getDashboardApplicationId(location.state));
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [editingApplicationId, setEditingApplicationId] = useState<number | null>(null);
    const [editedJobStatus, setEditedJobStatus] = useState<JobStatus | null>(null);
    const [interviews, setInterviews] = useState<JobInterview[]>([]);
    const confirm = useConfirm();
    const applicationHighlightTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const showCorrespondingAppTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const updatingStatusApplicationIdRef = useRef<Set<number>>(new Set());
    const updatingPinApplicationIdRef = useRef<Set<number>>(new Set());
    const pendingApplicationActionIdsRef = useRef<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isFilteringApplications, setIsFilteringApplications] = useState<boolean>(false);
    const [pendingBulkAction, setPendingBulkAction] = useState<'archive' | 'delete' | null>(null);
    const bulkActionPendingRef = useRef(false);
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
        pendingIds: updatingStatusApplicationIds,
        startPending: startUpdatingApplicationStatus,
        stopPending: stopUpdatingApplicationStatus,
    } = usePendingIds();
    const {
        pendingIds: updatingPinApplicationIds,
        startPending: startUpdatingApplicationPin,
        stopPending: stopUpdatingApplicationPin,
    } = usePendingIds();
    const {
        pendingIds: undoingFollowUpApplicationIds,
        startPending: startUndoingFollowUp,
        stopPending: stopUndoingFollowUp,
    } = usePendingIds();
    const { showErrorToast, showSuccessToast } = useToast();
    const filterRequest = useFilterRequest<JobApplication[]>();
    const saveApplicationNotes = useCallback(
        async (jobId: number, editedNotes: string) => {
            await api.application.updateNotes({ jobId, notes: editedNotes });
            setApplications((current) =>
                current.map((application) =>
                    application.job_id === jobId ? { ...application, notes: editedNotes } : application
                )
            );
        },
        [api.application]
    );
    const handleNoteSaveError = useCallback(
        (_jobId: number, error: unknown) => {
            showErrorToast(getErrorToastMessage(error, 'Unable to save job application notes. Please try again.'));
        },
        [showErrorToast]
    );
    const notesAutosave = useAutosaveNotes({ onSaveError: handleNoteSaveError, saveNotes: saveApplicationNotes });
    const selectedJobStatuses = preferences.application_job_statuses;
    const showArchive = preferences.application_show_archive;
    const showNotes = preferences.application_show_notes;
    const isAutoScrollEnabled = preferences.application_enable_scroll;
    const viewMode = preferences.application_view_mode;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const isBoardView = viewMode === 'board';
    const currentSortOrder = isBoardView
        ? preferences.application_board_sort_order
        : preferences.application_list_sort_order;
    const displayedApplications = useMemo(
        () => sortApplications(applications, currentSortOrder),
        [applications, currentSortOrder]
    );
    const csvApplications = useMemo(
        () =>
            isBoardView
                ? getApplicationsInBoardOrder(displayedApplications, selectedJobStatuses)
                : displayedApplications,
        [displayedApplications, isBoardView, selectedJobStatuses]
    );
    const csvData = useMemo(() => createApplicationCsvData(csvApplications), [csvApplications]);

    const interviewJobIdSet = useMemo(() => new Set(interviews.map((interview) => interview.job_id)), [interviews]);

    const upcomingInterviewCountByJob = useMemo(() => {
        const counts: Record<number, number> = {};
        interviews.forEach((interview) => {
            if (getInterviewTiming(interview, currentTime).hasNotEnded) {
                counts[interview.job_id] = (counts[interview.job_id] || 0) + 1;
            }
        });
        return counts;
    }, [currentTime, interviews]);

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
        void handlePreferenceUpdate({ application_view_mode: nextViewMode });
    };

    const handleListSortOrderChange = async (sortOrder: ApplicationListSortOrder): Promise<boolean> => {
        try {
            await updatePreferences({ application_list_sort_order: sortOrder });
            return true;
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(error, 'Unable to save the application sorting preference. Please try again.')
            );
            return false;
        }
    };

    const handleBoardSortOrderChange = async (sortOrder: ApplicationBoardSortOrder): Promise<boolean> => {
        try {
            await updatePreferences({ application_board_sort_order: sortOrder });
            return true;
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(error, 'Unable to save the application sorting preference. Please try again.')
            );
            return false;
        }
    };

    const handleJobStatusChange = async (jobStatuses: JobStatus[]) => {
        const requestId = filterRequest.startRequest();
        closeStatusEditor();
        setIsFilteringApplications(true);

        try {
            const jobApplications = await api.application.listApplications({ jobStatuses });
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            await updatePreferences({ application_job_statuses: jobStatuses });
            const savedApplications = filterRequest.saveResult(
                requestId,
                Array.isArray(jobApplications) ? jobApplications : []
            );
            if (savedApplications) {
                setApplications(savedApplications);
            }

            return true;
        } catch (error) {
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            const savedApplications = filterRequest.failRequest(requestId);
            if (savedApplications) {
                setApplications(savedApplications);
            }
            showErrorToast(getErrorToastMessage(error, 'Unable to filter job applications. Please try again.'));
            return false;
        } finally {
            if (filterRequest.isLatestRequest(requestId)) {
                setIsFilteringApplications(false);
            }
        }
    };

    const handlePreferenceUpdate = async (updatedPreferences: UpdateUserPreferencesRequest): Promise<void> => {
        try {
            await updatePreferences(updatedPreferences);
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to save display preferences. Please try again.'));
        }
    };

    const handleShowNotesToggle = () => {
        const nextShowNotes = !showNotes;
        notesAutosave.setAllNotesVisibility(nextShowNotes);
        void handlePreferenceUpdate({ application_show_notes: nextShowNotes });
    };

    useEffect(() => {
        let isActive = true;

        const fetchData = async () => {
            const dashboardJobStatus = dashboardJobStatusRef.current;
            const dashboardApplicationId = dashboardApplicationIdRef.current;
            const initialJobStatuses = dashboardJobStatus ? [dashboardJobStatus] : selectedJobStatuses;

            try {
                const preferenceUpdates: UpdateUserPreferencesRequest = {};
                if (
                    dashboardJobStatus &&
                    (selectedJobStatuses.length !== 1 || selectedJobStatuses[0] !== dashboardJobStatus)
                ) {
                    preferenceUpdates.application_job_statuses = initialJobStatuses;
                }
                if (dashboardApplicationId && isBoardView) {
                    preferenceUpdates.application_view_mode = 'list';
                }
                const preferenceUpdate =
                    Object.keys(preferenceUpdates).length > 0
                        ? updatePreferences(preferenceUpdates).catch((error: unknown) => {
                              showErrorToast(
                                  getErrorToastMessage(error, 'Unable to filter job applications. Please try again.')
                              );
                          })
                        : Promise.resolve();
                const [jobApplications, jobInterviews] = await Promise.all([
                    api.application.listApplications({ jobStatuses: initialJobStatuses }),
                    api.interview.listInterviews({}),
                    preferenceUpdate,
                ]);

                if (isActive) {
                    setApplications(Array.isArray(jobApplications) ? jobApplications : []);
                    setInterviews(Array.isArray(jobInterviews) ? jobInterviews : []);
                }
            } catch (error) {
                showErrorToast(getErrorToastMessage(error, 'Unable to load job application data. Please try again.'));
            } finally {
                if (dashboardJobStatusRef.current && !dashboardApplicationIdRef.current) {
                    dashboardJobStatusRef.current = null;
                    navigate(location.pathname, { replace: true, state: null });
                }
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        void fetchData();
        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        const targetApplicationId = dashboardApplicationIdRef.current;
        if (isLoading || isBoardView || !targetApplicationId) {
            return;
        }

        if (applications.some((application) => application.job_id === targetApplicationId)) {
            scrollAndHighlight(String(targetApplicationId), styles.highlighted, showCorrespondingAppTimeout.current);
        }

        dashboardApplicationIdRef.current = null;
        dashboardJobStatusRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
    }, [applications, isBoardView, isLoading, location.pathname, navigate]);

    useEffect(() => {
        const targetApplicationId = location.hash.substring(1);
        if (isLoading || isBoardView || !targetApplicationId) {
            return;
        }

        const targetApplicationIsVisible = applications.some(
            (application) => String(application.job_id) === targetApplicationId
        );
        if (!targetApplicationIsVisible) {
            return;
        }

        scrollAndHighlight(targetApplicationId, styles.highlighted, showCorrespondingAppTimeout.current);
        // to remove the hash
        navigate(location.pathname, { replace: true });
    }, [applications, isBoardView, isLoading, location.hash, location.pathname, navigate]);

    const handleEditNotes = (jobId: number, editedNotes: string) => {
        if (editedNotes.length > FIELD_MAX_LENGTHS.notes) {
            showErrorToast(`Notes must be ${FIELD_MAX_LENGTHS.notes} characters or fewer.`);
            return;
        }

        notesAutosave.editNotes(jobId, editedNotes);
    };

    const handleApplicationAction = async (action: 'archive' | 'delete', jobId: number) => {
        if (pendingApplicationActionIdsRef.current.has(jobId)) {
            return;
        }

        pendingApplicationActionIdsRef.current.add(jobId);
        if (action === 'archive') {
            startArchivingApplication(jobId);
        } else {
            startDeletingApplication(jobId);
        }

        try {
            const summary = await api.application.getRelationSummary({ jobId });
            const { confirmed } = await confirm(
                createApplicationRelationConfirmation(
                    action,
                    'active',
                    summary.related_interview_count,
                    summary.offer_evaluation_count
                )
            );

            if (!confirmed) {
                return;
            }

            if (action === 'archive') {
                if (!(await notesAutosave.flushNote(jobId))) {
                    return;
                }
                await api.archivedApplication.archiveApplication({ jobId });
            } else {
                await api.application.deleteApplication({ jobId });
            }

            notesAutosave.clearNoteState(jobId);
            setApplications((current) => current.filter((application) => application.job_id !== jobId));
            setInterviews((current) => current.filter((interview) => interview.job_id !== jobId));
        } catch (error) {
            const fallback =
                action === 'archive'
                    ? 'Unable to archive the job application. Please try again.'
                    : 'Unable to delete the job application. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
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

    const handleUndoFollowUp = async (application: JobApplication) => {
        if (undoingFollowUpApplicationIds.has(application.job_id)) {
            return;
        }

        startUndoingFollowUp(application.job_id);
        try {
            await api.application.undoFollowUp({ jobId: application.job_id });
            setApplications((current) =>
                current.map((item) =>
                    item.job_id === application.job_id ? { ...item, application_follow_up_sent_at: null } : item
                )
            );
            showSuccessToast('Application follow-up undone.');
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to undo the application follow-up. Please try again.'));
        } finally {
            stopUndoingFollowUp(application.job_id);
        }
    };

    const handlePinToggle = async (application: JobApplication) => {
        if (updatingPinApplicationIdRef.current.has(application.job_id)) {
            return;
        }

        const shouldPin = !application.is_pinned;
        updatingPinApplicationIdRef.current.add(application.job_id);
        startUpdatingApplicationPin(application.job_id);

        try {
            const updatedPin = await api.application.updatePin({
                jobId: application.job_id,
                isPinned: shouldPin,
            });
            setApplications((current) =>
                current.map((item) =>
                    item.job_id === updatedPin.job_id ? { ...item, is_pinned: updatedPin.is_pinned } : item
                )
            );
            showSuccessToast(shouldPin ? 'Job application pinned.' : 'Job application unpinned.');

            if (isAutoScrollEnabled && viewModeRef.current === 'list') {
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
        } catch (error) {
            const fallback = shouldPin
                ? 'Unable to pin the job application. Please try again.'
                : 'Unable to unpin the job application. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
        } finally {
            updatingPinApplicationIdRef.current.delete(application.job_id);
            stopUpdatingApplicationPin(application.job_id);
        }
    };

    const handleBulkAction = async (action: 'archive' | 'delete') => {
        if (bulkActionPendingRef.current) {
            return;
        }

        bulkActionPendingRef.current = true;
        setPendingBulkAction(action);
        let countsLoaded = false;

        try {
            const summary = await api.application.getSummary();
            countsLoaded = true;

            if (summary.application_count === 0) {
                notesAutosave.clearAllNoteStates();
                setApplications([]);
                setInterviews([]);
                return;
            }

            const confirmation =
                action === 'archive'
                    ? createArchiveAllConfirmation(
                          summary.application_count,
                          summary.related_interview_count,
                          summary.offer_evaluation_count
                      )
                    : createDeleteAllApplicationsConfirmation(
                          summary.application_count,
                          summary.related_interview_count,
                          summary.offer_evaluation_count,
                          'active'
                      );
            const { confirmed } = await confirm(confirmation);

            if (!confirmed) {
                return;
            }

            if (action === 'archive') {
                if (!(await notesAutosave.flushAllNotes())) {
                    return;
                }
                await api.archivedApplication.archiveAllApplications();
            } else {
                await api.application.deleteAllApplications();
            }

            notesAutosave.clearAllNoteStates();
            setApplications([]);
            setInterviews([]);
        } catch (error) {
            const fallback = !countsLoaded
                ? 'Unable to load active application counts. Please try again.'
                : action === 'archive'
                ? 'Unable to archive job applications. Please try again.'
                : 'Unable to delete job applications. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
        } finally {
            bulkActionPendingRef.current = false;
            setPendingBulkAction(null);
        }
    };

    const handleStatusEditorToggle = async (application: JobApplication) => {
        if (updatingStatusApplicationIdRef.current.has(application.job_id)) {
            return;
        }

        const isEditing = editingApplicationId === application.job_id;

        if (!isEditing) {
            setEditingApplicationId(application.job_id);
            setEditedJobStatus(application.job_status);
            return;
        }

        const newStatus = editedJobStatus ?? application.job_status;
        const oldStatus = application.job_status;
        const statusChanged = newStatus !== oldStatus;
        const statusRemainsVisible = selectedJobStatuses.includes(newStatus);

        if (!statusChanged) {
            closeStatusEditor();
            return;
        }

        updatingStatusApplicationIdRef.current.add(application.job_id);
        startUpdatingApplicationStatus(application.job_id);
        try {
            await api.application.updateStatus({
                jobId: application.job_id,
                jobStatus: newStatus,
            });

            closeStatusEditor();
            setApplications((current) =>
                current
                    .map((item) =>
                        item.job_id === application.job_id
                            ? {
                                  ...item,
                                  job_status: newStatus,
                                  application_follow_up_sent_at:
                                      newStatus === 'Applied' ? item.application_follow_up_sent_at ?? null : null,
                              }
                            : item
                    )
                    .filter((item) => selectedJobStatuses.includes(item.job_status))
            );

            if (
                shouldAutoScrollAfterStatusChange(isAutoScrollEnabled, preferences.application_list_sort_order) &&
                statusRemainsVisible
            ) {
                setTimeout(() => {
                    scrollAndHighlight(
                        String(application.job_id),
                        styles.highlighted,
                        applicationHighlightTimeout.current
                    );
                }, 100);
            }
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(error, 'Unable to update the job application status. Please try again.')
            );
        } finally {
            updatingStatusApplicationIdRef.current.delete(application.job_id);
            stopUpdatingApplicationStatus(application.job_id);
        }
    };

    const updateApplicationStatusFromBoard = async (application: JobApplication, newStatus: JobStatus) => {
        const oldStatus = application.job_status;

        if (newStatus === oldStatus || updatingStatusApplicationIdRef.current.has(application.job_id)) {
            return;
        }

        updatingStatusApplicationIdRef.current.add(application.job_id);
        startUpdatingApplicationStatus(application.job_id);
        setApplications((current) =>
            current
                .map((item) =>
                    item.job_id === application.job_id
                        ? {
                              ...item,
                              job_status: newStatus,
                              application_follow_up_sent_at:
                                  newStatus === 'Applied' ? item.application_follow_up_sent_at ?? null : null,
                          }
                        : item
                )
                .filter((item) => selectedJobStatuses.includes(item.job_status))
        );

        try {
            await api.application.updateStatus({
                jobId: application.job_id,
                jobStatus: newStatus,
            });
        } catch (error) {
            setApplications((current) => {
                const applicationStillVisible = current.some((item) => item.job_id === application.job_id);
                const restoredApplications = applicationStillVisible
                    ? current.map((item) => (item.job_id === application.job_id ? application : item))
                    : [...current, application];

                return restoredApplications;
            });
            showErrorToast(
                getErrorToastMessage(error, 'Unable to update the job application status. Please try again.')
            );
        } finally {
            updatingStatusApplicationIdRef.current.delete(application.job_id);
            stopUpdatingApplicationStatus(application.job_id);
        }
    };

    const hasApplications = applications.length > 0;
    const filtersAreActive = selectedJobStatuses.length !== JOB_STATUSES.length;
    const emptyState = createApplicationEmptyState({
        actionRoute: routes.addApplication,
        filtersAreActive,
        onClearFilters: () => void handleJobStatusChange([...JOB_STATUSES]),
        variant: 'active',
    });

    return (
        <div className={`${styles.applicationList} ${isBoardView ? styles.boardLayout : ''}`}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        !isLoading && hasApplications ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename='job_applications.csv'
                                csvHeaders={APPLICATION_CSV_HEADERS}
                                deleteLabel='Delete all applications'
                                id='application-more-options'
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
                    ariaLabel='Application view and management controls'
                    mobileLayout={isBoardView || !hasApplications ? 'applicationCompact' : 'applicationWithDisplay'}
                >
                    <CollectionViewToggle
                        ariaLabel='Application view'
                        currentView={viewMode}
                        onViewChange={handleViewModeChange}
                    />
                    <CheckboxFilter
                        buttonLabel='Filter by'
                        disabled={isLoading}
                        id='application-job-status-filter'
                        onSelectionChange={handleJobStatusChange}
                        options={JOB_STATUSES}
                        selectedOptions={selectedJobStatuses}
                    />
                    {hasApplications &&
                        (isBoardView ? (
                            <SortOptions
                                disabled={isLoading}
                                id='application-board-sort-options'
                                onSelectionChange={handleBoardSortOrderChange}
                                options={APPLICATION_BOARD_SORT_OPTIONS}
                                selectedOption={preferences.application_board_sort_order}
                            />
                        ) : (
                            <SortOptions
                                disabled={isLoading}
                                id='application-list-sort-options'
                                onSelectionChange={handleListSortOrderChange}
                                options={APPLICATION_LIST_SORT_OPTIONS}
                                selectedOption={preferences.application_list_sort_order}
                            />
                        ))}
                    {hasApplications && !isBoardView && (
                        <DisplayOptions id='application-display-options'>
                            <ToggleButton toggled={showNotes} onToggle={handleShowNotesToggle} label='Show notes' />
                            <ToggleButton
                                toggled={showArchive}
                                onToggle={() =>
                                    void handlePreferenceUpdate({
                                        application_show_archive: !showArchive,
                                    })
                                }
                                label='Show archive'
                            />
                            <ToggleButton
                                toggled={isAutoScrollEnabled}
                                onToggle={() =>
                                    void handlePreferenceUpdate({
                                        application_enable_scroll: !isAutoScrollEnabled,
                                    })
                                }
                                label='Auto-scroll to updated items'
                            />
                        </DisplayOptions>
                    )}
                </ActivityControls>
            </div>

            {(isLoading || isFilteringApplications) && !isBoardView && (
                <>
                    <SkeletonCard variant='application' />
                    <SkeletonCard variant='application' />
                </>
            )}

            {(isLoading || isFilteringApplications) && isBoardView && <SkeletonBoard />}

            {!isLoading && !isFilteringApplications && (
                <>
                    {!hasApplications && <EmptyState {...emptyState} />}

                    {hasApplications && isBoardView && (
                        <ApplicationBoard
                            applications={displayedApplications}
                            deletingApplicationIds={deletingApplicationIds}
                            editedNotes={notesAutosave.draftNotes}
                            hasInterview={(jobId) => interviewJobIdSet.has(jobId)}
                            hasOfferEvaluation={(jobId) =>
                                Boolean(
                                    applications.find((application) => application.job_id === jobId)
                                        ?.has_offer_evaluation
                                )
                            }
                            isArchivingApplication={(jobId) =>
                                pendingBulkAction === 'archive' || archivingApplicationIds.has(jobId)
                            }
                            isUpdatingApplicationPin={(jobId) => updatingPinApplicationIds.has(jobId)}
                            isUpdatingApplicationStatus={(jobId) => updatingStatusApplicationIds.has(jobId)}
                            isUndoingApplicationFollowUp={(jobId) => undoingFollowUpApplicationIds.has(jobId)}
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
                        displayedApplications.map((application, index) => (
                            <ApplicationCard
                                application={application}
                                editedJobStatus={
                                    editingApplicationId === application.job_id && editedJobStatus
                                        ? editedJobStatus
                                        : application.job_status
                                }
                                hasInterview={interviewJobIdSet.has(application.job_id)}
                                hasOfferEvaluation={Boolean(application.has_offer_evaluation)}
                                index={index}
                                isArchiving={
                                    pendingBulkAction === 'archive' || archivingApplicationIds.has(application.job_id)
                                }
                                isDeleting={deletingApplicationIds.has(application.job_id)}
                                isEditingStatus={editingApplicationId === application.job_id}
                                isUpdatingPin={updatingPinApplicationIds.has(application.job_id)}
                                isUpdatingStatus={updatingStatusApplicationIds.has(application.job_id)}
                                isUndoingFollowUp={undoingFollowUpApplicationIds.has(application.job_id)}
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
                </>
            )}
        </div>
    );
};

export default ViewApplication;
