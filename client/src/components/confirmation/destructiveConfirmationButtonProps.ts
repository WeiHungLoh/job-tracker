import type { ConfirmOptions } from 'material-ui-confirm';

type ConfirmationButtonProps = NonNullable<ConfirmOptions['confirmationButtonProps']>;

export const createDestructiveConfirmationButtonProps = (
    overrides: ConfirmationButtonProps = {}
): ConfirmationButtonProps => ({
    autoFocus: true,
    color: 'error',
    variant: 'contained',
    ...overrides,
});
