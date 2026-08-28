import type { DuplicateApplicationDetails } from '../../pages/application/models';
import formatDate from '../../helper/dateFormatter';
import { createDuplicateApplicationConfirmation } from '../../pages/application/duplicateApplicationConfirmation';

describe('duplicate application confirmation', () => {
    test('includes duplicate details and uses the standard confirm actions with Enter enabled', () => {
        const duplicate: DuplicateApplicationDetails = {
            company_name: 'Morgan Stanley',
            job_title: 'Software Engineer',
            application_date: '2026-03-03T10:30:00.000Z',
        };

        expect(createDuplicateApplicationConfirmation(duplicate)).toEqual({
            title: 'Possible duplicate application',
            description: `You already added an application for Software Engineer at Morgan Stanley on ${
                formatDate(duplicate.application_date).formattedDate
            }. Do you want to add this application anyway?`,
            confirmationText: 'Add anyway',
            cancellationText: 'Cancel',
            confirmationButtonProps: { autoFocus: true },
        });
    });
});
