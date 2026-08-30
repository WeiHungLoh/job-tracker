import { useEffect, useState } from 'react';
import { MdKeyboardArrowUp } from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import { getScrollBehavior } from '../../helper/scrollBehavior';
import { routes } from '../../routes';
import styles from './PageScrollControls.module.css';

const SCROLL_TOP_VISIBILITY_THRESHOLD = 320;

const PAGE_SCROLL_CONTROL_ROUTES = new Set<string>([
    routes.viewApplications,
    routes.viewInterviews,
    routes.archivedApplications,
    routes.archivedInterviews,
    routes.offerDecisions,
    routes.archivedOfferDecisions,
    routes.demoViewApplications,
    routes.demoViewInterviews,
    routes.demoArchivedApplications,
    routes.demoArchivedInterviews,
    routes.demoOfferDecisions,
    routes.demoArchivedOfferDecisions,
]);

const PageScrollControls = () => {
    const { pathname } = useLocation();
    const isEnabled = PAGE_SCROLL_CONTROL_ROUTES.has(pathname);
    const [canScrollUp, setCanScrollUp] = useState(false);

    useEffect(() => {
        if (!isEnabled) {
            setCanScrollUp(false);
            return;
        }

        const updateVisibility = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;

            setCanScrollUp(scrollTop >= SCROLL_TOP_VISIBILITY_THRESHOLD);
        };

        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });
        window.addEventListener('resize', updateVisibility);

        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateVisibility);
        resizeObserver?.observe(document.body);

        return () => {
            window.removeEventListener('scroll', updateVisibility);
            window.removeEventListener('resize', updateVisibility);
            resizeObserver?.disconnect();
        };
    }, [isEnabled, pathname]);

    if (!isEnabled) {
        return null;
    }

    return canScrollUp ? (
        <button
            aria-label='Scroll to top'
            className={`${styles.scrollButton} ${styles.scrollToTop}`}
            onClick={() => window.scrollTo({ top: 0, behavior: getScrollBehavior() })}
            title='Scroll to top'
            type='button'
        >
            <MdKeyboardArrowUp aria-hidden='true' focusable='false' />
        </button>
    ) : null;
};

export default PageScrollControls;
