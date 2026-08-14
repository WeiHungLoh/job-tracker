import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const VIEWPORT_GUTTER = 8;
const DROPDOWN_GAP = 8;
const CLIPPING_OVERFLOW = /^(auto|clip|hidden|scroll)$/;

type DropdownBoundary = {
    bottom: number;
    left: number;
    right: number;
    top: number;
};

const getDropdownBoundary = (container: HTMLElement): DropdownBoundary => {
    const viewportBoundary = {
        bottom: window.innerHeight - VIEWPORT_GUTTER,
        left: VIEWPORT_GUTTER,
        right: window.innerWidth - VIEWPORT_GUTTER,
        top: VIEWPORT_GUTTER,
    };

    let ancestor = container.parentElement;
    while (ancestor) {
        const style = window.getComputedStyle(ancestor);
        if (
            CLIPPING_OVERFLOW.test(style.overflow) ||
            CLIPPING_OVERFLOW.test(style.overflowX) ||
            CLIPPING_OVERFLOW.test(style.overflowY)
        ) {
            const rect = ancestor.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                return {
                    bottom: Math.min(viewportBoundary.bottom, rect.bottom),
                    left: Math.max(viewportBoundary.left, rect.left),
                    right: Math.min(viewportBoundary.right, rect.right),
                    top: Math.max(viewportBoundary.top, rect.top),
                };
            }
        }
        ancestor = ancestor.parentElement;
    }

    return viewportBoundary;
};

const getScrollingAncestors = (container: HTMLElement): HTMLElement[] => {
    const ancestors: HTMLElement[] = [];
    let ancestor = container.parentElement;

    while (ancestor) {
        const style = window.getComputedStyle(ancestor);
        if (
            CLIPPING_OVERFLOW.test(style.overflow) ||
            CLIPPING_OVERFLOW.test(style.overflowX) ||
            CLIPPING_OVERFLOW.test(style.overflowY)
        ) {
            ancestors.push(ancestor);
        }
        ancestor = ancestor.parentElement;
    }

    return ancestors;
};

const useControlDropdown = (renderInPortal = false) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownOffset, setDropdownOffset] = useState(0);
    const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | null>(null);
    const [openAbove, setOpenAbove] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ left: number; top: number } | null>(null);
    const closeDropdown = useCallback(() => {
        setIsOpen(false);
        setDropdownMaxHeight(null);
        setDropdownOffset(0);
        setOpenAbove(false);
        setDropdownPosition(null);
    }, []);
    const toggleDropdown = useCallback(() => {
        setIsOpen((current) => !current);
        setDropdownMaxHeight(null);
        setDropdownOffset(0);
        setOpenAbove(false);
        setDropdownPosition(null);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (
                !containerRef.current?.contains(event.target as Node) &&
                !dropdownRef.current?.contains(event.target as Node)
            ) {
                closeDropdown();
            }
        };

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeDropdown();
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [closeDropdown, isOpen]);

    useLayoutEffect(() => {
        if (!isOpen) {
            return;
        }

        const updatePosition = () => {
            const dropdown = dropdownRef.current;
            const container = containerRef.current;

            if (!dropdown || !container) {
                return;
            }

            const containerRect = container.getBoundingClientRect();
            const dropdownRect = dropdown.getBoundingClientRect();
            const dropdownWidth = dropdownRect.width;
            const boundary = getDropdownBoundary(container);
            const rightAlignedLeft = containerRect.right - dropdownWidth;
            const preferredLeft =
                containerRect.left + dropdownWidth <= boundary.right ? containerRect.left : rightAlignedLeft;
            const maximumLeft = Math.max(boundary.left, boundary.right - dropdownWidth);
            const clampedLeft = Math.min(Math.max(preferredLeft, boundary.left), maximumLeft);

            setDropdownOffset(clampedLeft - containerRect.left);

            const availableBelow = Math.max(0, boundary.bottom - containerRect.bottom - DROPDOWN_GAP);
            const availableAbove = Math.max(0, containerRect.top - boundary.top - DROPDOWN_GAP);
            const shouldOpenAbove = dropdownRect.height > availableBelow && availableAbove > availableBelow;
            const dropdownTop = shouldOpenAbove
                ? Math.max(boundary.top, containerRect.top - dropdownRect.height - DROPDOWN_GAP)
                : containerRect.bottom + DROPDOWN_GAP;

            setOpenAbove(shouldOpenAbove);
            setDropdownMaxHeight(Math.floor(shouldOpenAbove ? availableAbove : availableBelow));
            if (renderInPortal) {
                setDropdownPosition({ left: clampedLeft, top: dropdownTop });
            }
        };

        const handleScroll = (event: Event) => {
            if (renderInPortal) {
                const scrollTarget = event.target;
                if (scrollTarget instanceof Node && dropdownRef.current?.contains(scrollTarget)) {
                    return;
                }
                closeDropdown();
                return;
            }

            updatePosition();
        };

        const scrollingAncestors =
            renderInPortal && containerRef.current ? getScrollingAncestors(containerRef.current) : [];

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', handleScroll, true);
        scrollingAncestors.forEach((ancestor) => ancestor.addEventListener('scroll', handleScroll));

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', handleScroll, true);
            scrollingAncestors.forEach((ancestor) => ancestor.removeEventListener('scroll', handleScroll));
        };
    }, [closeDropdown, isOpen, renderInPortal]);

    return {
        closeDropdown,
        containerRef,
        dropdownMaxHeight,
        dropdownOffset,
        dropdownPosition,
        dropdownRef,
        isOpen,
        openAbove,
        toggleDropdown,
        triggerRef,
    };
};

export default useControlDropdown;
