import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '../toast/ToastProvider';

export const DEVICE_TIMEZONE_STORAGE_KEY = 'jobTrackerDeviceTimezone';

type StoredDeviceTimezone = {
    timezone: string;
    offset: string;
};

const isStoredDeviceTimezone = (value: unknown): value is StoredDeviceTimezone => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const storedTimezone = value as Record<string, unknown>;
    const storedKeys = Object.keys(storedTimezone);
    return (
        storedKeys.length === 2 &&
        storedKeys.includes('timezone') &&
        storedKeys.includes('offset') &&
        typeof storedTimezone.timezone === 'string' &&
        storedTimezone.timezone.trim().length > 0 &&
        typeof storedTimezone.offset === 'string' &&
        storedTimezone.offset.trim().length > 0
    );
};

const getDeviceTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Device timezone unavailable';
    } catch {
        return 'Device timezone unavailable';
    }
};

const getBrowserOffsetFallback = (date: Date): string => {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;

    return `GMT${sign}${hours}${minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`}`;
};

const getDeviceTimezoneOffset = (date: Date, timezone: string): string => {
    try {
        const offset = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'shortOffset',
        })
            .formatToParts(date)
            .find(({ type }) => type === 'timeZoneName')?.value;

        return offset || getBrowserOffsetFallback(date);
    } catch {
        return getBrowserOffsetFallback(date);
    }
};

const getCurrentDeviceTimezone = (currentDate: Date): StoredDeviceTimezone => {
    const timezone = getDeviceTimezone();

    return {
        timezone,
        offset: getDeviceTimezoneOffset(currentDate, timezone),
    };
};

const formatDeviceDateTime = (date: Date): string => {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
            .format(date)
            .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
    } catch {
        const formattedDate = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const formattedTime = date
            .toLocaleTimeString('en-GB', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            })
            .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
        return `${formattedDate} at ${formattedTime}`;
    }
};

const formatTimezone = ({ timezone, offset }: StoredDeviceTimezone): string => `${timezone} (${offset})`;

const createTimezoneNotice = (
    currentTimezone: StoredDeviceTimezone,
    storedTimezone: StoredDeviceTimezone | null,
    currentDate: Date
): string => {
    let heading = `Timezone: ${formatTimezone(currentTimezone)}`;
    let explanation = 'All dates and times are entered and displayed using this device timezone.';

    if (storedTimezone) {
        const changeType =
            storedTimezone.timezone === currentTimezone.timezone ? 'Timezone offset changed' : 'Timezone changed';
        heading = `${changeType}: ${formatTimezone(storedTimezone)} → ${formatTimezone(currentTimezone)}`;
        explanation = 'All dates and times are now entered and displayed using this device timezone.';
    }

    return `${heading}\n\nCurrent device date and time: ${formatDeviceDateTime(currentDate)}.\n\n${explanation}`;
};

const readStoredTimezone = (): StoredDeviceTimezone | null => {
    const storedValue = localStorage.getItem(DEVICE_TIMEZONE_STORAGE_KEY);
    if (!storedValue) {
        return null;
    }

    try {
        const parsedValue: unknown = JSON.parse(storedValue);
        return isStoredDeviceTimezone(parsedValue) ? parsedValue : null;
    } catch {
        return null;
    }
};

const DeviceTimezoneNotice = () => {
    const { showNeutralToast } = useToast();
    const storageUnavailableRef = useRef(false);
    const dismissTimezoneToastRef = useRef<(() => void) | null>(null);

    const checkDeviceTimezone = useCallback(() => {
        if (storageUnavailableRef.current) {
            return;
        }

        const currentDate = new Date();
        const currentTimezone = getCurrentDeviceTimezone(currentDate);
        let storedTimezone: StoredDeviceTimezone | null;
        const showTimezoneNotice = (previousTimezone: StoredDeviceTimezone | null) => {
            dismissTimezoneToastRef.current?.();
            dismissTimezoneToastRef.current = showNeutralToast(
                createTimezoneNotice(currentTimezone, previousTimezone, currentDate)
            );
        };

        try {
            storedTimezone = readStoredTimezone();
        } catch {
            storageUnavailableRef.current = true;
            showTimezoneNotice(null);
            return;
        }

        if (storedTimezone?.timezone === currentTimezone.timezone && storedTimezone.offset === currentTimezone.offset) {
            return;
        }

        showTimezoneNotice(storedTimezone);
        try {
            localStorage.setItem(DEVICE_TIMEZONE_STORAGE_KEY, JSON.stringify(currentTimezone));
        } catch {
            storageUnavailableRef.current = true;
        }
    }, [showNeutralToast]);

    useEffect(() => {
        checkDeviceTimezone();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkDeviceTimezone();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            dismissTimezoneToastRef.current?.();
            dismissTimezoneToastRef.current = null;
        };
    }, [checkDeviceTimezone]);

    return null;
};

export default DeviceTimezoneNotice;
