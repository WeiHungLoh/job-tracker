import type { PropsWithChildren, ReactNode } from 'react';
import styles from './BoardCardActions.module.css';

type BoardCardActionsProps = PropsWithChildren<{
    actions: ReactNode;
    compactActions?: boolean;
    compactSizing?: boolean;
    compactPanelSpacing?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    summaryAriaLabel: string;
}>;

const BoardCardActions = ({
    actions,
    children,
    compactActions = false,
    compactSizing = false,
    compactPanelSpacing = false,
    onOpenChange,
    summaryAriaLabel,
}: BoardCardActionsProps) => (
    <details
        className={[
            styles.actions,
            compactSizing ? styles.compactSizing : '',
            compactPanelSpacing ? styles.compactPanelSpacing : '',
        ]
            .filter(Boolean)
            .join(' ')}
        onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
    >
        <summary aria-label={summaryAriaLabel}>Actions</summary>
        <div className={styles.actionPanel}>
            {children}
            <div className={`${styles.actionButtons} ${compactActions ? styles.compactActions : ''}`}>{actions}</div>
        </div>
    </details>
);

export default BoardCardActions;
