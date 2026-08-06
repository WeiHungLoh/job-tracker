import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, TouchEvent as ReactTouchEvent } from 'react';
import { MdOpenInFull } from 'react-icons/md';
import darkApplicationsPreview from '../../../images/dark-list-applications.webp';
import darkDashboardPreview from '../../../images/dark-dashboard.webp';
import darkInterviewsPreview from '../../../images/dark-list-interview.webp';
import darkOfferComparisonPreview from '../../../images/dark-offer-comparison.webp';
import lightApplicationsPreview from '../../../images/light-list-applications.webp';
import lightDashboardPreview from '../../../images/light-dashboard.webp';
import lightInterviewsPreview from '../../../images/light-list-interview.webp';
import lightOfferComparisonPreview from '../../../images/light-offer-comparison.webp';
import type { Theme } from '../theme/models';
import { useTheme } from '../theme/ThemeContext';
import styles from './AuthProductIntro.module.css';
import ProductPreviewFullscreenViewer from './ProductPreviewFullscreenViewer';

const PREVIEW_TRANSITION_FALLBACK_MS = 380;
const SWIPE_CLICK_SUPPRESSION_MS = 350;
const SWIPE_DISTANCE_THRESHOLD = 48;
const SWIPE_HORIZONTAL_BIAS = 1.2;

type ProductPreview = {
    readonly alt: string;
    readonly darkImage: string;
    readonly description: string;
    readonly label: string;
    readonly lightImage: string;
};

type PreviewMotionDirection = 'backward' | 'forward';

type TouchStart = {
    x: number;
    y: number;
};

const productPreviews: readonly ProductPreview[] = [
    {
        alt: 'Job Tracker Dashboard showing application, interview and priority statistics',
        darkImage: darkDashboardPreview,
        description: 'See what needs your attention, monitor your progress and understand your job search at a glance.',
        label: 'Dashboard',
        lightImage: lightDashboardPreview,
    },
    {
        alt: 'Job Tracker Applications Board showing opportunities grouped across the application pipeline',
        darkImage: darkApplicationsPreview,
        description: 'Track every opportunity across your pipeline and switch between focused list and visual board views.',
        label: 'Applications',
        lightImage: lightApplicationsPreview,
    },
    {
        alt: 'Job Tracker Interviews List showing scheduled interviews, meeting details and follow-ups',
        darkImage: darkInterviewsPreview,
        description: 'Keep upcoming interviews, schedules, meeting details and follow-ups organised in list or board view.',
        label: 'Interviews',
        lightImage: lightInterviewsPreview,
    },
    {
        alt: 'Job Tracker Offer Comparison in Card mode showing compensation, priorities and overall fit',
        darkImage: darkOfferComparisonPreview,
        description: 'Evaluate competing offers across compensation, priorities, trade-offs and overall fit.',
        label: 'Offer Comparison',
        lightImage: lightOfferComparisonPreview,
    },
];

const loadedPreviewImages = new Set<string>();
const previewImageRequests = new Map<string, Promise<void>>();

const canDecodePreviewImages = () =>
    typeof window !== 'undefined' &&
    typeof Image !== 'undefined' &&
    !window.navigator.userAgent.toLowerCase().includes('jsdom');

const getPreviewImage = (preview: ProductPreview, theme: Theme) =>
    theme === 'dark' ? preview.darkImage : preview.lightImage;

const loadPreviewImage = (src: string) => {
    if (loadedPreviewImages.has(src)) {
        return Promise.resolve();
    }

    if (!canDecodePreviewImages()) {
        loadedPreviewImages.add(src);
        return Promise.resolve();
    }

    const existingRequest = previewImageRequests.get(src);
    if (existingRequest) {
        return existingRequest;
    }

    const request = new Promise<void>((resolve) => {
        const image = new Image();
        let completed = false;

        const complete = () => {
            if (completed) {
                return;
            }

            completed = true;
            loadedPreviewImages.add(src);
            previewImageRequests.delete(src);
            resolve();
        };

        image.onload = () => {
            if (typeof image.decode === 'function') {
                void image.decode().then(complete, complete);
                return;
            }

            complete();
        };
        image.onerror = complete;
        image.src = src;

        if (image.complete) {
            image.onload?.(new Event('load'));
        }
    });

    previewImageRequests.set(src, request);
    return request;
};

const getPreviewMotionDirection = (currentIndex: number, nextIndex: number): PreviewMotionDirection => {
    const forwardDistance = (nextIndex - currentIndex + productPreviews.length) % productPreviews.length;
    const backwardDistance = (currentIndex - nextIndex + productPreviews.length) % productPreviews.length;
    return forwardDistance <= backwardDistance ? 'forward' : 'backward';
};

const prefersReducedMotion = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ProductPreviewCarousel = () => {
    const { theme } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const [displayedTheme, setDisplayedTheme] = useState<Theme>(theme);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isNavigationPending, setIsNavigationPending] = useState(false);
    const [isTransitionActive, setIsTransitionActive] = useState(false);
    const [motionDirection, setMotionDirection] = useState<PreviewMotionDirection>('forward');
    const [outgoingImage, setOutgoingImage] = useState<string | null>(null);
    const imageButtonRef = useRef<HTMLButtonElement>(null);
    const navigationRequestIdRef = useRef(0);
    const previewTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const restoreFocusRef = useRef(false);
    const suppressClickAfterSwipeRef = useRef(false);
    const swipeClickSuppressionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const touchStartRef = useRef<TouchStart | null>(null);

    const activePreview = productPreviews[activeIndex];
    const activeImage = getPreviewImage(activePreview, displayedTheme);
    const isNavigationDisabled = isNavigationPending || outgoingImage !== null;
    const previewLabels = useMemo(() => productPreviews.map((preview) => preview.label), []);

    const markImageLoaded = useCallback((src: string) => {
        loadedPreviewImages.add(src);
    }, []);

    const finishPreviewTransition = useCallback(() => {
        if (previewTransitionTimeoutRef.current) {
            clearTimeout(previewTransitionTimeoutRef.current);
            previewTransitionTimeoutRef.current = undefined;
        }

        setIsTransitionActive(false);
        setOutgoingImage(null);
    }, []);

    const startPreviewTransitionFallback = useCallback(() => {
        if (previewTransitionTimeoutRef.current) {
            clearTimeout(previewTransitionTimeoutRef.current);
        }

        previewTransitionTimeoutRef.current = setTimeout(
            finishPreviewTransition,
            PREVIEW_TRANSITION_FALLBACK_MS
        );
    }, [finishPreviewTransition]);

    const beginPreviewTransition = useCallback(
        (index: number, nextTheme: Theme, direction: PreviewMotionDirection) => {
            const nextImage = getPreviewImage(productPreviews[index], nextTheme);
            const currentImage = getPreviewImage(productPreviews[activeIndex], displayedTheme);

            setMotionDirection(direction);
            setActiveIndex(index);
            setDisplayedTheme(nextTheme);

            if (prefersReducedMotion() || currentImage === nextImage) {
                setOutgoingImage(null);
                setIsTransitionActive(false);
                return;
            }

            setOutgoingImage(currentImage);
            setIsTransitionActive(false);
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    setIsTransitionActive(true);
                    if (!isFullscreen) {
                        startPreviewTransitionFallback();
                    }
                });
            });
        },
        [activeIndex, displayedTheme, isFullscreen, startPreviewTransitionFallback]
    );

    const selectPreview = useCallback(
        (index: number, requestedDirection?: PreviewMotionDirection) => {
            if (index === activeIndex || isNavigationDisabled) {
                return;
            }

            const direction = requestedDirection ?? getPreviewMotionDirection(activeIndex, index);
            const nextImage = getPreviewImage(productPreviews[index], theme);
            const requestId = navigationRequestIdRef.current + 1;
            navigationRequestIdRef.current = requestId;
            setIsNavigationPending(true);

            void loadPreviewImage(nextImage).then(() => {
                if (navigationRequestIdRef.current !== requestId) {
                    return;
                }

                beginPreviewTransition(index, theme, direction);
                setIsNavigationPending(false);
            });
        },
        [activeIndex, beginPreviewTransition, isNavigationDisabled, theme]
    );

    const showPreviousPreview = useCallback(() => {
        selectPreview((activeIndex - 1 + productPreviews.length) % productPreviews.length, 'backward');
    }, [activeIndex, selectPreview]);

    const showNextPreview = useCallback(() => {
        selectPreview((activeIndex + 1) % productPreviews.length, 'forward');
    }, [activeIndex, selectPreview]);

    const handleTabKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
            let nextIndex: number | null = null;

            if (event.key === 'ArrowLeft') {
                nextIndex = (index - 1 + productPreviews.length) % productPreviews.length;
            } else if (event.key === 'ArrowRight') {
                nextIndex = (index + 1) % productPreviews.length;
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = productPreviews.length - 1;
            }

            if (nextIndex === null) {
                return;
            }

            event.preventDefault();
            tabRefs.current[nextIndex]?.focus();
            selectPreview(nextIndex);
        },
        [selectPreview]
    );

    const suppressNextClick = useCallback(() => {
        suppressClickAfterSwipeRef.current = true;
        if (swipeClickSuppressionTimeoutRef.current) {
            clearTimeout(swipeClickSuppressionTimeoutRef.current);
        }
        swipeClickSuppressionTimeoutRef.current = setTimeout(() => {
            suppressClickAfterSwipeRef.current = false;
        }, SWIPE_CLICK_SUPPRESSION_MS);
    }, []);

    const handleTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
        if (isNavigationDisabled || event.touches.length !== 1) {
            touchStartRef.current = null;
            return;
        }

        touchStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, [isNavigationDisabled]);

    const handleTouchEnd = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            const touchStart = touchStartRef.current;
            touchStartRef.current = null;
            if (!touchStart || event.changedTouches.length !== 1) {
                return;
            }

            const horizontalDistance = event.changedTouches[0].clientX - touchStart.x;
            const verticalDistance = event.changedTouches[0].clientY - touchStart.y;
            if (
                Math.abs(horizontalDistance) < SWIPE_DISTANCE_THRESHOLD ||
                Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * SWIPE_HORIZONTAL_BIAS
            ) {
                return;
            }

            event.preventDefault();
            suppressNextClick();
            if (horizontalDistance < 0) {
                showNextPreview();
            } else {
                showPreviousPreview();
            }
        },
        [showNextPreview, showPreviousPreview, suppressNextClick]
    );

    const handleOpenFullscreen = useCallback(() => {
        if (suppressClickAfterSwipeRef.current || isNavigationPending) {
            suppressClickAfterSwipeRef.current = false;
            return;
        }

        if (outgoingImage) {
            finishPreviewTransition();
        }
        setIsFullscreen(true);
    }, [finishPreviewTransition, isNavigationPending, outgoingImage]);

    const closeFullscreen = useCallback(() => {
        restoreFocusRef.current = true;
        navigationRequestIdRef.current += 1;
        setIsNavigationPending(false);
        finishPreviewTransition();
        setIsFullscreen(false);
    }, [finishPreviewTransition]);

    useEffect(() => {
        const nextIndex = (activeIndex + 1) % productPreviews.length;
        void loadPreviewImage(getPreviewImage(productPreviews[nextIndex], displayedTheme));
    }, [activeIndex, displayedTheme]);

    useEffect(() => {
        if (theme === displayedTheme) {
            return;
        }

        const nextImage = getPreviewImage(productPreviews[activeIndex], theme);
        const requestId = navigationRequestIdRef.current + 1;
        navigationRequestIdRef.current = requestId;
        setIsNavigationPending(true);
        void loadPreviewImage(nextImage).then(() => {
            if (navigationRequestIdRef.current !== requestId) {
                return;
            }

            beginPreviewTransition(activeIndex, theme, 'forward');
            setIsNavigationPending(false);
        });
    }, [activeIndex, beginPreviewTransition, displayedTheme, theme]);

    useEffect(() => {
        if (!isFullscreen && restoreFocusRef.current) {
            restoreFocusRef.current = false;
            imageButtonRef.current?.focus();
        }
    }, [isFullscreen]);

    useEffect(
        () => () => {
            navigationRequestIdRef.current += 1;
            if (previewTransitionTimeoutRef.current) {
                clearTimeout(previewTransitionTimeoutRef.current);
            }
            if (swipeClickSuppressionTimeoutRef.current) {
                clearTimeout(swipeClickSuppressionTimeoutRef.current);
            }
        },
        []
    );

    return (
        <>
            <section
                className={styles.carouselRegion}
                aria-label='Job Tracker product preview'
                onTouchCancel={() => {
                    touchStartRef.current = null;
                }}
                onTouchEnd={handleTouchEnd}
                onTouchStart={handleTouchStart}
            >
                <div className={styles.featureTabs} role='tablist' aria-label='Product features'>
                    {productPreviews.map((preview, index) => (
                        <button
                            ref={(element) => {
                                tabRefs.current[index] = element;
                            }}
                            key={preview.label}
                            id={`product-feature-tab-${index}`}
                            type='button'
                            className={styles.featureTab}
                            role='tab'
                            aria-controls='product-feature-panel'
                            aria-selected={index === activeIndex}
                            tabIndex={index === activeIndex ? 0 : -1}
                            onClick={() => selectPreview(index)}
                            onKeyDown={(event) => handleTabKeyDown(event, index)}
                        >
                            {preview.label}
                        </button>
                    ))}
                </div>

                <p className={styles.featureDescription} aria-live='polite'>
                    {activePreview.description}
                </p>

                <div
                    id='product-feature-panel'
                    className={styles.preview}
                    role='tabpanel'
                    aria-labelledby={`product-feature-tab-${activeIndex}`}
                >
                    <button
                        ref={imageButtonRef}
                        type='button'
                        className={styles.previewImageButton}
                        onClick={handleOpenFullscreen}
                        aria-label={`Open ${activePreview.label} screenshot in fullscreen`}
                    >
                        {outgoingImage ? (
                            <img
                                className={`${styles.previewLayer} ${
                                    isTransitionActive ? styles.previewLayerOutgoing : ''
                                }`}
                                data-motion-direction={motionDirection}
                                data-preview-layer='outgoing'
                                src={outgoingImage}
                                alt=''
                                aria-hidden='true'
                                decoding='async'
                            />
                        ) : null}
                        <img
                            className={`${styles.previewLayer} ${
                                outgoingImage && !isTransitionActive ? styles.previewLayerIncomingInitial : ''
                            }`}
                            data-motion-direction={motionDirection}
                            data-preview-layer='incoming'
                            src={activeImage}
                            alt={activePreview.alt}
                            decoding='async'
                            loading={activeIndex === 0 ? 'eager' : 'lazy'}
                            onLoad={() => markImageLoaded(activeImage)}
                            onTransitionEnd={outgoingImage && isTransitionActive ? finishPreviewTransition : undefined}
                        />
                        <span className={styles.fullPageAffordance}>
                            <MdOpenInFull aria-hidden='true' focusable='false' />
                            View full page
                        </span>
                    </button>
                </div>
            </section>

            {isFullscreen ? (
                <ProductPreviewFullscreenViewer
                    activeIndex={activeIndex}
                    alt={activePreview.alt}
                    image={activeImage}
                    isNavigationDisabled={isNavigationDisabled}
                    isNavigationLoading={isNavigationPending}
                    label={activePreview.label}
                    labels={previewLabels}
                    motionDirection={motionDirection}
                    onClose={closeFullscreen}
                    onImageLoad={markImageLoaded}
                    onSelect={selectPreview}
                    onShowNext={showNextPreview}
                    onShowPrevious={showPreviousPreview}
                    onTransitionEnd={finishPreviewTransition}
                    onTransitionStart={startPreviewTransitionFallback}
                    previousImage={outgoingImage}
                />
            ) : null}
        </>
    );
};

export default ProductPreviewCarousel;
