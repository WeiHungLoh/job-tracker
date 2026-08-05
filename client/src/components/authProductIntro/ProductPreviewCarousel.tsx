import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    CSSProperties,
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    Ref,
    TouchEvent as ReactTouchEvent,
} from 'react';
import { MdChevronLeft, MdChevronRight, MdOpenInFull } from 'react-icons/md';
import darkAddApplicationPreview from '../../../images/dark-add-application.png';
import darkArchivedOfferComparisonPreview from '../../../images/dark-archived-offer-comparison.png';
import darkBoardApplicationPreview from '../../../images/dark-board-application.png';
import darkBoardArchivedApplicationPreview from '../../../images/dark-board-archived-application.png';
import darkBoardArchivedInterviewPreview from '../../../images/dark-board-archived-interview.png';
import darkBoardInterviewPreview from '../../../images/dark-board-interview.png';
import darkDashboardPreview from '../../../images/dark-dashboard.png';
import darkListApplicationPreview from '../../../images/dark-list-application.png';
import darkListArchivedApplicationPreview from '../../../images/dark-list-archived-application.png';
import darkListArchivedInterviewPreview from '../../../images/dark-list-archived-interview.png';
import darkListInterviewPreview from '../../../images/dark-list-interview.png';
import darkOfferComparisonPreview from '../../../images/dark-offer-comparison.png';
import lightAddApplicationPreview from '../../../images/light-add-application.png';
import lightArchivedOfferComparisonPreview from '../../../images/light-archived-offer-comparison.png';
import lightBoardApplicationPreview from '../../../images/light-board-application.png';
import lightBoardArchivedApplicationPreview from '../../../images/light-board-archived-application.png';
import lightBoardArchivedInterviewPreview from '../../../images/light-board-archived-interview.png';
import lightBoardInterviewPreview from '../../../images/light-board-interview.png';
import lightDashboardPreview from '../../../images/light-dashboard.png';
import lightListApplicationPreview from '../../../images/light-list-application.png';
import lightListArchivedApplicationPreview from '../../../images/light-list-archived-application.png';
import lightListArchivedInterviewPreview from '../../../images/light-list-archived-interview.png';
import lightListInterviewPreview from '../../../images/light-list-interview.png';
import lightOfferComparisonPreview from '../../../images/light-offer-comparison.png';
import LoadingSpinner from '../loadingSpinner/LoadingSpinner';
import { routes } from '../../routes';
import type { Theme } from '../theme/models';
import { useTheme } from '../theme/ThemeContext';
import styles from './AuthProductIntro.module.css';
import ProductPreviewFullscreenViewer from './ProductPreviewFullscreenViewer';

const PRODUCT_HOST = 'jobtracker.weihungloh.com';
const DRAG_INTENT_THRESHOLD = 8;
const DRAG_SETTLE_FALLBACK_MS = 300;
const PREVIEW_TRANSITION_FALLBACK_MS = 680;
const SWIPE_CLICK_SUPPRESSION_MS = 350;
const SWIPE_DISTANCE_THRESHOLD = 48;
const SWIPE_HORIZONTAL_BIAS = 1.2;

type ProductPreview = {
    readonly alt: string;
    readonly darkImage: string;
    readonly label: string;
    readonly lightImage: string;
    readonly route: string;
};

type PreviewMotionDirection = 'backward' | 'forward';
type PreviewDragPhase = 'dragging' | 'settling';

type PreviewDragState = {
    direction: PreviewMotionDirection;
    offsetPx: number;
    phase: PreviewDragPhase;
    targetIndex: number;
};

type PreviewTrackStyle = CSSProperties & {
    '--preview-track-start-offset'?: string;
};

type TouchStart = {
    intent: 'horizontal' | 'pending' | 'vertical';
    x: number;
    y: number;
};

const productPreviews: readonly ProductPreview[] = [
    {
        alt: 'Job Tracker Dashboard showing application, interview and priority statistics',
        darkImage: darkDashboardPreview,
        label: 'Dashboard',
        lightImage: lightDashboardPreview,
        route: routes.dashboard,
    },
    {
        alt: 'Job Tracker Add Application form',
        darkImage: darkAddApplicationPreview,
        label: 'Add Application',
        lightImage: lightAddApplicationPreview,
        route: routes.addApplication,
    },
    {
        alt: 'Job Tracker List Application page showing applications, statuses, interviews and notes',
        darkImage: darkListApplicationPreview,
        label: 'List Application',
        lightImage: lightListApplicationPreview,
        route: routes.viewApplications,
    },
    {
        alt: 'Job Tracker Board Application page showing applications grouped by status',
        darkImage: darkBoardApplicationPreview,
        label: 'Board Application',
        lightImage: lightBoardApplicationPreview,
        route: routes.viewApplications,
    },
    {
        alt: 'Job Tracker List Interview page showing scheduled job interviews',
        darkImage: darkListInterviewPreview,
        label: 'List Interview',
        lightImage: lightListInterviewPreview,
        route: routes.viewInterviews,
    },
    {
        alt: 'Job Tracker Board Interview page showing scheduled job interviews',
        darkImage: darkBoardInterviewPreview,
        label: 'Board Interview',
        lightImage: lightBoardInterviewPreview,
        route: routes.viewInterviews,
    },
    {
        alt: 'Job Tracker Offer Comparison page showing evaluated job offers',
        darkImage: darkOfferComparisonPreview,
        label: 'Offer Comparison',
        lightImage: lightOfferComparisonPreview,
        route: routes.offerDecisions,
    },
    {
        alt: 'Job Tracker List Archived Application page',
        darkImage: darkListArchivedApplicationPreview,
        label: 'List Archived Application',
        lightImage: lightListArchivedApplicationPreview,
        route: routes.archivedApplications,
    },
    {
        alt: 'Job Tracker Board Archived Application page',
        darkImage: darkBoardArchivedApplicationPreview,
        label: 'Board Archived Application',
        lightImage: lightBoardArchivedApplicationPreview,
        route: routes.archivedApplications,
    },
    {
        alt: 'Job Tracker List Archived Interview page',
        darkImage: darkListArchivedInterviewPreview,
        label: 'List Archived Interview',
        lightImage: lightListArchivedInterviewPreview,
        route: routes.archivedInterviews,
    },
    {
        alt: 'Job Tracker Board Archived Interview page',
        darkImage: darkBoardArchivedInterviewPreview,
        label: 'Board Archived Interview',
        lightImage: lightBoardArchivedInterviewPreview,
        route: routes.archivedInterviews,
    },
    {
        alt: 'Job Tracker Archived Offer Comparison page showing previous offer evaluations',
        darkImage: darkArchivedOfferComparisonPreview,
        label: 'Archived Offer Comparison',
        lightImage: lightArchivedOfferComparisonPreview,
        route: routes.archivedOfferDecisions,
    },
];

const loadedPreviewImages = new Set<string>();
const previewImageRequests = new Map<string, Promise<void>>();

const canPreloadPreviewImages = () =>
    typeof window !== 'undefined' &&
    typeof Image !== 'undefined' &&
    !window.navigator.userAgent.toLowerCase().includes('jsdom');

const getPreviewImage = (preview: ProductPreview, theme: Theme) =>
    theme === 'dark' ? preview.darkImage : preview.lightImage;

const preloadPreviewImage = (src: string) => {
    if (loadedPreviewImages.has(src)) {
        return Promise.resolve();
    }

    if (!canPreloadPreviewImages()) {
        loadedPreviewImages.add(src);
        return Promise.resolve();
    }

    const existingRequest = previewImageRequests.get(src);
    if (existingRequest) {
        return existingRequest;
    }

    const request = new Promise<void>((resolve) => {
        const image = new Image();

        const complete = () => {
            loadedPreviewImages.add(src);
            previewImageRequests.delete(src);
            resolve();
        };

        image.onload = () => {
            if (typeof image.decode === 'function') {
                void image.decode().then(complete, complete);
            } else {
                complete();
            }
        };
        image.onerror = complete;
        image.src = src;
    });

    previewImageRequests.set(src, request);
    return request;
};

const productPreviewIndexes = productPreviews.map((_, index) => index);

const getPreviewMotionDirection = (currentIndex: number, nextIndex: number): PreviewMotionDirection => {
    const forwardDistance = (nextIndex - currentIndex + productPreviews.length) % productPreviews.length;
    const backwardDistance = (currentIndex - nextIndex + productPreviews.length) % productPreviews.length;
    return forwardDistance <= backwardDistance ? 'forward' : 'backward';
};

const prefersReducedMotion = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type CarouselControlsProps = {
    activeIndex: number;
    activeLabel: string;
    isNavigationDisabled: boolean;
    onSelect: (index: number) => void;
    onShowNext: () => void;
    onShowPrevious: () => void;
};

const CarouselControls = memo(
    ({
        activeIndex,
        activeLabel,
        isNavigationDisabled,
        onSelect,
        onShowNext,
        onShowPrevious,
    }: CarouselControlsProps) => {
        const previousLabel =
            productPreviews[(activeIndex - 1 + productPreviews.length) % productPreviews.length].label;
        const nextLabel = productPreviews[(activeIndex + 1) % productPreviews.length].label;

        return (
            <div className={styles.carouselControls}>
                <button
                    type='button'
                    className={styles.carouselArrow}
                    onClick={onShowPrevious}
                    disabled={isNavigationDisabled}
                >
                    <MdChevronLeft className={styles.carouselArrowIcon} aria-hidden='true' focusable='false' />
                    <span className={styles.visuallyHidden}>Previous preview: {previousLabel}</span>
                </button>

                <div className={styles.carouselPosition}>
                    <div className={styles.carouselDots} aria-label='Jump to a product preview'>
                        {productPreviews.map((preview, index) => (
                            <button
                                key={preview.label}
                                type='button'
                                className={`${styles.carouselDot} ${
                                    index === activeIndex ? styles.activeCarouselDot : ''
                                }`}
                                onClick={() => onSelect(index)}
                                disabled={isNavigationDisabled}
                                aria-label={`Jump to ${preview.label}`}
                                aria-current={index === activeIndex ? 'true' : undefined}
                            />
                        ))}
                    </div>
                    <span aria-atomic='true' aria-live='polite' className={styles.carouselCounter}>
                        {activeLabel} · {activeIndex + 1} of {productPreviews.length}
                    </span>
                </div>

                <button
                    type='button'
                    className={styles.carouselArrow}
                    onClick={onShowNext}
                    disabled={isNavigationDisabled}
                >
                    <MdChevronRight className={styles.carouselArrowIcon} aria-hidden='true' focusable='false' />
                    <span className={styles.visuallyHidden}>Next preview: {nextLabel}</span>
                </button>
            </div>
        );
    }
);

CarouselControls.displayName = 'CarouselControls';

type PreviewFrameProps = {
    activeIndex: number;
    dragState: PreviewDragState | null;
    imageButtonRef: Ref<HTMLButtonElement>;
    isNavigationDisabled: boolean;
    isNavigationLoading: boolean;
    motionDirection: PreviewMotionDirection;
    onImageClick: () => void;
    onImageLoad: (src: string) => void;
    onSelect: (index: number) => void;
    onShowNext: () => void;
    onShowPrevious: () => void;
    onTrackSettleEnd: () => void;
    onTransitionEnd: () => void;
    previousIndex: number | null;
    theme: Theme;
    transitionStartOffsetPx: number;
};

const PreviewFrame = memo(
    ({
        activeIndex,
        dragState,
        imageButtonRef,
        isNavigationDisabled,
        isNavigationLoading,
        motionDirection,
        onImageClick,
        onImageLoad,
        onSelect,
        onShowNext,
        onShowPrevious,
        onTrackSettleEnd,
        onTransitionEnd,
        previousIndex,
        theme,
        transitionStartOffsetPx,
    }: PreviewFrameProps) => {
        const activePreview = productPreviews[activeIndex];
        const isTransitioning = previousIndex !== null;
        const trackDirection = dragState?.direction ?? motionDirection;
        const trackPhase = dragState?.phase ?? (isTransitioning ? 'transitioning' : undefined);
        const trackIndexes = (() => {
            if (previousIndex !== null) {
                return trackDirection === 'forward' ? [previousIndex, activeIndex] : [activeIndex, previousIndex];
            }

            if (dragState) {
                return trackDirection === 'forward'
                    ? [activeIndex, dragState.targetIndex]
                    : [dragState.targetIndex, activeIndex];
            }

            return [activeIndex];
        })();
        const trackStyle: PreviewTrackStyle | undefined = (() => {
            if (isTransitioning) {
                return { '--preview-track-start-offset': `${transitionStartOffsetPx}px` };
            }

            if (!dragState) {
                return undefined;
            }

            return {
                transform:
                    trackDirection === 'forward'
                        ? `translate3d(${dragState.offsetPx}px, 0, 0)`
                        : `translate3d(calc(-50% + ${dragState.offsetPx}px), 0, 0)`,
            };
        })();

        return (
            <div className={styles.preview}>
                <div className={styles.browserBar} aria-hidden='true'>
                    <span />
                    <span />
                    <span />
                    <div className={styles.browserAddress}>
                        {PRODUCT_HOST}
                        {activePreview.route}
                    </div>
                </div>

                <button
                    ref={imageButtonRef}
                    type='button'
                    className={styles.previewImageButton}
                    onClick={onImageClick}
                    aria-label={`Open ${activePreview.label} screenshot in fullscreen`}
                >
                    <span
                        className={styles.previewTrack}
                        data-motion-direction={trackDirection}
                        data-preview-track='embedded'
                        data-track-phase={trackPhase}
                        onAnimationEnd={isTransitioning ? onTransitionEnd : undefined}
                        onTransitionEnd={dragState?.phase === 'settling' ? onTrackSettleEnd : undefined}
                        style={trackStyle}
                    >
                        {trackIndexes.map((index) => {
                            const preview = productPreviews[index];
                            const image = getPreviewImage(preview, theme);
                            const isActiveImage = index === activeIndex;
                            const layer = isTransitioning
                                ? isActiveImage
                                    ? 'incoming'
                                    : 'outgoing'
                                : dragState
                                ? isActiveImage
                                    ? 'current'
                                    : 'target'
                                : 'incoming';

                            return (
                                <img
                                    key={index}
                                    className={isActiveImage ? styles.previewImage : styles.previewTrackImage}
                                    data-motion-direction={trackDirection}
                                    data-preview-layer={layer}
                                    src={image}
                                    alt={isActiveImage ? preview.alt : ''}
                                    aria-hidden={isActiveImage ? undefined : 'true'}
                                    decoding='async'
                                    loading='eager'
                                    onLoad={isActiveImage ? () => onImageLoad(image) : undefined}
                                />
                            );
                        })}
                    </span>
                    <span className={styles.fullPageAffordance}>
                        <MdOpenInFull aria-hidden='true' focusable='false' />
                        View full page
                    </span>
                    {isNavigationLoading ? (
                        <span className={styles.previewLoadingOverlay}>
                            <LoadingSpinner size={32} title='Loading preview' variant='primary' />
                        </span>
                    ) : null}
                </button>

                <CarouselControls
                    activeIndex={activeIndex}
                    activeLabel={activePreview.label}
                    isNavigationDisabled={isNavigationDisabled}
                    onSelect={onSelect}
                    onShowNext={onShowNext}
                    onShowPrevious={onShowPrevious}
                />
            </div>
        );
    }
);

PreviewFrame.displayName = 'PreviewFrame';

const ProductPreviewCarousel = () => {
    const { theme } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const [dragState, setDragState] = useState<PreviewDragState | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isNavigationLoading, setIsNavigationLoading] = useState(false);
    const [loadedImages, setLoadedImages] = useState(() => new Set(loadedPreviewImages));
    const [motionDirection, setMotionDirection] = useState<PreviewMotionDirection>('forward');
    const [previousIndex, setPreviousIndex] = useState<number | null>(null);
    const [transitionStartOffsetPx, setTransitionStartOffsetPx] = useState(0);
    const dragSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const imageButtonRef = useRef<HTMLButtonElement>(null);
    const navigationRequestIdRef = useRef(0);
    const previewTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const restoreFocusRef = useRef(false);
    const isMountedRef = useRef(true);
    const suppressClickAfterSwipeRef = useRef(false);
    const swipeClickSuppressionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const touchStartRef = useRef<TouchStart | null>(null);

    const markImageLoaded = useCallback((src: string) => {
        loadedPreviewImages.add(src);
        if (!isMountedRef.current) {
            return;
        }

        setLoadedImages((currentLoadedImages) => {
            if (currentLoadedImages.has(src)) {
                return currentLoadedImages;
            }

            const nextLoadedImages = new Set(currentLoadedImages);
            nextLoadedImages.add(src);
            return nextLoadedImages;
        });
    }, []);

    const preloadImages = useCallback(
        (indexes: number[]) => {
            const sources = indexes.map((index) => getPreviewImage(productPreviews[index], theme));

            if (!canPreloadPreviewImages()) {
                sources.forEach((src) => loadedPreviewImages.add(src));
                return;
            }

            void Promise.all(sources.map(preloadPreviewImage)).then(() => {
                if (!isMountedRef.current) {
                    return;
                }

                setLoadedImages((currentLoadedImages) => {
                    const nextLoadedImages = new Set(currentLoadedImages);
                    sources.forEach((src) => nextLoadedImages.add(src));
                    return nextLoadedImages;
                });
            });
        },
        [theme]
    );

    const finishPreviewTransition = useCallback(() => {
        if (previewTransitionTimeoutRef.current) {
            clearTimeout(previewTransitionTimeoutRef.current);
            previewTransitionTimeoutRef.current = undefined;
        }

        setPreviousIndex(null);
        setTransitionStartOffsetPx(0);
    }, []);

    const startPreviewTransitionFallback = useCallback(() => {
        if (previewTransitionTimeoutRef.current) {
            clearTimeout(previewTransitionTimeoutRef.current);
        }

        previewTransitionTimeoutRef.current = setTimeout(finishPreviewTransition, PREVIEW_TRANSITION_FALLBACK_MS);
    }, [finishPreviewTransition]);

    const finishDragSettle = useCallback(() => {
        if (dragSettleTimeoutRef.current) {
            clearTimeout(dragSettleTimeoutRef.current);
            dragSettleTimeoutRef.current = undefined;
        }

        setDragState(null);
    }, []);

    const settleDrag = useCallback(
        (releasedDragState: PreviewDragState) => {
            if (dragSettleTimeoutRef.current) {
                clearTimeout(dragSettleTimeoutRef.current);
            }

            if (prefersReducedMotion()) {
                finishDragSettle();
                return;
            }

            setDragState({ ...releasedDragState, offsetPx: 0, phase: 'settling' });
            dragSettleTimeoutRef.current = setTimeout(finishDragSettle, DRAG_SETTLE_FALLBACK_MS);
        },
        [finishDragSettle]
    );

    const beginPreviewTransition = useCallback(
        (index: number, direction: PreviewMotionDirection, startOffsetPx = 0) => {
            if (previewTransitionTimeoutRef.current) {
                clearTimeout(previewTransitionTimeoutRef.current);
            }
            if (dragSettleTimeoutRef.current) {
                clearTimeout(dragSettleTimeoutRef.current);
                dragSettleTimeoutRef.current = undefined;
            }

            setDragState(null);
            if (prefersReducedMotion()) {
                setPreviousIndex(null);
                setMotionDirection(direction);
                setTransitionStartOffsetPx(0);
                setActiveIndex(index);
                return;
            }

            setPreviousIndex(activeIndex);
            setMotionDirection(direction);
            setTransitionStartOffsetPx(startOffsetPx);
            setActiveIndex(index);

            if (!isFullscreen) {
                startPreviewTransitionFallback();
            }
        },
        [activeIndex, isFullscreen, startPreviewTransitionFallback]
    );

    const selectPreview = useCallback(
        (index: number, requestedDirection?: PreviewMotionDirection, startOffsetPx = 0) => {
            if (index === activeIndex || isNavigationLoading || previousIndex !== null) {
                return;
            }

            const nextMotionDirection = requestedDirection ?? getPreviewMotionDirection(activeIndex, index);
            const nextImage = getPreviewImage(productPreviews[index], theme);

            if (!canPreloadPreviewImages()) {
                loadedPreviewImages.add(nextImage);
                beginPreviewTransition(index, nextMotionDirection, startOffsetPx);
                return;
            }

            if (loadedImages.has(nextImage) || loadedPreviewImages.has(nextImage)) {
                beginPreviewTransition(index, nextMotionDirection, startOffsetPx);
                return;
            }

            const requestId = navigationRequestIdRef.current + 1;
            navigationRequestIdRef.current = requestId;
            setIsNavigationLoading(true);

            void preloadPreviewImage(nextImage).then(() => {
                if (!isMountedRef.current || navigationRequestIdRef.current !== requestId) {
                    return;
                }

                markImageLoaded(nextImage);
                beginPreviewTransition(index, nextMotionDirection, startOffsetPx);
                setIsNavigationLoading(false);
            });
        },
        [activeIndex, beginPreviewTransition, isNavigationLoading, loadedImages, markImageLoaded, previousIndex, theme]
    );

    const showPreviousPreview = useCallback(() => {
        selectPreview((activeIndex - 1 + productPreviews.length) % productPreviews.length, 'backward');
    }, [activeIndex, selectPreview]);

    const showNextPreview = useCallback(() => {
        selectPreview((activeIndex + 1) % productPreviews.length, 'forward');
    }, [activeIndex, selectPreview]);

    const handleCarouselClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        if (!suppressClickAfterSwipeRef.current) {
            return;
        }

        suppressClickAfterSwipeRef.current = false;
        if (swipeClickSuppressionTimeoutRef.current) {
            clearTimeout(swipeClickSuppressionTimeoutRef.current);
            swipeClickSuppressionTimeoutRef.current = undefined;
        }
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const suppressNextCarouselClick = useCallback(() => {
        suppressClickAfterSwipeRef.current = true;
        if (swipeClickSuppressionTimeoutRef.current) {
            clearTimeout(swipeClickSuppressionTimeoutRef.current);
        }
        swipeClickSuppressionTimeoutRef.current = setTimeout(() => {
            suppressClickAfterSwipeRef.current = false;
            swipeClickSuppressionTimeoutRef.current = undefined;
        }, SWIPE_CLICK_SUPPRESSION_MS);
    }, []);

    const handleCarouselTouchStart = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            if (dragState || isNavigationLoading || previousIndex !== null || event.touches.length !== 1) {
                touchStartRef.current = null;
                return;
            }

            const touch = event.touches[0];
            touchStartRef.current = { intent: 'pending', x: touch.clientX, y: touch.clientY };
        },
        [dragState, isNavigationLoading, previousIndex]
    );

    const handleCarouselTouchMove = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            const touchStart = touchStartRef.current;
            if (
                !touchStart ||
                touchStart.intent === 'vertical' ||
                isNavigationLoading ||
                previousIndex !== null ||
                event.touches.length !== 1
            ) {
                return;
            }

            const touch = event.touches[0];
            const horizontalDistance = touch.clientX - touchStart.x;
            const verticalDistance = touch.clientY - touchStart.y;

            if (touchStart.intent === 'pending') {
                if (Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < DRAG_INTENT_THRESHOLD) {
                    return;
                }

                if (Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * SWIPE_HORIZONTAL_BIAS) {
                    touchStart.intent = 'vertical';
                    setDragState(null);
                    return;
                }

                touchStart.intent = 'horizontal';
            }

            event.preventDefault();
            const direction: PreviewMotionDirection = horizontalDistance < 0 ? 'forward' : 'backward';
            const targetIndex =
                direction === 'forward'
                    ? (activeIndex + 1) % productPreviews.length
                    : (activeIndex - 1 + productPreviews.length) % productPreviews.length;
            const frameWidth = imageButtonRef.current?.clientWidth ?? 0;
            const maximumOffset = frameWidth > 0 ? frameWidth : Math.abs(horizontalDistance);
            const offsetPx = Math.sign(horizontalDistance) * Math.min(Math.abs(horizontalDistance), maximumOffset);

            setDragState({ direction, offsetPx, phase: 'dragging', targetIndex });
        },
        [activeIndex, isNavigationLoading, previousIndex]
    );

    const handleCarouselTouchEnd = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            const touchStart = touchStartRef.current;
            touchStartRef.current = null;

            if (
                !touchStart ||
                touchStart.intent === 'vertical' ||
                isNavigationLoading ||
                previousIndex !== null ||
                event.changedTouches.length !== 1
            ) {
                return;
            }

            const touch = event.changedTouches[0];
            const horizontalDistance = touch.clientX - touchStart.x;
            const verticalDistance = touch.clientY - touchStart.y;
            const hasHorizontalIntent =
                touchStart.intent === 'horizontal' ||
                (Math.abs(horizontalDistance) >= DRAG_INTENT_THRESHOLD &&
                    Math.abs(horizontalDistance) > Math.abs(verticalDistance) * SWIPE_HORIZONTAL_BIAS);

            if (!hasHorizontalIntent) {
                return;
            }

            event.preventDefault();
            suppressNextCarouselClick();
            const direction: PreviewMotionDirection = horizontalDistance < 0 ? 'forward' : 'backward';
            const targetIndex =
                direction === 'forward'
                    ? (activeIndex + 1) % productPreviews.length
                    : (activeIndex - 1 + productPreviews.length) % productPreviews.length;

            if (Math.abs(horizontalDistance) >= SWIPE_DISTANCE_THRESHOLD) {
                selectPreview(targetIndex, direction, horizontalDistance);
                return;
            }

            settleDrag(
                dragState ?? {
                    direction,
                    offsetPx: horizontalDistance,
                    phase: 'dragging',
                    targetIndex,
                }
            );
        },
        [
            activeIndex,
            dragState,
            isNavigationLoading,
            previousIndex,
            selectPreview,
            settleDrag,
            suppressNextCarouselClick,
        ]
    );

    const handleCarouselTouchCancel = useCallback(() => {
        touchStartRef.current = null;
        if (dragState) {
            settleDrag(dragState);
        }
    }, [dragState, settleDrag]);

    const handleCarouselKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                showPreviousPreview();
                return;
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                showNextPreview();
            }
        },
        [showNextPreview, showPreviousPreview]
    );

    const handleOpenFullscreen = useCallback(() => {
        if (dragState || isNavigationLoading) {
            return;
        }

        if (previousIndex !== null) {
            finishPreviewTransition();
        }
        setIsFullscreen(true);
    }, [dragState, finishPreviewTransition, isNavigationLoading, previousIndex]);

    const closeFullscreen = useCallback(() => {
        restoreFocusRef.current = true;
        navigationRequestIdRef.current += 1;
        setIsNavigationLoading(false);
        if (previousIndex !== null) {
            finishPreviewTransition();
        }
        setIsFullscreen(false);
    }, [finishPreviewTransition, previousIndex]);

    const activePreview = productPreviews[activeIndex];
    const activeImage = getPreviewImage(activePreview, theme);
    const isNavigationDisabled = isNavigationLoading || previousIndex !== null || dragState !== null;
    const previousImage = previousIndex === null ? null : getPreviewImage(productPreviews[previousIndex], theme);
    const previewLabels = useMemo(() => productPreviews.map((preview) => preview.label), []);

    useEffect(() => {
        preloadImages(productPreviewIndexes);
    }, [preloadImages]);

    useEffect(() => {
        if (!isFullscreen && restoreFocusRef.current) {
            restoreFocusRef.current = false;
            imageButtonRef.current?.focus();
        }
    }, [isFullscreen]);

    useEffect(
        () => () => {
            isMountedRef.current = false;
            navigationRequestIdRef.current += 1;
            if (swipeClickSuppressionTimeoutRef.current) {
                clearTimeout(swipeClickSuppressionTimeoutRef.current);
            }
            if (dragSettleTimeoutRef.current) {
                clearTimeout(dragSettleTimeoutRef.current);
            }
            if (previewTransitionTimeoutRef.current) {
                clearTimeout(previewTransitionTimeoutRef.current);
            }
        },
        []
    );

    return (
        <>
            <div
                className={styles.carouselRegion}
                role='region'
                aria-roledescription='carousel'
                aria-label='Job Tracker product preview'
                onClickCapture={handleCarouselClickCapture}
                onKeyDown={handleCarouselKeyDown}
                onTouchCancel={handleCarouselTouchCancel}
                onTouchEnd={handleCarouselTouchEnd}
                onTouchMove={handleCarouselTouchMove}
                onTouchStart={handleCarouselTouchStart}
                tabIndex={0}
            >
                <PreviewFrame
                    activeIndex={activeIndex}
                    dragState={dragState}
                    imageButtonRef={imageButtonRef}
                    isNavigationDisabled={isNavigationDisabled}
                    isNavigationLoading={isNavigationLoading}
                    motionDirection={motionDirection}
                    onImageClick={handleOpenFullscreen}
                    onImageLoad={markImageLoaded}
                    onSelect={selectPreview}
                    onShowNext={showNextPreview}
                    onShowPrevious={showPreviousPreview}
                    onTrackSettleEnd={finishDragSettle}
                    onTransitionEnd={finishPreviewTransition}
                    previousIndex={isFullscreen ? null : previousIndex}
                    theme={theme}
                    transitionStartOffsetPx={transitionStartOffsetPx}
                />
            </div>

            {isFullscreen ? (
                <ProductPreviewFullscreenViewer
                    activeIndex={activeIndex}
                    alt={activePreview.alt}
                    image={activeImage}
                    isNavigationDisabled={isNavigationDisabled}
                    isNavigationLoading={isNavigationLoading}
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
                    previousImage={previousImage}
                    transitionStartOffsetPx={transitionStartOffsetPx}
                />
            ) : null}
        </>
    );
};

export default ProductPreviewCarousel;
