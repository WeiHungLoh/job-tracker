import type { IconName, IconProps } from './models';
import {
    MdArrowBack,
    MdArchive,
    MdAutoAwesome,
    MdCalendarToday,
    MdCancel,
    MdCheckCircle,
    MdChevronRight,
    MdDarkMode,
    MdDashboard,
    MdDeleteOutline,
    MdDragIndicator,
    MdEmail,
    MdEventNote,
    MdExpandMore,
    MdFileDownload,
    MdInfoOutline,
    MdLightMode,
    MdLock,
    MdMenuBook,
    MdOutlineArticle,
    MdOutlineStickyNote2,
    MdOutlineWork,
    MdOpenInNew,
    MdPushPin,
    MdVisibility,
    MdVisibilityOff,
    MdWarning,
    MdWifiOff,
    MdUndo,
} from 'react-icons/md';
import type { IconType } from 'react-icons';

const icons: Record<IconName, IconType> = {
    activeApplications: MdOutlineArticle,
    alert: MdWarning,
    arrowBack: MdArrowBack,
    archive: MdArchive,
    briefcase: MdOutlineWork,
    calendar: MdCalendarToday,
    chevronDown: MdExpandMore,
    chevronRight: MdChevronRight,
    error: MdCancel,
    dashboard: MdDashboard,
    delete: MdDeleteOutline,
    dragHandle: MdDragIndicator,
    email: MdEmail,
    export: MdFileDownload,
    guide: MdMenuBook,
    highlight: MdAutoAwesome,
    info: MdInfoOutline,
    interview: MdEventNote,
    lock: MdLock,
    notes: MdOutlineStickyNote2,
    externalLink: MdOpenInNew,
    pin: MdPushPin,
    darkMode: MdDarkMode,
    lightMode: MdLightMode,
    success: MdCheckCircle,
    visibility: MdVisibility,
    visibilityOff: MdVisibilityOff,
    wifiOff: MdWifiOff,
    undo: MdUndo,
};

const Icon = ({ name, size, title, ...props }: IconProps) => {
    const IconComponent = icons[name];
    return <IconComponent aria-hidden={title ? undefined : true} size={size} title={title} {...props} />;
};

export default Icon;
