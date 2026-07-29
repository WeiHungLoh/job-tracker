import { type MouseEvent, useMemo, useRef, useState } from 'react';
import { createInterviewCsvData } from '../../../../../helper/csvExport';
import { createDeleteConfirmation } from '../../../../../components/confirmation/deleteConfirmation';
import { createDeleteAllInterviewsConfirmation } from '../../../../../components/confirmation/bulkConfirmations';
import { INTERVIEW_CSV_HEADERS, type ArchivedJobInterview } from '../../../../interview/models';
import { routes } from '../../../../../routes';
import styles from '../../../../interview/InterviewListPage.module.css';
import { useConfirm } from 'material-ui-confirm';
import { useDemo } from '../../../context/DemoContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../../../components/toast/ToastProvider';
import { useUserPreferences } from '../../../../../components/userPreferences/UserPreferencesProvider';
import ActivityControls from '../../../../../components/activityControls/ActivityControls';
import InterviewCard from '../../../../interview/InterviewCard';
import MoreOptions from '../../../../../components/activityControls/moreOptions/MoreOptions';
import EmptyState from '../../../../../components/emptyState/EmptyState';
import { createInterviewEmptyState } from '../../../../interview/interviewEmptyState';
import CollectionViewToggle from '../../../../../components/activityControls/collectionViewToggle/CollectionViewToggle';
import InterviewGrid from '../../../../interview/interviewGrid/InterviewGrid';
import CheckboxFilter from '../../../../../components/activityControls/checkboxFilter/CheckboxFilter';
import {
    filterAndSortInterviews,
    INTERVIEW_TIME_FILTERS,
    type InterviewTimeFilter,
} from '../../../../../helper/interviewTiming';
import useCurrentTime from '../../../../../hooks/useCurrentTime';
import type { ApplicationListNavigationState } from '../../../../application/applicationNavigation';

const DemoViewArchivedInterview = () => {
    const { dispatch, state, updatePreferences } = useDemo();
    const currentTime = useCurrentTime();
    const { preferences } = useUserPreferences();
    const confirm = useConfirm();
    const navigate = useNavigate();
    const { showSuccessToast } = useToast();
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const deleteAllPendingRef = useRef(false);
    const selectedTimeFilters = preferences.archived_interview_time_filters;
    const displayedInterviews = useMemo(
        () => filterAndSortInterviews(state.archivedInterviews, selectedTimeFilters, currentTime),
        [currentTime, selectedTimeFilters, state.archivedInterviews]
    );
    const csvData = useMemo(() => createInterviewCsvData(displayedInterviews), [displayedInterviews]);
    const hasInterviews = state.archivedInterviews.length > 0;
    const hasDisplayedInterviews = displayedInterviews.length > 0;
    const filtersAreActive = hasInterviews && selectedTimeFilters.length !== INTERVIEW_TIME_FILTERS.length;
    const emptyState = createInterviewEmptyState({
        activeInterviewsRoute: routes.demoViewInterviews,
        filtersAreActive,
        onClearFilters: () => void updatePreferences({ archived_interview_time_filters: [...INTERVIEW_TIME_FILTERS] }),
        variant: 'archived',
    });
    const viewMode = preferences.archived_interview_view_mode;
    const isBoardView = viewMode === 'board';

    const handleDelete = async (archivedInterviewId: number) => {
        const { confirmed } = await confirm(createDeleteConfirmation('archived job interview'));

        if (!confirmed) {
            return;
        }

        dispatch({ type: 'DELETE_ARCHIVED_INTERVIEW', payload: { archivedInterviewId } });
        showSuccessToast('Archived interview deleted.');
    };

    const handleDeleteAll = async () => {
        if (deleteAllPendingRef.current) {
            return;
        }

        deleteAllPendingRef.current = true;
        setIsDeletingAll(true);

        try {
            if (state.archivedInterviews.length === 0) {
                return;
            }

            const { confirmed } = await confirm(
                createDeleteAllInterviewsConfirmation(state.archivedInterviews.length, 'archived')
            );

            if (!confirmed) {
                return;
            }

            dispatch({ type: 'DELETE_ALL_ARCHIVED_INTERVIEWS' });
            showSuccessToast('Archived interviews deleted.');
        } finally {
            deleteAllPendingRef.current = false;
            setIsDeletingAll(false);
        }
    };

    const handleTimeFilterChange = async (timeFilters: InterviewTimeFilter[]) => {
        await updatePreferences({ archived_interview_time_filters: timeFilters });
        return true;
    };

    const handleViewApplicationClick = (event: MouseEvent<HTMLAnchorElement>, interview: ArchivedJobInterview) => {
        event.preventDefault();

        const navigationState: ApplicationListNavigationState = {
            applicationListJobStatus: interview.job_status,
            applicationListTargetId: interview.archived_job_id,
        };
        navigate(routes.demoArchivedApplications, { state: navigationState });
    };

    return (
        <div className={`${styles.interviewList} ${isBoardView ? styles.boardLayout : ''}`}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        hasDisplayedInterviews ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename='demo_archived_job_interviews.csv'
                                csvHeaders={INTERVIEW_CSV_HEADERS}
                                deleteLabel='Delete all archived interviews'
                                id='demo-archived-interview-more-options'
                                isDeleting={isDeletingAll}
                                onDelete={() => void handleDeleteAll()}
                            />
                        ) : undefined
                    }
                    ariaLabel='Demo archived interview view and management controls'
                    mobileLayout='inlineWhenPossible'
                >
                    <CollectionViewToggle
                        ariaLabel='Archived interview view'
                        currentView={viewMode}
                        onViewChange={(nextViewMode) =>
                            void updatePreferences({ archived_interview_view_mode: nextViewMode })
                        }
                    />
                    <CheckboxFilter
                        buttonLabel='Filter by'
                        id='demo-archived-interview-time-filter'
                        onSelectionChange={handleTimeFilterChange}
                        options={INTERVIEW_TIME_FILTERS}
                        selectedOptions={selectedTimeFilters}
                    />
                </ActivityControls>
            </div>
            {!hasDisplayedInterviews && <EmptyState {...emptyState} />}

            {hasDisplayedInterviews && (
                <InterviewGrid ariaLabel='Archived interviews' layout={viewMode}>
                    {displayedInterviews.map((interview, index) => (
                        <InterviewCard
                            applicationRoute={routes.demoArchivedApplications}
                            currentTime={currentTime}
                            index={index}
                            interview={interview}
                            isDeleting={false}
                            key={interview.archived_interview_id}
                            layout={viewMode}
                            onDelete={() => handleDelete(interview.archived_interview_id)}
                            onViewApplicationClick={(event) => handleViewApplicationClick(event, interview)}
                            variant='archived'
                        />
                    ))}
                </InterviewGrid>
            )}
        </div>
    );
};

export default DemoViewArchivedInterview;
