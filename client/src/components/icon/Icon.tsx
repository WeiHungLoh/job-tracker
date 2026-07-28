import type { IconName, IconProps } from './models';
import { IoEye, IoNewspaperOutline } from 'react-icons/io5';
import { IoMdArchive, IoMdEyeOff } from 'react-icons/io';
import {
    MdArrowBack,
    MdAutoAwesome,
    MdCalendarToday,
    MdCancel,
    MdCheckCircle,
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
    MdOutlineStickyNote2,
    MdPushPin,
    MdWifiOff,
    MdUndo,
} from 'react-icons/md';
import { FaBriefcase } from 'react-icons/fa';
import { GoAlertFill } from 'react-icons/go';
import type { IconType } from 'react-icons';

const icons: Record<IconName, IconType> = {
    activeApplications: IoNewspaperOutline,
    alert: GoAlertFill,
    arrowBack: MdArrowBack,
    archive: IoMdArchive,
    briefcase: FaBriefcase,
    calendar: MdCalendarToday,
    chevronDown: MdExpandMore,
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
    pin: MdPushPin,
    darkMode: MdDarkMode,
    lightMode: MdLightMode,
    success: MdCheckCircle,
    visibility: IoEye,
    visibilityOff: IoMdEyeOff,
    wifiOff: MdWifiOff,
    undo: MdUndo,
};

const Icon = ({ name, size, title, ...props }: IconProps) => {
    const IconComponent = icons[name];
    return <IconComponent aria-hidden={title ? undefined : true} size={size} title={title} {...props} />;
};

export default Icon;
