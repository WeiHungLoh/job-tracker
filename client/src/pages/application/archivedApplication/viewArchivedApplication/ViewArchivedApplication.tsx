import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArchivedJobApplication } from '../../models';
import { createApplicationCsvData } from '../../../../helper/csvExport';
import { createApplicationRelationConfirmation } from '../../applicationRelationConfirmation';
import {
    createDeleteAllApplicationsConfirmation,
    createUnarchiveAllConfirmation,
} from '../../../../components/confirmation/bulkConfirmations';
import {
    APPLICATION_BOARD_SORT_OPTIONS,
    APPLICATION_CSV_HEADERS,
    APPLICATION_LIST_SORT_OPTIONS,
    JOB_STATUSES,
    type ApplicationBoardSortOrder,
    type ApplicationListSortOrder,
    type JobStatus,
} from '../../models';
import SkeletonCard from '../../../../components/skeletonLoader/skeletonCard/SkeletonCard';
import { scrollAndHighlight } from '../../../../helper/highlightElement';
import ToggleButton from '../../../../components/toggleButton/ToggleButton';
import styles from './ViewArchivedApplication.module.css';
import { useConfirm } from 'material-ui-confirm';
import { useJobTrackerAPI } from '../../../../api/useJobTrackerAPI';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../../../components/toast/ToastProvider';
import { useUserPreferences } from '../../../../components/userPreferences/UserPreferencesProvider';
import { getErrorToastMessage } from '../../../../helper/getErrorToastMessage';
import CheckboxFilter from '../../../../components/activityControls/checkboxFilter/CheckboxFilter';
import type { UpdateUserPreferencesRequest } from '../../../../components/userPreferences/models';
import usePendingIds from '../../../../hooks/usePendingIds';
import ApplicationCard from '../../ApplicationCard';
import ActivityControls from '../../../../components/activityControls/ActivityControls';
import DisplayOptions from '../../../../components/activityControls/displayOptions/DisplayOptions';
import MoreOptions from '../../../../components/activityControls/moreOptions/MoreOptions';
import ArchivedApplicationBoard from '../archivedApplicationBoard/ArchivedApplicationBoard';
import CollectionViewToggle from '../../../../components/activityControls/collectionViewToggle/CollectionViewToggle';
import type { CollectionViewMode } from '../../../../components/activityControls/collectionViewToggle/models';
import SkeletonBoard from '../../../../components/skeletonLoader/skeletonBoard/SkeletonBoard';
import EmptyState from '../../../../components/emptyState/EmptyState';
import { routes } from '../../../../routes';
import { createApplicationEmptyState } from '../../applicationEmptyState';
import SortOptions from '../../../../components/activityControls/sortOptions/SortOptions';
import { sortApplications } from '../../applicationSorting';
import { getApplicationsInBoardOrder } from '../../applicationBoard/applicationBoardUtils';
import useFilterRequest from '../../../../hooks/useFilterRequest';
import {
    getApplicationListJobStatuses,
    getApplicationListJobStatus,
    getApplicationListTargetId,
} from '../../applicationNavigation';

const ViewArchivedApplication = () => {
    const api = useJobTrackerAPI();
    const { preferences, updatePreferences } = useUserPreferences();
    const [archivedApplications, setArchivedApplications] = useState<ArchivedJobApplication[]>([]);
    const location = useLocation();
    const navigate = useNavigate();
    const navigationJobStatusRef = useRef(getApplicationListJobStatus(location.state));
    const navigationApplicationIdRef = useRef(getApplicationListTargetId(location.state));
    const showCorrespondingAppTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const confirm = useConfirm();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isFilteringApplications, setIsFilteringApplications] = useState<boolean>(false);
    const [pendingBulkAction, setPendingBulkAction] = useState<'delete' | 'unarchive' | null>(null);
    const bulkActionPendingRef = useRef(false);
    const pendingApplicationActionIdsRef = useRef<Set<number>>(new Set());
    const {
        pendingIds: deletingApplicationIds,
        startPending: startDeletingApplication,
        stopPending: stopDeletingApplication,
    } = usePendingIds();
    const {
        pendingIds: unarchivingApplicationIds,
        startPending: startUnarchivingApplication,
        stopPending: stopUnarchivingApplication,
    } = usePendingIds();
    const { showErrorToast, showSuccessToast } = useToast();
    const filterRequest = useFilterRequest<ArchivedJobApplication[]>();
    const selectedJobStatuses = preferences.archived_application_job_statuses;
    const showNotes = preferences.archived_application_show_notes;
    const viewMode = preferences.archived_application_view_mode;
    const isBoardView = viewMode === 'board';
    const currentSortOrder = isBoardView
        ? preferences.archived_application_board_sort_order
        : preferences.archived_application_list_sort_order;
    const displayedApplications = useMemo(
        () => sortApplications(archivedApplications, currentSortOrder),
        [archivedApplications, currentSortOrder]
    );
    const csvApplications = useMemo(
        () =>
            isBoardView
                ? getApplicationsInBoardOrder(displayedApplications, selectedJobStatuses)
                : displayedApplications,
        [displayedApplications, isBoardView, selectedJobStatuses]
    );
    const csvData = useMemo(() => createApplicationCsvData(csvApplications), [csvApplications]);

    const handleViewModeChange = (nextViewMode: CollectionViewMode) => {
        void handlePreferenceUpdate({ archived_application_view_mode: nextViewMode });
    };

    const handleListSortOrderChange = async (sortOrder: ApplicationListSortOrder): Promise<boolean> => {
        try {
            await updatePreferences({ archived_application_list_sort_order: sortOrder });
            return true;
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(
                    error,
                    'Unable to save the archived application sorting preference. Please try again.'
                )
            );
            return false;
        }
    };

    const handleBoardSortOrderChange = async (sortOrder: ApplicationBoardSortOrder): Promise<boolean> => {
        try {
            await updatePreferences({ archived_application_board_sort_order: sortOrder });
            return true;
        } catch (error) {
            showErrorToast(
                getErrorToastMessage(
                    error,
                    'Unable to save the archived application sorting preference. Please try again.'
                )
            );
            return false;
        }
    };

    const handleJobStatusChange = async (jobStatuses: JobStatus[]) => {
        const requestId = filterRequest.startRequest();
        setIsFilteringApplications(true);

        try {
            const archivedApplications = await api.archivedApplication.listApplications({ jobStatuses });
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            await updatePreferences({ archived_application_job_statuses: jobStatuses });
            const savedApplications = filterRequest.saveResult(
                requestId,
                Array.isArray(archivedApplications) ? archivedApplications : []
            );
            if (savedApplications) {
                setArchivedApplications(savedApplications);
            }

            return true;
        } catch (error) {
            if (!filterRequest.isLatestRequest(requestId)) {
                return true;
            }

            const savedApplications = filterRequest.failRequest(requestId);
            if (savedApplications) {
                setArchivedApplications(savedApplications);
            }
            showErrorToast(
                getErrorToastMessage(error, 'Unable to filter archived job applications. Please try again.')
            );
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

    useEffect(() => {
        let isActive = true;

        const fetchApplications = async () => {
            const navigationJobStatus = navigationJobStatusRef.current;
            const navigationApplicationId = navigationApplicationIdRef.current;
            const initialJobStatuses = getApplicationListJobStatuses(
                selectedJobStatuses,
                navigationJobStatus,
                navigationApplicationId
            );

            try {
                const preferenceUpdates: UpdateUserPreferencesRequest = {};
                if (initialJobStatuses !== selectedJobStatuses) {
                    preferenceUpdates.archived_application_job_statuses = initialJobStatuses;
                }
                if (navigationApplicationId && isBoardView) {
                    preferenceUpdates.archived_application_view_mode = 'list';
                }
                const preferenceUpdate =
                    Object.keys(preferenceUpdates).length > 0
                        ? updatePreferences(preferenceUpdates).catch((error: unknown) => {
                              showErrorToast(
                                  getErrorToastMessage(
                                      error,
                                      'Unable to filter archived job applications. Please try again.'
                                  )
                              );
                          })
                        : Promise.resolve();
                const [fetchedApplications] = await Promise.all([
                    api.archivedApplication.listApplications({ jobStatuses: initialJobStatuses }),
                    preferenceUpdate,
                ]);
                if (isActive) {
                    setArchivedApplications(Array.isArray(fetchedApplications) ? fetchedApplications : []);
                }
            } catch (error) {
                showErrorToast(
                    getErrorToastMessage(error, 'Unable to load archived job applications. Please try again.')
                );
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        void fetchApplications();
        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        const targetApplicationId = navigationApplicationIdRef.current;
        if (isLoading || isBoardView || !targetApplicationId) {
            return;
        }

        if (archivedApplications.some((application) => application.archived_job_id === targetApplicationId)) {
            scrollAndHighlight(String(targetApplicationId), styles.highlighted, showCorrespondingAppTimeout.current);
        }

        navigationApplicationIdRef.current = null;
        navigationJobStatusRef.current = null;
        navigate(location.pathname, { replace: true, state: null });
    }, [archivedApplications, isBoardView, isLoading, location.pathname, navigate]);

    useEffect(() => {
        const targetApplicationId = location.hash.substring(1);
        if (isLoading || isBoardView || !targetApplicationId) {
            return;
        }

        const targetApplicationIsVisible = archivedApplications.some(
            (application) => String(application.archived_job_id) === targetApplicationId
        );
        if (!targetApplicationIsVisible) {
            return;
        }

        scrollAndHighlight(targetApplicationId, styles.highlighted, showCorrespondingAppTimeout.current);
        navigate(location.pathname, { replace: true });
    }, [archivedApplications, isBoardView, isLoading, location.hash, location.pathname, navigate]);

    const handleApplicationAction = async (action: 'delete' | 'unarchive', archivedJobId: number) => {
        if (pendingApplicationActionIdsRef.current.has(archivedJobId)) {
            return;
        }

        pendingApplicationActionIdsRef.current.add(archivedJobId);
        if (action === 'unarchive') {
            startUnarchivingApplication(archivedJobId);
        } else {
            startDeletingApplication(archivedJobId);
        }

        try {
            const summary = await api.archivedApplication.getRelationSummary({ archivedJobId });
            const { confirmed } = await confirm(
                createApplicationRelationConfirmation(
                    action,
                    'archived',
                    summary.related_interview_count,
                    summary.offer_evaluation_count,
                    summary.counteroffer_plan_count
                )
            );

            if (!confirmed) {
                return;
            }

            if (action === 'unarchive') {
                await api.archivedApplication.unarchiveApplication({ archivedJobId });
            } else {
                await api.archivedApplication.deleteApplication({ archivedJobId });
            }

            setArchivedApplications((current) =>
                current.filter((application) => application.archived_job_id !== archivedJobId)
            );
            showSuccessToast(action === 'unarchive' ? 'Job application unarchived.' : 'Job application deleted.');
        } catch (error) {
            const fallback =
                action === 'unarchive'
                    ? 'Unable to unarchive the job application. Please try again.'
                    : 'Unable to delete the archived job application. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
        } finally {
            pendingApplicationActionIdsRef.current.delete(archivedJobId);
            if (action === 'unarchive') {
                stopUnarchivingApplication(archivedJobId);
            } else {
                stopDeletingApplication(archivedJobId);
            }
        }
    };

    const handleDelete = (archivedJobId: number) => handleApplicationAction('delete', archivedJobId);
    const handleUnarchive = (archivedJobId: number) => handleApplicationAction('unarchive', archivedJobId);

    const handleBulkAction = async (action: 'delete' | 'unarchive') => {
        if (bulkActionPendingRef.current) {
            return;
        }

        bulkActionPendingRef.current = true;
        setPendingBulkAction(action);
        let countsLoaded = false;

        try {
            const summary = await api.archivedApplication.getSummary();
            countsLoaded = true;

            if (summary.application_count === 0) {
                setArchivedApplications([]);
                return;
            }

            const confirmation =
                action === 'unarchive'
                    ? createUnarchiveAllConfirmation(
                          summary.application_count,
                          summary.related_interview_count,
                          summary.offer_evaluation_count,
                          summary.counteroffer_plan_count
                      )
                    : createDeleteAllApplicationsConfirmation(
                          summary.application_count,
                          summary.related_interview_count,
                          summary.offer_evaluation_count,
                          'archived',
                          summary.counteroffer_plan_count
                      );
            const { confirmed } = await confirm(confirmation);

            if (!confirmed) {
                return;
            }

            if (action === 'unarchive') {
                await api.archivedApplication.unarchiveAllApplications();
            } else {
                await api.archivedApplication.deleteAllApplications();
            }

            setArchivedApplications([]);
            showSuccessToast(action === 'unarchive' ? 'Job applications unarchived.' : 'Job applications deleted.');
        } catch (error) {
            const fallback = !countsLoaded
                ? 'Unable to load archived application counts. Please try again.'
                : action === 'unarchive'
                ? 'Unable to unarchive job applications. Please try again.'
                : 'Unable to delete archived job applications. Please try again.';
            showErrorToast(getErrorToastMessage(error, fallback));
        } finally {
            bulkActionPendingRef.current = false;
            setPendingBulkAction(null);
        }
    };

    const hasApplications = archivedApplications.length > 0;
    const filtersAreActive = selectedJobStatuses.length !== JOB_STATUSES.length;
    const emptyState = createApplicationEmptyState({
        actionRoute: routes.viewApplications,
        filtersAreActive,
        onClearFilters: () => void handleJobStatusChange([...JOB_STATUSES]),
        variant: 'archived',
    });

    return (
        <div className={`${styles.archivedApplicationList} ${isBoardView ? styles.boardLayout : ''}`}>
            <div className={styles.controlsRow}>
                <ActivityControls
                    actions={
                        !isLoading && hasApplications ? (
                            <MoreOptions
                                csvData={csvData}
                                csvFilename='archived_job_applications.csv'
                                csvHeaders={APPLICATION_CSV_HEADERS}
                                deleteDisabled={pendingBulkAction === 'unarchive'}
                                deleteLabel='Delete all archived applications'
                                id='archived-application-more-options'
                                isDeleting={pendingBulkAction === 'delete'}
                                middleAction={{
                                    disabled: pendingBulkAction === 'delete',
                                    icon: 'archive',
                                    isLoading: pendingBulkAction === 'unarchive',
                                    label: 'Unarchive all applications',
                                    onClick: () => void handleBulkAction('unarchive'),
                                }}
                                onDelete={() => void handleBulkAction('delete')}
                            />
                        ) : undefined
                    }
                    ariaLabel='Archived application view and management controls'
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
                        id='archived-application-job-status-filter'
                        onSelectionChange={handleJobStatusChange}
                        options={JOB_STATUSES}
                        selectedOptions={selectedJobStatuses}
                    />
                    {hasApplications &&
                        (isBoardView ? (
                            <SortOptions
                                disabled={isLoading}
                                id='archived-application-board-sort-options'
                                onSelectionChange={handleBoardSortOrderChange}
                                options={APPLICATION_BOARD_SORT_OPTIONS}
                                selectedOption={preferences.archived_application_board_sort_order}
                            />
                        ) : (
                            <SortOptions
                                disabled={isLoading}
                                id='archived-application-list-sort-options'
                                onSelectionChange={handleListSortOrderChange}
                                options={APPLICATION_LIST_SORT_OPTIONS}
                                selectedOption={preferences.archived_application_list_sort_order}
                            />
                        ))}
                    {hasApplications && !isBoardView && (
                        <DisplayOptions id='archived-application-display-options'>
                            <ToggleButton
                                toggled={showNotes}
                                onToggle={() =>
                                    void handlePreferenceUpdate({
                                        archived_application_show_notes: !showNotes,
                                    })
                                }
                                label='Show notes'
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
                        <ArchivedApplicationBoard
                            applications={displayedApplications}
                            deletingApplicationIds={deletingApplicationIds}
                            onDelete={handleDelete}
                            onUnarchive={handleUnarchive}
                            selectedJobStatuses={selectedJobStatuses}
                            showNotes={showNotes}
                            unarchivingApplicationIds={unarchivingApplicationIds}
                        />
                    )}

                    {!isBoardView &&
                        displayedApplications.map((application, index) => (
                            <ApplicationCard
                                application={application}
                                index={index}
                                isDeleting={deletingApplicationIds.has(application.archived_job_id)}
                                isUnarchiving={unarchivingApplicationIds.has(application.archived_job_id)}
                                key={application.archived_job_id}
                                onDelete={handleDelete}
                                onUnarchive={handleUnarchive}
                                showNotes={showNotes}
                                variant='archived'
                            />
                        ))}
                </>
            )}
        </div>
    );
};

export default ViewArchivedApplication;
