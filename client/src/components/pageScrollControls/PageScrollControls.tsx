import { useEffect, useState } from 'react';
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import { routes } from '../../routes';
import styles from './PageScrollControls.module.css';

const SCROLL_TOP_VISIBILITY_THRESHOLD = 320;
const SCROLL_BOTTOM_TOLERANCE = 24;

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

const getScrollBehavior = (): ScrollBehavior =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

const PageScrollControls = () => {
    const { pathname } = useLocation();
    const isEnabled = PAGE_SCROLL_CONTROL_ROUTES.has(pathname);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    useEffect(() => {
        if (!isEnabled) {
            setCanScrollUp(false);
            setCanScrollDown(false);
            return;
        }

        const updateVisibility = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const remainingScroll = document.documentElement.scrollHeight - window.innerHeight - scrollTop;

            setCanScrollUp(scrollTop >= SCROLL_TOP_VISIBILITY_THRESHOLD);
            setCanScrollDown(remainingScroll > SCROLL_BOTTOM_TOLERANCE);
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

    return (
        <>
            {canScrollUp && (
                <button
                    aria-label='Scroll to top'
                    className={`${styles.scrollButton} ${styles.scrollToTop}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: getScrollBehavior() })}
                    title='Scroll to top'
                    type='button'
                >
                    <MdKeyboardArrowUp aria-hidden='true' focusable='false' />
                </button>
            )}
            {canScrollDown && (
                <button
                    aria-label='Scroll to bottom'
                    className={`${styles.scrollButton} ${styles.scrollToBottom}`}
                    onClick={() =>
                        window.scrollTo({
                            top: document.documentElement.scrollHeight,
                            behavior: getScrollBehavior(),
                        })
                    }
                    title='Scroll to bottom'
                    type='button'
                >
                    <MdKeyboardArrowDown aria-hidden='true' focusable='false' />
                </button>
            )}
        </>
    );
};

export default PageScrollControls;
