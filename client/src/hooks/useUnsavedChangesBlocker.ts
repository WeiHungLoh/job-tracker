import { useEffect, useRef } from 'react';
import { useConfirm } from 'material-ui-confirm';
import { type Blocker, useBlocker } from 'react-router-dom';
import { createDestructiveConfirmationButtonProps } from '../components/confirmation/destructiveConfirmationButtonProps';

const leavePageConfirmation = {
    title: 'Leave this page?',
    description: 'You have unsaved changes. If you leave now, your changes will be lost.',
    confirmationText: 'Leave Page',
    cancellationText: 'Stay',
    confirmationButtonProps: createDestructiveConfirmationButtonProps(),
};

export const useUnsavedChangesBlocker = (hasUnsavedChanges: boolean, isSubmissionPending = false) => {
    const blocker = useBlocker(hasUnsavedChanges);
    const confirm = useConfirm();
    const blockedNavigationRef = useRef<Blocker | null>(null);
    const confirmationOpenRef = useRef(false);

    useEffect(() => {
        if (blocker.state === 'unblocked') {
            blockedNavigationRef.current = null;
            return;
        }
        if (blocker.state !== 'blocked') {
            return;
        }
        if (blockedNavigationRef.current?.state !== 'blocked') {
            blockedNavigationRef.current = blocker;
        }
        if (isSubmissionPending || confirmationOpenRef.current) {
            return;
        }

        const blockedNavigation = blockedNavigationRef.current;
        if (blockedNavigation?.state !== 'blocked') {
            return;
        }
        if (!hasUnsavedChanges) {
            blockedNavigationRef.current = null;
            blockedNavigation.proceed();
            return;
        }

        let isActive = true;
        confirmationOpenRef.current = true;

        void confirm(leavePageConfirmation).then(({ confirmed }) => {
            if (!isActive) {
                return;
            }

            confirmationOpenRef.current = false;
            blockedNavigationRef.current = null;
            if (confirmed) {
                blockedNavigation.proceed();
            } else {
                blockedNavigation.reset();
            }
        });

        return () => {
            isActive = false;
            confirmationOpenRef.current = false;
        };
    }, [blocker.state, confirm, hasUnsavedChanges, isSubmissionPending]);
};
