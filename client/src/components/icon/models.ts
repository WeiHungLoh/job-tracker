import type { HTMLAttributes } from 'react';

export type IconName =
    | 'activeApplications'
    | 'alert'
    | 'arrowBack'
    | 'archive'
    | 'briefcase'
    | 'calendar'
    | 'chevronDown'
    | 'chevronRight'
    | 'error'
    | 'dashboard'
    | 'delete'
    | 'dragHandle'
    | 'email'
    | 'export'
    | 'externalLink'
    | 'guide'
    | 'highlight'
    | 'info'
    | 'interview'
    | 'lock'
    | 'notes'
    | 'pin'
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
