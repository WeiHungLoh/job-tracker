import { useLocation, useNavigate } from 'react-router-dom';
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createInterviewCsvData } from '../../../../helper/csvExport';
import { createDeleteConfirmation } from '../../../../components/confirmation/deleteConfirmation';
import { createDeleteAllInterviewsConfirmation } from '../../../../components/confirmation/bulkConfirmations';
import { INTERVIEW_CSV_HEADERS, type JobInterview } from '../../models';
import SkeletonCard from '../../../../components/skeletonLoader/skeletonCard/SkeletonCard';
import { routes } from '../../../../routes';
import styles from '../../InterviewListPage.module.css';
import { useConfirm } from 'material-ui-confirm';
import { useJobTrackerAPI } from '../../../../api/useJobTrackerAPI';
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
    getUpcomingInterviews,
    INTERVIEW_TIME_FILTERS,
    type InterviewTimeFilter,
} from '../../../../helper/interviewTiming';
import { useBulkInterviewCalendarExport } from '../../calendarOptions/useBulkInterviewCalendarExport';
import useCurrentTime from '../../../../hooks/useCurrentTime';
import useFilterRequest from '../../../../hooks/useFilterRequest';
import type { ApplicationListNavigationState } from '../../../application/applicationNavigation';

type InterviewFilterResult = {
    interviews: JobInterview[];
    upcomingInterviews?: JobInterview[];
};

const ViewInterview = () => {
    const api = useJobTrackerAPI();
    const currentTime = useCurrentTime();
    const { preferences, updatePreferences } = useUserPreferences();
    const [interviews, setInterviews] = useState<JobInterview[]>([]);
    const [upcomingInterviews, setUpcomingInterviews] = useState<JobInterview[]>([]);
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
    const filterRequest = useFilterRequest<InterviewFilterResult>();
    const viewMode = preferences.interview_view_mode;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const isAutoScrollEnabled = preferences.application_enable_scroll;
    const selectedTimeFilters = preferences.interview_time_filters;
    const isBoardView = viewMode === 'board';
    const csvData = useMemo(() => createInterviewCsvData(interviews), [interviews]);
    const { exportUpcomingInterviews, upcomingInterviewCount } = useBulkInterviewCalendarExport(
        upcomingInterviews,
        currentTime
    );

    const handleViewModeChange = async (nextViewMode: CollectionViewMode) => {
        try {
            await updatePreferences({ interview_view_mode: nextViewMode });
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to save display preferences. Please try again.'));
        }
    };

    const handleTimeFilterChange = async (timeFilters: InterviewTimeFilter[]) => {
        const requestId = filterRequest.startRequest();
        setIsFilteringInterviews(true);

        try {
            const filteredInterviews = await api.interview.listInterviews({ timeFilters });
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            await updatePreferences({ interview_time_filters: timeFilters });
            const normalizedInterviews = filterAndSortInterviews(
                Array.isArray(filteredInterviews) ? filteredInterviews : [],
                INTERVIEW_TIME_FILTERS,
                currentTime
            );
            const savedResult = filterRequest.saveResult(requestId, {
                interviews: normalizedInterviews,
                ...(timeFilters.includes('Upcoming Interviews')
                    ? { upcomingInterviews: getUpcomingInterviews(normalizedInterviews, currentTime) }
                    : {}),
            });
            if (savedResult) {
                setInterviews(savedResult.interviews);
                if (savedResult.upcomingInterviews) {
                    setUpcomingInterviews(savedResult.upcomingInterviews);
                }
            }

            return true;
        } catch (error) {
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            const savedResult = filterRequest.failRequest(requestId);
            if (savedResult) {
                setInterviews(savedResult.interviews);
                if (savedResult.upcomingInterviews) {
                    setUpcomingInterviews(savedResult.upcomingInterviews);
                }
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

        const fetchInterviews = async () => {
            const initialTimeFilters = dashboardInterviewIdRef.current
                ? [...INTERVIEW_TIME_FILTERS]
                : selectedTimeFilters;

            try {
                const fetchedInterviews = await api.interview.listInterviews({ timeFilters: initialTimeFilters });
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

                if (initialTimeFilters.includes('Upcoming Interviews')) {
                    if (isActive) {
                        setUpcomingInterviews(getUpcomingInterviews(normalizedInterviews, currentTime));
                    }
                } else {
                    void api.interview
                        .listInterviews({ timeFilters: ['Upcoming Interviews'] })
                        .then((fetchedUpcomingInterviews) => {
                            if (isActive) {
                                setUpcomingInterviews(
                                    filterAndSortInterviews(
                                        Array.isArray(fetchedUpcomingInterviews) ? fetchedUpcomingInterviews : [],
                                        ['Upcoming Interviews'],
                                        currentTime
                                    )
                                );
                            }
                        })
                        .catch((error: unknown) => {
                            if (isActive) {
                                showErrorToast(
                                    getErrorToastMessage(
                                        error,
                                        'Unable to load upcoming interviews for calendar export. Please try again.'
                                    )
                                );
                            }
                        });
                }
            } catch (error) {
                showErrorToast(getErrorToastMessage(error, 'Unable to load interviews. Please try again.'));
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
                        timeFilters: selectedTimeFilters,
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
        if (interviews.some((interview) => interview.interview_id === interviewId)) {
            scrollAndHighlight(targetId, styles.highlighted, interviewHighlightTimeout.current);
        }

        dashboardInterviewIdRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
    }, [interviews, isLoading, location.pathname, navigate, selectedTimeFilters, viewMode]);

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
                setUpcomingInterviews((current) =>
                    current.filter((interview) => interview.interview_id !== interviewId)
                );
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
                setUpcomingInterviews([]);
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
            setUpcomingInterviews([]);
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
            setUpcomingInterviews((current) =>
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
            setUpcomingInterviews((current) =>
                filterAndSortInterviews(current.map(updatePin), ['Upcoming Interviews'], currentTime)
            );
            showSuccessToast(shouldPin ? 'Interview pinned.' : 'Interview unpinned.');

            if (isAutoScrollEnabled && viewModeRef.current === 'list') {
                setTimeout(() => {
                    if (viewModeRef.current === 'list') {
                        scrollAndHighlight(
                            String(interview.interview_id),
                            styles.highlighted,
                            interviewHighlightTimeout.current
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
    const filtersAreActive = selectedTimeFilters.length !== INTERVIEW_TIME_FILTERS.length;
    const emptyState = createInterviewEmptyState({
        applicationsRoute: routes.viewApplications,
        filtersAreActive,
        onClearFilters: () => void handleTimeFilterChange([...INTERVIEW_TIME_FILTERS]),
        variant: 'active',
    });

    const handleViewApplicationClick = (event: MouseEvent<HTMLAnchorElement>, interview: JobInterview) => {
        event.preventDefault();

        const state: ApplicationListNavigationState = {
            applicationListJobStatus: interview.job_status,
            applicationListTargetId: interview.job_id,
        };
        navigate(routes.viewApplications, { state });
    };

    return (
        <div className={`${styles.interviewList} ${isBoardView ? styles.boardLayout : ''}`}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        !isLoading && hasInterviews ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename='job_interviews.csv'
                                csvHeaders={INTERVIEW_CSV_HEADERS}
                                deleteLabel='Delete all interviews'
                                id='interview-more-options'
                                isDeleting={isDeletingAll}
                                middleAction={{
                                    disabled: upcomingInterviewCount === 0,
                                    icon: 'calendar',
                                    label: 'Export upcoming interviews (.ics)',
                                    onClick: () => void exportUpcomingInterviews(),
                                }}
                                onDelete={() => void handleDeleteAll()}
                            />
                        ) : undefined
                    }
                    ariaLabel='Interview view and management controls'
                    mobileLayout='inlineWhenPossible'
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

            {!isLoading && !isFilteringInterviews && !hasInterviews && <EmptyState {...emptyState} />}

            {!isLoading && !isFilteringInterviews && hasInterviews && (
                <InterviewGrid ariaLabel='Active interviews' layout={viewMode}>
                    {interviews.map((interview, index) => (
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
                            onDelete={() => handleDelete(interview.interview_id)}
                            onPinToggle={handlePinToggle}
                            onUndoFollowUp={handleUndoFollowUp}
                            onViewApplicationClick={(event) => handleViewApplicationClick(event, interview)}
                            variant='job'
                        />
                    ))}
                </InterviewGrid>
            )}
        </div>
    );
};

export default ViewInterview;
