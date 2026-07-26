import { fireEvent, screen, within } from '@testing-library/react';
import ProductPreviewCarousel from '../../components/authProductIntro/ProductPreviewCarousel';
import { useTheme } from '../../components/theme/ThemeContext';
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
        expect(screen.getByText('1 of 12')).toBeInTheDocument();
        expect(screen.getByText('View full page')).toBeInTheDocument();

        expectedSlides.forEach(([label, lightImage], index) => {
            if (index > 0) {
                userEvent.click(screen.getByRole('button', { name: /next preview/i }));
            }

            expect(screen.getByRole('button', { name: `Open ${label} screenshot in fullscreen` })).toBeInTheDocument();
            expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining(lightImage));
            expect(screen.getByText(`${index + 1} of 12`)).toBeInTheDocument();
        });
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
        expect(within(dialog).getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        expect(within(dialog).getByText('1 of 12')).toBeInTheDocument();
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
