import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import AddInterview from '../../pages/interview/jobInterview/addInterview/AddInterview';
import DemoAddInterview from '../../pages/demo/interview/jobInterview/addInterview/DemoAddInterview';
import ApplicationCard from '../../pages/application/ApplicationCard';
import DemoApplicationCard from '../../pages/demo/application/DemoApplicationCard';
import type { JobApplicationCardProps } from '../../pages/application/ApplicationCard.models';
import type { JobApplication } from '../../pages/application/models';
import { DemoProvider } from '../../pages/demo/context/DemoContext';
import { routes } from '../../routes';
import { render } from '../renderWithProviders';

vi.mock('../../hooks/useUnsavedChangesBlocker', () => ({
    useUnsavedChangesBlocker: vi.fn(),
}));

const application: JobApplication = {
    job_id: 42,
    company_name: 'Acme',
    job_title: 'Software Engineer',
    application_date: '2026-07-01T09:00:00.000Z',
    job_status: 'Interview',
    job_location: '',
    job_posting_url: '',
    notes: '',
    is_pinned: false,
};

const applicationCardProps: JobApplicationCardProps = {
    application,
    editedJobStatus: application.job_status,
    hasInterview: false,
    hasOfferEvaluation: false,
    index: 0,
    isArchiving: false,
    isDeleting: false,
    isEditingStatus: false,
    isUpdatingPin: false,
    isUpdatingStatus: false,
    isUndoingFollowUp: false,
    note: '',
    noteSaveStatus: 'idle',
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onEditNotes: vi.fn(),
    onJobStatusChange: vi.fn(),
    onNotesBlur: vi.fn(),
    onPinToggle: vi.fn(),
    onRetryNotes: vi.fn(),
    onToggleStatusEditor: vi.fn(),
    onUndoFollowUp: vi.fn(),
    showArchive: false,
    showNotes: false,
    upcomingInterviewCount: 0,
    variant: 'job',
};

const LocationProbe = () => {
    const location = useLocation();

    return (
        <>
            <output data-testid='pathname'>{location.pathname}</output>
            <output data-testid='navigation-state'>{JSON.stringify(location.state)}</output>
        </>
    );
};

const renderRoutes = (children: ReactNode, initialEntry: { pathname: string; state?: unknown }, demo = false) => {
    const content = (
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path={initialEntry.pathname} element={children} />
                <Route path={routes.addInterview} element={<LocationProbe />} />
                <Route path={routes.demoAddInterview} element={<LocationProbe />} />
                <Route path={routes.viewApplications} element={<LocationProbe />} />
                <Route path={routes.demoViewApplications} element={<LocationProbe />} />
                <Route path={routes.dashboard} element={<LocationProbe />} />
                <Route path={routes.demoDashboard} element={<LocationProbe />} />
            </Routes>
        </MemoryRouter>
    );

    return render(demo ? <DemoProvider>{content}</DemoProvider> : content);
};

describe('Add Interview origin-aware navigation', () => {
    test('production and demo application cards identify the application collection origin', async () => {
        const production = renderRoutes(<ApplicationCard {...applicationCardProps} />, {
            pathname: routes.viewApplications,
        });

        await userEvent.click(screen.getByRole('link', { name: 'Add interview' }));
        expect(screen.getByTestId('navigation-state')).toHaveTextContent(
            JSON.stringify({ app: application, origin: { kind: 'application-collection' } })
        );

        production.unmount();
        renderRoutes(
            <DemoApplicationCard {...applicationCardProps} />,
            { pathname: routes.demoViewApplications },
            true
        );

        await userEvent.click(screen.getByRole('link', { name: 'Add interview' }));
        expect(screen.getByTestId('navigation-state')).toHaveTextContent(
            JSON.stringify({ app: application, origin: { kind: 'application-collection' } })
        );
    });

    test.each([
        ['production', routes.addInterview, routes.viewApplications, false, AddInterview],
        ['demo', routes.demoAddInterview, routes.demoViewApplications, true, DemoAddInterview],
    ] as const)(
        '%s Back returns an application origin with the existing status and target state',
        async (_label, addRoute, destinationRoute, demo, Component) => {
            renderRoutes(
                <Component />,
                {
                    pathname: addRoute,
                    state: { app: application, origin: { kind: 'application-collection' } },
                },
                demo
            );

            await userEvent.click(screen.getByRole('button', { name: 'Back' }));

            expect(screen.getByTestId('pathname')).toHaveTextContent(destinationRoute);
            expect(screen.getByTestId('navigation-state')).toHaveTextContent(
                JSON.stringify({
                    applicationJobStatus: 'Interview',
                    applicationTargetId: 42,
                })
            );
        }
    );

    test.each([
        ['production', routes.addInterview, routes.dashboard, false, AddInterview],
        ['demo', routes.demoAddInterview, routes.demoDashboard, true, DemoAddInterview],
    ] as const)(
        '%s Back returns a Needs Attention origin with the exact reminder target',
        async (_label, addRoute, destinationRoute, demo, Component) => {
            renderRoutes(
                <Component />,
                {
                    pathname: addRoute,
                    state: {
                        app: application,
                        origin: { kind: 'dashboard-needs-attention', category: 'interview-unscheduled' },
                    },
                },
                demo
            );

            await userEvent.click(screen.getByRole('button', { name: 'Back' }));

            expect(screen.getByTestId('pathname')).toHaveTextContent(destinationRoute);
            expect(screen.getByTestId('navigation-state')).toHaveTextContent(
                JSON.stringify({
                    dashboardAttentionTarget: { jobId: 42, category: 'interview-unscheduled' },
                })
            );
        }
    );
});
