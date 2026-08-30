import { useLocation, useNavigate } from 'react-router-dom';
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createInterviewCsvData } from '../../../../helper/csvExport';
import { createDeleteConfirmation } from '../../../../components/confirmation/deleteConfirmation';
import { createDeleteAllInterviewsConfirmation } from '../../../../components/confirmation/bulkConfirmations';
import { INTERVIEW_CSV_HEADERS, type JobInterview } from '../../models';
import SkeletonCard from '../../../../components/skeletonLoader/skeletonCard/SkeletonCard';
import { routes } from '../../../../routes';
import styles from '../../InterviewListPage.module.css';
import { useConfirm } from 'material-ui-confirm';
import { useJobTrackerAPI } from '../../../../api/useJobTrackerAPI';
import { isAbortError } from '../../../../api/api';
import { useToast } from '../../../../components/toast/ToastProvider';
import { useUserPreferences } from '../../../../components/userPreferences/UserPreferencesProvider';
import { getErrorToastMessage } from '../../../../helper/getErrorToastMessage';
import usePendingIds from '../../../../hooks/usePendingIds';
import InterviewCard from '../../InterviewCard';
import ActivityControls from '../../../../components/activityControls/ActivityControls';
import MoreOptions from '../../../../components/activityControls/moreOptions/MoreOptions';
import EmptyState from '../../../../components/emptyState/EmptyState';
import { createInterviewEmptyState } from '../../interviewEmptyState';
import CollectionViewToggle from '../../../../components/activityControls/collectionViewToggle/CollectionViewToggle';
import type { CollectionViewMode } from '../../../../components/activityControls/collectionViewToggle/models';
import SkeletonInterviewBoard from '../../../../components/skeletonLoader/skeletonInterviewBoard/SkeletonInterviewBoard';
import InterviewGrid from '../../interviewGrid/InterviewGrid';
import { getDashboardInterviewId } from '../../../dashboard/dashboardNavigation';
import { scrollAndHighlight } from '../../../../helper/highlightElement';
import CheckboxFilter from '../../../../components/activityControls/checkboxFilter/CheckboxFilter';
import {
    filterAndSortInterviews,
    INTERVIEW_TIME_FILTERS,
    type InterviewTimeFilter,
} from '../../../../helper/interviewTiming';
import { useBulkInterviewCalendarExport } from '../../calendarOptions/useBulkInterviewCalendarExport';
import useCurrentTime from '../../../../hooks/useCurrentTime';
import useFilterRequest from '../../../../hooks/useFilterRequest';
import type { ApplicationCollectionNavigationState } from '../../../application/applicationNavigation';
import useAutosaveNotes from '../../../../hooks/useAutosaveNotes';
import { FIELD_MAX_LENGTHS } from '../../../../helper/formValidation';
import DisplayOptions from '../../../../components/activityControls/displayOptions/DisplayOptions';
import ToggleButton from '../../../../components/toggleButton/ToggleButton';

const ViewInterview = () => {
    const api = useJobTrackerAPI();
    const currentTime = useCurrentTime();
    const { preferences, updatePreferences } = useUserPreferences();
    const [interviews, setInterviews] = useState<JobInterview[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isFilteringInterviews, setIsFilteringInterviews] = useState<boolean>(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const deleteAllPendingRef = useRef(false);
    const location = useLocation();
    const dashboardInterviewIdRef = useRef(getDashboardInterviewId(location.state));
    const dashboardInterviewsRef = useRef<JobInterview[] | null>(null);
    const dashboardInterviewRequestSettledRef = useRef(false);
    const dashboardViewUpdatePendingRef = useRef(false);
    const dashboardViewUpdateFailedRef = useRef(false);
    const interviewHighlightTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const {
        pendingIds: deletingInterviewIds,
        startPending: startDeletingInterview,
        stopPending: stopDeletingInterview,
    } = usePendingIds();
    const {
        pendingIds: undoingFollowUpInterviewIds,
        startPending: startUndoingFollowUp,
        stopPending: stopUndoingFollowUp,
    } = usePendingIds();
    const {
        pendingIds: pinningInterviewIds,
        startPending: startPinningInterview,
        stopPending: stopPinningInterview,
    } = usePendingIds();
    const confirm = useConfirm();
    const navigate = useNavigate();
    const { showErrorToast, showSuccessToast } = useToast();
    const filterRequest = useFilterRequest<JobInterview[]>();
    const saveInterviewNotes = useCallback(
        async (interviewId: number, editedNotes: string) => {
            await api.interview.updateNotes({ interviewId, notes: editedNotes });
            const updateNotes = (interview: JobInterview): JobInterview =>
                interview.interview_id === interviewId
                    ? { ...interview, interview_notes: editedNotes.trim() }
                    : interview;
            setInterviews((current) => current.map(updateNotes));
        },
        [api.interview]
    );
    const handleNoteSaveError = useCallback(
        (_interviewId: number, error: unknown) => {
            showErrorToast(getErrorToastMessage(error, 'Unable to save interview notes. Please try again.'));
        },
        [showErrorToast]
    );
    const notesAutosave = useAutosaveNotes({ onSaveError: handleNoteSaveError, saveNotes: saveInterviewNotes });
    const viewMode = preferences.interview_view_mode;
    const showNotes = preferences.interview_show_notes;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const isAutoScrollEnabled = preferences.application_enable_scroll;
    const isAutoScrollEnabledRef = useRef(isAutoScrollEnabled);
    isAutoScrollEnabledRef.current = isAutoScrollEnabled;
    const selectedTimeFilters = preferences.interview_time_filters;
    const isBoardView = viewMode === 'board';
    const displayedInterviews = useMemo(
        () => filterAndSortInterviews(interviews, selectedTimeFilters, currentTime),
        [currentTime, interviews, selectedTimeFilters]
    );
    const csvData = useMemo(() => createInterviewCsvData(displayedInterviews), [displayedInterviews]);
    const { exportUpcomingInterviews, upcomingInterviewCount } = useBulkInterviewCalendarExport(
        interviews,
        currentTime
    );

    const handleViewModeChange = async (nextViewMode: CollectionViewMode) => {
        notesAutosave.setAllNotesVisibility(nextViewMode === 'list' && showNotes);
        try {
            await updatePreferences({ interview_view_mode: nextViewMode });
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to save display preferences. Please try again.'));
        }
    };

    const handleShowNotesToggle = () => {
        const nextShowNotes = !showNotes;
        notesAutosave.setAllNotesVisibility(nextShowNotes);
        void updatePreferences({ interview_show_notes: nextShowNotes }).catch((error: unknown) => {
            showErrorToast(getErrorToastMessage(error, 'Unable to save display preferences. Please try again.'));
        });
    };

    const handleEditNotes = (interviewId: number, editedNotes: string) => {
        if (editedNotes.length > FIELD_MAX_LENGTHS.notes) {
            showErrorToast(`Notes must be ${FIELD_MAX_LENGTHS.notes} characters or fewer.`);
            return;
        }

        notesAutosave.editNotes(interviewId, editedNotes);
    };

    const handleTimeFilterChange = async (timeFilters: InterviewTimeFilter[]) => {
        const requestId = filterRequest.startRequest();
        setIsFilteringInterviews(true);

        try {
            const fetchedInterviews = await api.interview.listInterviews({
                timeFilters: [...INTERVIEW_TIME_FILTERS],
            });
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            await updatePreferences({ interview_time_filters: timeFilters });
            const normalizedInterviews = filterAndSortInterviews(
                Array.isArray(fetchedInterviews) ? fetchedInterviews : [],
                INTERVIEW_TIME_FILTERS,
                currentTime
            );
            const savedInterviews = filterRequest.saveResult(requestId, normalizedInterviews);
            if (savedInterviews) {
                setInterviews(savedInterviews);
            }

            return true;
        } catch (error) {
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            const savedInterviews = filterRequest.failRequest(requestId);
            if (savedInterviews) {
                setInterviews(savedInterviews);
            }
            showErrorToast(getErrorToastMessage(error, 'Unable to filter interviews. Please try again.'));
            return false;
        } finally {
            if (filterRequest.isLatestRequest(requestId)) {
                setIsFilteringInterviews(false);
            }
        }
    };

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();

        const fetchInterviews = async () => {
            try {
                const fetchedInterviews = await api.interview.listInterviews(
                    { timeFilters: [...INTERVIEW_TIME_FILTERS] },
                    { signal: controller.signal }
                );
                const normalizedInterviews = filterAndSortInterviews(
                    Array.isArray(fetchedInterviews) ? fetchedInterviews : [],
                    INTERVIEW_TIME_FILTERS,
                    currentTime
                );
                if (dashboardInterviewIdRef.current && dashboardViewUpdatePendingRef.current) {
                    dashboardInterviewsRef.current = normalizedInterviews;
                } else if (isActive && !dashboardViewUpdateFailedRef.current) {
                    setInterviews(normalizedInterviews);
                }
            } catch (error) {
                if (isActive && !isAbortError(error)) {
                    showErrorToast(getErrorToastMessage(error, 'Unable to load interviews. Please try again.'));
                }
            } finally {
                dashboardInterviewRequestSettledRef.current = true;
                if (isActive && !dashboardViewUpdatePendingRef.current) {
                    setIsLoading(false);
                }
            }
        };

        void fetchInterviews();
        return () => {
            isActive = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        const interviewId = dashboardInterviewIdRef.current;
        const hidesUpcomingInterviews =
            selectedTimeFilters.length === 1 && selectedTimeFilters[0] === 'Past Interviews';
        if (
            !interviewId ||
            (viewMode === 'list' && !hidesUpcomingInterviews) ||
            dashboardViewUpdatePendingRef.current
        ) {
            return;
        }

        dashboardViewUpdatePendingRef.current = true;
        const switchToListView = async () => {
            let viewUpdateSucceeded = false;
            try {
                await updatePreferences({
                    ...(viewMode === 'list' ? {} : { interview_view_mode: 'list' }),
                    ...(hidesUpcomingInterviews ? { interview_time_filters: [...INTERVIEW_TIME_FILTERS] } : {}),
                });
                viewUpdateSucceeded = true;
            } catch (error) {
                showErrorToast(getErrorToastMessage(error, 'Unable to save display preferences. Please try again.'));
                dashboardViewUpdateFailedRef.current = true;
                try {
                    const restoredInterviews = await api.interview.listInterviews({
                        timeFilters: [...INTERVIEW_TIME_FILTERS],
                    });
                    setInterviews(
                        filterAndSortInterviews(
                            Array.isArray(restoredInterviews) ? restoredInterviews : [],
                            INTERVIEW_TIME_FILTERS,
                            currentTime
                        )
                    );
                } catch (restoreError) {
                    setInterviews([]);
                    showErrorToast(
                        getErrorToastMessage(
                            restoreError,
                            'Unable to restore the saved interview filters. Please try again.'
                        )
                    );
                }
                setIsLoading(false);
                dashboardInterviewIdRef.current = null;
                navigate(location.pathname, { replace: true, state: null });
            } finally {
                dashboardViewUpdatePendingRef.current = false;
                if (viewUpdateSucceeded && dashboardInterviewRequestSettledRef.current) {
                    if (dashboardInterviewsRef.current) {
                        setInterviews(dashboardInterviewsRef.current);
                    }
                    setIsLoading(false);
                }
                dashboardInterviewsRef.current = null;
            }
        };

        void switchToListView();
    }, [location.pathname, navigate, selectedTimeFilters, showErrorToast, updatePreferences, viewMode]);

    useEffect(() => {
        const interviewId = dashboardInterviewIdRef.current;
        const hidesUpcomingInterviews =
            selectedTimeFilters.length === 1 && selectedTimeFilters[0] === 'Past Interviews';
        if (!interviewId || isLoading || viewMode !== 'list' || hidesUpcomingInterviews) {
            return;
        }

        const targetId = String(interviewId);
        if (displayedInterviews.some((interview) => interview.interview_id === interviewId)) {
            scrollAndHighlight(targetId, styles.highlighted, interviewHighlightTimeout.current);
        }

        dashboardInterviewIdRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
    }, [displayedInterviews, isLoading, location.pathname, navigate, selectedTimeFilters, viewMode]);

    useEffect(() => {
        const highlightTimeouts = interviewHighlightTimeout.current;
        return () => {
            Object.values(highlightTimeouts).forEach(clearTimeout);
        };
    }, []);

    const handleDelete = async (interviewId: number) => {
        try {
            const { confirmed } = await confirm(createDeleteConfirmation('job interview'));

            if (!confirmed) {
                return;
            }

            startDeletingInterview(interviewId);
            try {
                await api.interview.deleteInterview({ interviewId });
                setInterviews((current) => current.filter((interview) => interview.interview_id !== interviewId));
                showSuccessToast('Interview deleted.');
            } finally {
                stopDeletingInterview(interviewId);
            }
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to delete the interview. Please try again.'));
        }
    };

    const handleDeleteAll = async () => {
        if (deleteAllPendingRef.current) {
            return;
        }

        deleteAllPendingRef.current = true;
        setIsDeletingAll(true);
        let countsLoaded = false;

        try {
            const summary = await api.interview.getSummary();
            countsLoaded = true;

            if (summary.interview_count === 0) {
                setInterviews([]);
                return;
            }

            const { confirmed } = await confirm(
                createDeleteAllInterviewsConfirmation(summary.interview_count, 'active')
            );

            if (!confirmed) {
                return;
            }

            await api.interview.deleteAllInterviews();
            setInterviews([]);
            showSuccessToast('Interviews deleted.');
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(
                    error,
                    countsLoaded
                        ? 'Unable to delete interviews. Please try again.'
                        : 'Unable to load active interview counts. Please try again.'
                )
            );
        } finally {
            deleteAllPendingRef.current = false;
            setIsDeletingAll(false);
        }
    };

    const handleUndoFollowUp = async (interview: JobInterview) => {
        if (undoingFollowUpInterviewIds.has(interview.interview_id)) {
            return;
        }

        startUndoingFollowUp(interview.interview_id);
        try {
            await api.interview.undoFollowUp({ interviewId: interview.interview_id });
            setInterviews((current) =>
                current.map((item) =>
                    item.interview_id === interview.interview_id ? { ...item, follow_up_sent_at: null } : item
                )
            );
            showSuccessToast('Interview follow-up undone.');
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to undo the interview follow-up. Please try again.'));
        } finally {
            stopUndoingFollowUp(interview.interview_id);
        }
    };

    const handlePinToggle = async (interview: JobInterview) => {
        if (pinningInterviewIds.has(interview.interview_id)) {
            return;
        }

        const shouldPin = !interview.is_pinned;
        const requestedViewMode = viewModeRef.current;
        startPinningInterview(interview.interview_id);
        try {
            const updatedPin = await api.interview.updatePin({
                interviewId: interview.interview_id,
                isPinned: shouldPin,
            });
            const updatePin = (item: JobInterview): JobInterview =>
                item.interview_id === interview.interview_id ? { ...item, is_pinned: updatedPin.is_pinned } : item;

            setInterviews((current) =>
                filterAndSortInterviews(current.map(updatePin), INTERVIEW_TIME_FILTERS, currentTime)
            );
            showSuccessToast(shouldPin ? 'Interview pinned.' : 'Interview unpinned.');

            if (isAutoScrollEnabledRef.current && viewModeRef.current === requestedViewMode) {
                setTimeout(() => {
                    if (isAutoScrollEnabledRef.current && viewModeRef.current === requestedViewMode) {
                        scrollAndHighlight(
                            String(interview.interview_id),
                            styles.highlighted,
                            interviewHighlightTimeout.current,
                            undefined,
                            () => isAutoScrollEnabledRef.current && viewModeRef.current === requestedViewMode
                        );
                    }
                }, 100);
            }
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(error, `Unable to ${shouldPin ? 'pin' : 'unpin'} the interview. Please try again.`)
            );
        } finally {
            stopPinningInterview(interview.interview_id);
        }
    };

    const hasInterviews = interviews.length > 0;
    const hasDisplayedInterviews = displayedInterviews.length > 0;
    const filtersAreActive = hasInterviews && selectedTimeFilters.length !== INTERVIEW_TIME_FILTERS.length;
    const emptyState = createInterviewEmptyState({
        applicationsRoute: routes.viewApplications,
        filtersAreActive,
        onClearFilters: () => void handleTimeFilterChange([...INTERVIEW_TIME_FILTERS]),
        variant: 'active',
    });

    const handleViewApplicationClick = (event: MouseEvent<HTMLAnchorElement>, interview: JobInterview) => {
        event.preventDefault();

        const state: ApplicationCollectionNavigationState = {
            applicationJobStatus: interview.job_status,
            applicationTargetId: interview.job_id,
        };
        navigate(routes.viewApplications, { state });
    };

    return (
        <div className={`${styles.interviewList} ${isBoardView ? styles.boardLayout : ''}`}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        !isLoading && hasDisplayedInterviews ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename='job_interviews.csv'
                                csvHeaders={INTERVIEW_CSV_HEADERS}
                                csvLabel='Export filtered interviews as CSV'
                                deleteLabel='Delete all interviews'
                                id='interview-more-options'
                                isDeleting={isDeletingAll}
                                middleAction={{
                                    disabled: upcomingInterviewCount === 0,
                                    icon: 'calendar',
                                    label: 'Export all upcoming active interviews (.ics)',
                                    onClick: () => void exportUpcomingInterviews(),
                                }}
                                onDelete={() => void handleDeleteAll()}
                            />
                        ) : undefined
                    }
                    ariaLabel='Interview view and management controls'
                    mobileLayout={
                        !isBoardView && hasDisplayedInterviews ? 'collectionResponsive' : 'inlineWhenPossible'
                    }
                >
                    <CollectionViewToggle
                        ariaLabel='Interview view'
                        currentView={viewMode}
                        onViewChange={(nextViewMode) => void handleViewModeChange(nextViewMode)}
                    />
                    <CheckboxFilter
                        buttonLabel='Filter by'
                        disabled={isLoading}
                        id='interview-time-filter'
                        onSelectionChange={handleTimeFilterChange}
                        options={INTERVIEW_TIME_FILTERS}
                        selectedOptions={selectedTimeFilters}
                    />
                    {hasDisplayedInterviews && !isBoardView && (
                        <DisplayOptions id='interview-display-options'>
                            <ToggleButton toggled={showNotes} onToggle={handleShowNotesToggle} label='Show notes' />
                        </DisplayOptions>
                    )}
                </ActivityControls>
            </div>

            {(isLoading || isFilteringInterviews) &&
                (isBoardView ? (
                    <SkeletonInterviewBoard />
                ) : (
                    <>
                        <SkeletonCard variant='interview' />
                        <SkeletonCard variant='interview' />
                    </>
                ))}

            {!isLoading && !isFilteringInterviews && !hasDisplayedInterviews && <EmptyState {...emptyState} />}

            {!isLoading && !isFilteringInterviews && hasDisplayedInterviews && (
                <InterviewGrid ariaLabel='Active interviews' layout={viewMode}>
                    {displayedInterviews.map((interview, index) => (
                        <InterviewCard
                            applicationRoute={routes.viewApplications}
                            currentTime={currentTime}
                            index={index}
                            interview={interview}
                            isDeleting={deletingInterviewIds.has(interview.interview_id)}
                            isUpdatingPin={pinningInterviewIds.has(interview.interview_id)}
                            isUndoingFollowUp={undoingFollowUpInterviewIds.has(interview.interview_id)}
                            key={interview.interview_id}
                            layout={viewMode}
                            note={notesAutosave.draftNotes[interview.interview_id] ?? interview.interview_notes}
                            noteSaveStatus={notesAutosave.noteSaveStatuses[interview.interview_id] ?? 'idle'}
                            onDelete={() => handleDelete(interview.interview_id)}
                            onEditNotes={handleEditNotes}
                            onNotesBlur={notesAutosave.flushNote}
                            onNotesVisibilityChange={notesAutosave.setNoteVisibility}
                            onPinToggle={handlePinToggle}
                            onRetryNotes={notesAutosave.retryNotes}
                            onUndoFollowUp={handleUndoFollowUp}
                            onViewApplicationClick={(event) => handleViewApplicationClick(event, interview)}
                            showNotes={showNotes}
                            variant='job'
                        />
                    ))}
                </InterviewGrid>
            )}
        </div>
    );
};

export default ViewInterview;
