import { Navigate, Route, Routes } from 'react-router-dom';
import DemoAddApplication from '../../application/jobApplication/addApplication/DemoAddApplication';
import DemoAddInterview from '../../interview/jobInterview/addInterview/DemoAddInterview';
import DemoDashboard from '../../dashboard/DemoDashboard';
import DemoViewApplication from '../../application/jobApplication/viewApplication/DemoViewApplication';
import DemoViewArchivedApplication from '../../application/archivedApplication/viewArchivedApplication/DemoViewArchivedApplication';
import DemoViewArchivedInterview from '../../interview/archivedInterview/viewArchivedInterview/DemoViewArchivedInterview';
import DemoViewInterview from '../../interview/jobInterview/viewInterview/DemoViewInterview';
import { routes } from '../../../../routes';
import DemoOfferDecisionPage from '../../offerDecision/DemoOfferDecisionPage';
import InvalidPage from '../../../invalidPage/InvalidPage';

const getDemoChildPath = (path: string) => path.replace(`${routes.demoRoot}/`, '');

const demoPaths = {
    dashboard: getDemoChildPath(routes.demoDashboard),
    addApplication: getDemoChildPath(routes.demoAddApplication),
    viewApplications: getDemoChildPath(routes.demoViewApplications),
    addInterview: getDemoChildPath(routes.demoAddInterview),
    viewInterviews: getDemoChildPath(routes.demoViewInterviews),
    archivedApplications: getDemoChildPath(routes.demoArchivedApplications),
    archivedInterviews: getDemoChildPath(routes.demoArchivedInterviews),
    offerDecisions: getDemoChildPath(routes.demoOfferDecisions),
    archivedOfferDecisions: getDemoChildPath(routes.demoArchivedOfferDecisions),
} as const;

const DemoRoutes = () => (
    <Routes>
        <Route index element={<Navigate to={demoPaths.viewApplications} replace />} />
        <Route path={demoPaths.dashboard} element={<DemoDashboard />} />
        <Route path={demoPaths.addApplication} element={<DemoAddApplication />} />
        <Route path={demoPaths.viewApplications} element={<DemoViewApplication />} />
        <Route path={demoPaths.addInterview} element={<DemoAddInterview />} />
        <Route path={demoPaths.viewInterviews} element={<DemoViewInterview />} />
        <Route path={demoPaths.archivedApplications} element={<DemoViewArchivedApplication />} />
        <Route path={demoPaths.archivedInterviews} element={<DemoViewArchivedInterview />} />
        <Route path={demoPaths.offerDecisions} element={<DemoOfferDecisionPage archived={false} />} />
        <Route path={demoPaths.archivedOfferDecisions} element={<DemoOfferDecisionPage archived />} />
        <Route path='*' element={<InvalidPage context='demo' />} />
    </Routes>
);

export default DemoRoutes;
