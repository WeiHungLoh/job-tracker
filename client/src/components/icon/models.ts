import type { HTMLAttributes } from 'react';

export type IconName =
    | 'activeApplications'
    | 'alert'
    | 'arrowBack'
    | 'arrowForward'
    | 'archive'
    | 'briefcase'
    | 'calendar'
    | 'chevronDown'
    | 'chevronRight'
    | 'close'
    | 'darkMode'
    | 'dashboard'
    | 'delete'
    | 'dragHandle'
    | 'email'
    | 'error'
    | 'export'
    | 'externalLink'
    | 'guide'
    | 'highlight'
    | 'info'
    | 'interview'
    | 'lightMode'
    | 'lock'
    | 'notes'
    | 'pin'
    | 'search'
    | 'success'
    | 'undo'
    | 'visibility'
    | 'visibilityOff'
    | 'wifiOff';

export type IconProps = HTMLAttributes<SVGElement> & {
    name: IconName;
    size?: number | string;
    title?: string;
};
