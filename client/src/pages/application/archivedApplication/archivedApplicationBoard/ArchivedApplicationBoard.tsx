import ApplicationBoardColumn from '../../applicationBoard/ApplicationBoardColumn';
import ArchivedApplicationBoardCard from './ArchivedApplicationBoardCard';
import { getOrderedBoardStatuses, groupApplicationsByStatus } from '../../applicationBoard/applicationBoardUtils';
import type { ArchivedApplicationBoardProps } from './models';
import styles from '../../applicationBoard/ApplicationBoard.module.css';
import { useEffect, useRef, useState } from 'react';
import {
    BOARD_CARD_HIGHLIGHT_DURATION,
    revealApplicationBoardTarget,
} from '../../applicationBoard/applicationBoardTarget';

const ArchivedApplicationBoard = ({
    applications,
    deletingApplicationIds,
    onDelete,
    onTargetHandled,
    onUnarchive,
    selectedJobStatuses,
    showNotes,
    targetRequest,
    unarchivingApplicationIds,
}: ArchivedApplicationBoardProps) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onTargetHandledRef = useRef(onTargetHandled);
    onTargetHandledRef.current = onTargetHandled;
    const [highlightedApplicationId, setHighlightedApplicationId] = useState<number | null>(null);
    const groupedApplications = groupApplicationsByStatus(applications);
    const boardStatuses = getOrderedBoardStatuses(selectedJobStatuses);

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

    return (
        <div aria-label='Archived application board' className={styles.board} ref={boardRef} role='region'>
            {boardStatuses.map((status) => {
                const statusApplications = groupedApplications[status];

                return (
                    <ApplicationBoardColumn
                        applications={statusApplications}
                        droppable={false}
                        key={status}
                        status={status}
                    >
                        {statusApplications.map((application) => (
                            <ArchivedApplicationBoardCard
                                application={application}
                                isDeleting={deletingApplicationIds.has(application.archived_job_id)}
                                isHighlighted={highlightedApplicationId === application.archived_job_id}
                                isUnarchiving={unarchivingApplicationIds.has(application.archived_job_id)}
                                key={application.archived_job_id}
                                onDelete={onDelete}
                                onUnarchive={onUnarchive}
                                showNotes={showNotes}
                            />
                        ))}
                    </ApplicationBoardColumn>
                );
            })}
        </div>
    );
};

export default ArchivedApplicationBoard;
