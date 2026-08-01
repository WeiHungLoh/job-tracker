export type CollectionViewMode = 'list' | 'board';

export type CollectionViewToggleOption<ViewMode extends string> = {
    label: string;
    value: ViewMode;
};

export type CollectionViewToggleProps<ViewMode extends string = CollectionViewMode> = {
    ariaLabel: string;
    currentView: ViewMode;
    onViewChange: (viewMode: ViewMode) => void;
    options?: readonly CollectionViewToggleOption<ViewMode>[];
};
