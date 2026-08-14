import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ActivityControlsEffect = 'glass' | 'normal';

type ActivityControlsEffectContextValue = {
    activityControlsEffect: ActivityControlsEffect;
    toggleActivityControlsEffect: () => void;
};

const STORAGE_KEY = 'activity-controls-effect';
const ActivityControlsEffectContext = createContext<ActivityControlsEffectContextValue | null>(null);

const getInitialActivityControlsEffect = (): ActivityControlsEffect => {
    try {
        const storedEffect = localStorage.getItem(STORAGE_KEY);
        if (storedEffect === 'glass' || storedEffect === 'normal') {
            return storedEffect;
        }
    } catch {
        // localStorage unavailable
    }

    return 'glass';
};

export const ActivityControlsEffectProvider = ({ children }: { children: ReactNode }) => {
    const [activityControlsEffect, setActivityControlsEffect] = useState<ActivityControlsEffect>(
        getInitialActivityControlsEffect
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-activity-controls-effect', activityControlsEffect);
    }, [activityControlsEffect]);

    const toggleActivityControlsEffect = () => {
        setActivityControlsEffect((currentEffect) => {
            const nextEffect = currentEffect === 'glass' ? 'normal' : 'glass';
            try {
                localStorage.setItem(STORAGE_KEY, nextEffect);
            } catch {
                // localStorage unavailable
            }
            return nextEffect;
        });
    };

    return (
        <ActivityControlsEffectContext.Provider value={{ activityControlsEffect, toggleActivityControlsEffect }}>
            {children}
        </ActivityControlsEffectContext.Provider>
    );
};

export const useActivityControlsEffect = (): ActivityControlsEffectContextValue => {
    const context = useContext(ActivityControlsEffectContext);
    if (!context) {
        throw new Error('useActivityControlsEffect must be used within ActivityControlsEffectProvider');
    }
    return context;
};
