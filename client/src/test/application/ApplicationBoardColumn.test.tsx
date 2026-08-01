import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import ApplicationBoardColumn from '../../pages/application/applicationBoard/ApplicationBoardColumn';
import styles from '../../pages/application/applicationBoard/ApplicationBoard.module.css';

const droppableState = vi.hoisted(() => ({ isOver: false }));

vi.mock('@dnd-kit/core', () => ({
    useDroppable: () => ({
        isOver: droppableState.isOver,
        setNodeRef: vi.fn(),
    }),
}));

const renderColumn = (
    { isDropDisabled = false, isDropOrigin = false } = {},
    children: ReactNode = <p>Application card</p>
) =>
    render(
        <ApplicationBoardColumn
            applications={[{ job_status: 'Applied' }]}
            isDropDisabled={isDropDisabled}
            isDropOrigin={isDropOrigin}
            status='Interview'
        >
            {children}
        </ApplicationBoardColumn>
    );

describe('ApplicationBoardColumn', () => {
    beforeEach(() => {
        droppableState.isOver = false;
    });

    test('shows the destination status while a valid dragged card is over the column', () => {
        droppableState.isOver = true;

        renderColumn();

        const watermark = document.querySelector(`.${styles.dropTargetPattern}`);
        const pattern = watermark?.querySelector('pattern');
        const fill = watermark?.querySelector('rect');
        expect(pattern).toHaveAttribute('height', '14');
        expect(pattern).toHaveAttribute('patternTransform', 'rotate(-45)');
        expect(pattern).toHaveAttribute('patternUnits', 'userSpaceOnUse');
        expect(pattern?.querySelector('text')).toHaveTextContent('Interview');
        expect(fill).toHaveAttribute('height', '100%');
        expect(fill).toHaveAttribute('width', '100%');
        expect(fill?.getAttribute('fill')).toMatch(/^url\(#application-board-drop-pattern-/);
        expect(screen.getByRole('region', { name: 'Interview 1' })).toHaveClass(styles.dropTarget);
    });

    test('does not show a valid destination message for a disabled drop column', () => {
        droppableState.isOver = true;

        renderColumn({ isDropDisabled: true });

        expect(screen.getAllByText('Interview')).toHaveLength(1);
        expect(screen.getByRole('region', { name: 'Interview 1' }))
            .toHaveAttribute('aria-disabled', 'true')
            .toHaveClass(styles.dropDisabled);
    });

    test('keeps the dragged card origin column neutral', () => {
        droppableState.isOver = true;

        renderColumn({ isDropOrigin: true });

        expect(screen.getAllByText('Interview')).toHaveLength(1);
        expect(screen.getByRole('region', { name: 'Interview 1' })).not.toHaveClass(styles.dropTarget);
    });
});
