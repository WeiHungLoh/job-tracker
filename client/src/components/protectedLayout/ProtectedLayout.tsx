import { ConfirmProvider } from 'material-ui-confirm';
import FallbackScreen from '../fallbackScreen/FallbackScreen';
import Navbar from '../navbar/Navbar';
import { Outlet } from 'react-router-dom';
import { UserPreferencesProvider } from '../userPreferences/UserPreferencesProvider';
import { defaultConfirmOptions } from '../confirmation/defaultConfirmOptions';
import type { UpdateUserPreferencesRequest, UserPreferences } from '../userPreferences/models';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJobTrackerAPI } from '../../api/useJobTrackerAPI';
import { useToast } from '../toast/ToastProvider';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';
import DeviceTimezoneNotice from '../deviceTimezoneNotice/DeviceTimezoneNotice';

const ProtectedLayout = () => {
    const api = useJobTrackerAPI();
    const { showErrorToast } = useToast();
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [preferencesError, setPreferencesError] = useState<boolean>(false);
    const preferenceUpdateQueue = useRef<Promise<void>>(Promise.resolve());

    const loadPreferences = useCallback(async () => {
        setPreferencesError(false);
        setPreferences(null);
        try {
            setPreferences(await api.userPreferences.get());
        } catch (error) {
            setPreferencesError(true);
            showErrorToast(getErrorToastMessage(error, 'Unable to load user preferences. Please try again.'));
        }
    }, [api.userPreferences, showErrorToast]);

    const updatePreferences = useCallback(
        (updatedPreferences: UpdateUserPreferencesRequest): Promise<UserPreferences> => {
            const update = preferenceUpdateQueue.current.then(async () => {
                const savedPreferences = await api.userPreferences.update(updatedPreferences);
                setPreferences(savedPreferences);
                return savedPreferences;
            });
            preferenceUpdateQueue.current = update.then(
                () => undefined,
                () => undefined
            );
            return update;
        },
        [api.userPreferences]
    );

    useEffect(() => {
        void loadPreferences();
    }, [loadPreferences]);

    if (preferencesError) {
        return <FallbackScreen variant='authenticationError' onAction={() => void loadPreferences()} />;
    }

    if (!preferences) {
        return <FallbackScreen variant='loading' />;
    }

    return (
        <UserPreferencesProvider preferences={preferences} updatePreferences={updatePreferences}>
            <Navbar />
            <DeviceTimezoneNotice />
            <ConfirmProvider defaultOptions={defaultConfirmOptions}>
                <Outlet />
            </ConfirmProvider>
        </UserPreferencesProvider>
    );
};

export default ProtectedLayout;
