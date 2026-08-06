import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ProductPreviewCarousel from '../../components/authProductIntro/ProductPreviewCarousel';
import ProductPreviewFullscreenViewer from '../../components/authProductIntro/ProductPreviewFullscreenViewer';
import styles from '../../components/authProductIntro/AuthProductIntro.module.css';
import { useTheme } from '../../components/theme/ThemeContext';
import { render } from '../renderWithProviders';
import userEvent from '@testing-library/user-event';

const expectedPreviews = [
    ['Dashboard', 'light-dashboard.webp', 'dark-dashboard.webp'],
    ['Applications', 'light-list-applications.webp', 'dark-list-applications.webp'],
    ['Interviews', 'light-list-interview.webp', 'dark-list-interview.webp'],
    ['Offer Comparison', 'light-offer-comparison.webp', 'dark-offer-comparison.webp'],
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

const click = async (element: Element) => {
    await act(async () => {
        userEvent.click(element);
        await Promise.resolve();
    });
};

const pressKeys = async (keys: string) => {
    await act(async () => {
        userEvent.keyboard(keys);
        await Promise.resolve();
    });
};

const completeEmbeddedTransition = async () => {
    await waitFor(() => {
        expect(document.querySelector('[data-preview-layer="outgoing"]')).toHaveClass(styles.previewLayerOutgoing);
    });
    fireEvent.transitionEnd(document.querySelector('[data-preview-layer="incoming"]') as HTMLElement);
    await waitFor(() => {
        expect(document.querySelector('[data-preview-layer="outgoing"]')).not.toBeInTheDocument();
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
        vi.restoreAllMocks();
    });

    test('uses exactly four accessible feature tabs and representative WebP screenshots', async () => {
        render(<ProductPreviewCarousel />);

        const tablist = screen.getByRole('tablist', { name: 'Product features' });
        const tabs = within(tablist).getAllByRole('tab');
        expect(tabs).toHaveLength(4);
        expect(tabs.map((tab) => tab.textContent)).toEqual(expectedPreviews.map(([label]) => label));
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        expect(screen.queryByRole('tab', { name: /add application/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: /archived/i })).not.toBeInTheDocument();
        expect(screen.queryByText('jobtracker.weihungloh.com')).not.toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('light-dashboard.webp'));

        for (const [label, lightImage] of expectedPreviews.slice(1)) {
            await click(screen.getByRole('tab', { name: label }));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: `Open ${label} screenshot in fullscreen` })).toBeInTheDocument();
            });
            expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining(lightImage));
            await completeEmbeddedTransition();
        }
    });

    test('supports roving tab focus and arrow, Home and End keyboard navigation', async () => {
        render(<ProductPreviewCarousel />);

        const dashboardTab = screen.getByRole('tab', { name: 'Dashboard' });
        dashboardTab.focus();
        await pressKeys('{ArrowRight}');
        await waitFor(() => expect(screen.getByRole('tab', { name: 'Applications' })).toHaveAttribute('aria-selected', 'true'));
        expect(screen.getByRole('tab', { name: 'Applications' })).toHaveFocus();
        await completeEmbeddedTransition();

        await pressKeys('{End}');
        await waitFor(() => expect(screen.getByRole('tab', { name: 'Offer Comparison' })).toHaveAttribute('aria-selected', 'true'));
        await completeEmbeddedTransition();

        await pressKeys('{Home}');
        await waitFor(() => expect(dashboardTab).toHaveAttribute('aria-selected', 'true'));
    });

    test('crossfades only the incoming and outgoing layers and ignores rapid navigation', async () => {
        render(<ProductPreviewCarousel />);

        await click(screen.getByRole('tab', { name: 'Applications' }));
        await waitFor(() => expect(document.querySelectorAll('[data-preview-layer]')).toHaveLength(2));
        expect(document.querySelector('[data-preview-track="embedded"]')).not.toBeInTheDocument();

        await click(screen.getByRole('tab', { name: 'Interviews' }));
        expect(screen.getByRole('tab', { name: 'Applications' })).toHaveAttribute('aria-selected', 'true');
        expect(document.querySelectorAll('[data-preview-layer]')).toHaveLength(2);

        await completeEmbeddedTransition();
        expect(document.querySelectorAll('[data-preview-layer]')).toHaveLength(1);
    });

    test('continues navigation when an incoming image decode rejects', async () => {
        const originalImage = globalThis.Image;
        const originalUserAgent = window.navigator.userAgent;

        class RejectingDecodeImage {
            complete = false;
            onerror: (() => void) | null = null;
            onload: (() => void) | null = null;

            decode = vi.fn().mockRejectedValue(new Error('decode failed'));

            set src(_value: string) {
                this.complete = true;
                queueMicrotask(() => this.onload?.());
            }
        }

        Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Browser' });
        vi.stubGlobal('Image', RejectingDecodeImage);

        try {
            render(<ProductPreviewCarousel />);
            await click(screen.getByRole('tab', { name: 'Interviews' }));

            await waitFor(() => {
                expect(screen.getByRole('tab', { name: 'Interviews' })).toHaveAttribute('aria-selected', 'true');
            });
            expect(screen.getByRole('button', { name: 'Open Interviews screenshot in fullscreen' })).toBeInTheDocument();
        } finally {
            vi.stubGlobal('Image', originalImage);
            Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: originalUserAgent });
        }
    });

    test('changes previews immediately without paired layers when reduced motion is requested', async () => {
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
            await click(screen.getByRole('tab', { name: 'Applications' }));

            await waitFor(() => expect(screen.getByRole('tab', { name: 'Applications' })).toHaveAttribute('aria-selected', 'true'));
            expect(document.querySelector('[data-preview-layer="outgoing"]')).not.toBeInTheDocument();
        } finally {
            Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
        }
    });

    test('uses the matching themed screenshot without changing the selected feature', async () => {
        localStorage.setItem('theme', 'dark');
        render(
            <>
                <ProductPreviewCarousel />
                <ThemeToggle />
            </>
        );

        await click(screen.getByRole('tab', { name: 'Offer Comparison' }));
        await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('dark-offer-comparison.webp')));
        await completeEmbeddedTransition();

        await click(screen.getByRole('button', { name: 'Toggle theme' }));
        await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('light-offer-comparison.webp')));
        expect(screen.getByRole('tab', { name: 'Offer Comparison' })).toHaveAttribute('aria-selected', 'true');
    });

    test('preserves horizontal swipe navigation without hijacking vertical scrolling or opening fullscreen', async () => {
        render(<ProductPreviewCarousel />);
        const region = screen.getByRole('region', { name: 'Job Tracker product preview' });

        fireEvent.touchStart(region, { touches: [{ clientX: 280, clientY: 120 }] });
        fireEvent.touchEnd(region, { changedTouches: [{ clientX: 120, clientY: 126 }] });
        await waitFor(() => expect(screen.getByRole('tab', { name: 'Applications' })).toHaveAttribute('aria-selected', 'true'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await completeEmbeddedTransition();

        fireEvent.touchStart(region, { touches: [{ clientX: 180, clientY: 300 }] });
        fireEvent.touchEnd(region, { changedTouches: [{ clientX: 190, clientY: 120 }] });
        expect(screen.getByRole('tab', { name: 'Applications' })).toHaveAttribute('aria-selected', 'true');
    });

    test('opens the selected screenshot in an accessible fullscreen viewer and restores focus', async () => {
        render(<ProductPreviewCarousel />);

        const openButton = screen.getByRole('button', { name: 'Open Dashboard screenshot in fullscreen' });
        await click(openButton);
        const dialog = screen.getByRole('dialog', { name: 'Dashboard screenshot viewer' });

        expect(within(dialog).getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        expect(within(dialog).getByText('1 of 4')).toBeInTheDocument();
        expect(within(dialog).getAllByRole('button', { name: /^Show / })).toHaveLength(4);
        expect(within(dialog).getByRole('button', { name: 'Close fullscreen preview' })).toHaveFocus();
        expect(document.body).toHaveStyle({ overflow: 'hidden' });
        expect(document.getElementById('root')).toHaveAttribute('inert');

        await click(within(dialog).getByRole('button', { name: 'Close fullscreen preview' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(openButton).toHaveFocus();
    });

    test('keeps fit width as the default and supports zoom controls', async () => {
        render(<ProductPreviewCarousel />);
        await click(screen.getByRole('button', { name: /open dashboard screenshot/i }));

        const dialog = screen.getByRole('dialog');
        const viewport = within(dialog).getByTestId('fullscreen-image-viewport');
        Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 932 });
        const image = within(dialog).getByRole('img');
        setNaturalImageSize(image, 1200, 2400);
        fireEvent.load(image);

        await waitFor(() => expect(image).toHaveStyle({ width: '900px', height: '1800px' }));
        expect(within(dialog).getByText('75%')).toBeInTheDocument();
        await click(within(dialog).getByRole('button', { name: 'Zoom in' }));
        expect(image).toHaveStyle({ width: '1350px', height: '2700px' });
        expect(within(dialog).getByText('113%')).toBeInTheDocument();
        await click(within(dialog).getByRole('button', { name: 'Fit width' }));
        expect(within(dialog).getByText('75%')).toBeInTheDocument();
        expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 0 });
    });

    test('reports a fullscreen image failure without trapping navigation', async () => {
        const onSelect = vi.fn();
        const onShowNext = vi.fn();
        render(
            <ProductPreviewFullscreenViewer
                activeIndex={0}
                alt='Dashboard preview'
                image='/dashboard.webp'
                isNavigationDisabled={false}
                isNavigationLoading={false}
                label='Dashboard'
                labels={['Dashboard', 'Applications', 'Interviews', 'Offer Comparison']}
                motionDirection='forward'
                onClose={vi.fn()}
                onImageLoad={vi.fn()}
                onSelect={onSelect}
                onShowNext={onShowNext}
                onShowPrevious={vi.fn()}
                onTransitionEnd={vi.fn()}
                onTransitionStart={vi.fn()}
                previousImage={null}
            />
        );

        fireEvent.error(screen.getByRole('img'));
        expect(screen.getByText('Unable to load this preview.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Next screenshot: Applications' }));
        expect(onShowNext).toHaveBeenCalledTimes(1);
        expect(onSelect).not.toHaveBeenCalled();
    });

    test('supports fullscreen Escape and arrow navigation', async () => {
        render(<ProductPreviewCarousel />);
        const openButton = screen.getByRole('button', { name: /open dashboard screenshot/i });
        await click(openButton);

        fireEvent.keyDown(document, { key: 'ArrowRight' });
        await waitFor(() => expect(screen.getByRole('dialog', { name: 'Applications screenshot viewer' })).toBeInTheDocument());
        const incoming = within(screen.getByRole('dialog')).getByRole('img');
        setNaturalImageSize(incoming, 1200, 2400);
        fireEvent.load(incoming);
        await act(async () => {
            await Promise.resolve();
        });

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(openButton).toHaveFocus();
    });
});
