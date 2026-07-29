import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NeedsAttentionSettingsDialog from '../../pages/dashboard/attentionCenter/NeedsAttentionSettingsDialog';
import { render, testPreferences } from '../renderWithProviders';

const categoryLabels = [
    'Offer decision due soon',
    'Offer decision overdue',
    'Offer needs evaluation',
    'Interview follow-up unanswered',
    'Interview follow-up due',
    'Interview not scheduled',
    'Application follow-up unanswered',
    'Application follow-up due',
];

describe('NeedsAttentionSettingsDialog', () => {
    test('uses the already-loaded preferences and renders categories in fixed order with applicable timing fields', async () => {
        render(<NeedsAttentionSettingsDialog open onClose={vi.fn()} />);

        const dialog = screen.getByRole('dialog', { name: 'Customise Dashboard Reminders' });
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(
            within(dialog)
                .getAllByRole('checkbox')
                .map((checkbox) => checkbox.getAttribute('aria-label'))
        ).toEqual(categoryLabels);
        expect(
            within(dialog)
                .getAllByLabelText(/^Priority \d+$/)
                .map((priority) => priority.textContent)
        ).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
        expect(
            within(dialog).getByText(
                'Reminders are checked from 1 to 8. If several are due, lower numbers appear first. You can switch types off, but the order stays the same.'
            )
        ).toBeVisible();
        expect(within(dialog).getByText(/The card shows six before it scrolls\./)).toBeVisible();
        expect(within(dialog).getAllByRole('spinbutton')).toHaveLength(7);
        expect(within(dialog).getByLabelText('Maximum reminders shown (1–50)')).toHaveValue(10);
        const offerDueInput = within(dialog).getByLabelText('Start showing this many days before the deadline (1–14)');
        expect(offerDueInput).toHaveAttribute('step', '1');
        expect(offerDueInput).toHaveAttribute('min', '1');
        expect(offerDueInput).toHaveAttribute('max', '14');
    });

    test('disables a switched-off timing field, restores its draft value, and Reset to Default makes no request', async () => {
        const updatePreferences = vi.fn();
        render(<NeedsAttentionSettingsDialog open onClose={vi.fn()} />, { updatePreferences });

        const dueCheckbox = await screen.findByRole('checkbox', {
            name: 'Offer decision due soon',
        });
        const dueInput = screen.getByLabelText('Start showing this many days before the deadline (1–14)');
        await userEvent.clear(dueInput);
        await userEvent.type(dueInput, '9');
        await userEvent.click(dueCheckbox);
        expect(screen.getByLabelText('Start showing this many days before the deadline (1–14)')).toBeDisabled();
        expect(screen.getByLabelText('Start showing this many days before the deadline (1–14)')).toHaveValue(9);
        expect(dueCheckbox).not.toBeChecked();
        await userEvent.click(dueCheckbox);
        expect(dueCheckbox).toBeChecked();
        expect(screen.getByLabelText('Start showing this many days before the deadline (1–14)')).toBeEnabled();
        expect(screen.getByLabelText('Start showing this many days before the deadline (1–14)')).toHaveValue(9);

        await userEvent.click(screen.getByRole('button', { name: 'Reset to Default' }));
        expect(screen.getByLabelText('Start showing this many days before the deadline (1–14)')).toHaveValue(3);
        expect(screen.getByLabelText('Maximum reminders shown (1–50)')).toHaveValue(10);
        expect(screen.getAllByRole('checkbox').every((checkbox) => checkbox.hasAttribute('checked'))).toBe(true);
        expect(updatePreferences).not.toHaveBeenCalled();
    });

    test('toggles from card text but never from the timing input', async () => {
        render(<NeedsAttentionSettingsDialog open onClose={vi.fn()} />);

        const checkbox = await screen.findByRole('checkbox', {
            name: 'Offer decision due soon',
        });
        const description = screen.getByText('Evaluated offers before their decision deadline.');
        const input = screen.getByLabelText('Start showing this many days before the deadline (1–14)');

        await userEvent.click(input);
        expect(checkbox).toBeChecked();

        await userEvent.click(description);
        expect(checkbox).not.toBeChecked();
        expect(input).toBeDisabled();

        await userEvent.click(input);
        expect(checkbox).not.toBeChecked();

        await userEvent.click(screen.getByText('Start showing this many days before the deadline (1–14)'));
        expect(checkbox).toBeChecked();
    });

    test('rejects out-of-range timing values, keeps Save enabled, and saves all settings once on Enter', async () => {
        let resolveUpdate!: (value: typeof testPreferences) => void;
        const updatePreferences = vi.fn(
            () =>
                new Promise<typeof testPreferences>((resolve) => {
                    resolveUpdate = resolve;
                })
        );
        const onClose = vi.fn();
        render(<NeedsAttentionSettingsDialog open onClose={onClose} />, { updatePreferences });

        const input = await screen.findByLabelText('Start showing this many days after applying (1–30)');
        const save = screen.getByRole('button', { name: 'Save' });
        await userEvent.clear(input);
        await userEvent.type(input, '50');
        expect(input).toHaveValue(5);
        expect(save).toBeEnabled();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();

        await userEvent.clear(input);
        await userEvent.type(input, '9');
        await userEvent.keyboard('{Enter}');
        expect(updatePreferences).toHaveBeenCalledTimes(1);
        expect(updatePreferences).toHaveBeenCalledWith(
            expect.objectContaining({
                needs_attention_application_follow_up_days: 9,
                needs_attention_categories: testPreferences.needs_attention_categories,
                needs_attention_max_items: 10,
            })
        );
        expect(save).toHaveAttribute('aria-busy', 'true');

        await userEvent.keyboard('{Enter}');
        expect(updatePreferences).toHaveBeenCalledTimes(1);
        resolveUpdate({
            ...testPreferences,
            needs_attention_application_follow_up_days: 9,
        });
        expect(await screen.findByText('Needs Attention settings saved.')).toBeInTheDocument();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('saves on Enter when focus is not inside an input', async () => {
        const updatePreferences = vi.fn(() => new Promise<typeof testPreferences>(() => undefined));
        render(<NeedsAttentionSettingsDialog open onClose={vi.fn()} />, { updatePreferences });

        const dialog = await screen.findByRole('dialog', { name: 'Customise Dashboard Reminders' });
        fireEvent.keyDown(dialog, { key: 'Enter' });

        expect(updatePreferences).toHaveBeenCalledTimes(1);
    });

    test('Cancel and Escape discard the draft without updating preferences', async () => {
        const updatePreferences = vi.fn();
        const onClose = vi.fn();
        const { rerender } = render(<NeedsAttentionSettingsDialog open onClose={onClose} />, { updatePreferences });

        await screen.findAllByRole('checkbox');
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(updatePreferences).not.toHaveBeenCalled();

        rerender(<NeedsAttentionSettingsDialog open onClose={onClose} />);
        await screen.findByRole('dialog');
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(updatePreferences).not.toHaveBeenCalled();
    });
});
