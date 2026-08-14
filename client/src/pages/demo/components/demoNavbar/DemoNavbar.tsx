import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { type MouseEvent, useEffect, useRef } from 'react';
import Icon from '../../../../components/icon/Icon';
import PrimaryButton from '../../../../components/button/PrimaryButton';
import { routes } from '../../../../routes';
import styles from '../../../../components/navbar/Navbar.module.css';
import { useTheme } from '../../../../components/theme/ThemeContext';
import { useActivityControlsEffect } from '../../../../components/activityControls/ActivityControlsEffectContext';

const ARCHIVED_LOCATIONS: readonly string[] = [
    routes.demoArchivedApplications,
    routes.demoArchivedInterviews,
    routes.demoArchivedOfferDecisions,
];

const ACTIVE_NAV_LINKS = [
    { to: routes.demoDashboard, label: 'Dashboard' },
    { to: routes.demoAddApplication, label: 'New Application' },
    { to: routes.demoViewApplications, label: 'Applications' },
    { to: routes.demoViewInterviews, label: 'Interviews' },
    { to: routes.demoOfferDecisions, label: 'Offer Comparison' },
] as const;

const ARCHIVED_NAV_LINKS = [
    { to: routes.demoArchivedApplications, label: 'Archived Applications' },
    { to: routes.demoArchivedInterviews, label: 'Archived Interviews' },
    { to: routes.demoArchivedOfferDecisions, label: 'Archived Offer Comparison' },
] as const;

const DemoNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentLocation = location.pathname;
    const archived = ARCHIVED_LOCATIONS.includes(currentLocation);
    const activeLinkRef = useRef<HTMLAnchorElement>(null);
    const { theme, toggleTheme } = useTheme();
    const { activityControlsEffect, toggleActivityControlsEffect } = useActivityControlsEffect();

    useEffect(() => {
        activeLinkRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [archived, currentLocation]);

    const handleArchiveStatusToggle = () => {
        if (currentLocation === routes.demoOfferDecisions) {
            navigate(routes.demoArchivedOfferDecisions);
            return;
        }
        if (currentLocation === routes.demoArchivedOfferDecisions) {
            navigate(routes.demoOfferDecisions);
            return;
        }

        navigate(archived ? routes.demoViewApplications : routes.demoArchivedApplications);
    };

    const handleExitDemo = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        navigate(routes.signIn, { state: { fromLogout: true } });
    };

    const navLinks = archived ? ARCHIVED_NAV_LINKS : ACTIVE_NAV_LINKS;

    return (
        <nav aria-label='Demo navigation' className={styles.navbar}>
            <div className={styles.navbarContent}>
                <div className={styles.brand}>
                    <span className={styles.brandIcon}>
                        <Icon name='briefcase' size={17} />
                    </span>
                    <h1>Demo</h1>
                </div>

                <div
                    aria-label={archived ? 'Archived demo pages' : 'Active demo pages'}
                    className={styles.primaryLinks}
                >
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
                        aria-label={archived ? 'Show Active' : 'Show Archived'}
                        className={styles.archiveStatus}
                        onClick={handleArchiveStatusToggle}
                        type='button'
                        variant='navigation'
                    >
                        <Icon name={archived ? 'archive' : 'activeApplications'} size={18} />
                        <span className={styles.utilityLabel}>{archived ? 'Show Active' : 'Show Archived'}</span>
                    </PrimaryButton>

                    <PrimaryButton
                        aria-label={
                            activityControlsEffect === 'glass'
                                ? 'Switch to normal activity controls'
                                : 'Switch to glass activity controls'
                        }
                        aria-pressed={activityControlsEffect === 'glass'}
                        className={styles.iconAction}
                        onClick={toggleActivityControlsEffect}
                        type='button'
                        variant='navigation'
                    >
                        <Icon name={activityControlsEffect === 'glass' ? 'highlight' : 'visibility'} size={20} />
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

                    <NavLink className={styles.utilityAction} onClick={handleExitDemo} to={routes.signIn}>
                        Exit Demo
                    </NavLink>
                </div>
            </div>
        </nav>
    );
};

export default DemoNavbar;
