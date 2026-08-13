import { createDeleteConfirmation } from '../../components/confirmation/deleteConfirmation';

describe('delete confirmation', () => {
    test('uses the shared destructive action treatment for a permanent deletion', () => {
        expect(createDeleteConfirmation('job interview')).toMatchObject({
            confirmationText: 'Delete',
            confirmationButtonProps: {
                autoFocus: true,
                color: 'error',
                variant: 'contained',
            },
        });
    });
});
