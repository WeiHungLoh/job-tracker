import { act, fireEvent, render, screen } from '@testing-library/react';
import DeviceTimezoneNotice, {
    DEVICE_TIMEZONE_STORAGE_KEY,
} from '../../components/deviceTimezoneNotice/DeviceTimezoneNotice';
import { ToastProvider } from '../../components/toast/ToastProvider';

const detectedTimezone = {
    offset: 'GMT+8',
    timezone: 'Asia/Singapore',
};

const mockDeviceTimezone = () =>
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((_, options = {}) => {
        if (options.timeZoneName === 'shortOffset') {
            return {
                formatToParts: () => [{ type: 'timeZoneName', value: detectedTimezone.offset }],
            } as Intl.DateTimeFormat;
        }

        if (options.month === 'long') {
            return {
                format: () => '28 July 2026 at 8:24 pm',
            } as Intl.DateTimeFormat;
        }

        return {
            resolvedOptions: () => ({ timeZone: detectedTimezone.timezone }),
        } as Intl.DateTimeFormat;
    });

const renderNotice = () =>
    render(
        <ToastProvider>
            <main>Protected content</main>
            <DeviceTimezoneNotice />
        </ToastProvider>
    );

const getStoredTimezone = () => JSON.parse(localStorage.getItem(DEVICE_TIMEZONE_STORAGE_KEY) ?? '');

describe('DeviceTimezoneNotice', () => {
    beforeEach(() => {
        localStorage.clear();
        detectedTimezone.timezone = 'Asia/Singapore';
        detectedTimezone.offset = 'GMT+8';
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-28T12:24:00.000Z'));
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        mockDeviceTimezone();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    test('shows and saves a persistent first-visit notice without rendering permanent UI', () => {
        const fetch = vi.spyOn(globalThis, 'fetch');
        renderNotice();

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText(/^Timezone: Asia\/Singapore/).textContent).toBe(
            'Timezone: Asia/Singapore (GMT+8)\n\nCurrent device date and time: 28 July 2026 at 8:24 PM.\n\nAll dates and times are entered and displayed using this device timezone.'
        );
        expect(getStoredTimezone()).toEqual({
            timezone: 'Asia/Singapore',
            offset: 'GMT+8',
        });
        expect(screen.queryByRole('region', { name: /device time and timezone/i })).not.toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('stays silent and does not rewrite matching stored timezone data', () => {
        localStorage.setItem(DEVICE_TIMEZONE_STORAGE_KEY, JSON.stringify(detectedTimezone));
        const setItem = vi.spyOn(localStorage, 'setItem');

        renderNotice();

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(setItem).not.toHaveBeenCalled();
    });

    test('shows one timezone-changed notice and stores the current values immediately', () => {
        localStorage.setItem(
            DEVICE_TIMEZONE_STORAGE_KEY,
            JSON.stringify({ timezone: 'America/New_York', offset: 'GMT-4' })
        );

        renderNotice();

        expect(screen.getByRole('status')).toHaveTextContent(
            'Timezone changed: America/New_York (GMT-4) → Asia/Singapore (GMT+8)'
        );
        expect(screen.getByRole('status')).toHaveTextContent(
            'All dates and times are now entered and displayed using this device timezone.'
        );
        expect(screen.getByRole('status')).toHaveTextContent('Current device date and time: 28 July 2026 at 8:24 PM.');
        expect(getStoredTimezone()).toEqual(detectedTimezone);

        fireEvent(document, new Event('visibilitychange'));
        expect(screen.getAllByRole('status')).toHaveLength(1);
    });

    test('replaces an existing timezone notice when the device timezone changes again', () => {
        renderNotice();
        expect(screen.getByRole('status')).toHaveTextContent('Timezone: Asia/Singapore (GMT+8)');

        detectedTimezone.timezone = 'America/New_York';
        detectedTimezone.offset = 'GMT-4';
        fireEvent(document, new Event('visibilitychange'));

        expect(screen.getAllByRole('status')).toHaveLength(1);
        expect(screen.queryByText(/^Timezone: Asia\/Singapore/)).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(
            'Timezone changed: Asia/Singapore (GMT+8) → America/New_York (GMT-4)'
        );
    });

    test('shows offset-changed wording when the IANA timezone is unchanged', () => {
        localStorage.setItem(
            DEVICE_TIMEZONE_STORAGE_KEY,
            JSON.stringify({ timezone: 'Asia/Singapore', offset: 'GMT+7' })
        );

        renderNotice();

        expect(screen.getByRole('status')).toHaveTextContent(
            'Timezone offset changed: Asia/Singapore (GMT+7) → Asia/Singapore (GMT+8)'
        );
        expect(getStoredTimezone()).toEqual(detectedTimezone);
    });

    test.each([
        ['invalid JSON', '{'],
        ['missing timezone', JSON.stringify({ offset: 'GMT+8' })],
        ['missing offset', JSON.stringify({ timezone: 'Asia/Singapore' })],
        ['incorrect value types', JSON.stringify({ timezone: 8, offset: false })],
        ['empty values', JSON.stringify({ timezone: '', offset: '' })],
        ['unexpected fields', JSON.stringify({ timezone: 'Asia/Singapore', offset: 'GMT+8', dismissed: true })],
    ])('treats %s as a first visit', (_, storedValue) => {
        localStorage.setItem(DEVICE_TIMEZONE_STORAGE_KEY, storedValue);

        renderNotice();

        expect(screen.getByRole('status')).toHaveTextContent('Timezone: Asia/Singapore (GMT+8)');
        expect(getStoredTimezone()).toEqual(detectedTimezone);
    });

    test('shows at most one notice when localStorage access fails', () => {
        vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
            throw new Error('Storage unavailable');
        });
        const setItem = vi.spyOn(localStorage, 'setItem');

        renderNotice();

        expect(screen.getByRole('status')).toBeInTheDocument();
        fireEvent(document, new Event('visibilitychange'));
        fireEvent(document, new Event('visibilitychange'));
        expect(screen.getAllByRole('status')).toHaveLength(1);
        expect(setItem).not.toHaveBeenCalled();
        expect(screen.getByText('Protected content')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('stops retrying after saving to localStorage fails', () => {
        const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            throw new Error('Storage unavailable');
        });

        renderNotice();

        expect(screen.getAllByRole('status')).toHaveLength(1);
        fireEvent(document, new Event('visibilitychange'));
        fireEvent(document, new Event('visibilitychange'));
        expect(screen.getAllByRole('status')).toHaveLength(1);
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('rechecks only when the document becomes visible and cleans up its listener', () => {
        localStorage.setItem(DEVICE_TIMEZONE_STORAGE_KEY, JSON.stringify(detectedTimezone));
        const removeEventListener = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderNotice();

        detectedTimezone.timezone = 'America/New_York';
        detectedTimezone.offset = 'GMT-4';
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        fireEvent(document, new Event('visibilitychange'));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        fireEvent(document, new Event('visibilitychange'));
        expect(screen.getByRole('status')).toHaveTextContent(
            'Timezone changed: Asia/Singapore (GMT+8) → America/New_York (GMT-4)'
        );

        unmount();
        expect(removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    test('uses a browser-derived GMT fallback when shortOffset is unavailable', () => {
        vi.restoreAllMocks();
        vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-330);
        vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((_, options = {}) => {
            if (options.timeZoneName === 'shortOffset') {
                throw new RangeError('shortOffset unavailable');
            }
            if (options.month === 'long') {
                return { format: () => '28 July 2026 at 8:24 pm' } as Intl.DateTimeFormat;
            }
            return {
                resolvedOptions: () => ({ timeZone: 'Asia/Kolkata' }),
            } as Intl.DateTimeFormat;
        });

        renderNotice();

        expect(screen.getByRole('status')).toHaveTextContent('Timezone: Asia/Kolkata (GMT+5:30)');
    });
});
