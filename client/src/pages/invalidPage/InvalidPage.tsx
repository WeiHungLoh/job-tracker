import FallbackScreen from '../../components/fallbackScreen/FallbackScreen';
import { routes } from '../../routes';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useJobTrackerAPI } from '../../api/useJobTrackerAPI';

type InvalidPageContext = 'demo' | 'session';

type InvalidPageProps = {
    context?: InvalidPageContext;
};

const RECOVERY_TARGETS = {
    authenticated: {
        label: 'View applications',
        path: routes.viewApplications,
    },
    demo: {
        label: 'Back to Demo',
        path: routes.demoViewApplications,
    },
    public: {
        label: 'Back to Job Tracker',
        path: routes.signIn,
    },
} as const;

const InvalidPage = ({ context = 'session' }: InvalidPageProps) => {
    const navigate = useNavigate();
    const api = useJobTrackerAPI();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        if (context === 'demo') {
            return;
        }

        let isMounted = true;

        const resolveSessionContext = async () => {
            try {
                await api.authentication.verify({
                    onUnauthenticated: () => {
                        if (isMounted) setIsAuthenticated(false);
                    },
                });
                if (isMounted) setIsAuthenticated(true);
            } catch {
                if (isMounted) setIsAuthenticated(false);
            }
        };

        void resolveSessionContext();

        return () => {
            isMounted = false;
        };
    }, [api.authentication, context]);

    const recoveryTarget =
        context === 'demo'
            ? RECOVERY_TARGETS.demo
            : isAuthenticated
            ? RECOVERY_TARGETS.authenticated
            : RECOVERY_TARGETS.public;

    return (
        <FallbackScreen
            actionLabel={recoveryTarget.label}
            onAction={() => navigate(recoveryTarget.path)}
            onSecondaryAction={() => navigate(-1)}
            secondaryActionLabel='Go back'
            variant='notFound'
        />
    );
};

export default InvalidPage;
