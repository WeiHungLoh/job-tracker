import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createInterviewCsvData } from '../../../../../helper/csvExport';
import { createDeleteConfirmation } from '../../../../../components/confirmation/deleteConfirmation';
import { createDeleteAllInterviewsConfirmation } from '../../../../../components/confirmation/bulkConfirmations';
import {
    ACTIVE_APPLICATION_BOARD_MESSAGE,
    getApplicationUnavailableMessage,
} from '../../../../interview/applicationNavigationMessages';
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

const DemoViewInterview = () => {
    const { dispatch, state, updatePreferences } = useDemo();
    const currentTime = useCurrentTime();
    const { preferences } = useUserPreferences();
    const confirm = useConfirm();
    const navigate = useNavigate();
    const location = useLocation();
    const dashboardInterviewIdRef = useRef(getDashboardInterviewId(location.state));
    const dashboardHighlightTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const { showErrorToast } = useToast();
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const deleteAllPendingRef = useRef(false);
    const selectedTimeFilters = preferences.interview_time_filters;
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
    const isBoardView = viewMode === 'board';

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
            scrollAndHighlight(String(interviewId), styles.highlighted, dashboardHighlightTimeout.current);
        }

        dashboardInterviewIdRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
    }, [displayedInterviews, location.pathname, navigate, selectedTimeFilters, viewMode]);

    useEffect(() => {
        const highlightTimeouts = dashboardHighlightTimeout.current;
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
        } finally {
            deleteAllPendingRef.current = false;
            setIsDeletingAll(false);
        }
    };

    const handleTimeFilterChange = async (timeFilters: InterviewTimeFilter[]) => {
        await updatePreferences({ interview_time_filters: timeFilters });
        return true;
    };

    const handleViewApplicationClick = (event: MouseEvent<HTMLAnchorElement>, interview: JobInterview) => {
        event.preventDefault();

        if (preferences.application_view_mode === 'board') {
            showErrorToast(ACTIVE_APPLICATION_BOARD_MESSAGE);
            return;
        }

        const applicationExists = state.applications.some(
            (application) =>
                application.job_id === interview.job_id &&
                preferences.application_job_statuses.includes(application.job_status)
        );

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

        navigate(`${routes.demoViewApplications}#${interview.job_id}`);
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
                                deleteLabel='Delete all interviews'
                                id='demo-interview-more-options'
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
                    ariaLabel='Demo interview view and management controls'
                    mobileLayout='inlineWhenPossible'
                >
                    <CollectionViewToggle
                        ariaLabel='Interview view'
                        currentView={viewMode}
                        onViewChange={(nextViewMode) => void updatePreferences({ interview_view_mode: nextViewMode })}
                    />
                    <CheckboxFilter
                        buttonLabel='Filter by'
                        id='demo-interview-time-filter'
                        onSelectionChange={handleTimeFilterChange}
                        options={INTERVIEW_TIME_FILTERS}
                        selectedOptions={selectedTimeFilters}
                    />
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
                            key={interview.interview_id}
                            layout={viewMode}
                            onDelete={() => handleDelete(interview.interview_id)}
                            onViewApplicationClick={(event) => handleViewApplicationClick(event, interview)}
                            variant='job'
                        />
                    ))}
                </InterviewGrid>
            )}
        </div>
    );
};

export default DemoViewInterview;
