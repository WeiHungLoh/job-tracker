import type { CollectionViewMode, CollectionViewToggleOption, CollectionViewToggleProps } from './models';
import styles from './CollectionViewToggle.module.css';

const COLLECTION_VIEW_OPTIONS: readonly CollectionViewToggleOption<CollectionViewMode>[] = [
    { label: 'List', value: 'list' },
    { label: 'Board', value: 'board' },
];

const CollectionViewToggle = <ViewMode extends string = CollectionViewMode>({
    ariaLabel,
    currentView,
    onViewChange,
    options = COLLECTION_VIEW_OPTIONS as readonly CollectionViewToggleOption<ViewMode>[],
}: CollectionViewToggleProps<ViewMode>) => (
    <div className={styles.toggleWrapper}>
        <div aria-label={ariaLabel} className={styles.toggle} role='group'>
            {options.map(({ label, value }) => (
                <button
                    aria-pressed={currentView === value}
                    className={`${styles.option} ${currentView === value ? styles.active : ''}`}
                    key={value}
                    onClick={() => onViewChange(value)}
                    type='button'
                >
                    <span className={styles.optionLabel}>{label}</span>
                </button>
            ))}
        </div>
    </div>
);

export default CollectionViewToggle;
