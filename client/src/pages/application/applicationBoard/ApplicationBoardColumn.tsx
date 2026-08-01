import { useDroppable } from '@dnd-kit/core';
import { useId, type CSSProperties } from 'react';
import type { ApplicationBoardColumnProps, BoardColumnContentProps } from './models';
import { getApplicationBoardStatusColor } from './statusClassNames';
import styles from './ApplicationBoard.module.css';

const DROP_TARGET_PATTERN_ROW_HEIGHT = 14;

const getColumnStyle = (status: BoardColumnContentProps['status']) =>
    ({
        '--boardStatusColor': getApplicationBoardStatusColor(status),
    } as CSSProperties);

const BoardColumnContent = ({ applications, children, status }: BoardColumnContentProps) => (
    <>
        <h2 className={styles.columnHeading} id={`application-board-column-${status}`}>
            <span className={styles.columnTitle}>{status}</span>{' '}
            <span className={styles.columnCount}>{applications.length}</span>
        </h2>
        <div className={styles.columnCards}>
            {children}
            {applications.length === 0 && <p className={styles.emptyColumn}>No applications</p>}
        </div>
    </>
);

const DroppableApplicationBoardColumn = ({
    applications,
    children,
    isDropDisabled = false,
    isDropOrigin = false,
    status,
}: BoardColumnContentProps & Pick<ApplicationBoardColumnProps, 'isDropDisabled' | 'isDropOrigin'>) => {
    const { isOver, setNodeRef } = useDroppable({ disabled: isDropDisabled, id: status });
    const isValidDropTarget = isOver && !isDropDisabled && !isDropOrigin;
    const patternId = `application-board-drop-pattern-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const patternWidth = Math.max(44, status.length * 6 + 14);
    const columnClassName = [
        styles.column,
        isValidDropTarget ? styles.dropTarget : '',
        isDropDisabled ? styles.dropDisabled : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <section
            aria-disabled={isDropDisabled || undefined}
            aria-labelledby={`application-board-column-${status}`}
            className={columnClassName}
            ref={setNodeRef}
            style={getColumnStyle(status)}
        >
            {isValidDropTarget && (
                <svg aria-hidden='true' className={styles.dropTargetPattern} focusable='false'>
                    <defs>
                        <pattern
                            height={DROP_TARGET_PATTERN_ROW_HEIGHT}
                            id={patternId}
                            patternTransform='rotate(-45)'
                            patternUnits='userSpaceOnUse'
                            width={patternWidth}
                        >
                            <text className={styles.dropTargetPatternText} x='2' y='10'>
                                {status}
                            </text>
                        </pattern>
                    </defs>
                    <rect fill={`url(#${patternId})`} height='100%' width='100%' x='0' y='0' />
                </svg>
            )}
            <BoardColumnContent applications={applications} status={status}>
                {children}
            </BoardColumnContent>
        </section>
    );
};

const ApplicationBoardColumn = ({
    applications,
    children,
    droppable = true,
    isDropDisabled = false,
    isDropOrigin = false,
    status,
}: ApplicationBoardColumnProps) => {
    if (droppable) {
        return (
            <DroppableApplicationBoardColumn
                applications={applications}
                isDropDisabled={isDropDisabled}
                isDropOrigin={isDropOrigin}
                status={status}
            >
                {children}
            </DroppableApplicationBoardColumn>
        );
    }

    return (
        <section
            aria-labelledby={`application-board-column-${status}`}
            className={styles.column}
            style={getColumnStyle(status)}
        >
            <BoardColumnContent applications={applications} status={status}>
                {children}
            </BoardColumnContent>
        </section>
    );
};

export default ApplicationBoardColumn;
