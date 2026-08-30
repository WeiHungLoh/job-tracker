import { getScrollBehavior } from '../../../helper/scrollBehavior';

export const BOARD_CARD_HIGHLIGHT_DURATION = 4000;

export const getMaxBoardScrollLeft = (board: Pick<HTMLElement, 'clientWidth' | 'scrollWidth'>) =>
    Math.max(0, board.scrollWidth - board.clientWidth);

export const getCenteredBoardScrollLeft = (
    board: Pick<HTMLElement, 'clientWidth' | 'scrollLeft' | 'scrollWidth'>,
    boardRect: Pick<DOMRect, 'left' | 'width'>,
    targetRect: Pick<DOMRect, 'left' | 'width'>
) => {
    const targetLeft = board.scrollLeft + targetRect.left - boardRect.left;
    const centeredTargetLeft = targetLeft - (board.clientWidth - targetRect.width) / 2;

    return Math.min(getMaxBoardScrollLeft(board), Math.max(0, centeredTargetLeft));
};

export const getCenteredPageScrollTop = (
    scrollY: number,
    viewportHeight: number,
    pageHeight: number,
    targetRect: Pick<DOMRect, 'height' | 'top'>
) => {
    const targetTop = scrollY + targetRect.top;
    const centeredTargetTop = targetTop - (viewportHeight - targetRect.height) / 2;
    const maxScrollTop = Math.max(0, pageHeight - viewportHeight);

    return Math.min(maxScrollTop, Math.max(0, centeredTargetTop));
};

export const revealApplicationBoardTarget = (board: HTMLElement, target: HTMLElement) => {
    const targetRect = target.getBoundingClientRect();
    const left = getCenteredBoardScrollLeft(board, board.getBoundingClientRect(), targetRect);

    if (typeof board.scrollTo === 'function') {
        board.scrollTo({ behavior: getScrollBehavior(), left });
    } else {
        board.scrollLeft = left;
    }

    if (typeof window.scrollTo === 'function') {
        const top = getCenteredPageScrollTop(
            window.scrollY,
            window.innerHeight,
            document.documentElement.scrollHeight,
            targetRect
        );
        window.scrollTo({ behavior: getScrollBehavior(), top });
    }
};
