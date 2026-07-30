import type { AriaRole, ComponentProps, ReactNode } from 'react';
import type { CSVLink } from 'react-csv';
import type { PrimaryButtonVariant } from '../button/models';
import type { IconName } from '../icon/models';

type MoreOptionsMiddleAction = {
    disabled?: boolean;
    icon?: IconName;
    isLoading?: boolean;
    label: string;
    onClick: () => void;
};

export type ActivityControlsProps = {
    actions?: ReactNode;
    ariaLabel: string;
    children: ReactNode;
    mobileLayout?: 'applicationCompact' | 'applicationWithDisplay' | 'inlineWhenPossible' | 'interviewResponsive';
};

export type ControlDropdownProps = {
    children: ReactNode;
    closeOnSelect?: boolean;
    containerClassName?: string;
    disabled?: boolean;
    dropdownAriaLabel?: string;
    dropdownClassName?: string;
    dropdownRole?: AriaRole;
    id: string;
    label: ReactNode;
    triggerAriaLabel?: string;
    triggerClassName?: string;
    triggerStyle?: 'activity';
    triggerVariant?: PrimaryButtonVariant;
};

export type DisplayOptionsProps = {
    children: ReactNode;
    id: string;
};

export type MoreOptionsProps = {
    csvData: ComponentProps<typeof CSVLink>['data'];
    csvFilename: string;
    csvHeaders?: ComponentProps<typeof CSVLink>['headers'];
    deleteLabel: string;
    deleteDisabled?: boolean;
    id: string;
    isDeleting: boolean;
    middleAction?: MoreOptionsMiddleAction;
    onDelete: () => void;
};
