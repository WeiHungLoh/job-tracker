import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FollowUpSentBadge from '../../components/followUpSentBadge/FollowUpSentBadge';
import { formatFollowUpSentAt } from '../../helper/dateFormatter';

const timestamp = '2026-07-27T07:42:00.000Z';

describe('FollowUpSentBadge', () => {
    test('shows the full timestamp and an accessible compact destructive Undo action', async () => {
        const onUndo = vi.fn();

        render(<FollowUpSentBadge contextLabel='Role at Acme' isUndoing={false} onUndo={onUndo} sentAt={timestamp} />);

        expect(screen.getByRole('status')).toHaveTextContent('Follow-up sent on');
        expect(screen.getByRole('status')).toHaveTextContent(formatFollowUpSentAt(timestamp));
        const undo = screen.getByRole('button', { name: 'Undo follow-up for Role at Acme' });
        await userEvent.click(undo);

        expect(onUndo).toHaveBeenCalledOnce();
    });

    test('renders a read-only compact indicator without an Undo button', () => {
        render(<FollowUpSentBadge compact contextLabel='Role at Acme' sentAt={timestamp} />);

        expect(screen.getByRole('status')).toHaveTextContent('Follow-up sent · 27 Jul');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('prevents pointer activation from bubbling into a draggable card', () => {
        const parentPointerDown = vi.fn();

        render(
            <div onPointerDown={parentPointerDown}>
                <FollowUpSentBadge contextLabel='Role at Acme' isUndoing={false} onUndo={vi.fn()} sentAt={timestamp} />
            </div>
        );

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Undo follow-up for Role at Acme' }));

        expect(parentPointerDown).not.toHaveBeenCalled();
    });
});
