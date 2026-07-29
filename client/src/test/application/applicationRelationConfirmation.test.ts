import { createApplicationRelationConfirmation } from '../../pages/application/applicationRelationConfirmation';

const confirmationCases = [
    {
        action: 'archive',
        state: 'active',
        relatedInterviewCount: 0,
        title: 'Confirm Archive',
        confirmationText: 'Archive',
        description: 'Archive this active job application?',
    },
    {
        action: 'archive',
        state: 'active',
        relatedInterviewCount: 1,
        title: 'Confirm Archive',
        confirmationText: 'Archive',
        description: 'Archive this active job application and its 1 related active interview?',
    },
    {
        action: 'archive',
        state: 'active',
        relatedInterviewCount: 2,
        title: 'Confirm Archive',
        confirmationText: 'Archive',
        description: 'Archive this active job application and its 2 related active interviews?',
    },
    {
        action: 'unarchive',
        state: 'archived',
        relatedInterviewCount: 0,
        title: 'Confirm Unarchive',
        confirmationText: 'Unarchive',
        description: 'Unarchive this archived job application?',
    },
    {
        action: 'unarchive',
        state: 'archived',
        relatedInterviewCount: 1,
        title: 'Confirm Unarchive',
        confirmationText: 'Unarchive',
        description: 'Unarchive this archived job application and its 1 related archived interview?',
    },
    {
        action: 'unarchive',
        state: 'archived',
        relatedInterviewCount: 2,
        title: 'Confirm Unarchive',
        confirmationText: 'Unarchive',
        description: 'Unarchive this archived job application and its 2 related archived interviews?',
    },
    {
        action: 'delete',
        state: 'active',
        relatedInterviewCount: 0,
        title: 'Confirm Deletion',
        confirmationText: 'Delete',
        description: 'Delete this active job application? This action is permanent and cannot be undone.',
    },
    {
        action: 'delete',
        state: 'active',
        relatedInterviewCount: 1,
        title: 'Confirm Deletion',
        confirmationText: 'Delete',
        description:
            'Delete this active job application and its 1 related active interview? This action is permanent and cannot be undone.',
    },
    {
        action: 'delete',
        state: 'active',
        relatedInterviewCount: 2,
        title: 'Confirm Deletion',
        confirmationText: 'Delete',
        description:
            'Delete this active job application and its 2 related active interviews? This action is permanent and cannot be undone.',
    },
    {
        action: 'delete',
        state: 'archived',
        relatedInterviewCount: 0,
        title: 'Confirm Deletion',
        confirmationText: 'Delete',
        description: 'Delete this archived job application? This action is permanent and cannot be undone.',
    },
    {
        action: 'delete',
        state: 'archived',
        relatedInterviewCount: 1,
        title: 'Confirm Deletion',
        confirmationText: 'Delete',
        description:
            'Delete this archived job application and its 1 related archived interview? This action is permanent and cannot be undone.',
    },
    {
        action: 'delete',
        state: 'archived',
        relatedInterviewCount: 2,
        title: 'Confirm Deletion',
        confirmationText: 'Delete',
        description:
            'Delete this archived job application and its 2 related archived interviews? This action is permanent and cannot be undone.',
    },
] as const;

describe('single-application relation confirmations', () => {
    test.each(confirmationCases)(
        'uses exact $action $state wording for $relatedInterviewCount related interviews',
        ({ action, state, relatedInterviewCount, title, confirmationText, description }) => {
            expect(createApplicationRelationConfirmation(action, state, relatedInterviewCount)).toEqual({
                title,
                description,
                confirmationText,
                cancellationText: 'Cancel',
                confirmationButtonProps: { autoFocus: true },
            });
        }
    );

    test('describes saved evaluation lifecycle for archive, restore, and deletion', () => {
        expect(createApplicationRelationConfirmation('archive', 'active', 0, 1).description).toBe(
            'Archive this active job application and its saved offer evaluation? The saved offer evaluation becomes read-only while archived.'
        );
        expect(createApplicationRelationConfirmation('unarchive', 'archived', 0, 1).description).toBe(
            'Unarchive this archived job application and its saved offer evaluation? The saved offer evaluation becomes editable again.'
        );
        expect(createApplicationRelationConfirmation('delete', 'archived', 0, 1).description).toBe(
            'Delete this archived job application and its saved offer evaluation? This action is permanent and cannot be undone.'
        );
    });

    test('lists interviews and an evaluation without ambiguous ownership', () => {
        expect(createApplicationRelationConfirmation('archive', 'active', 2, 1).description).toBe(
            'Archive this active job application, its 2 related active interviews, and its saved offer evaluation? The saved offer evaluation becomes read-only while archived.'
        );
    });

    test('includes the counteroffer plan in application lifecycle confirmations', () => {
        expect(createApplicationRelationConfirmation('archive', 'active', 2, 1, 1).description).toBe(
            'Archive this active job application, its 2 related active interviews, its saved offer evaluation, and its counteroffer plan? The saved offer evaluation and counteroffer plan become read-only while archived.'
        );
        expect(createApplicationRelationConfirmation('delete', 'active', 0, 1, 1).description).toBe(
            'Delete this active job application, its saved offer evaluation, and its counteroffer plan? This action is permanent and cannot be undone.'
        );
    });
});
