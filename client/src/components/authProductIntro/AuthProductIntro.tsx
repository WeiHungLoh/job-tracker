import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { routes } from '../../routes';
import Icon from '../icon/Icon';
import styles from './AuthProductIntro.module.css';
import ProductPreviewCarousel from './ProductPreviewCarousel';

type AuthProductIntroProps = {
    children: ReactNode;
};

export const AUTH_FOCUSED_MODE_STORAGE_KEY = 'jobTrackerAuthFocusedMode';
const AUTH_PANEL_ID = 'auth-account-panel';
const AUTH_FOCUS_TRANSITION_MS = 560;

const getInitialFocusedMode = (): boolean => {
    try {
        return localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

const AuthProductIntro = ({ children }: AuthProductIntroProps) => {
    const location = useLocation();
    const [isFocusedMode, setIsFocusedMode] = useState<boolean>(getInitialFocusedMode);
    const accountTriggerRef = useRef<HTMLButtonElement>(null);
    const accountPanelRef = useRef<HTMLElement>(null);
    const focusTimerRef = useRef<number | undefined>(undefined);
    const restoreTriggerFocusRef = useRef(false);
    const accountTriggerLabel = location.pathname === routes.signUp ? 'Create account' : 'Sign in';
    const containerClassName = `${styles.authContainer} ${isFocusedMode ? styles.focusedMode : ''}`;

    const openAccountAccess = () => {
        if (isFocusedMode) {
            return;
        }

        setIsFocusedMode(true);
        try {
            localStorage.setItem(AUTH_FOCUSED_MODE_STORAGE_KEY, 'true');
        } catch {
            // Account access still opens when storage is unavailable.
        }

        const prefersReducedMotion =
            typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        focusTimerRef.current = window.setTimeout(
            () => {
                focusTimerRef.current = undefined;
                accountPanelRef.current?.querySelector<HTMLInputElement>('#email')?.focus({ preventScroll: true });
            },
            prefersReducedMotion ? 0 : AUTH_FOCUS_TRANSITION_MS
        );
    };

    const showProductOverview = useCallback(() => {
        if (focusTimerRef.current !== undefined) {
            window.clearTimeout(focusTimerRef.current);
            focusTimerRef.current = undefined;
        }

        restoreTriggerFocusRef.current = true;
        setIsFocusedMode(false);
        try {
            localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
        } catch {
            // The product stage still opens when storage is unavailable.
        }
    }, []);

    useEffect(
        () => () => {
            if (focusTimerRef.current !== undefined) {
                window.clearTimeout(focusTimerRef.current);
            }
        },
        []
    );

    useEffect(() => {
        if (isFocusedMode || !restoreTriggerFocusRef.current) {
            return;
        }

        restoreTriggerFocusRef.current = false;
        accountTriggerRef.current?.focus({ preventScroll: true });
    }, [isFocusedMode]);

    useEffect(() => {
        if (!isFocusedMode) {
            return;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            showProductOverview();
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isFocusedMode, showProductOverview]);

    return (
        <div className={containerClassName} data-auth-focused={isFocusedMode ? 'true' : undefined}>
            <section
                className={styles.productPanel}
                aria-hidden={isFocusedMode ? true : undefined}
                aria-labelledby='auth-product-heading'
                inert={isFocusedMode ? true : undefined}
            >
                <header className={styles.productHeader}>
                    <div className={styles.productBrand}>
                        <span className={styles.productBrandIcon} aria-hidden='true'>
                            <Icon name='briefcase' />
                        </span>
                        <span>Job Tracker</span>
                    </div>
                    <button
                        ref={accountTriggerRef}
                        type='button'
                        className={styles.accountTrigger}
                        aria-controls={AUTH_PANEL_ID}
                        aria-expanded={isFocusedMode}
                        onClick={openAccountAccess}
                    >
                        {accountTriggerLabel}
                        <span aria-hidden='true'>→</span>
                    </button>
                </header>

                <div className={styles.heroRow}>
                    <div className={styles.productCopy}>
                        <h1 id='auth-product-heading'>Your job search. One clear view.</h1>
                    </div>
                    <div className={styles.productDetails}>
                        <p className={styles.description}>
                            Keep applications, interviews and offers in one place, so you always know what to do next.
                        </p>
                        <div className={styles.productActions}>
                            <div className={styles.productActionRow}>
                                <a
                                    className={styles.demoLink}
                                    href={routes.demoViewApplications}
                                    rel='noreferrer'
                                    target='_blank'
                                >
                                    Explore Demo
                                    <span aria-hidden='true'>→</span>
                                </a>
                                <Link
                                    className={styles.guideLink}
                                    rel='noreferrer'
                                    to={routes.userGuide}
                                    target='_blank'
                                >
                                    See how it works <span aria-hidden='true'>→</span>
                                </Link>
                            </div>
                            <p className={styles.demoCopy}>
                                Explore Job Tracker with sample data. No account needed. The demo resets when you
                                refresh the page.
                            </p>
                        </div>
                    </div>
                </div>

                <ProductPreviewCarousel />
            </section>

            <section
                id={AUTH_PANEL_ID}
                ref={accountPanelRef}
                className={styles.authPanel}
                aria-label='Account access'
                aria-hidden={!isFocusedMode ? true : undefined}
                inert={!isFocusedMode ? true : undefined}
            >
                <div className={styles.authStage}>
                    <button type='button' className={styles.restoreOverviewButton} onClick={showProductOverview}>
                        <Icon name='arrowBack' />
                        <span>Back to product</span>
                    </button>
                    <div className={styles.authCardSlot}>{children}</div>
                </div>
            </section>
        </div>
    );
};

export default AuthProductIntro;
