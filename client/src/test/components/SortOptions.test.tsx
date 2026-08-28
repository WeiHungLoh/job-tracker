import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortOptions from '../../components/activityControls/sortOptions/SortOptions';
import { APPLICATION_BOARD_SORT_OPTIONS, APPLICATION_LIST_SORT_OPTIONS } from '../../pages/application/models';

describe('SortOptions', () => {
    test('renders native radio choices and saves a selected option', async () => {
        const onSelectionChange = vi.fn().mockResolvedValue(true);
        render(
            <SortOptions
                id='application-sort'
                onSelectionChange={onSelectionChange}
                options={APPLICATION_LIST_SORT_OPTIONS}
                selectedOption='job_status'
            />
        );

        const trigger = screen.getByRole('button', { name: 'Sort by' });
        await userEvent.click(trigger);

        expect(screen.getByRole('radiogroup', { name: 'Sort options' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Job status' })).toBeChecked();
        expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
            'job_status',
            'application_date_desc',
            'application_date_asc',
            'company_name_asc',
            'company_name_desc',
        ]);
        expect(new Set(screen.getAllByRole('radio').map((radio) => radio.id)).size).toBe(5);

        await act(async () => {
            await userEvent.click(screen.getByText('Newest application'));
        });

        expect(onSelectionChange).toHaveBeenCalledWith('application_date_desc');
        expect(screen.queryByRole('radiogroup', { name: 'Sort options' })).not.toBeInTheDocument();
        await waitFor(() => expect(trigger).toBeEnabled());
        expect(trigger).toHaveFocus();
    });

    test.each(['resolved false', 'rejected'] as const)('rolls back when saving is %s', async (failureMode) => {
        const onSelectionChange =
            failureMode === 'resolved false'
                ? vi.fn().mockResolvedValue(false)
                : vi.fn().mockRejectedValue(new Error('save failed'));
        render(
            <SortOptions
                id='application-sort'
                onSelectionChange={onSelectionChange}
                options={APPLICATION_LIST_SORT_OPTIONS}
                selectedOption='job_status'
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        await act(async () => {
            await userEvent.click(screen.getByRole('radio', { name: 'Company A–Z' }));
        });
        await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith('company_name_asc'));
        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));

        await waitFor(() => expect(screen.getByRole('radio', { name: 'Job status' })).toBeChecked());
    });

    test('synchronizes its checked option when the saved preference changes', async () => {
        const { rerender } = render(
            <SortOptions
                id='application-sort'
                onSelectionChange={vi.fn().mockResolvedValue(true)}
                options={APPLICATION_LIST_SORT_OPTIONS}
                selectedOption='job_status'
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));
        rerender(
            <SortOptions
                id='application-sort'
                onSelectionChange={vi.fn().mockResolvedValue(true)}
                options={APPLICATION_LIST_SORT_OPTIONS}
                selectedOption='company_name_desc'
            />
        );

        expect(screen.getByRole('radio', { name: 'Company Z–A' })).toBeChecked();
    });

    test('synchronizes to the first available option when the option set changes', async () => {
        const { rerender } = render(
            <SortOptions
                id='application-sort'
                onSelectionChange={vi.fn().mockResolvedValue(true)}
                options={APPLICATION_LIST_SORT_OPTIONS}
                selectedOption='job_status'
            />
        );

        rerender(
            <SortOptions
                id='application-sort'
                onSelectionChange={vi.fn().mockResolvedValue(true)}
                options={APPLICATION_BOARD_SORT_OPTIONS}
                selectedOption='job_status'
            />
        );
        await userEvent.click(screen.getByRole('button', { name: 'Sort by' }));

        expect(screen.queryByRole('radio', { name: 'Job status' })).not.toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Newest application' })).toBeChecked();
    });

    test('does not resubmit the current option and disables the trigger while saving', async () => {
        let resolveSelection: ((saved: boolean) => void) | undefined;
        const selection = new Promise<boolean>((resolve) => {
            resolveSelection = resolve;
        });
        const onSelectionChange = vi.fn().mockReturnValue(selection);
        render(
            <SortOptions
                id='application-sort'
                onSelectionChange={onSelectionChange}
                options={APPLICATION_LIST_SORT_OPTIONS}
                selectedOption='job_status'
            />
        );

        const trigger = screen.getByRole('button', { name: 'Sort by' });
        await userEvent.click(trigger);
        await userEvent.click(screen.getByRole('radio', { name: 'Job status' }));
        expect(onSelectionChange).not.toHaveBeenCalled();

        await userEvent.click(trigger);
        await userEvent.click(screen.getByRole('radio', { name: 'Oldest application' }));
        expect(onSelectionChange).toHaveBeenCalledTimes(1);
        expect(trigger).toBeDisabled();

        resolveSelection?.(true);
        await waitFor(() => expect(trigger).toBeEnabled());
    });
});
