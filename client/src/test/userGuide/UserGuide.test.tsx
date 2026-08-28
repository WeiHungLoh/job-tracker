import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import UserGuide from '../../pages/userGuide/UserGuide';
import { routes } from '../../routes';
import { loadDemoRoute } from '../../routeLoaders';
import { render } from '../renderWithProviders';

vi.mock('../../routeLoaders', () => ({
    loadDemoRoute: vi.fn().mockResolvedValue({ default: () => null }),
}));

const sectionTitles = [
    'Getting started',
    'Dashboard and reminders',
    'Applications',
    'Interviews',
    'Offer Comparison',
    'Notes and follow-ups',
    'Archived records and deletion',
    'Exporting, sorting and display',
    'Finding records after updates',
    'Demo mode',
    'Account and appearance',
] as const;

const LocationProbe = () => {
    const location = useLocation();
    return <output data-testid='guide-location'>{`${location.pathname}${location.hash}`}</output>;
};

const renderGuide = (initialEntry: string = routes.userGuide) =>
    render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <UserGuide />
            <LocationProbe />
        </MemoryRouter>
    );

describe('UserGuide', () => {
    beforeEach(() => {
        localStorage.removeItem('theme');
        vi.mocked(loadDemoRoute).mockClear();
    });

    test('renders the current workflow sections as an accessible collapsed accordion', () => {
        renderGuide();

        expect(screen.getByTestId('ug')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Job Tracker User Guide' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to Job Tracker' })).toHaveAttribute('href', routes.signIn);

        sectionTitles.forEach((title) => {
            const button = screen.getByRole('button', { name: title });
            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(button).toHaveAttribute('aria-controls');
        });
    });

    test('keeps only one guide section open at a time', async () => {
        renderGuide();

        const gettingStartedButton = screen.getByRole('button', { name: 'Getting started' });
        const dashboardButton = screen.getByRole('button', { name: 'Dashboard and reminders' });

        await userEvent.click(gettingStartedButton);
        expect(gettingStartedButton).toHaveAttribute('aria-expanded', 'true');
        expect(document.getElementById('getting-started-panel')).toBeVisible();

        await userEvent.click(dashboardButton);
        expect(gettingStartedButton).toHaveAttribute('aria-expanded', 'false');
        expect(document.getElementById('getting-started-panel')).not.toBeVisible();
        expect(dashboardButton).toHaveAttribute('aria-expanded', 'true');
        expect(document.getElementById('dashboard-panel')).toBeVisible();

        await userEvent.click(dashboardButton);
        expect(dashboardButton).toHaveAttribute('aria-expanded', 'false');
        expect(document.getElementById('dashboard-panel')).not.toBeVisible();
    });

    test('renders guide discovery controls and concise section summaries', () => {
        renderGuide();

        expect(screen.getByRole('searchbox', { name: 'Search the User Guide' })).toBeInTheDocument();
        expect(screen.getByText('11 sections')).toBeInTheDocument();
        expect(screen.getByText('Add, capture, organise and update your applications')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    test('uses an accessible icon button to clear the guide search', async () => {
        renderGuide();

        const search = screen.getByRole('searchbox', { name: 'Search the User Guide' });
        await userEvent.type(search, 'password');

        const clearSearchButton = screen.getByRole('button', { name: 'Clear search' });
        expect(clearSearchButton.querySelector('svg')).toBeInTheDocument();
        expect(clearSearchButton).not.toHaveTextContent('Clear');

        await userEvent.click(clearSearchButton);

        expect(search).toHaveValue('');
        expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });

    test('searches the complete guide copy and opens the only matching section', async () => {
        renderGuide();

        const search = screen.getByRole('searchbox', { name: 'Search the User Guide' });
        await userEvent.type(search, 'formula');

        expect(screen.getByText('1 section')).toBeInTheDocument();
        const exportingButton = screen.getByRole('button', { name: 'Exporting, sorting and display' });
        await waitFor(() => expect(exportingButton).toHaveAttribute('aria-expanded', 'true'));
        expect(document.getElementById('exporting-sorting-display-panel')).toHaveTextContent(
            /spreadsheet apps do not treat ordinary notes as formulas/i
        );
        expect(screen.getByTestId('guide-location')).toHaveTextContent(`${routes.userGuide}#exporting-sorting-display`);
    });

    test('collapses the open section when a changed search has multiple matches', async () => {
        renderGuide();

        const search = screen.getByRole('searchbox', { name: 'Search the User Guide' });
        await userEvent.type(search, 'password');

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Account and appearance' })).toHaveAttribute(
                'aria-expanded',
                'true'
            )
        );

        await userEvent.clear(search);
        await userEvent.type(search, 'sign');

        expect(screen.getByText('3 sections')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Account and appearance' })).toHaveAttribute(
                'aria-expanded',
                'false'
            )
        );
        expect(screen.getByTestId('guide-location')).toHaveTextContent(/^\/user-guide$/);
    });

    test('shows the matching guide sentence for each search result', async () => {
        renderGuide();

        await userEvent.type(screen.getByRole('searchbox', { name: 'Search the User Guide' }), 'counteroffer');

        expect(screen.getByText('3 sections')).toBeInTheDocument();

        const archivedExcerpt = screen.getByTestId('guide-search-excerpt-archived-records-deletion');
        expect(archivedExcerpt).toHaveTextContent(
            /Saved offer evaluations and counteroffer plans are kept as read-only records\./i
        );
        expect(within(archivedExcerpt).getByText(/counteroffer/i).tagName).toBe('MARK');

        const exportingExcerpt = screen.getByTestId('guide-search-excerpt-exporting-sorting-display');
        expect(exportingExcerpt).toHaveTextContent(
            /Offer Comparison exports the sections you selected and includes counteroffer plan details when they exist\./i
        );
        expect(within(exportingExcerpt).getByText(/counteroffer/i).tagName).toBe('MARK');
    });

    test('includes text rendered by embedded guide controls in search', async () => {
        renderGuide();

        await userEvent.type(screen.getByRole('searchbox', { name: 'Search the User Guide' }), 'Save to Job Tracker');

        expect(screen.getByText('1 section')).toBeInTheDocument();
        const applicationsButton = screen.getByRole('button', { name: 'Applications' });
        await waitFor(() => expect(applicationsButton).toHaveAttribute('aria-expanded', 'true'));
        expect(
            within(document.getElementById('applications-panel')!).getByRole('link', { name: 'Save to Job Tracker' })
        ).toBeVisible();
    });

    test('filters sections using nested guide topics and offers useful empty-search recovery', async () => {
        renderGuide();

        const search = screen.getByRole('searchbox', { name: 'Search the User Guide' });

        await userEvent.type(search, 'decisions and export');

        expect(screen.getByText('1 section')).toBeInTheDocument();
        const offerComparisonButton = screen.getByRole('button', { name: 'Offer Comparison' });
        await waitFor(() => expect(offerComparisonButton).toHaveAttribute('aria-expanded', 'true'));
        expect(screen.getByTestId('guide-location')).toHaveTextContent(`${routes.userGuide}#offer-comparison`);
        expect(screen.queryByRole('button', { name: 'Applications' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();

        await userEvent.clear(search);
        await userEvent.type(search, 'topic that does not exist');

        expect(screen.getByText('0 sections')).toBeInTheDocument();
        expect(screen.getByText('No guide sections match your search.')).toBeInTheDocument();
        expect(
            screen.getByText('Try a feature or task, such as applications, calendar, counteroffer or password.')
        ).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

        expect(search).toHaveValue('');
        expect(screen.getByText('11 sections')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });

    test('does not add a page-level appearance control', () => {
        renderGuide();

        expect(screen.queryByRole('button', { name: /Switch to (dark|light) mode/ })).not.toBeInTheDocument();
    });

    test('opens and positions the matching section from a subtopic hash', () => {
        renderGuide(`${routes.userGuide}#quick-capture`);

        expect(screen.getByRole('button', { name: 'Applications' })).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('heading', { name: 'Quick Capture from a job posting' })).toHaveAttribute(
            'id',
            'quick-capture'
        );
    });

    test('updates the URL when opening and closing a guide section', async () => {
        renderGuide();

        const gettingStartedButton = screen.getByRole('button', { name: 'Getting started' });
        await userEvent.click(gettingStartedButton);

        expect(screen.getByTestId('guide-location')).toHaveTextContent(`${routes.userGuide}#getting-started`);

        await userEvent.click(gettingStartedButton);

        expect(screen.getByTestId('guide-location')).toHaveTextContent(routes.userGuide);
    });

    test('keeps long guide sections as plain accordion content without a topic navigator', async () => {
        renderGuide();

        await userEvent.click(screen.getByRole('button', { name: 'Applications' }));
        const applicationsPanel = document.getElementById('applications-panel')!;

        expect(within(applicationsPanel).getByRole('heading', { name: 'Application statuses' })).toBeVisible();
        expect(within(applicationsPanel).queryByText('On this page')).not.toBeInTheDocument();
        expect(
            within(applicationsPanel).queryByRole('navigation', { name: 'Applications topics' })
        ).not.toBeInTheDocument();
    });

    test('covers current application, interview, offer and demo workflows', async () => {
        renderGuide();

        await userEvent.click(screen.getByRole('button', { name: 'Applications' }));
        const applicationsPanel = document.getElementById('applications-panel');
        expect(applicationsPanel).toBeVisible();
        const applicationSteps = within(applicationsPanel!).getByRole('list', {
            name: 'Add an application steps',
        });
        expect(within(applicationSteps).getAllByRole('listitem')).toHaveLength(3);
        expect(within(applicationsPanel!).getByRole('link', { name: 'Save to Job Tracker' })).toBeInTheDocument();
        expect(applicationsPanel).toHaveTextContent(/List and Board/i);
        expect(applicationsPanel).toHaveTextContent(/Withdrawn:/i);
        expect(applicationsPanel).not.toHaveTextContent(/Interested:/i);

        await userEvent.click(screen.getByRole('button', { name: 'Interviews' }));
        expect(document.getElementById('interviews-panel')).toHaveTextContent(/keeps your current List or Board view/i);

        await userEvent.click(screen.getByRole('button', { name: 'Offer Comparison' }));
        const offerPanel = document.getElementById('offer-comparison-panel');
        expect(offerPanel).toHaveTextContent(/Cards or Table/i);
        expect(offerPanel).toHaveTextContent(/Horizontal or Vertical/i);
        expect(offerPanel).toHaveTextContent(/work-life balance/i);
        expect(offerPanel).toHaveTextContent(/Offers without evaluations are not deleted/i);

        await userEvent.click(screen.getByRole('button', { name: 'Demo mode' }));
        const demoPanel = document.getElementById('demo-mode-panel');
        const demoLink = within(demoPanel!).getByRole('link', { name: 'Explore Demo' });
        expect(demoLink).toHaveAttribute('href', routes.demoViewApplications);
        expect(demoLink).toHaveAttribute('target', '_blank');
        expect(demoLink).toHaveAttribute('rel', 'noreferrer');
        expect(demoPanel).toHaveTextContent(/resets when you refresh the page/i);
    });

    test('preloads the Demo route when an Explore Demo link receives user intent', async () => {
        renderGuide();

        await userEvent.click(screen.getByRole('button', { name: 'Getting started' }));
        const demoLink = screen.getByRole('link', { name: 'Explore Demo' });

        expect(demoLink).toHaveAttribute('target', '_blank');
        expect(demoLink).toHaveAttribute('rel', 'noreferrer');

        fireEvent.pointerEnter(demoLink);
        fireEvent.focus(demoLink);
        fireEvent.pointerDown(demoLink);

        expect(loadDemoRoute).toHaveBeenCalledTimes(3);
    });
});
