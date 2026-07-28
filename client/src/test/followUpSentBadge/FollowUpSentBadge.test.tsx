import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        expect(screen.getByRole('status')).not.toHaveAttribute('data-mobile-tooltip');
        expect(screen.getByText('Follow-up sent')).not.toHaveAttribute('data-mobile-tooltip');
        expect(screen.getAllByText(formatFollowUpSentAt(timestamp), { selector: 'time' })).toHaveLength(1);
        const undo = screen.getByRole('button', { name: 'Undo follow-up for Role at Acme' });
        expect(undo).not.toHaveAttribute('title');

        await userEvent.hover(screen.getByText('Follow-up sent'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(formatFollowUpSentAt(timestamp));
        await userEvent.unhover(screen.getByText('Follow-up sent'));
        await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());

        await userEvent.hover(undo);
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Undo');
        expect(screen.queryByText(formatFollowUpSentAt(timestamp), { selector: '[role="tooltip"]' })).toBeNull();
        await userEvent.click(undo);

        expect(onUndo).toHaveBeenCalledOnce();
    });

    test('renders the compact label with a date tooltip and without an Undo button when read-only', async () => {
        render(<FollowUpSentBadge compact contextLabel='Role at Acme' sentAt={timestamp} />);

        expect(screen.getByRole('status')).toHaveTextContent('Follow-up sent');
        expect(screen.getByRole('status')).not.toHaveTextContent('27 Jul');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();

        await userEvent.hover(screen.getByText('Follow-up sent'));

        expect(await screen.findByRole('tooltip')).toHaveTextContent(formatFollowUpSentAt(timestamp));
    });

    test('keeps compact date and Undo tooltips on separate triggers', async () => {
        render(<FollowUpSentBadge compact contextLabel='Role at Acme' onUndo={vi.fn()} sentAt={timestamp} />);

        const undo = screen.getByRole('button', { name: 'Undo follow-up for Role at Acme' });
        await userEvent.hover(undo);

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Undo');
        expect(screen.queryByText(formatFollowUpSentAt(timestamp), { selector: '[role="tooltip"]' })).toBeNull();
    });

    test('accepts a view-specific class without changing the status semantics', () => {
        render(
            <FollowUpSentBadge
                className='application-board-follow-up'
                compact
                contextLabel='Role at Acme'
                sentAt={timestamp}
            />
        );

        expect(screen.getByRole('status')).toHaveClass('application-board-follow-up');
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
