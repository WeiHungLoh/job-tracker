import { scrollAndHighlight } from '../../helper/highlightElement';

describe('scrollAndHighlight', () => {
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: originalMatchMedia,
        });
    });

    test('supports composed CSS module class names', () => {
        const element = document.createElement('div');
        const scrollIntoView = vi.fn();
        const timeouts: Record<string, ReturnType<typeof setTimeout>> = {};

        element.id = 'target';
        element.scrollIntoView = scrollIntoView;
        document.body.append(element);

        scrollAndHighlight('target', 'demo_highlight actual_highlight', timeouts);
        vi.advanceTimersByTime(100);

        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
        expect(element).toHaveClass('demo_highlight');
        expect(element).toHaveClass('actual_highlight');

        vi.advanceTimersByTime(4000);

        expect(element).not.toHaveClass('demo_highlight');
        expect(element).not.toHaveClass('actual_highlight');
        expect(timeouts.target).toBeUndefined();
    });

    test('still scrolls without crashing when a highlight class is unavailable', () => {
        const element = document.createElement('div');
        const scrollIntoView = vi.fn();
        const timeouts: Record<string, ReturnType<typeof setTimeout>> = {};

        element.id = 'target';
        element.scrollIntoView = scrollIntoView;
        document.body.append(element);

        expect(() => scrollAndHighlight('target', undefined, timeouts, 'start')).not.toThrow();
        vi.advanceTimersByTime(100);

        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
        expect(timeouts.target).toBeUndefined();
    });

    test('ignores a delayed request after its owning surface changes', () => {
        const element = document.createElement('div');
        const scrollIntoView = vi.fn();
        const timeouts: Record<string, ReturnType<typeof setTimeout>> = {};

        element.id = 'target';
        element.scrollIntoView = scrollIntoView;
        document.body.append(element);

        scrollAndHighlight('target', 'highlight', timeouts, 'start', () => false);
        vi.advanceTimersByTime(100);

        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(element).not.toHaveClass('highlight');
        expect(timeouts.target).toBeUndefined();
    });

    test('uses immediate scrolling when reduced motion is preferred', () => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockReturnValue({ matches: true }),
        });
        const element = document.createElement('div');
        const scrollIntoView = vi.fn();
        const timeouts: Record<string, ReturnType<typeof setTimeout>> = {};

        element.id = 'target';
        element.scrollIntoView = scrollIntoView;
        document.body.append(element);

        scrollAndHighlight('target', 'highlight', timeouts);
        vi.advanceTimersByTime(100);

        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
    });
});
