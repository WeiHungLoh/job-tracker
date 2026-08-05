import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { MdChevronLeft, MdChevronRight, MdClose, MdFitScreen, MdZoomIn, MdZoomOut } from 'react-icons/md';
import LoadingSpinner from '../loadingSpinner/LoadingSpinner';
import styles from './AuthProductIntro.module.css';

const MAX_ZOOM = 2.5;
const ZOOM_SCALE = 1.5;
const VIEWPORT_HORIZONTAL_PADDING = 32;

type ImageDimensions = {
    height: number;
    src: string;
    width: number;
};

type ProductPreviewFullscreenViewerProps = {
    activeIndex: number;
    alt: string;
    image: string;
    isNavigationDisabled: boolean;
    isNavigationLoading: boolean;
    label: string;
    labels: readonly string[];
    motionDirection: 'backward' | 'forward';
    onClose: () => void;
    onImageLoad: (src: string) => void;
    onSelect: (index: number) => void;
    onShowNext: () => void;
    onShowPrevious: () => void;
    onTransitionEnd: () => void;
    onTransitionStart: () => void;
    previousImage: string | null;
    transitionStartOffsetPx: number;
};

type PreviewTrackStyle = CSSProperties & {
    '--preview-track-start-offset'?: string;
};

const calculateFitWidthZoom = (viewportWidth: number, naturalWidth: number) => {
    if (viewportWidth <= 0 || naturalWidth <= 0) {
        return 1;
    }

    const availableWidth = Math.max(viewportWidth - VIEWPORT_HORIZONTAL_PADDING, 1);
    return Math.min(availableWidth / naturalWidth, 1);
};

const calculateZoomForLevel = (fitWidthZoom: number, zoomLevel: number) =>
    Math.min(fitWidthZoom * ZOOM_SCALE ** zoomLevel, MAX_ZOOM);

const ProductPreviewFullscreenViewer = ({
    activeIndex,
    alt,
    image,
    isNavigationDisabled,
    isNavigationLoading,
    label,
    labels,
    motionDirection,
    onClose,
    onImageLoad,
    onSelect,
    onShowNext,
    onShowPrevious,
    onTransitionEnd,
    onTransitionStart,
    previousImage,
    transitionStartOffsetPx,
}: ProductPreviewFullscreenViewerProps) => {
    const [displayReadyImage, setDisplayReadyImage] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const [fitWidthZoom, setFitWidthZoom] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(0);
    const imageDimensionsBySourceRef = useRef(new Map<string, ImageDimensions>());
    const imageRef = useRef<HTMLImageElement>(null);
    const navigationLockRef = useRef(false);
    const preparingImageElementRef = useRef<HTMLImageElement | null>(null);
    const startedTransitionImageRef = useRef<string | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const activeImageDimensions = imageDimensions?.src === image ? imageDimensions : null;

    const resetViewport = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        if (typeof viewport.scrollTo === 'function') {
            viewport.scrollTo({ left: 0, top: 0 });
            return;
        }

        viewport.scrollLeft = 0;
        viewport.scrollTop = 0;
    }, []);

    const fitImageToWidth = useCallback(
        (dimensions: ImageDimensions, resetScroll: boolean) => {
            const nextZoom = calculateFitWidthZoom(viewportRef.current?.clientWidth ?? 0, dimensions.width);
            setFitWidthZoom(nextZoom);
            setZoom(nextZoom);
            setZoomLevel(0);
            if (resetScroll) {
                resetViewport();
            }
        },
        [resetViewport]
    );

    const readImageDimensions = useCallback(
        (imageElement: HTMLImageElement) => {
            const { naturalHeight, naturalWidth } = imageElement;
            onImageLoad(image);

            if (naturalHeight <= 0 || naturalWidth <= 0) {
                return;
            }

            const dimensions = { height: naturalHeight, src: image, width: naturalWidth };
            imageDimensionsBySourceRef.current.set(image, dimensions);
            setImageDimensions(dimensions);
            setFailedImage(null);
            fitImageToWidth(dimensions, true);
        },
        [fitImageToWidth, image, onImageLoad]
    );

    const prepareImageForDisplay = useCallback(
        (imageElement: HTMLImageElement) => {
            readImageDimensions(imageElement);

            if (preparingImageElementRef.current === imageElement) {
                return;
            }

            preparingImageElementRef.current = imageElement;
            const markImageDisplayReady = () => {
                if (imageRef.current === imageElement) {
                    setDisplayReadyImage(image);
                }
            };
            const markImageDisplayReadyAfterPaint = () => {
                if (typeof window.requestAnimationFrame !== 'function') {
                    markImageDisplayReady();
                    return;
                }

                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(markImageDisplayReady);
                });
            };

            if (typeof imageElement.decode === 'function') {
                void imageElement.decode().then(markImageDisplayReadyAfterPaint, markImageDisplayReadyAfterPaint);
                return;
            }

            markImageDisplayReady();
        },
        [image, readImageDimensions]
    );

    const handleImageLoad = useCallback(
        (event: SyntheticEvent<HTMLImageElement>) => {
            prepareImageForDisplay(event.currentTarget);
        },
        [prepareImageForDisplay]
    );

    const handleFitWidth = useCallback(() => {
        if (imageDimensions) {
            fitImageToWidth(imageDimensions, true);
        }
    }, [fitImageToWidth, imageDimensions]);

    const handleZoomIn = useCallback(() => {
        if (!imageDimensions || zoom >= MAX_ZOOM) {
            return;
        }

        const nextZoomLevel = zoomLevel + 1;
        setZoomLevel(nextZoomLevel);
        setZoom(calculateZoomForLevel(fitWidthZoom, nextZoomLevel));
    }, [fitWidthZoom, imageDimensions, zoom, zoomLevel]);

    const handleZoomOut = useCallback(() => {
        if (!imageDimensions || zoomLevel === 0) {
            return;
        }

        const nextZoomLevel = zoomLevel - 1;
        setZoomLevel(nextZoomLevel);
        setZoom(calculateZoomForLevel(fitWidthZoom, nextZoomLevel));
    }, [fitWidthZoom, imageDimensions, zoomLevel]);

    const prepareNavigation = useCallback(
        (navigate: () => void) => {
            if (isNavigationDisabled || navigationLockRef.current) {
                return;
            }

            navigationLockRef.current = true;
            try {
                navigate();
            } catch (error) {
                navigationLockRef.current = false;
                throw error;
            }
        },
        [isNavigationDisabled]
    );

    const handleShowPrevious = useCallback(
        () => prepareNavigation(onShowPrevious),
        [onShowPrevious, prepareNavigation]
    );
    const handleShowNext = useCallback(() => prepareNavigation(onShowNext), [onShowNext, prepareNavigation]);
    const handleSelect = useCallback(
        (index: number) => {
            if (index !== activeIndex) {
                prepareNavigation(() => onSelect(index));
            }
        },
        [activeIndex, onSelect, prepareNavigation]
    );

    useLayoutEffect(() => {
        setDisplayReadyImage(null);
        setImageDimensions(null);
        setFailedImage(null);
        setFitWidthZoom(1);
        setZoom(1);
        setZoomLevel(0);
        preparingImageElementRef.current = null;
        startedTransitionImageRef.current = null;
        resetViewport();
    }, [image, resetViewport]);

    useEffect(() => {
        if (!isNavigationDisabled) {
            navigationLockRef.current = false;
        }
    }, [image, isNavigationDisabled]);

    useEffect(() => {
        const imageElement = imageRef.current;
        if (imageElement?.complete) {
            prepareImageForDisplay(imageElement);
        }
    }, [image, prepareImageForDisplay]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport || !imageDimensions) {
            return;
        }

        const recalculateFitWidth = () => {
            const nextFitWidthZoom = calculateFitWidthZoom(viewport.clientWidth, imageDimensions.width);
            setFitWidthZoom(nextFitWidthZoom);
            setZoom(calculateZoomForLevel(nextFitWidthZoom, zoomLevel));
        };

        if (typeof ResizeObserver === 'function') {
            const observer = new ResizeObserver(recalculateFitWidth);
            observer.observe(viewport);
            return () => observer.disconnect();
        }

        window.addEventListener('resize', recalculateFitWidth);
        return () => window.removeEventListener('resize', recalculateFitWidth);
    }, [imageDimensions, zoomLevel]);

    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow;
        const previousDocumentOverflow = document.documentElement.style.overflow;
        const appRoot = document.getElementById('root');
        const previousRootAriaHidden = appRoot?.getAttribute('aria-hidden');
        const previousRootInert = appRoot?.getAttribute('inert');

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        appRoot?.setAttribute('aria-hidden', 'true');
        appRoot?.setAttribute('inert', '');

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousDocumentOverflow;

            if (previousRootInert === null) {
                appRoot?.removeAttribute('inert');
            } else if (previousRootInert !== undefined) {
                appRoot?.setAttribute('inert', previousRootInert);
            }

            if (previousRootAriaHidden === null) {
                appRoot?.removeAttribute('aria-hidden');
            } else if (previousRootAriaHidden !== undefined) {
                appRoot?.setAttribute('aria-hidden', previousRootAriaHidden);
            }
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.repeat && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                event.preventDefault();
                return;
            }

            if (isNavigationDisabled && ['ArrowLeft', 'ArrowRight', '+', '=', '-', '0'].includes(event.key)) {
                event.preventDefault();
                return;
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                handleShowPrevious();
                return;
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                handleShowNext();
                return;
            }

            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                if (zoom < MAX_ZOOM) {
                    handleZoomIn();
                }
                return;
            }

            if (event.key === '-') {
                event.preventDefault();
                if (zoomLevel > 0) {
                    handleZoomOut();
                }
                return;
            }

            if (event.key === '0') {
                event.preventDefault();
                handleFitWidth();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        handleFitWidth,
        handleShowNext,
        handleShowPrevious,
        handleZoomIn,
        handleZoomOut,
        isNavigationDisabled,
        onClose,
        zoom,
        zoomLevel,
    ]);

    const hasImageLoadError = failedImage === image;
    const hasPairedTrack = previousImage !== null;
    const isTransitionPreparing = hasPairedTrack && displayReadyImage !== image && !hasImageLoadError;
    const isTransitioning = hasPairedTrack && !isTransitionPreparing;
    const trackPhase = isTransitionPreparing ? 'preparing' : isTransitioning ? 'transitioning' : undefined;

    useLayoutEffect(() => {
        if (!isTransitioning || startedTransitionImageRef.current === image) {
            return;
        }

        startedTransitionImageRef.current = image;
        onTransitionStart();
    }, [image, isTransitioning, onTransitionStart]);

    const previousLabel = labels[(activeIndex - 1 + labels.length) % labels.length];
    const nextLabel = labels[(activeIndex + 1) % labels.length];
    const percentage = Math.round(zoom * 100);
    const imageStyle = activeImageDimensions
        ? {
              height: `${activeImageDimensions.height * zoom}px`,
              width: `${activeImageDimensions.width * zoom}px`,
          }
        : undefined;

    const outgoingImageDimensions = previousImage ? imageDimensionsBySourceRef.current.get(previousImage) : undefined;
    const outgoingFitWidthZoom = outgoingImageDimensions
        ? calculateFitWidthZoom(viewportRef.current?.clientWidth ?? 0, outgoingImageDimensions.width)
        : 1;
    const outgoingImageStyle = outgoingImageDimensions
        ? {
              height: `${outgoingImageDimensions.height * outgoingFitWidthZoom}px`,
              width: `${outgoingImageDimensions.width * outgoingFitWidthZoom}px`,
          }
        : undefined;
    const trackStyle: PreviewTrackStyle | undefined = hasPairedTrack
        ? { '--preview-track-start-offset': `${transitionStartOffsetPx}px` }
        : undefined;
    const activePanel = (
        <div key={image} className={styles.fullscreenTrackPanel}>
            <div className={styles.fullscreenImageCanvas}>
                {hasImageLoadError ? (
                    <p className={styles.fullscreenImageError}>Unable to load this preview.</p>
                ) : (
                    <img
                        ref={imageRef}
                        className={styles.fullscreenPreviewImage}
                        data-motion-direction={motionDirection}
                        data-preview-layer='incoming'
                        src={image}
                        alt={alt}
                        decoding='async'
                        loading='eager'
                        onError={() => {
                            setImageDimensions(null);
                            setFailedImage(image);
                            setDisplayReadyImage(image);
                        }}
                        onLoad={handleImageLoad}
                        style={imageStyle}
                    />
                )}
            </div>
        </div>
    );
    const outgoingPanel = previousImage ? (
        <div key={previousImage} className={styles.fullscreenTrackPanel} aria-hidden='true'>
            <div className={styles.fullscreenImageCanvas}>
                <img
                    className={`${styles.fullscreenPreviewImage} ${styles.fullscreenTrackSnapshot}`}
                    data-preview-layer='outgoing'
                    src={previousImage}
                    alt=''
                    decoding='async'
                    style={outgoingImageStyle}
                />
            </div>
        </div>
    ) : null;
    const trackPanels =
        outgoingPanel && motionDirection === 'forward'
            ? [outgoingPanel, activePanel]
            : outgoingPanel
            ? [activePanel, outgoingPanel]
            : [activePanel];

    return createPortal(
        <div
            className={styles.fullscreenBackdrop}
            role='dialog'
            aria-modal='true'
            aria-label={`${label} screenshot viewer`}
        >
            <div className={styles.fullscreenViewer}>
                <header className={styles.fullscreenToolbar}>
                    <div className={styles.fullscreenTitleGroup}>
                        <h2>{label}</h2>
                        <span>
                            {activeIndex + 1} of {labels.length}
                        </span>
                    </div>

                    <div className={styles.fullscreenZoomControls} aria-label='Screenshot zoom controls'>
                        <button
                            type='button'
                            className={styles.fullscreenTextButton}
                            onClick={handleFitWidth}
                            disabled={!activeImageDimensions || isNavigationDisabled}
                            aria-pressed={zoomLevel === 0}
                        >
                            <MdFitScreen aria-hidden='true' focusable='false' />
                            Fit width
                        </button>
                        <button
                            type='button'
                            className={styles.fullscreenIconButton}
                            onClick={handleZoomOut}
                            disabled={!activeImageDimensions || zoomLevel === 0 || isNavigationDisabled}
                            aria-label='Zoom out'
                        >
                            <MdZoomOut aria-hidden='true' focusable='false' />
                        </button>
                        <span className={styles.fullscreenZoomPercentage} aria-live='polite'>
                            {percentage}%
                        </span>
                        <button
                            type='button'
                            className={styles.fullscreenIconButton}
                            onClick={handleZoomIn}
                            disabled={!activeImageDimensions || zoom >= MAX_ZOOM || isNavigationDisabled}
                            aria-label='Zoom in'
                        >
                            <MdZoomIn aria-hidden='true' focusable='false' />
                        </button>
                    </div>

                    <button
                        type='button'
                        className={styles.fullscreenClose}
                        onClick={onClose}
                        aria-label='Close fullscreen preview'
                        autoFocus
                    >
                        <MdClose aria-hidden='true' focusable='false' />
                    </button>
                </header>

                <div
                    ref={viewportRef}
                    className={styles.fullscreenImageViewport}
                    data-track-active={hasPairedTrack ? 'true' : undefined}
                    data-testid='fullscreen-image-viewport'
                >
                    <div
                        className={styles.fullscreenPreviewTrack}
                        data-motion-direction={motionDirection}
                        data-preview-track='fullscreen'
                        data-track-phase={trackPhase}
                        onAnimationEnd={isTransitioning ? onTransitionEnd : undefined}
                        style={trackStyle}
                    >
                        {trackPanels}
                    </div>
                    {isNavigationLoading ||
                    isTransitionPreparing ||
                    (!hasPairedTrack &&
                        (!activeImageDimensions || displayReadyImage !== image) &&
                        !hasImageLoadError) ? (
                        <span className={styles.previewLoadingOverlay}>
                            <LoadingSpinner size={32} title='Loading preview' variant='primary' />
                        </span>
                    ) : null}
                </div>

                <nav className={styles.fullscreenNavigation} aria-label='Fullscreen screenshot navigation'>
                    <button
                        type='button'
                        className={styles.fullscreenNavigationButton}
                        onClick={handleShowPrevious}
                        disabled={isNavigationDisabled}
                        aria-label={`Previous screenshot: ${previousLabel}`}
                    >
                        <MdChevronLeft aria-hidden='true' focusable='false' />
                        <span>Previous</span>
                    </button>

                    <div className={styles.fullscreenDots} aria-label='Select a screenshot'>
                        {labels.map((previewLabel, index) => (
                            <button
                                key={previewLabel}
                                type='button'
                                className={`${styles.carouselDot} ${
                                    index === activeIndex ? styles.activeCarouselDot : ''
                                }`}
                                onClick={() => handleSelect(index)}
                                disabled={isNavigationDisabled}
                                aria-label={`Show ${previewLabel}`}
                                aria-current={index === activeIndex ? 'true' : undefined}
                            />
                        ))}
                    </div>

                    <button
                        type='button'
                        className={styles.fullscreenNavigationButton}
                        onClick={handleShowNext}
                        disabled={isNavigationDisabled}
                        aria-label={`Next screenshot: ${nextLabel}`}
                    >
                        <span>Next</span>
                        <MdChevronRight aria-hidden='true' focusable='false' />
                    </button>
                </nav>
            </div>
        </div>,
        document.body
    );
};

export default ProductPreviewFullscreenViewer;
