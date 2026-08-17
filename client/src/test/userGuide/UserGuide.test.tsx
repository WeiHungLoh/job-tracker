import { fireEvent, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const renderGuide = () =>
    render(
        <MemoryRouter initialEntries={[routes.userGuide]}>
            <UserGuide />
        </MemoryRouter>
    );

describe('UserGuide', () => {
    beforeEach(() => {
        vi.mocked(loadDemoRoute).mockClear();
    });

    test('renders the current workflow sections as an accessible collapsed accordion', () => {
        renderGuide();

        expect(screen.getByTestId('ug')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Job Tracker User Guide' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', routes.signIn);

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

    test('covers current application, interview, offer and demo workflows', async () => {
        renderGuide();

        await userEvent.click(screen.getByRole('button', { name: 'Applications' }));
        const applicationsPanel = document.getElementById('applications-panel');
        expect(applicationsPanel).toBeVisible();
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
        expect(within(demoPanel!).getByRole('link', { name: 'Explore Demo' })).toHaveAttribute(
            'href',
            routes.demoViewApplications
        );
        expect(demoPanel).toHaveTextContent(/resets when you refresh the page/i);
    });

    test('preloads the Demo route when an Explore Demo link receives user intent', async () => {
        renderGuide();

        await userEvent.click(screen.getByRole('button', { name: 'Getting started' }));
        const demoLink = screen.getByRole('link', { name: 'Explore Demo' });

        fireEvent.pointerEnter(demoLink);
        fireEvent.focus(demoLink);
        fireEvent.pointerDown(demoLink);

        expect(loadDemoRoute).toHaveBeenCalledTimes(3);
    });
});
