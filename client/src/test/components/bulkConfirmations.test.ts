import {
    createArchiveAllConfirmation,
    createBulkCalendarExportConfirmation,
    createDeleteAllApplicationsConfirmation,
    createDeleteAllInterviewsConfirmation,
    createUnarchiveAllConfirmation,
} from '../../components/confirmation/bulkConfirmations';

describe('bulk confirmations', () => {
    test('describes all active application archive counts and filter-independent scope', () => {
        const confirmation = createArchiveAllConfirmation(12, 4);

        expect(confirmation).toMatchObject({
            title: 'Confirm Archive All',
            description:
                'Archive all 12 active job applications and their 4 related active interviews? This affects every active application you own, including applications not visible under the current job-status filters.',
            confirmationText: 'Archive All',
            cancellationText: 'Cancel',
        });
    });

    test('uses singular grammar for archived application restoration', () => {
        expect(createUnarchiveAllConfirmation(1, 1).description).toBe(
            'Unarchive all 1 archived job application and its 1 related archived interview? This affects every archived application you own, including applications not visible under the current archived job-status filters.'
        );
    });

    test('describes active and archived permanent application deletion', () => {
        expect(createDeleteAllApplicationsConfirmation(2, 1, 0, 'active').description).toBe(
            'Delete all 2 active job applications and their 1 related active interview? This affects every active application you own, including applications not visible under the current job-status filters. This action is permanent and cannot be undone.'
        );
        expect(createDeleteAllApplicationsConfirmation(5, 2, 0, 'archived').description).toBe(
            'Delete all 5 archived job applications and their 2 related archived interviews? This affects every archived application you own, including applications not visible under the current archived job-status filters. This action is permanent and cannot be undone.'
        );
    });

    test('describes saved evaluation lifecycle in bulk application actions', () => {
        expect(createArchiveAllConfirmation(3, 2, 2, 1).description).toBe(
            'Archive all 3 active job applications, their 2 related active interviews, their 2 saved offer evaluations, and their 1 counteroffer plan? This affects every active application you own, including applications not visible under the current job-status filters. Saved offer evaluations and counteroffer plans become read-only while archived.'
        );
        expect(createUnarchiveAllConfirmation(1, 0, 1).description).toBe(
            'Unarchive all 1 archived job application, its 0 related archived interviews, and its 1 saved offer evaluation? This affects every archived application you own, including applications not visible under the current archived job-status filters. Saved offer evaluations become editable again.'
        );
        expect(createDeleteAllApplicationsConfirmation(2, 1, 1, 'archived', 1).description).toBe(
            'Delete all 2 archived job applications, their 1 related archived interview, their 1 saved offer evaluation, and their 1 counteroffer plan? This affects every archived application you own, including applications not visible under the current archived job-status filters. This action is permanent and cannot be undone.'
        );
    });

    test('keeps active and archived interview deletion wording structurally consistent', () => {
        expect(createDeleteAllInterviewsConfirmation(1, 'active').description).toBe(
            'Delete all 1 active interview you own? This affects every active interview in your account. This action is permanent and cannot be undone.'
        );
        expect(createDeleteAllInterviewsConfirmation(3, 'archived').description).toBe(
            'Delete all 3 archived interviews you own? This affects every archived interview in your account. This action is permanent and cannot be undone.'
        );
    });

    test('prevents Enter confirmation without changing explicit click behavior', () => {
        const options = createBulkCalendarExportConfirmation(2);
        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();
        const onKeyDown = options.confirmationButtonProps?.onKeyDown;

        onKeyDown?.({ key: 'Enter', preventDefault, stopPropagation } as never);
        expect(preventDefault).toHaveBeenCalledOnce();
        expect(stopPropagation).toHaveBeenCalledOnce();
        expect(options.confirmationButtonProps?.autoFocus).toBe(false);

        preventDefault.mockClear();
        onKeyDown?.({ key: ' ', preventDefault, stopPropagation } as never);
        expect(preventDefault).not.toHaveBeenCalled();
    });

    test('uses exact bulk calendar wording and singular grammar', () => {
        expect(createBulkCalendarExportConfirmation(1)).toMatchObject({
            title: 'Export all upcoming interviews?',
            description:
                'This will download one .ics file containing all 1 upcoming interview, including interviews you may already have added to your calendar. Importing the file again may create duplicate calendar events.',
            confirmationText: 'Export All',
            cancellationText: 'Cancel',
        });
    });
});
