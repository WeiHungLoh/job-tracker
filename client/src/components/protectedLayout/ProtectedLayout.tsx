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
import PageScrollControls from '../pageScrollControls/PageScrollControls';

const ProtectedLayout = () => {
    const api = useJobTrackerAPI();
    const { showErrorToast } = useToast();
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [preferencesError, setPreferencesError] = useState<boolean>(false);
    const preferenceUpdateQueue = useRef<Promise<void>>(Promise.resolve());

    const loadPreferences = useCallback(async (): Promise<UserPreferences> => {
        const loadedPreferences = await api.userPreferences.get();
        setPreferences(loadedPreferences);
        return loadedPreferences;
    }, [api.userPreferences]);

    const loadInitialPreferences = useCallback(async () => {
        setPreferencesError(false);
        try {
            await loadPreferences();
        } catch (error) {
            setPreferencesError(true);
            showErrorToast(getErrorToastMessage(error, 'Unable to load user preferences. Please try again.'));
        }
    }, [loadPreferences, showErrorToast]);

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
        void loadInitialPreferences();
    }, [loadInitialPreferences]);

    if (preferencesError) {
        return <FallbackScreen variant='authenticationError' onAction={() => void loadInitialPreferences()} />;
    }

    if (!preferences) {
        return <FallbackScreen variant='loading' />;
    }

    return (
        <UserPreferencesProvider preferences={preferences} updatePreferences={updatePreferences}>
            <Navbar />
            <DeviceTimezoneNotice />
            <PageScrollControls />
            <ConfirmProvider defaultOptions={defaultConfirmOptions}>
                <Outlet />
            </ConfirmProvider>
        </UserPreferencesProvider>
    );
};

export default ProtectedLayout;
