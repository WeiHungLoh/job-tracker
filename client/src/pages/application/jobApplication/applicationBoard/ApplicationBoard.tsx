import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    type Modifier,
} from '@dnd-kit/core';
import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react';
import ApplicationBoardCard from './ApplicationBoardCard';
import ApplicationBoardColumn from '../../applicationBoard/ApplicationBoardColumn';
import {
    detectApplicationBoardCollisions,
    getOrderedBoardStatuses,
    groupApplicationsByStatus,
    isJobStatus,
} from '../../applicationBoard/applicationBoardUtils';
import type { ApplicationBoardProps } from './models';
import styles from '../../applicationBoard/ApplicationBoard.module.css';
import { isApplicationStatusDisabled } from '../../applicationStatusRestrictions';
import {
    BOARD_CARD_HIGHLIGHT_DURATION,
    getMaxBoardScrollLeft,
    revealApplicationBoardTarget,
} from '../../applicationBoard/applicationBoardTarget';

export { getCenteredBoardScrollLeft, getCenteredPageScrollTop } from '../../applicationBoard/applicationBoardTarget';

const SCROLL_BOUNDARY_TOLERANCE = 1;
const isApplicationBoardElement = (element: Element) => element.classList.contains(styles.board);

const canAutoScrollBoard = (element: Element) =>
    isApplicationBoardElement(element) && getMaxBoardScrollLeft(element as HTMLElement) > 0;

const clampBoardScrollLeft = (board: Element) => {
    const maxScrollLeft = getMaxBoardScrollLeft(board as HTMLElement);

    if (board.scrollLeft < 0) {
        board.scrollLeft = 0;
        return;
    }

    if (board.scrollLeft >= maxScrollLeft - SCROLL_BOUNDARY_TOLERANCE) {
        board.scrollLeft = maxScrollLeft;
    }
};

const clampBoardScroll = (event: UIEvent<HTMLDivElement>) => {
    clampBoardScrollLeft(event.currentTarget);
};

const restrictDragToBoardViewport: Modifier = ({
    activeNodeRect,
    scrollableAncestorRects,
    scrollableAncestors,
    transform,
}) => {
    const boardIndex = scrollableAncestors.findIndex(isApplicationBoardElement);
    const boardRect = scrollableAncestorRects[boardIndex];

    if (!activeNodeRect || !boardRect) {
        return transform;
    }

    const minX = boardRect.left - activeNodeRect.left;
    const maxX = boardRect.right - activeNodeRect.right;

    if (maxX < minX) {
        return transform;
    }

    return {
        ...transform,
        x: Math.min(maxX, Math.max(minX, transform.x)),
    };
};

const APPLICATION_BOARD_DRAG_MODIFIERS: Modifier[] = [restrictDragToBoardViewport];

const getDragJobId = (id: DragStartEvent['active']['id']) => {
    const jobId = Number(id);

    return Number.isFinite(jobId) ? jobId : null;
};

const ApplicationBoard = ({
    applications,
    deletingApplicationIds,
    editedNotes,
    hasInterview,
    hasOfferEvaluation,
    isArchivingApplication,
    isUpdatingApplicationPin,
    isUpdatingApplicationStatus,
    isUndoingApplicationFollowUp,
    noteSaveStatuses,
    onArchive,
    onDelete,
    onEditNotes,
    onNotesBlur,
    onNotesVisibilityChange,
    onPinToggle,
    onRetryNotes,
    onStatusChange,
    onTargetHandled,
    onUndoFollowUp,
    selectedJobStatuses,
    targetRequest,
    upcomingInterviewCountByJob,
}: ApplicationBoardProps) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onTargetHandledRef = useRef(onTargetHandled);
    onTargetHandledRef.current = onTargetHandled;
    const [draggingApplicationId, setDraggingApplicationId] = useState<number | null>(null);
    const [highlightedApplicationId, setHighlightedApplicationId] = useState<number | null>(null);
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
    const groupedApplications = groupApplicationsByStatus(applications);
    const boardStatuses = getOrderedBoardStatuses(selectedJobStatuses);
    const draggingApplication = applications.find((application) => application.job_id === draggingApplicationId);
    const activeApplicationHasInterview = draggingApplicationId !== null && hasInterview(draggingApplicationId);
    const activeApplicationHasOfferEvaluation =
        draggingApplicationId !== null && hasOfferEvaluation(draggingApplicationId);
    const clampCurrentBoardScroll = useCallback(() => {
        if (boardRef.current) {
            clampBoardScrollLeft(boardRef.current);
        }
    }, []);

    useEffect(
        () => () => {
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
            }
        },
        []
    );

    useEffect(() => {
        const board = boardRef.current;
        if (!board || !targetRequest) {
            return;
        }

        const target = document.getElementById(String(targetRequest.applicationId));
        if (!target || !board.contains(target)) {
            return;
        }

        revealApplicationBoardTarget(board, target);
        setHighlightedApplicationId(targetRequest.applicationId);

        if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
        }
        const highlightTimeout = setTimeout(() => {
            setHighlightedApplicationId((currentId) => (currentId === targetRequest.applicationId ? null : currentId));
            if (highlightTimeoutRef.current === highlightTimeout) {
                highlightTimeoutRef.current = null;
            }
        }, BOARD_CARD_HIGHLIGHT_DURATION);
        highlightTimeoutRef.current = highlightTimeout;
        onTargetHandledRef.current?.(targetRequest);
    }, [applications, selectedJobStatuses, targetRequest]);

    const handleDragStart = (event: DragStartEvent) => {
        setDraggingApplicationId(getDragJobId(event.active.id));
    };

    const handleDragCancel = () => {
        setDraggingApplicationId(null);
        clampCurrentBoardScroll();
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setDraggingApplicationId(null);
        clampCurrentBoardScroll();

        const destinationStatus = String(event.over?.id ?? '');
        const jobId = getDragJobId(event.active.id);

        if (jobId === null) {
            return;
        }

        const application = applications.find((item) => item.job_id === jobId);

        if (!application || !isJobStatus(destinationStatus) || application.job_status === destinationStatus) {
            return;
        }
        if (
            isApplicationStatusDisabled(
                destinationStatus,
                hasInterview(application.job_id),
                hasOfferEvaluation(application.job_id)
            )
        ) {
            return;
        }

        void onStatusChange(application, destinationStatus);
    };

    return (
        <DndContext
            autoScroll={{ canScroll: canAutoScrollBoard }}
            collisionDetection={detectApplicationBoardCollisions}
            modifiers={APPLICATION_BOARD_DRAG_MODIFIERS}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
            onDragMove={clampCurrentBoardScroll}
            onDragStart={handleDragStart}
            sensors={sensors}
        >
            <div
                aria-label='Application board'
                className={styles.board}
                onScroll={clampBoardScroll}
                ref={boardRef}
                role='region'
            >
                {boardStatuses.map((status) => {
                    const statusApplications = groupedApplications[status];
                    const isDropDisabled = isApplicationStatusDisabled(
                        status,
                        activeApplicationHasInterview,
                        activeApplicationHasOfferEvaluation
                    );

                    return (
                        <ApplicationBoardColumn
                            applications={statusApplications}
                            isDropDisabled={isDropDisabled}
                            isDropOrigin={draggingApplication?.job_status === status}
                            key={status}
                            status={status}
                        >
                            {statusApplications.map((application) => (
                                <ApplicationBoardCard
                                    application={application}
                                    hasInterview={hasInterview(application.job_id)}
                                    hasOfferEvaluation={hasOfferEvaluation(application.job_id)}
                                    isArchiving={isArchivingApplication(application.job_id)}
                                    isDeleting={deletingApplicationIds.has(application.job_id)}
                                    isHighlighted={highlightedApplicationId === application.job_id}
                                    isUpdatingPin={isUpdatingApplicationPin(application.job_id)}
                                    isUpdatingStatus={isUpdatingApplicationStatus(application.job_id)}
                                    isUndoingFollowUp={isUndoingApplicationFollowUp?.(application.job_id)}
                                    key={application.job_id}
                                    note={editedNotes[application.job_id] ?? application.notes}
                                    noteSaveStatus={noteSaveStatuses[application.job_id] ?? 'idle'}
                                    onArchive={onArchive}
                                    onDelete={onDelete}
                                    onEditNotes={onEditNotes}
                                    onNotesBlur={onNotesBlur}
                                    onNotesVisibilityChange={onNotesVisibilityChange}
                                    onPinToggle={onPinToggle}
                                    onRetryNotes={onRetryNotes}
                                    onStatusChange={onStatusChange}
                                    onUndoFollowUp={onUndoFollowUp}
                                    upcomingInterviewCount={upcomingInterviewCountByJob[application.job_id] ?? 0}
                                />
                            ))}
                        </ApplicationBoardColumn>
                    );
                })}
            </div>
        </DndContext>
    );
};

export default ApplicationBoard;
