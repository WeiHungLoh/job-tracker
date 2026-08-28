import type { ConfirmOptions } from 'material-ui-confirm';
import type { DuplicateApplicationDetails } from './models';
import formatDate from '../../helper/dateFormatter';

export const createDuplicateApplicationConfirmation = (duplicate: DuplicateApplicationDetails): ConfirmOptions => ({
    title: 'Possible duplicate application',
    description: `You already added an application for ${duplicate.job_title} at ${duplicate.company_name} on ${
        formatDate(duplicate.application_date).formattedDate
    }. Do you want to add this application anyway?`,
    confirmationText: 'Add anyway',
    cancellationText: 'Cancel',
    confirmationButtonProps: { autoFocus: true },
});
