import type { ConfirmOptions } from 'material-ui-confirm';
import { PERMANENT_DELETION_WARNING } from './bulkConfirmations';
import { createDestructiveConfirmationButtonProps } from './destructiveConfirmationButtonProps';

export const createDeleteConfirmation = (target: string): ConfirmOptions => {
    const options: ConfirmOptions = {
        title: 'Confirm deletion',
        description: `Are you sure you want to delete this ${target}? ${PERMANENT_DELETION_WARNING}`,
        confirmationText: 'Delete',
        cancellationText: 'Cancel',
        confirmationButtonProps: createDestructiveConfirmationButtonProps(),
    };

    return options;
};
