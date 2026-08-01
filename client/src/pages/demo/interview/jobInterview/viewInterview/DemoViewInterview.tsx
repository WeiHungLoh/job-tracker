import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createInterviewCsvData } from '../../../../../helper/csvExport';
import { createDeleteConfirmation } from '../../../../../components/confirmation/deleteConfirmation';
import { createDeleteAllInterviewsConfirmation } from '../../../../../components/confirmation/bulkConfirmations';
import { INTERVIEW_CSV_HEADERS, type JobInterview } from '../../../../interview/models';
import { routes } from '../../../../../routes';
import styles from '../../../../interview/InterviewListPage.module.css';
import { useConfirm } from 'material-ui-confirm';
import { useDemo } from '../../../context/DemoContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../../../../components/toast/ToastProvider';
import { useUserPreferences } from '../../../../../components/userPreferences/UserPreferencesProvider';
import ActivityControls from '../../../../../components/activityControls/ActivityControls';
import InterviewCard from '../../../../interview/InterviewCard';
import MoreOptions from '../../../../../components/activityControls/moreOptions/MoreOptions';
import EmptyState from '../../../../../components/emptyState/EmptyState';
import { createInterviewEmptyState } from '../../../../interview/interviewEmptyState';
import CollectionViewToggle from '../../../../../components/activityControls/collectionViewToggle/CollectionViewToggle';
import InterviewGrid from '../../../../interview/interviewGrid/InterviewGrid';
import { getDashboardInterviewId } from '../../../../dashboard/dashboardNavigation';
import { scrollAndHighlight } from '../../../../../helper/highlightElement';
import CheckboxFilter from '../../../../../components/activityControls/checkboxFilter/CheckboxFilter';
import {
    filterAndSortInterviews,
    INTERVIEW_TIME_FILTERS,
    type InterviewTimeFilter,
} from '../../../../../helper/interviewTiming';
import { useBulkInterviewCalendarExport } from '../../../../interview/calendarOptions/useBulkInterviewCalendarExport';
import useCurrentTime from '../../../../../hooks/useCurrentTime';
import type { ApplicationCollectionNavigationState } from '../../../../application/applicationNavigation';
import useAutosaveNotes from '../../../../../hooks/useAutosaveNotes';
import { FIELD_MAX_LENGTHS } from '../../../../../helper/formValidation';
import DisplayOptions from '../../../../../components/activityControls/displayOptions/DisplayOptions';
import ToggleButton from '../../../../../components/toggleButton/ToggleButton';

const DemoViewInterview = () => {
    const { dispatch, state, updatePreferences } = useDemo();
    const currentTime = useCurrentTime();
    const { preferences } = useUserPreferences();
    const confirm = useConfirm();
    const navigate = useNavigate();
    const location = useLocation();
    const dashboardInterviewIdRef = useRef(getDashboardInterviewId(location.state));
    const interviewHighlightTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const { showSuccessToast } = useToast();
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const deleteAllPendingRef = useRef(false);
    const selectedTimeFilters = preferences.interview_time_filters;
    const showNotes = preferences.interview_show_notes;
    const saveInterviewNotes = useCallback(
        async (interviewId: number, notes: string) => {
            dispatch({ type: 'UPDATE_INTERVIEW_NOTES', payload: { interviewId, notes } });
        },
        [dispatch]
    );
    const notesAutosave = useAutosaveNotes({ saveNotes: saveInterviewNotes });
    const displayedInterviews = useMemo(
        () => filterAndSortInterviews(state.interviews, selectedTimeFilters, currentTime),
        [currentTime, selectedTimeFilters, state.interviews]
    );
    const csvData = useMemo(() => createInterviewCsvData(displayedInterviews), [displayedInterviews]);
    const hasInterviews = state.interviews.length > 0;
    const hasDisplayedInterviews = displayedInterviews.length > 0;
    const filtersAreActive = hasInterviews && selectedTimeFilters.length !== INTERVIEW_TIME_FILTERS.length;
    const { exportUpcomingInterviews, upcomingInterviewCount } = useBulkInterviewCalendarExport(
        state.interviews,
        currentTime
    );
    const emptyState = createInterviewEmptyState({
        applicationsRoute: routes.demoViewApplications,
        filtersAreActive,
        onClearFilters: () => void updatePreferences({ interview_time_filters: [...INTERVIEW_TIME_FILTERS] }),
        variant: 'active',
    });
    const viewMode = preferences.interview_view_mode;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const isAutoScrollEnabled = preferences.application_enable_scroll;
    const isAutoScrollEnabledRef = useRef(isAutoScrollEnabled);
    isAutoScrollEnabledRef.current = isAutoScrollEnabled;
    const isBoardView = viewMode === 'board';

    const handleViewModeChange = (nextViewMode: 'list' | 'board') => {
        notesAutosave.setAllNotesVisibility(nextViewMode === 'list' && showNotes);
        void updatePreferences({ interview_view_mode: nextViewMode });
    };

    const handleShowNotesToggle = () => {
        const nextShowNotes = !showNotes;
        notesAutosave.setAllNotesVisibility(nextShowNotes);
        void updatePreferences({ interview_show_notes: nextShowNotes });
    };

    const handleEditNotes = (interviewId: number, notes: string) => {
        if (notes.length <= FIELD_MAX_LENGTHS.notes) {
            notesAutosave.editNotes(interviewId, notes);
        }
    };

    useEffect(() => {
        const hidesUpcomingInterviews =
            selectedTimeFilters.length === 1 && selectedTimeFilters[0] === 'Past Interviews';
        if (dashboardInterviewIdRef.current && (viewMode !== 'list' || hidesUpcomingInterviews)) {
            void updatePreferences({
                ...(viewMode === 'list' ? {} : { interview_view_mode: 'list' }),
                ...(hidesUpcomingInterviews ? { interview_time_filters: [...INTERVIEW_TIME_FILTERS] } : {}),
            });
        }
    }, [selectedTimeFilters, updatePreferences, viewMode]);

    useEffect(() => {
        const interviewId = dashboardInterviewIdRef.current;
        const hidesUpcomingInterviews =
            selectedTimeFilters.length === 1 && selectedTimeFilters[0] === 'Past Interviews';
        if (!interviewId || viewMode !== 'list' || hidesUpcomingInterviews) {
            return;
        }

        if (displayedInterviews.some((interview) => interview.interview_id === interviewId)) {
            scrollAndHighlight(String(interviewId), styles.highlighted, interviewHighlightTimeout.current);
        }

        dashboardInterviewIdRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
    }, [displayedInterviews, location.pathname, navigate, selectedTimeFilters, viewMode]);

    useEffect(() => {
        const highlightTimeouts = interviewHighlightTimeout.current;
        return () => {
            Object.values(highlightTimeouts).forEach(clearTimeout);
        };
    }, []);

    const handleDelete = async (interviewId: number) => {
        const { confirmed } = await confirm(createDeleteConfirmation('job interview'));

        if (!confirmed) {
            return;
        }

        dispatch({ type: 'DELETE_INTERVIEW', payload: { interviewId } });
        showSuccessToast('Interview deleted.');
    };

    const handleDeleteAll = async () => {
        if (deleteAllPendingRef.current) {
            return;
        }

        deleteAllPendingRef.current = true;
        setIsDeletingAll(true);

        try {
            if (state.interviews.length === 0) {
                return;
            }

            const { confirmed } = await confirm(
                createDeleteAllInterviewsConfirmation(state.interviews.length, 'active')
            );

            if (!confirmed) {
                return;
            }

            dispatch({ type: 'DELETE_ALL_INTERVIEWS' });
            showSuccessToast('Interviews deleted.');
        } finally {
            deleteAllPendingRef.current = false;
            setIsDeletingAll(false);
        }
    };

    const handleTimeFilterChange = async (timeFilters: InterviewTimeFilter[]) => {
        await updatePreferences({ interview_time_filters: timeFilters });
        return true;
    };

    const handleUndoFollowUp = (interview: JobInterview) => {
        dispatch({ type: 'UNDO_INTERVIEW_FOLLOW_UP', payload: { interviewId: interview.interview_id } });
        showSuccessToast('Interview follow-up undone.');
    };

    const handlePinToggle = (interview: JobInterview) => {
        const shouldPin = !interview.is_pinned;
        const requestedViewMode = viewModeRef.current;
        dispatch({
            type: 'UPDATE_INTERVIEW_PIN',
            payload: { interviewId: interview.interview_id, isPinned: shouldPin },
        });
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
    };

    const handleViewApplicationClick = (event: MouseEvent<HTMLAnchorElement>, interview: JobInterview) => {
        event.preventDefault();

        const navigationState: ApplicationCollectionNavigationState = {
            applicationJobStatus: interview.job_status,
            applicationTargetId: interview.job_id,
        };
        navigate(routes.demoViewApplications, { state: navigationState });
    };

    return (
        <div className={`${styles.interviewList} ${isBoardView ? styles.boardLayout : ''}`}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        hasDisplayedInterviews ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename='demo_job_interviews.csv'
                                csvHeaders={INTERVIEW_CSV_HEADERS}
                                csvLabel='Export filtered interviews as CSV'
                                deleteLabel='Delete all interviews'
                                id='demo-interview-more-options'
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
                    ariaLabel='Demo interview view and management controls'
                    mobileLayout={!isBoardView && hasInterviews ? 'collectionResponsive' : 'inlineWhenPossible'}
                >
                    <CollectionViewToggle
                        ariaLabel='Interview view'
                        currentView={viewMode}
                        onViewChange={handleViewModeChange}
                    />
                    <CheckboxFilter
                        buttonLabel='Filter by'
                        id='demo-interview-time-filter'
                        onSelectionChange={handleTimeFilterChange}
                        options={INTERVIEW_TIME_FILTERS}
                        selectedOptions={selectedTimeFilters}
                    />
                    {hasInterviews && !isBoardView && (
                        <DisplayOptions id='demo-interview-display-options'>
                            <ToggleButton toggled={showNotes} onToggle={handleShowNotesToggle} label='Show notes' />
                        </DisplayOptions>
                    )}
                </ActivityControls>
            </div>
            {!hasDisplayedInterviews && <EmptyState {...emptyState} />}

            {hasDisplayedInterviews && (
                <InterviewGrid ariaLabel='Active interviews' layout={viewMode}>
                    {displayedInterviews.map((interview, index) => (
                        <InterviewCard
                            applicationRoute={routes.demoViewApplications}
                            currentTime={currentTime}
                            index={index}
                            interview={interview}
                            isDeleting={false}
                            isUpdatingPin={false}
                            isUndoingFollowUp={false}
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

export default DemoViewInterview;
