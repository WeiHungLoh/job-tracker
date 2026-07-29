import type { DemoAction } from '../state/demoReducer';
import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { createDemoInitialState } from '../state/demoInitialState';
import type { DemoState } from '../models';
import type { PropsWithChildren } from 'react';
import type { UpdateUserPreferencesRequest, UserPreferences } from '../../../components/userPreferences/models';
import { demoReducer } from '../state/demoReducer';

type DemoContextValue = {
    dispatch: React.Dispatch<DemoAction>;
    state: DemoState;
    updatePreferences: (preferences: UpdateUserPreferencesRequest) => Promise<UserPreferences>;
};

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export const DemoProvider = ({ children }: PropsWithChildren) => {
    const [state, dispatch] = useReducer(demoReducer, undefined, () => createDemoInitialState());

    const updatePreferences = useCallback(
        async (updatedPreferences: UpdateUserPreferencesRequest) => {
            dispatch({ type: 'UPDATE_PREFERENCES', payload: updatedPreferences });

            return {
                ...state.preferences,
                ...updatedPreferences,
            };
        },
        [state.preferences]
    );
    const contextValue = useMemo(() => ({ dispatch, state, updatePreferences }), [state, updatePreferences]);

    return <DemoContext.Provider value={contextValue}>{children}</DemoContext.Provider>;
};

export const useDemo = () => {
    const context = useContext(DemoContext);

    if (!context) {
        throw new Error('useDemo must be used within a DemoProvider');
    }

    return context;
};
