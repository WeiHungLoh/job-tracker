import { getScrollBehavior } from './scrollBehavior';

/**
 * Scroll to and highlight a DOM element, then remove the highlight after 4s.
 * Clears any existing timeout for the same element before applying the new one.
 */
export const scrollAndHighlight = (
    elementId: string,
    highlightClass: string | undefined,
    timeouts: Record<string, ReturnType<typeof setTimeout>>,
    block?: ScrollLogicalPosition,
    isRequestCurrent: () => boolean = () => true
): void => {
    const highlightClasses = highlightClass?.split(/\s+/).filter(Boolean) ?? [];

    setTimeout(() => {
        if (!isRequestCurrent() || typeof document === 'undefined') {
            return;
        }

        const element = document.getElementById(elementId);
        if (!element) {
            return;
        }

        const existing = timeouts[elementId];
        if (existing) {
            clearTimeout(existing);
        }

        if (highlightClasses.length > 0) {
            element.classList.remove(...highlightClasses);
        }
        if (typeof element.scrollIntoView === 'function') {
            element.scrollIntoView({ behavior: getScrollBehavior(), ...(block ? { block } : {}) });
        }
        if (highlightClasses.length === 0) {
            return;
        }
        element.classList.add(...highlightClasses);
        timeouts[elementId] = setTimeout(() => {
            element.classList.remove(...highlightClasses);
            delete timeouts[elementId];
        }, 4000);
    }, 100);
};
