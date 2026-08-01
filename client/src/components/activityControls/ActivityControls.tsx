import { Children } from 'react';
import type { ActivityControlsProps } from './models';
import styles from './ActivityControls.module.css';

const ActivityControls = ({ actions, ariaLabel, children, mobileLayout }: ActivityControlsProps) => {
    const childItems = Children.toArray(children);
    const primaryControls =
        mobileLayout === 'collectionResponsive' ? (
            <>
                <div className={styles.viewControl}>{childItems[0]}</div>
                <div className={styles.secondaryControls}>{childItems.slice(1)}</div>
            </>
        ) : (
            children
        );

    return (
        <section
            aria-label={ariaLabel}
            className={[styles.controls, mobileLayout ? styles[mobileLayout] : '', actions ? styles.hasActions : '']
                .filter(Boolean)
                .join(' ')}
        >
            <div className={styles.primaryControls}>{primaryControls}</div>
            {actions && <div className={styles.actions}>{actions}</div>}
        </section>
    );
};

export default ActivityControls;
