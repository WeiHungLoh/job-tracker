import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageScrollControls from '../../components/pageScrollControls/PageScrollControls';
import { routes } from '../../routes';

const renderControls = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <PageScrollControls />
        </MemoryRouter>
    );

const setPageScroll = ({
    scrollHeight,
    scrollY,
    viewportHeight = 800,
}: {
    scrollHeight: number;
    scrollY: number;
    viewportHeight?: number;
}) => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: scrollHeight,
    });
    Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: viewportHeight,
    });
    Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: scrollY,
    });
};

describe('PageScrollControls', () => {
    beforeEach(() => {
        setPageScroll({ scrollHeight: 2400, scrollY: 0 });
        vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it.each([
        routes.viewApplications,
        routes.viewInterviews,
        routes.archivedApplications,
        routes.archivedInterviews,
        routes.offerDecisions,
        routes.archivedOfferDecisions,
        routes.demoViewApplications,
        routes.demoViewInterviews,
        routes.demoArchivedApplications,
        routes.demoArchivedInterviews,
        routes.demoOfferDecisions,
        routes.demoArchivedOfferDecisions,
    ])('does not show a down-caret control on %s', (path) => {
        renderControls(path);

        expect(screen.queryByRole('button', { name: 'Scroll to bottom' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Scroll to top' })).not.toBeInTheDocument();
    });

    it.each([
        routes.dashboard,
        routes.addApplication,
        routes.addInterview,
        routes.demoDashboard,
        routes.demoAddApplication,
        routes.demoAddInterview,
    ])('does not render page scroll controls on %s', (path) => {
        renderControls(path);

        expect(screen.queryByRole('button', { name: 'Scroll to bottom' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Scroll to top' })).not.toBeInTheDocument();
    });

    it('reveals only the scroll-to-top control after meaningful scrolling', () => {
        renderControls(routes.viewApplications);

        act(() => {
            setPageScroll({ scrollHeight: 2400, scrollY: 400 });
            window.dispatchEvent(new Event('scroll'));
        });

        expect(screen.queryByRole('button', { name: 'Scroll to bottom' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Scroll to top' }));
        expect(window.scrollTo).toHaveBeenLastCalledWith({ behavior: 'smooth', top: 0 });
    });

    it('hides the jump-to-bottom control when the page is already near the bottom', () => {
        renderControls(routes.offerDecisions);

        act(() => {
            setPageScroll({ scrollHeight: 2400, scrollY: 1580 });
            window.dispatchEvent(new Event('scroll'));
        });

        expect(screen.queryByRole('button', { name: 'Scroll to bottom' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument();
    });
});
