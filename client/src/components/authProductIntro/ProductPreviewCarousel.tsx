import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
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

const getAdjacentPreviewIndexes = (activeIndex: number) => [
    activeIndex,
    (activeIndex - 1 + productPreviews.length) % productPreviews.length,
    (activeIndex + 1) % productPreviews.length,
];

type CarouselControlsProps = {
    activeIndex: number;
    activeLabel: string;
    isNavigationLoading: boolean;
    onSelect: (index: number) => void;
    onShowNext: () => void;
    onShowPrevious: () => void;
};

const CarouselControls = memo(
    ({
        activeIndex,
        activeLabel,
        isNavigationLoading,
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
                    disabled={isNavigationLoading}
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
                                disabled={isNavigationLoading}
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
                    disabled={isNavigationLoading}
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
    imageButtonRef: Ref<HTMLButtonElement>;
    isNavigationLoading: boolean;
    onImageClick: () => void;
    onImageLoad: (src: string) => void;
    onSelect: (index: number) => void;
    onShowNext: () => void;
    onShowPrevious: () => void;
    theme: Theme;
};

const PreviewFrame = memo(
    ({
        activeIndex,
        imageButtonRef,
        isNavigationLoading,
        onImageClick,
        onImageLoad,
        onSelect,
        onShowNext,
        onShowPrevious,
        theme,
    }: PreviewFrameProps) => {
        const activePreview = productPreviews[activeIndex];
        const image = getPreviewImage(activePreview, theme);

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
                    <img
                        src={image}
                        alt={activePreview.alt}
                        decoding='async'
                        loading='eager'
                        onLoad={() => onImageLoad(image)}
                    />
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
                    isNavigationLoading={isNavigationLoading}
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isNavigationLoading, setIsNavigationLoading] = useState(false);
    const [loadedImages, setLoadedImages] = useState(() => new Set(loadedPreviewImages));
    const imageButtonRef = useRef<HTMLButtonElement>(null);
    const navigationRequestIdRef = useRef(0);
    const restoreFocusRef = useRef(false);
    const isMountedRef = useRef(true);
    const suppressClickAfterSwipeRef = useRef(false);
    const swipeClickSuppressionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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
            indexes.forEach((index) => {
                const src = getPreviewImage(productPreviews[index], theme);

                if (!canPreloadPreviewImages()) {
                    loadedPreviewImages.add(src);
                    return;
                }

                void preloadPreviewImage(src).then(() => markImageLoaded(src));
            });
        },
        [markImageLoaded, theme]
    );

    const selectPreview = useCallback(
        (index: number) => {
            if (index === activeIndex || isNavigationLoading) {
                return;
            }

            const nextImage = getPreviewImage(productPreviews[index], theme);

            if (!canPreloadPreviewImages()) {
                loadedPreviewImages.add(nextImage);
                setActiveIndex(index);
                return;
            }

            if (loadedImages.has(nextImage) || loadedPreviewImages.has(nextImage)) {
                setActiveIndex(index);
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
                setActiveIndex(index);
                setIsNavigationLoading(false);
            });
        },
        [activeIndex, isNavigationLoading, loadedImages, markImageLoaded, theme]
    );

    const showPreviousPreview = useCallback(() => {
        selectPreview((activeIndex - 1 + productPreviews.length) % productPreviews.length);
    }, [activeIndex, selectPreview]);

    const showNextPreview = useCallback(() => {
        selectPreview((activeIndex + 1) % productPreviews.length);
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

    const handleCarouselTouchStart = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            if (isNavigationLoading || event.touches.length !== 1) {
                touchStartRef.current = null;
                return;
            }

            const touch = event.touches[0];
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        },
        [isNavigationLoading]
    );

    const handleCarouselTouchEnd = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            const touchStart = touchStartRef.current;
            touchStartRef.current = null;

            if (!touchStart || isNavigationLoading || event.changedTouches.length !== 1) {
                return;
            }

            const touch = event.changedTouches[0];
            const horizontalDistance = touch.clientX - touchStart.x;
            const verticalDistance = touch.clientY - touchStart.y;
            const isHorizontalSwipe =
                Math.abs(horizontalDistance) >= SWIPE_DISTANCE_THRESHOLD &&
                Math.abs(horizontalDistance) > Math.abs(verticalDistance) * SWIPE_HORIZONTAL_BIAS;

            if (!isHorizontalSwipe) {
                return;
            }

            event.preventDefault();
            suppressClickAfterSwipeRef.current = true;
            if (swipeClickSuppressionTimeoutRef.current) {
                clearTimeout(swipeClickSuppressionTimeoutRef.current);
            }
            swipeClickSuppressionTimeoutRef.current = setTimeout(() => {
                suppressClickAfterSwipeRef.current = false;
                swipeClickSuppressionTimeoutRef.current = undefined;
            }, SWIPE_CLICK_SUPPRESSION_MS);

            if (horizontalDistance < 0) {
                showNextPreview();
                return;
            }

            showPreviousPreview();
        },
        [isNavigationLoading, showNextPreview, showPreviousPreview]
    );

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
        setIsFullscreen(true);
    }, []);

    const closeFullscreen = useCallback(() => {
        restoreFocusRef.current = true;
        setIsFullscreen(false);
    }, []);

    const adjacentPreviewIndexes = useMemo(() => getAdjacentPreviewIndexes(activeIndex), [activeIndex]);
    const activePreview = productPreviews[activeIndex];
    const activeImage = getPreviewImage(activePreview, theme);
    const previewLabels = useMemo(() => productPreviews.map((preview) => preview.label), []);

    useEffect(() => {
        preloadImages(adjacentPreviewIndexes);
    }, [adjacentPreviewIndexes, preloadImages]);

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
                onTouchCancel={() => {
                    touchStartRef.current = null;
                }}
                onTouchEnd={handleCarouselTouchEnd}
                onTouchStart={handleCarouselTouchStart}
                tabIndex={0}
            >
                <PreviewFrame
                    activeIndex={activeIndex}
                    imageButtonRef={imageButtonRef}
                    isNavigationLoading={isNavigationLoading}
                    onImageClick={handleOpenFullscreen}
                    onImageLoad={markImageLoaded}
                    onSelect={selectPreview}
                    onShowNext={showNextPreview}
                    onShowPrevious={showPreviousPreview}
                    theme={theme}
                />
            </div>

            {isFullscreen ? (
                <ProductPreviewFullscreenViewer
                    activeIndex={activeIndex}
                    alt={activePreview.alt}
                    image={activeImage}
                    isNavigationLoading={isNavigationLoading}
                    label={activePreview.label}
                    labels={previewLabels}
                    onClose={closeFullscreen}
                    onImageLoad={markImageLoaded}
                    onSelect={selectPreview}
                    onShowNext={showNextPreview}
                    onShowPrevious={showPreviousPreview}
                />
            ) : null}
        </>
    );
};

export default ProductPreviewCarousel;
