import type { HTMLAttributes } from 'react';

export type IconName =
    | 'activeApplications'
    | 'alert'
    | 'arrowBack'
    | 'archive'
    | 'briefcase'
    | 'calendar'
    | 'chevronDown'
    | 'error'
    | 'dashboard'
    | 'delete'
    | 'dragHandle'
    | 'email'
    | 'export'
    | 'guide'
    | 'highlight'
    | 'interview'
    | 'lock'
    | 'notes'
    | 'success'
    | 'visibility'
    | 'visibilityOff'
    | 'wifiOff'
    | 'undo'
    | 'darkMode'
    | 'lightMode';

export type IconProps = HTMLAttributes<SVGElement> & {
    name: IconName;
    size?: number | string;
    title?: string;
};
