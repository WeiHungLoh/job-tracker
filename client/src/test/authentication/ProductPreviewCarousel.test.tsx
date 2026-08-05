import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ProductPreviewCarousel from '../../components/authProductIntro/ProductPreviewCarousel';
import ProductPreviewFullscreenViewer from '../../components/authProductIntro/ProductPreviewFullscreenViewer';
import { useTheme } from '../../components/theme/ThemeContext';
import spinnerStyles from '../../components/loadingSpinner/LoadingSpinner.module.css';
import { render } from '../renderWithProviders';
import userEvent from '@testing-library/user-event';

const expectedSlides = [
    ['Dashboard', 'light-dashboard.png', 'dark-dashboard.png'],
    ['Add Application', 'light-add-application.png', 'dark-add-application.png'],
    ['List Application', 'light-list-application.png', 'dark-list-application.png'],
    ['Board Application', 'light-board-application.png', 'dark-board-application.png'],
    ['List Interview', 'light-list-interview.png', 'dark-list-interview.png'],
    ['Board Interview', 'light-board-interview.png', 'dark-board-interview.png'],
    ['Offer Comparison', 'light-offer-comparison.png', 'dark-offer-comparison.png'],
    ['List Archived Application', 'light-list-archived-application.png', 'dark-list-archived-application.png'],
    ['Board Archived Application', 'light-board-archived-application.png', 'dark-board-archived-application.png'],
    ['List Archived Interview', 'light-list-archived-interview.png', 'dark-list-archived-interview.png'],
    ['Board Archived Interview', 'light-board-archived-interview.png', 'dark-board-archived-interview.png'],
    ['Archived Offer Comparison', 'light-archived-offer-comparison.png', 'dark-archived-offer-comparison.png'],
] as const;

const ThemeToggle = () => {
    const { toggleTheme } = useTheme();
    return (
        <button type='button' onClick={toggleTheme}>
            Toggle theme
        </button>
    );
};

const setNaturalImageSize = (image: HTMLImageElement, width: number, height: number) => {
    Object.defineProperties(image, {
        naturalHeight: { configurable: true, value: height },
        naturalWidth: { configurable: true, value: width },
    });
};

describe('ProductPreviewCarousel', () => {
    beforeEach(() => {
        localStorage.removeItem('theme');
        const appRoot = document.createElement('div');
        appRoot.id = 'root';
        document.body.append(appRoot);
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
            configurable: true,
            value: vi.fn(),
        });
    });

    afterEach(() => {
        localStorage.removeItem('theme');
        document.getElementById('root')?.remove();
    });

    test('uses the exact twelve-slide light screenshot order and labels', () => {
        render(<ProductPreviewCarousel />);

        expect(screen.getAllByRole('button', { name: /^Jump to / })).toHaveLength(12);
        expect(screen.getByText('Dashboard · 1 of 12')).toBeInTheDocument();
        expect(screen.getByText('View full page')).toBeInTheDocument();

        expectedSlides.forEach(([label, lightImage], index) => {
            if (index > 0) {
                userEvent.click(screen.getByRole('button', { name: /next preview/i }));
            }

            expect(screen.getByRole('button', { name: `Open ${label} screenshot in fullscreen` })).toBeInTheDocument();
            expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining(lightImage));
            expect(screen.getByText(`${label} · ${index + 1} of 12`)).toBeInTheDocument();

            if (index > 0) {
                fireEvent.animationEnd(document.querySelector('[data-preview-track="embedded"]') as HTMLElement);
            }
        });
    });

    test('swipes between previews without opening fullscreen or hijacking vertical scrolling', () => {
        render(<ProductPreviewCarousel />);

        const carousel = screen.getByRole('region', { name: 'Job Tracker product preview' });
        const dashboardPreview = screen.getByRole('button', { name: 'Open Dashboard screenshot in fullscreen' });

        fireEvent.touchStart(dashboardPreview, { touches: [{ clientX: 280, clientY: 120 }] });
        fireEvent.touchEnd(dashboardPreview, { changedTouches: [{ clientX: 120, clientY: 126 }] });

        const addApplicationPreview = screen.getByRole('button', {
            name: 'Open Add Application screenshot in fullscreen',
        });
        expect(screen.getByText('Add Application · 2 of 12')).toBeInTheDocument();
        fireEvent.animationEnd(addApplicationPreview.querySelector('[data-preview-track="embedded"]') as HTMLElement);

        fireEvent.click(addApplicationPreview);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.touchStart(carousel, { touches: [{ clientX: 180, clientY: 300 }] });
        fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 190, clientY: 120 }] });
        expect(screen.getByText('Add Application · 2 of 12')).toBeInTheDocument();

        fireEvent.touchStart(carousel, { touches: [{ clientX: 120, clientY: 120 }] });
        fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 280, clientY: 126 }] });
        expect(screen.getByText('Dashboard · 1 of 12')).toBeInTheDocument();
    });

    test('moves one shared screenshot track in both embedded and fullscreen previews', () => {
        render(<ProductPreviewCarousel />);

        const initialDashboardImage = screen.getByRole('img');
        userEvent.click(screen.getByRole('button', { name: /next preview/i }));
        let embeddedImage = screen.getByRole('img');
        expect(embeddedImage.className).toContain('previewImage');
        expect(embeddedImage).toHaveAttribute('data-motion-direction', 'forward');
        const embeddedFrame = screen.getByRole('button', {
            name: 'Open Add Application screenshot in fullscreen',
        });
        let embeddedTrack = embeddedFrame.querySelector('[data-preview-track="embedded"]') as HTMLElement;
        expect(embeddedFrame.style.backgroundImage).toBe('');
        expect(embeddedTrack).toHaveAttribute('data-track-phase', 'transitioning');
        expect(embeddedTrack).toHaveAttribute('data-motion-direction', 'forward');
        const outgoingDashboardImage = embeddedFrame.querySelector('[data-preview-layer="outgoing"]');
        const incomingAddApplicationImage = embeddedFrame.querySelector('[data-preview-layer="incoming"]');
        expect(outgoingDashboardImage).toBe(initialDashboardImage);
        expect(outgoingDashboardImage).toHaveAttribute('src', expect.stringContaining('light-dashboard.png'));
        expect(incomingAddApplicationImage).toHaveAttribute(
            'src',
            expect.stringContaining('light-add-application.png')
        );
        expect(embeddedTrack.querySelectorAll(':scope > img')).toHaveLength(2);
        fireEvent.animationEnd(embeddedTrack);
        expect(embeddedFrame.querySelector('[data-preview-layer="outgoing"]')).not.toBeInTheDocument();
        expect(screen.getByRole('img')).toBe(incomingAddApplicationImage);

        userEvent.click(screen.getByRole('button', { name: /previous preview/i }));
        embeddedImage = screen.getByRole('img');
        expect(embeddedImage).toHaveAttribute('data-motion-direction', 'backward');
        embeddedTrack = document.querySelector('[data-preview-track="embedded"]') as HTMLElement;
        expect(embeddedTrack).toHaveAttribute('data-motion-direction', 'backward');
        expect(
            screen
                .getByRole('button', { name: 'Open Dashboard screenshot in fullscreen' })
                .querySelector('[data-preview-layer="outgoing"]')
        ).toHaveAttribute('src', expect.stringContaining('light-add-application.png'));
        expect(embeddedTrack.firstElementChild).toHaveAttribute('data-preview-layer', 'incoming');
        expect(embeddedTrack.lastElementChild).toHaveAttribute('data-preview-layer', 'outgoing');
        fireEvent.animationEnd(embeddedTrack);

        userEvent.click(screen.getByRole('button', { name: /open dashboard screenshot in fullscreen/i }));
        let dialog = screen.getByRole('dialog');
        const initialFullscreenImage = within(dialog).getByRole('img');
        expect(initialFullscreenImage.className).toContain('fullscreenPreviewImage');

        userEvent.click(within(dialog).getByRole('button', { name: /next screenshot/i }));
        dialog = screen.getByRole('dialog', { name: 'Add Application screenshot viewer' });
        expect(within(dialog).getByRole('img')).toHaveAttribute('data-motion-direction', 'forward');
        expect(within(dialog).getByTestId('fullscreen-image-viewport').style.backgroundImage).toBe('');
        const fullscreenTrack = dialog.querySelector('[data-preview-track="fullscreen"]') as HTMLElement;
        fireEvent.load(within(dialog).getByRole('img'));
        expect(fullscreenTrack).toHaveAttribute('data-track-phase', 'transitioning');
        expect(fullscreenTrack).toHaveAttribute('data-motion-direction', 'forward');
        const outgoingFullscreenImage = dialog.querySelector('[data-preview-layer="outgoing"]');
        expect(outgoingFullscreenImage).toBe(initialFullscreenImage);
        expect(outgoingFullscreenImage).toHaveAttribute('src', expect.stringContaining('light-dashboard.png'));
        expect(fullscreenTrack.children).toHaveLength(2);
        fireEvent.animationEnd(fullscreenTrack);
        expect(dialog.querySelector('[data-preview-layer="outgoing"]')).not.toBeInTheDocument();
    });

    test('lets a horizontal mobile drag follow the finger and settle from its release position', () => {
        render(<ProductPreviewCarousel />);

        const dashboardPreview = screen.getByRole('button', { name: 'Open Dashboard screenshot in fullscreen' });
        fireEvent.touchStart(dashboardPreview, { touches: [{ clientX: 280, clientY: 120 }] });
        fireEvent.touchMove(dashboardPreview, { touches: [{ clientX: 210, clientY: 124 }] });

        let track = dashboardPreview.querySelector('[data-preview-track="embedded"]') as HTMLElement;
        expect(track).toHaveAttribute('data-track-phase', 'dragging');
        expect(track).toHaveAttribute('data-motion-direction', 'forward');
        expect(track).toHaveStyle({ transform: 'translate3d(-70px, 0, 0)' });
        expect(track.querySelector('[data-preview-layer="target"]')).toHaveAttribute(
            'src',
            expect.stringContaining('light-add-application.png')
        );

        fireEvent.touchEnd(dashboardPreview, { changedTouches: [{ clientX: 180, clientY: 126 }] });

        expect(screen.getByText('Add Application · 2 of 12')).toBeInTheDocument();
        track = document.querySelector('[data-preview-track="embedded"]') as HTMLElement;
        expect(track).toHaveAttribute('data-track-phase', 'transitioning');
        expect(track.style.getPropertyValue('--preview-track-start-offset')).toBe('-100px');
    });

    test('snaps a short horizontal drag back without opening fullscreen or changing slides', () => {
        render(<ProductPreviewCarousel />);

        const dashboardPreview = screen.getByRole('button', { name: 'Open Dashboard screenshot in fullscreen' });
        fireEvent.touchStart(dashboardPreview, { touches: [{ clientX: 200, clientY: 120 }] });
        fireEvent.touchMove(dashboardPreview, { touches: [{ clientX: 170, clientY: 122 }] });
        fireEvent.touchEnd(dashboardPreview, { changedTouches: [{ clientX: 170, clientY: 122 }] });

        let track = dashboardPreview.querySelector('[data-preview-track="embedded"]') as HTMLElement;
        expect(screen.getByText('Dashboard · 1 of 12')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(track).toHaveAttribute('data-track-phase', 'settling');
        expect(track).toHaveStyle({ transform: 'translate3d(0px, 0, 0)' });

        fireEvent.transitionEnd(track);
        track = dashboardPreview.querySelector('[data-preview-track="embedded"]') as HTMLElement;
        expect(track).not.toHaveAttribute('data-track-phase');
        expect(track.querySelector('[data-preview-layer="target"]')).not.toBeInTheDocument();
    });

    test('keeps the current slide visible while a short backward drag snaps home', () => {
        render(<ProductPreviewCarousel />);

        const dashboardPreview = screen.getByRole('button', { name: 'Open Dashboard screenshot in fullscreen' });
        fireEvent.touchStart(dashboardPreview, { touches: [{ clientX: 150, clientY: 120 }] });
        fireEvent.touchMove(dashboardPreview, { touches: [{ clientX: 180, clientY: 122 }] });

        let track = dashboardPreview.querySelector('[data-preview-track="embedded"]') as HTMLElement;
        expect(track).toHaveAttribute('data-motion-direction', 'backward');
        expect(track).toHaveStyle({ transform: 'translate3d(calc(-50% + 30px), 0, 0)' });
        expect(track.querySelector('[data-preview-layer="target"]')).toHaveAttribute(
            'src',
            expect.stringContaining('light-archived-offer-comparison.png')
        );

        fireEvent.touchEnd(dashboardPreview, { changedTouches: [{ clientX: 180, clientY: 122 }] });

        track = dashboardPreview.querySelector('[data-preview-track="embedded"]') as HTMLElement;
        expect(track).toHaveAttribute('data-track-phase', 'settling');
        expect(track).toHaveStyle({ transform: 'translate3d(calc(-50% + 0px), 0, 0)' });
        fireEvent.click(dashboardPreview);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.transitionEnd(track);
        expect(screen.getByText('Dashboard · 1 of 12')).toBeInTheDocument();
    });

    test('changes slides without mounting a paired track when reduced motion is requested', () => {
        const originalMatchMedia = window.matchMedia;
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                addEventListener: vi.fn(),
                matches: query === '(prefers-reduced-motion: reduce)',
                media: query,
                onchange: null,
                removeEventListener: vi.fn(),
            })),
        });

        try {
            render(<ProductPreviewCarousel />);
            userEvent.click(screen.getByRole('button', { name: /next preview/i }));

            const addApplicationPreview = screen.getByRole('button', {
                name: 'Open Add Application screenshot in fullscreen',
            });
            const track = addApplicationPreview.querySelector('[data-preview-track="embedded"]') as HTMLElement;
            expect(track).not.toHaveAttribute('data-track-phase');
            expect(track.querySelector('[data-preview-layer="outgoing"]')).not.toBeInTheDocument();
            expect(screen.getByText('Add Application · 2 of 12')).toBeInTheDocument();
        } finally {
            Object.defineProperty(window, 'matchMedia', {
                configurable: true,
                value: originalMatchMedia,
            });
        }
    });

    test('uses the paired dark screenshots without changing the logical slide', () => {
        localStorage.setItem('theme', 'dark');
        render(
            <>
                <ProductPreviewCarousel />
                <ThemeToggle />
            </>
        );

        userEvent.click(screen.getByRole('button', { name: 'Jump to Offer Comparison' }));
        expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('dark-offer-comparison.png'));

        userEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
        expect(
            screen.getByRole('button', { name: 'Open Offer Comparison screenshot in fullscreen' })
        ).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('light-offer-comparison.png'));
    });

    test('opens a labelled fullscreen viewer with scrolling and complete controls', () => {
        render(<ProductPreviewCarousel />);

        userEvent.click(screen.getByRole('button', { name: 'Open Dashboard screenshot in fullscreen' }));

        const dialog = screen.getByRole('dialog', { name: 'Dashboard screenshot viewer' });
        const loadingSpinner = within(dialog).getByRole('progressbar', { name: 'Loading preview' });
        expect(within(dialog).getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        expect(within(dialog).getByText('1 of 12')).toBeInTheDocument();
        expect(loadingSpinner).toHaveClass(spinnerStyles.primary);
        expect(loadingSpinner).not.toHaveClass(spinnerStyles.light);
        expect(within(dialog).getByRole('button', { name: 'Fit width' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(dialog).queryByRole('button', { name: 'Actual size' })).not.toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Close fullscreen preview' })).toHaveFocus();
        expect(
            within(dialog).getByRole('button', { name: 'Previous screenshot: Archived Offer Comparison' })
        ).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Next screenshot: Add Application' })).toBeInTheDocument();
        expect(within(dialog).getAllByRole('button', { name: /^Show / })).toHaveLength(12);
        expect(within(dialog).getByTestId('fullscreen-image-viewport').className).toContain('fullscreenImageViewport');
        expect(document.body).toHaveStyle({ overflow: 'hidden' });
        expect(document.documentElement).toHaveStyle({ overflow: 'hidden' });
        expect(document.getElementById('root')).toHaveAttribute('inert');
        expect(document.getElementById('root')).toHaveAttribute('aria-hidden', 'true');
    });

    test('keeps fit width as the default and zooms in by 1.5 times per step', () => {
        render(<ProductPreviewCarousel />);
        userEvent.click(screen.getByRole('button', { name: /open dashboard screenshot/i }));

        const dialog = screen.getByRole('dialog');
        const viewport = within(dialog).getByTestId('fullscreen-image-viewport');
        Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 932 });
        const image = within(dialog).getByRole('img');
        setNaturalImageSize(image, 1200, 2400);
        fireEvent.load(image);

        expect(image).toHaveStyle({ width: '900px', height: '1800px' });
        expect(within(dialog).getByText('75%')).toBeInTheDocument();

        userEvent.click(within(dialog).getByRole('button', { name: 'Zoom in' }));
        expect(image).toHaveStyle({ width: '1350px', height: '2700px' });
        expect(within(dialog).getByText('113%')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Fit width' })).toHaveAttribute('aria-pressed', 'false');

        userEvent.click(within(dialog).getByRole('button', { name: 'Zoom in' }));
        expect(image).toHaveStyle({ width: '2025px', height: '4050px' });
        expect(within(dialog).getByText('169%')).toBeInTheDocument();

        userEvent.click(within(dialog).getByRole('button', { name: 'Zoom out' }));
        expect(image).toHaveStyle({ width: '1350px', height: '2700px' });
        expect(within(dialog).getByText('113%')).toBeInTheDocument();

        userEvent.click(within(dialog).getByRole('button', { name: 'Fit width' }));
        expect(within(dialog).getByText('75%')).toBeInTheDocument();
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 0 });

        Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 632 });
        fireEvent(window, new Event('resize'));
        expect(image).toHaveStyle({ width: '600px', height: '1200px' });

        userEvent.click(within(dialog).getByRole('button', { name: 'Zoom in' }));
        expect(image).toHaveStyle({ width: '900px', height: '1800px' });

        Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 432 });
        fireEvent(window, new Event('resize'));
        expect(image).toHaveStyle({ width: '600px', height: '1200px' });
    });

    test('fits the outgoing fullscreen slide to the current viewport and waits for the incoming image to decode', async () => {
        render(<ProductPreviewCarousel />);
        userEvent.click(screen.getByRole('button', { name: /open dashboard screenshot/i }));

        let dialog = screen.getByRole('dialog');
        const viewport = within(dialog).getByTestId('fullscreen-image-viewport');
        Object.defineProperties(viewport, {
            clientWidth: { configurable: true, value: 932 },
            scrollLeft: { configurable: true, value: 240 },
            scrollTop: { configurable: true, value: 320 },
        });
        const zoomedImage = within(dialog).getByRole('img');
        setNaturalImageSize(zoomedImage, 1200, 2400);
        fireEvent.load(zoomedImage);
        userEvent.click(within(dialog).getByRole('button', { name: 'Zoom in' }));

        expect(zoomedImage).toHaveStyle({ width: '1350px', height: '2700px' });

        userEvent.click(within(dialog).getByRole('button', { name: /next screenshot/i }));
        dialog = screen.getByRole('dialog', { name: 'Add Application screenshot viewer' });
        const outgoingImage = dialog.querySelector('[data-preview-layer="outgoing"]');
        expect(outgoingImage).toBe(zoomedImage);
        expect(outgoingImage).toHaveStyle({
            width: '900px',
            height: '1800px',
        });
        expect(outgoingImage).not.toHaveStyle({ transform: 'translate3d(-240px, -320px, 0)' });
        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-track-phase',
            'preparing'
        );
        expect(within(dialog).getByRole('progressbar', { name: 'Loading preview' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: /next screenshot/i })).toBeDisabled();

        fireEvent.keyDown(document, { key: '+' });
        expect(outgoingImage).toHaveStyle({ width: '900px', height: '1800px' });

        const incomingImage = within(dialog).getByRole('img');
        let resolveDecode!: () => void;
        const decodePromise = new Promise<void>((resolve) => {
            resolveDecode = resolve;
        });
        Object.defineProperty(incomingImage, 'decode', {
            configurable: true,
            value: vi.fn(() => decodePromise),
        });
        setNaturalImageSize(incomingImage, 1200, 2400);
        fireEvent.load(incomingImage);
        expect(incomingImage).toHaveStyle({ width: '900px', height: '1800px' });
        expect(outgoingImage).toHaveStyle({
            width: '900px',
            height: '1800px',
        });
        expect(outgoingImage).not.toHaveStyle({ transform: 'translate3d(-240px, -320px, 0)' });
        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-track-phase',
            'preparing'
        );

        const animationFrameCallbacks: FrameRequestCallback[] = [];
        const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            animationFrameCallbacks.push(callback);
            return animationFrameCallbacks.length;
        });
        await act(async () => {
            resolveDecode();
            await decodePromise;
        });
        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-track-phase',
            'preparing'
        );
        expect(animationFrameCallbacks).toHaveLength(1);

        act(() => animationFrameCallbacks.shift()?.(0));
        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-track-phase',
            'preparing'
        );
        expect(animationFrameCallbacks).toHaveLength(1);

        act(() => animationFrameCallbacks.shift()?.(16));
        await waitFor(() =>
            expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
                'data-track-phase',
                'transitioning'
            )
        );
        requestAnimationFrame.mockRestore();
        expect(within(dialog).queryByRole('progressbar', { name: 'Loading preview' })).not.toBeInTheDocument();

        fireEvent.animationEnd(dialog.querySelector('[data-preview-track="fullscreen"]') as HTMLElement);

        dialog = screen.getByRole('dialog', { name: 'Add Application screenshot viewer' });
        userEvent.click(within(dialog).getByRole('button', { name: 'Zoom in' }));
        Object.defineProperties(viewport, {
            scrollLeft: { configurable: true, value: 180 },
            scrollTop: { configurable: true, value: 240 },
        });
        userEvent.click(within(dialog).getByRole('button', { name: /previous screenshot/i }));

        dialog = screen.getByRole('dialog', { name: 'Dashboard screenshot viewer' });
        const backwardOutgoingImage = dialog.querySelector('[data-preview-layer="outgoing"]');
        expect(backwardOutgoingImage).toBe(incomingImage);
        expect(backwardOutgoingImage).toHaveStyle({
            width: '900px',
            height: '1800px',
        });
        expect(backwardOutgoingImage).not.toHaveStyle({ transform: 'translate3d(-180px, -240px, 0)' });
        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-motion-direction',
            'backward'
        );
        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-track-phase',
            'preparing'
        );
        const backwardIncomingImage = within(dialog).getByRole('img');
        setNaturalImageSize(backwardIncomingImage, 1200, 2400);
        fireEvent.load(backwardIncomingImage);
        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-track-phase',
            'transitioning'
        );

        fireEvent.animationEnd(dialog.querySelector('[data-preview-track="fullscreen"]') as HTMLElement);
    });

    test('keeps the current fullscreen frame still while a target loads and ignores rapid navigation', () => {
        const onShowNext = vi.fn();
        const onTransitionStart = vi.fn();
        const baseProps = {
            activeIndex: 0,
            alt: 'Current screenshot',
            image: '/current.png',
            isNavigationDisabled: false,
            isNavigationLoading: false,
            label: 'Current',
            labels: ['Current', 'Next'],
            motionDirection: 'forward' as const,
            onClose: vi.fn(),
            onImageLoad: vi.fn(),
            onSelect: vi.fn(),
            onShowNext,
            onShowPrevious: vi.fn(),
            onTransitionEnd: vi.fn(),
            onTransitionStart,
            previousImage: null,
            transitionStartOffsetPx: 0,
        };
        const view = render(<ProductPreviewFullscreenViewer {...baseProps} />);
        let dialog = screen.getByRole('dialog', { name: 'Current screenshot viewer' });
        const viewport = within(dialog).getByTestId('fullscreen-image-viewport');
        Object.defineProperties(viewport, {
            clientWidth: { configurable: true, value: 932 },
            scrollLeft: { configurable: true, value: 240 },
            scrollTop: { configurable: true, value: 320 },
        });
        const currentImage = within(dialog).getByRole('img');
        setNaturalImageSize(currentImage, 1200, 2400);
        fireEvent.load(currentImage);
        userEvent.click(within(dialog).getByRole('button', { name: 'Zoom in' }));
        vi.mocked(viewport.scrollTo).mockClear();

        const nextButton = within(dialog).getByRole('button', { name: 'Next screenshot: Next' });
        userEvent.click(nextButton);
        userEvent.click(nextButton);
        fireEvent.keyDown(document, { key: 'ArrowRight' });

        expect(onShowNext).toHaveBeenCalledTimes(1);
        expect(viewport.scrollTo).not.toHaveBeenCalled();
        expect(currentImage).toHaveStyle({ width: '1350px', height: '2700px' });

        view.rerender(<ProductPreviewFullscreenViewer {...baseProps} isNavigationDisabled isNavigationLoading />);
        expect(viewport.scrollTo).not.toHaveBeenCalled();
        expect(currentImage).toHaveStyle({ width: '1350px', height: '2700px' });

        view.rerender(
            <ProductPreviewFullscreenViewer
                {...baseProps}
                activeIndex={1}
                alt='Next screenshot'
                image='/next.png'
                isNavigationDisabled
                label='Next'
                previousImage='/current.png'
            />
        );

        dialog = screen.getByRole('dialog', { name: 'Next screenshot viewer' });
        const outgoingImage = dialog.querySelector('[data-preview-layer="outgoing"]');
        expect(viewport.scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
        expect(outgoingImage).toHaveStyle({
            width: '900px',
            height: '1800px',
        });
        expect(outgoingImage).not.toHaveStyle({ transform: 'translate3d(-240px, -320px, 0)' });
        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-track-phase',
            'preparing'
        );
        expect(onTransitionStart).not.toHaveBeenCalled();

        const nextImage = within(dialog).getByRole('img');
        setNaturalImageSize(nextImage, 1200, 2400);
        fireEvent.load(nextImage);

        expect(dialog.querySelector('[data-preview-track="fullscreen"]')).toHaveAttribute(
            'data-track-phase',
            'transitioning'
        );
        expect(onTransitionStart).toHaveBeenCalledTimes(1);
    });

    test('starts the fullscreen transition fallback only after the incoming image is ready', () => {
        vi.useFakeTimers();

        try {
            render(<ProductPreviewCarousel />);
            fireEvent.click(screen.getByRole('button', { name: /open dashboard screenshot/i }));

            let dialog = screen.getByRole('dialog', { name: 'Dashboard screenshot viewer' });
            fireEvent.load(within(dialog).getByRole('img'));
            fireEvent.click(within(dialog).getByRole('button', { name: /next screenshot/i }));

            dialog = screen.getByRole('dialog', { name: 'Add Application screenshot viewer' });
            let track = dialog.querySelector('[data-preview-track="fullscreen"]') as HTMLElement;
            expect(track).toHaveAttribute('data-track-phase', 'preparing');

            act(() => vi.advanceTimersByTime(1_000));
            expect(track).toHaveAttribute('data-track-phase', 'preparing');
            expect(track.querySelector('[data-preview-layer="outgoing"]')).toBeInTheDocument();

            fireEvent.load(within(dialog).getByRole('img'));
            expect(track).toHaveAttribute('data-track-phase', 'transitioning');

            act(() => vi.advanceTimersByTime(1_000));
            track = dialog.querySelector('[data-preview-track="fullscreen"]') as HTMLElement;
            expect(track).not.toHaveAttribute('data-track-phase');
            expect(track.querySelector('[data-preview-layer="outgoing"]')).not.toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });

    test('reads natural dimensions when a preloaded fullscreen image is already complete', () => {
        const completeDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
        const naturalHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalHeight');
        const naturalWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth');

        Object.defineProperties(HTMLImageElement.prototype, {
            complete: { configurable: true, get: () => true },
            naturalHeight: { configurable: true, get: () => 2400 },
            naturalWidth: { configurable: true, get: () => 1200 },
        });

        try {
            render(<ProductPreviewCarousel />);
            userEvent.click(screen.getByRole('button', { name: /open dashboard screenshot/i }));

            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByRole('img')).toHaveStyle({ height: '2400px', width: '1200px' });
            expect(within(dialog).getByRole('button', { name: 'Fit width' })).toBeEnabled();
            expect(within(dialog).queryByRole('button', { name: 'Actual size' })).not.toBeInTheDocument();
            expect(within(dialog).queryByRole('progressbar', { name: 'Loading preview' })).not.toBeInTheDocument();
        } finally {
            if (completeDescriptor) {
                Object.defineProperty(HTMLImageElement.prototype, 'complete', completeDescriptor);
            }
            if (naturalHeightDescriptor) {
                Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', naturalHeightDescriptor);
            }
            if (naturalWidthDescriptor) {
                Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', naturalWidthDescriptor);
            }
        }
    });

    test('enforces zoom limits and supports fullscreen keyboard controls', () => {
        render(<ProductPreviewCarousel />);
        const previewButton = screen.getByRole('button', { name: /open dashboard screenshot/i });
        userEvent.click(previewButton);

        let dialog = screen.getByRole('dialog');
        const image = within(dialog).getByRole('img');
        setNaturalImageSize(image, 800, 1600);
        Object.defineProperty(within(dialog).getByTestId('fullscreen-image-viewport'), 'clientWidth', {
            configurable: true,
            value: 832,
        });
        fireEvent.load(image);

        for (let index = 0; index < 8; index += 1) {
            fireEvent.keyDown(document, { key: '+' });
        }
        expect(within(dialog).getByText('250%')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Zoom in' })).toBeDisabled();

        for (let index = 0; index < 10; index += 1) {
            fireEvent.keyDown(document, { key: '-' });
        }
        expect(within(dialog).getByText('100%')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Zoom out' })).toBeDisabled();

        fireEvent.keyDown(document, { key: '=' });
        expect(within(dialog).getByText('150%')).toBeInTheDocument();
        fireEvent.keyDown(document, { key: '0' });
        expect(within(dialog).getByText('100%')).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'ArrowRight' });
        dialog = screen.getByRole('dialog', { name: 'Add Application screenshot viewer' });
        expect(within(dialog).getByText('2 of 12')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Fit width' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.load(within(dialog).getByRole('img'));
        fireEvent.animationEnd(dialog.querySelector('[data-preview-track="fullscreen"]') as HTMLElement);

        fireEvent.keyDown(document, { key: 'ArrowRight', repeat: true });
        expect(screen.getByRole('dialog', { name: 'Add Application screenshot viewer' })).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'ArrowLeft' });
        expect(screen.getByRole('dialog', { name: 'Dashboard screenshot viewer' })).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(previewButton).toHaveFocus();
        expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
        expect(document.documentElement).not.toHaveStyle({ overflow: 'hidden' });
        expect(document.getElementById('root')).not.toHaveAttribute('inert');
        expect(document.getElementById('root')).not.toHaveAttribute('aria-hidden');
    });

    test('keeps fullscreen open for direct navigation and reports image failures without trapping navigation', () => {
        render(<ProductPreviewCarousel />);
        userEvent.click(screen.getByRole('button', { name: /open dashboard screenshot/i }));

        const dialog = screen.getByRole('dialog');
        userEvent.click(within(dialog).getByRole('button', { name: 'Show Archived Offer Comparison' }));

        const updatedDialog = screen.getByRole('dialog', { name: 'Archived Offer Comparison screenshot viewer' });
        expect(within(updatedDialog).getByText('12 of 12')).toBeInTheDocument();
        fireEvent.error(within(updatedDialog).getByRole('img'));
        expect(within(updatedDialog).getByText('Unable to load this preview.')).toBeInTheDocument();
        fireEvent.animationEnd(updatedDialog.querySelector('[data-preview-track="fullscreen"]') as HTMLElement);
        expect(
            within(updatedDialog).getByRole('button', { name: 'Previous screenshot: Board Archived Interview' })
        ).toBeEnabled();
        expect(within(updatedDialog).getByRole('button', { name: 'Next screenshot: Dashboard' })).toBeEnabled();
        expect(within(updatedDialog).getByRole('button', { name: 'Close fullscreen preview' })).toBeEnabled();
    });

    test('keeps the logical slide open and reloads fit width when the theme changes in fullscreen', () => {
        localStorage.setItem('theme', 'dark');
        render(
            <>
                <ProductPreviewCarousel />
                <ThemeToggle />
            </>
        );

        userEvent.click(screen.getByRole('button', { name: 'Jump to Offer Comparison' }));
        userEvent.click(screen.getByRole('button', { name: /open offer comparison screenshot/i }));

        let dialog = screen.getByRole('dialog', { name: 'Offer Comparison screenshot viewer' });
        expect(within(dialog).getByRole('img')).toHaveAttribute(
            'src',
            expect.stringContaining('dark-offer-comparison.png')
        );

        userEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

        dialog = screen.getByRole('dialog', { name: 'Offer Comparison screenshot viewer' });
        expect(within(dialog).getByText('7 of 12')).toBeInTheDocument();
        expect(within(dialog).getByRole('img')).toHaveAttribute(
            'src',
            expect.stringContaining('light-offer-comparison.png')
        );
        expect(within(dialog).getByRole('button', { name: 'Fit width' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(dialog).queryByRole('button', { name: 'Actual size' })).not.toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Zoom in' })).toBeDisabled();
        expect(within(dialog).getByRole('progressbar', { name: 'Loading preview' })).toBeInTheDocument();
    });
});
