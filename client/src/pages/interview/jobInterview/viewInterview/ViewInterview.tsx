import { useLocation, useNavigate } from 'react-router-dom';
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createInterviewCsvData } from '../../../../helper/csvExport';
import { createDeleteConfirmation } from '../../../../components/confirmation/deleteConfirmation';
import { createDeleteAllInterviewsConfirmation } from '../../../../components/confirmation/bulkConfirmations';
import {
    ACTIVE_APPLICATION_BOARD_MESSAGE,
    getApplicationUnavailableMessage,
} from '../../applicationNavigationMessages';
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
    getUpcomingInterviews,
    INTERVIEW_TIME_FILTERS,
    type InterviewTimeFilter,
} from '../../../../helper/interviewTiming';
import { useBulkInterviewCalendarExport } from '../../calendarOptions/useBulkInterviewCalendarExport';
import useCurrentTime from '../../../../hooks/useCurrentTime';
import useFilterRequest from '../../../../hooks/useFilterRequest';

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
    const dashboardHighlightTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
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
    const confirm = useConfirm();
    const navigate = useNavigate();
    const { showErrorToast, showSuccessToast } = useToast();
    const filterRequest = useFilterRequest<InterviewFilterResult>();
    const viewMode = preferences.interview_view_mode;
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
            const normalizedInterviews = Array.isArray(filteredInterviews) ? filteredInterviews : [];
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
                const normalizedInterviews = Array.isArray(fetchedInterviews) ? fetchedInterviews : [];
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
                                    Array.isArray(fetchedUpcomingInterviews) ? fetchedUpcomingInterviews : []
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
                    setInterviews(Array.isArray(restoredInterviews) ? restoredInterviews : []);
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
            scrollAndHighlight(targetId, styles.highlighted, dashboardHighlightTimeout.current);
        }

        dashboardInterviewIdRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
    }, [interviews, isLoading, location.pathname, navigate, selectedTimeFilters, viewMode]);

    useEffect(() => {
        const highlightTimeouts = dashboardHighlightTimeout.current;
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

    const hasInterviews = interviews.length > 0;
    const filtersAreActive = selectedTimeFilters.length !== INTERVIEW_TIME_FILTERS.length;
    const emptyState = createInterviewEmptyState({
        applicationsRoute: routes.viewApplications,
        filtersAreActive,
        onClearFilters: () => void handleTimeFilterChange([...INTERVIEW_TIME_FILTERS]),
        variant: 'active',
    });

    const handleViewApplicationClick = async (event: MouseEvent<HTMLAnchorElement>, interview: JobInterview) => {
        event.preventDefault();

        if (preferences.application_view_mode === 'board') {
            showErrorToast(ACTIVE_APPLICATION_BOARD_MESSAGE);
            return;
        }

        try {
            const applications = await api.application.listApplications({
                jobStatuses: preferences.application_job_statuses,
            });
            const applicationExists = applications.some((application) => application.job_id === interview.job_id);

            if (!applicationExists) {
                showErrorToast(
                    getApplicationUnavailableMessage(preferences.application_job_statuses, interview.job_status, {
                        applicationLabel: 'This job application',
                        applicationsPageLabel: 'active applications',
                        statusFilterLabel: 'job status filter',
                    })
                );
                return;
            }

            navigate(`${routes.viewApplications}#${interview.job_id}`);
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(error, 'Unable to check the corresponding job application. Please try again.')
            );
        }
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
                            isUndoingFollowUp={undoingFollowUpInterviewIds.has(interview.interview_id)}
                            key={interview.interview_id}
                            layout={viewMode}
                            onDelete={() => handleDelete(interview.interview_id)}
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
