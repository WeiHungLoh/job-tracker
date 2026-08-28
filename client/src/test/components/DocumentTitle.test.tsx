import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import DocumentTitle from '../../components/documentTitle/DocumentTitle';
import { routes } from '../../routes';

const ROUTE_PATHS = [
    routes.signIn,
    routes.signUp,
    routes.userGuide,
    routes.dashboard,
    routes.addApplication,
    routes.viewApplications,
    routes.addInterview,
    routes.viewInterviews,
    routes.archivedApplications,
    routes.archivedInterviews,
    routes.offerDecisions,
    routes.archivedOfferDecisions,
    routes.demoRoot,
    routes.demoDashboard,
    routes.demoAddApplication,
    routes.demoViewApplications,
    routes.demoAddInterview,
    routes.demoViewInterviews,
    routes.demoArchivedApplications,
    routes.demoArchivedInterviews,
    routes.demoOfferDecisions,
    routes.demoArchivedOfferDecisions,
    '/missing',
] as const;

describe('DocumentTitle', () => {
    test.each(ROUTE_PATHS)('uses the Job Tracker title for %s', async (path) => {
        document.title = 'Previous page';

        render(
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route element={<DocumentTitle />}>
                        <Route path='*' element={<div>Route content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(document.title).toBe('Job Tracker'));
    });
});
