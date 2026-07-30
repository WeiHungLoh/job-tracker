import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ArchivedJobInterview } from '../../models';
import { createInterviewCsvData } from '../../../../helper/csvExport';
import { createDeleteConfirmation } from '../../../../components/confirmation/deleteConfirmation';
import { createDeleteAllInterviewsConfirmation } from '../../../../components/confirmation/bulkConfirmations';
import { INTERVIEW_CSV_HEADERS } from '../../models';
import { useNavigate } from 'react-router-dom';
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
import CheckboxFilter from '../../../../components/activityControls/checkboxFilter/CheckboxFilter';
import {
    filterAndSortInterviews,
    INTERVIEW_TIME_FILTERS,
    type InterviewTimeFilter,
} from '../../../../helper/interviewTiming';
import useCurrentTime from '../../../../hooks/useCurrentTime';
import useFilterRequest from '../../../../hooks/useFilterRequest';
import type { ApplicationListNavigationState } from '../../../application/applicationNavigation';
import DisplayOptions from '../../../../components/activityControls/displayOptions/DisplayOptions';
import ToggleButton from '../../../../components/toggleButton/ToggleButton';

const ViewArchivedInterview = () => {
    const api = useJobTrackerAPI();
    const currentTime = useCurrentTime();
    const { preferences, updatePreferences } = useUserPreferences();
    const [archivedInterviews, setArchivedInterviews] = useState<ArchivedJobInterview[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isFilteringInterviews, setIsFilteringInterviews] = useState<boolean>(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const deleteAllPendingRef = useRef(false);
    const {
        pendingIds: deletingInterviewIds,
        startPending: startDeletingInterview,
        stopPending: stopDeletingInterview,
    } = usePendingIds();
    const confirm = useConfirm();
    const navigate = useNavigate();
    const { showErrorToast, showSuccessToast } = useToast();
    const filterRequest = useFilterRequest<ArchivedJobInterview[]>();
    const viewMode = preferences.archived_interview_view_mode;
    const showNotes = preferences.archived_interview_show_notes;
    const selectedTimeFilters = preferences.archived_interview_time_filters;
    const isBoardView = viewMode === 'board';
    const csvData = useMemo(() => createInterviewCsvData(archivedInterviews), [archivedInterviews]);

    const handleViewModeChange = async (nextViewMode: CollectionViewMode) => {
        try {
            await updatePreferences({ archived_interview_view_mode: nextViewMode });
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to save display preferences. Please try again.'));
        }
    };

    const handleShowNotesToggle = async () => {
        try {
            await updatePreferences({ archived_interview_show_notes: !showNotes });
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to save display preferences. Please try again.'));
        }
    };

    const handleTimeFilterChange = async (timeFilters: InterviewTimeFilter[]) => {
        const requestId = filterRequest.startRequest();
        setIsFilteringInterviews(true);

        try {
            const filteredInterviews = await api.archivedInterview.listInterviews({ timeFilters });
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            await updatePreferences({ archived_interview_time_filters: timeFilters });
            const savedInterviews = filterRequest.saveResult(
                requestId,
                filterAndSortInterviews(
                    Array.isArray(filteredInterviews) ? filteredInterviews : [],
                    INTERVIEW_TIME_FILTERS,
                    currentTime
                )
            );
            if (savedInterviews) {
                setArchivedInterviews(savedInterviews);
            }

            return true;
        } catch (error) {
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            const savedInterviews = filterRequest.failRequest(requestId);
            if (savedInterviews) {
                setArchivedInterviews(savedInterviews);
            }
            showErrorToast(getErrorToastMessage(error, 'Unable to filter archived interviews. Please try again.'));
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
            try {
                const fetchedInterviews = await api.archivedInterview.listInterviews({
                    timeFilters: selectedTimeFilters,
                });
                if (isActive) {
                    setArchivedInterviews(
                        filterAndSortInterviews(
                            Array.isArray(fetchedInterviews) ? fetchedInterviews : [],
                            INTERVIEW_TIME_FILTERS,
                            currentTime
                        )
                    );
                }
            } catch (error) {
                showErrorToast(getErrorToastMessage(error, 'Unable to load archived interviews. Please try again.'));
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        void fetchInterviews();
        return () => {
            isActive = false;
        };
    }, []);

    const handleDelete = async (archivedInterviewId: number) => {
        try {
            const { confirmed } = await confirm(createDeleteConfirmation('archived job interview'));

            if (!confirmed) {
                return;
            }

            startDeletingInterview(archivedInterviewId);
            try {
                await api.archivedInterview.deleteInterview({ archivedInterviewId });
                setArchivedInterviews((current) =>
                    current.filter((interview) => interview.archived_interview_id !== archivedInterviewId)
                );
                showSuccessToast('Archived interview deleted.');
            } finally {
                stopDeletingInterview(archivedInterviewId);
            }
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to delete the archived interview. Please try again.'));
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
            const summary = await api.archivedInterview.getSummary();
            countsLoaded = true;

            if (summary.interview_count === 0) {
                setArchivedInterviews([]);
                return;
            }

            const { confirmed } = await confirm(
                createDeleteAllInterviewsConfirmation(summary.interview_count, 'archived')
            );

            if (!confirmed) {
                return;
            }

            await api.archivedInterview.deleteAllInterviews();
            setArchivedInterviews([]);
            showSuccessToast('Archived interviews deleted.');
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(
                    error,
                    countsLoaded
                        ? 'Unable to delete archived interviews. Please try again.'
                        : 'Unable to load archived interview counts. Please try again.'
                )
            );
        } finally {
            deleteAllPendingRef.current = false;
            setIsDeletingAll(false);
        }
    };

    const hasInterviews = archivedInterviews.length > 0;
    const filtersAreActive = selectedTimeFilters.length !== INTERVIEW_TIME_FILTERS.length;
    const emptyState = createInterviewEmptyState({
        activeInterviewsRoute: routes.viewInterviews,
        filtersAreActive,
        onClearFilters: () => void handleTimeFilterChange([...INTERVIEW_TIME_FILTERS]),
        variant: 'archived',
    });

    const handleViewApplicationClick = (event: MouseEvent<HTMLAnchorElement>, interview: ArchivedJobInterview) => {
        event.preventDefault();

        const state: ApplicationListNavigationState = {
            applicationListJobStatus: interview.job_status,
            applicationListTargetId: interview.archived_job_id,
        };
        navigate(routes.archivedApplications, { state });
    };

    return (
        <div className={`${styles.interviewList} ${isBoardView ? styles.boardLayout : ''}`}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        !isLoading && hasInterviews ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename='archived_job_interviews.csv'
                                csvHeaders={INTERVIEW_CSV_HEADERS}
                                deleteLabel='Delete all archived interviews'
                                id='archived-interview-more-options'
                                isDeleting={isDeletingAll}
                                onDelete={() => void handleDeleteAll()}
                            />
                        ) : undefined
                    }
                    ariaLabel='Archived interview view and management controls'
                    mobileLayout={!isBoardView && hasInterviews ? 'interviewResponsive' : 'inlineWhenPossible'}
                >
                    <CollectionViewToggle
                        ariaLabel='Archived interview view'
                        currentView={viewMode}
                        onViewChange={(nextViewMode) => void handleViewModeChange(nextViewMode)}
                    />
                    <CheckboxFilter
                        buttonLabel='Filter by'
                        disabled={isLoading}
                        id='archived-interview-time-filter'
                        onSelectionChange={handleTimeFilterChange}
                        options={INTERVIEW_TIME_FILTERS}
                        selectedOptions={selectedTimeFilters}
                    />
                    {hasInterviews && !isBoardView && (
                        <DisplayOptions id='archived-interview-display-options'>
                            <ToggleButton
                                toggled={showNotes}
                                onToggle={() => void handleShowNotesToggle()}
                                label='Show notes'
                            />
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

            {!isLoading && !isFilteringInterviews && !hasInterviews && <EmptyState {...emptyState} />}

            {!isLoading && !isFilteringInterviews && hasInterviews && (
                <InterviewGrid ariaLabel='Archived interviews' layout={viewMode}>
                    {archivedInterviews.map((interview, index) => (
                        <InterviewCard
                            applicationRoute={routes.archivedApplications}
                            currentTime={currentTime}
                            index={index}
                            interview={interview}
                            isDeleting={deletingInterviewIds.has(interview.archived_interview_id)}
                            key={interview.archived_interview_id}
                            layout={viewMode}
                            onDelete={() => handleDelete(interview.archived_interview_id)}
                            onViewApplicationClick={(event) => handleViewApplicationClick(event, interview)}
                            showNotes={showNotes}
                            variant='archived'
                        />
                    ))}
                </InterviewGrid>
            )}
        </div>
    );
};

export default ViewArchivedInterview;
