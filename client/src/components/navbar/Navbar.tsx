import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Icon from '../icon/Icon';
import BrandMark from '../brandMark/BrandMark';
import PrimaryButton from '../button/PrimaryButton';
import { routes } from '../../routes';
import styles from './Navbar.module.css';
import { useJobTrackerAPI } from '../../api/useJobTrackerAPI';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../toast/ToastProvider';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';

const ARCHIVED_LOCATIONS: readonly string[] = [
    routes.archivedApplications,
    routes.archivedInterviews,
    routes.archivedOfferDecisions,
];

const ACTIVE_NAV_LINKS = [
    { to: routes.dashboard, label: 'Dashboard' },
    { to: routes.addApplication, label: 'New Application' },
    { to: routes.viewApplications, label: 'Applications' },
    { to: routes.viewInterviews, label: 'Interviews' },
    { to: routes.offerDecisions, label: 'Offer Comparison' },
] as const;

const ARCHIVED_NAV_LINKS = [
    { to: routes.archivedApplications, label: 'Archived Applications' },
    { to: routes.archivedInterviews, label: 'Archived Interviews' },
    { to: routes.archivedOfferDecisions, label: 'Archived Offer Comparison' },
] as const;

const Navbar = () => {
    const location = useLocation();
    const currentLocation = location.pathname;
    const navigate = useNavigate();
    const archived = ARCHIVED_LOCATIONS.includes(currentLocation);
    const activeLinkRef = useRef<HTMLAnchorElement>(null);
    const signOutPendingRef = useRef(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const api = useJobTrackerAPI();
    const { showErrorToast } = useToast();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        activeLinkRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [archived, currentLocation]);

    const handleArchiveStatusToggle = () => {
        if (currentLocation === routes.offerDecisions) {
            navigate(routes.archivedOfferDecisions);
            return;
        }
        if (currentLocation === routes.archivedOfferDecisions) {
            navigate(routes.offerDecisions);
            return;
        }

        navigate(archived ? routes.viewApplications : routes.archivedApplications);
    };

    const handleSignOut = async () => {
        if (signOutPendingRef.current) {
            return;
        }

        signOutPendingRef.current = true;
        setIsSigningOut(true);
        try {
            await api.authentication.logout();
            navigate(routes.signIn, { state: { fromLogout: true } });
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to sign out. Please try again.'));
        } finally {
            signOutPendingRef.current = false;
            setIsSigningOut(false);
        }
    };

    const navLinks = archived ? ARCHIVED_NAV_LINKS : ACTIVE_NAV_LINKS;

    return (
        <nav aria-label='Primary navigation' className={styles.navbar}>
            <div className={styles.navbarContent}>
                <div className={styles.brand}>
                    <BrandMark />
                    <h1>Job Tracker</h1>
                </div>

                <div aria-label={archived ? 'Archived pages' : 'Active pages'} className={styles.primaryLinks}>
                    {navLinks.map(({ to, label }) => (
                        <NavLink
                            className={currentLocation === to ? styles.active : styles.inactive}
                            key={to}
                            ref={currentLocation === to ? activeLinkRef : undefined}
                            to={to}
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>

                <div className={styles.utilityActions}>
                    <PrimaryButton
                        aria-label={archived ? 'Show active' : 'Show archived'}
                        className={styles.archiveStatus}
                        onClick={handleArchiveStatusToggle}
                        type='button'
                        variant='navigation'
                    >
                        <Icon name={archived ? 'archive' : 'activeApplications'} size={18} />
                        <span className={styles.utilityLabel}>{archived ? 'Show active' : 'Show archived'}</span>
                    </PrimaryButton>

                    <PrimaryButton
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        className={styles.iconAction}
                        onClick={toggleTheme}
                        type='button'
                        variant='navigation'
                    >
                        <Icon name={theme === 'dark' ? 'lightMode' : 'darkMode'} size={20} />
                    </PrimaryButton>

                    <PrimaryButton
                        className={styles.utilityAction}
                        isLoading={isSigningOut}
                        onClick={() => void handleSignOut()}
                        type='button'
                        variant='navigation'
                    >
                        Sign out
                    </PrimaryButton>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
