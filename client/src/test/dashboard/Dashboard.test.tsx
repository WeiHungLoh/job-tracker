import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChartData, ChartOptions, Plugin } from 'chart.js';
import ApplicationsLineChart from '../../pages/dashboard/charts/applicationsTrend/ApplicationsLineChart';
import JobSearchRoadmap from '../../pages/dashboard/charts/jobSearchRoadmap/JobSearchRoadmap';
import DashboardContent from '../../pages/dashboard/DashboardContent';
import DashboardStats from '../../pages/dashboard/overview/dashboardStats/DashboardStats';
import UpcomingInterviews from '../../pages/dashboard/overview/upcomingInterviews/UpcomingInterviews';
import type { JobApplication, JobStatus, JobStatusCount, WeeklyApplicationCount } from '../../pages/application/models';
import type { JobInterview } from '../../pages/interview/models';
import { getTrendTooltipPlacement } from '../../pages/dashboard/charts/applicationsTrend/chartConfig';
import { render } from '../renderWithProviders';

const chartMocks = vi.hoisted(() => ({
    lineOptions: undefined as ChartOptions<'line'> | undefined,
    linePlugins: undefined as Plugin<'line'>[] | undefined,
    lineData: undefined as ChartData<'line'> | undefined,
}));

vi.mock('react-chartjs-2', () => ({
    Line: ({
        data,
        options,
        plugins,
    }: {
        data: ChartData<'line'>;
        options?: ChartOptions<'line'>;
        plugins?: Plugin<'line'>[];
    }) => {
        chartMocks.lineData = data;
        chartMocks.lineOptions = options;
        chartMocks.linePlugins = plugins;
        return <div data-testid='line-chart'>Application trend line chart</div>;
    },
}));

const fixedNow = new Date('2026-07-10T12:00:00.000Z');
const chartArea = { left: 20, top: 10, right: 320, bottom: 210, width: 300, height: 200 };

const createInterview = (interviewId: number, interviewDate: string, companyName: string): JobInterview => ({
    interview_id: interviewId,
    job_id: interviewId,
    company_name: companyName,
    job_title: `Role ${interviewId}`,
    interview_date: interviewDate,
    interview_duration_minutes: 60,
    interview_location: interviewId % 2 === 0 ? 'Video call' : '',
    interview_type: interviewId % 2 === 0 ? 'Technical interview' : '',
    interview_notes: '',
});

const statusCount = (jobStatus: JobStatusCount['job_status'], count: number): JobStatusCount => ({
    job_status: jobStatus,
    count: String(count),
});

const createApplication = (jobId: number, jobStatus: JobStatus): JobApplication => ({
    job_id: jobId,
    company_name: `Application Company ${jobId}`,
    job_title: `Application Role ${jobId}`,
    application_date: '2026-06-01T12:00:00.000Z',
    job_status: jobStatus,
    job_location: '',
    job_posting_url: '',
    notes: '',
});

const getLegendStatuses = (label: string): Array<string | null> =>
    within(screen.getByRole('list', { name: label }))
        .getAllByRole('listitem')
        .map((item) => item.textContent);

describe('Dashboard V2', () => {
    beforeEach(() => {
        localStorage.removeItem('theme');
    });

    afterEach(() => {
        vi.useRealTimers();
        chartMocks.lineOptions = undefined;
        chartMocks.linePlugins = undefined;
        chartMocks.lineData = undefined;
        localStorage.removeItem('theme');
    });

    test('renders all dashboard sections', () => {
        render(
            <DashboardContent
                applications={[createApplication(1, 'Offer')]}
                statusCounts={[statusCount('Applied', 4), statusCount('Rejected', 1)]}
                interviews={[]}
                weeklyApplications={[{ start_of_week: '2026-07-06', applications_count: '4' }]}
                isLoading={false}
            />
        );

        expect(screen.getByText('Total active applications')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Needs Attention' })).toBeInTheDocument();
        expect(screen.getByText('Application Company 1')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Job Search Activity' })).toBeInTheDocument();
        expect(screen.getByText('Applications submitted over the past eight weeks.')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Upcoming Interviews' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Job Search Roadmap' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Application Pipeline' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Closed Outcomes' })).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Job Search Roadmap' })).toBeInTheDocument();
        expect(
            screen.getByRole('list', {
                name: 'Application pipeline. Applied: 4, Interview: 0, Offer: 0, Accepted: 0',
            })
        ).toBeInTheDocument();
    });

    test('shows stable application pipeline and closed outcome totals beside their section headings', async () => {
        render(
            <JobSearchRoadmap
                statusCounts={[
                    statusCount('Applied', 1),
                    statusCount('Interview', 2),
                    statusCount('Offer', 3),
                    statusCount('Accepted', 4),
                    statusCount('Rejected', 5),
                    statusCount('Withdrawn', 6),
                    statusCount('Ghosted', 7),
                    statusCount('Declined', 8),
                ]}
                isLoading={false}
            />
        );

        const pipelineHeading = screen.getByRole('heading', { name: 'Application Pipeline' });
        const closedHeading = screen.getByRole('heading', { name: 'Closed Outcomes' });

        expect(within(pipelineHeading).getByText('10')).toHaveAttribute('aria-hidden', 'true');
        expect(within(closedHeading).getByText('26')).toHaveAttribute('aria-hidden', 'true');

        await userEvent.click(screen.getByRole('button', { name: 'Hide Applied stage' }));
        await userEvent.click(screen.getByRole('button', { name: 'Hide Rejected outcome' }));

        expect(within(pipelineHeading).getByText('10')).toBeInTheDocument();
        expect(within(closedHeading).getByText('26')).toBeInTheDocument();
    });

    test('shows application-only trend details when the eight-week interview total is zero', () => {
        const weeklyApplications: WeeklyApplicationCount[] = [
            { start_of_week: '2026-06-29', applications_count: '2' },
            { start_of_week: '2026-07-06', applications_count: '5' },
        ];

        render(<ApplicationsLineChart weeklyApplications={weeklyApplications} interviews={[]} isLoading={false} />);

        const summary = screen.getByLabelText('Weekly application summary');
        expect(within(summary).getByText('Applications this week').parentElement).toHaveTextContent('5');
        expect(within(summary).getByText('Application change').parentElement).toHaveTextContent('+3 vs last week');
        expect(within(summary).getByText('Best application week').parentElement).toHaveTextContent('5');
        expect(chartMocks.lineData?.datasets).toHaveLength(1);
        expect(chartMocks.lineData?.datasets[0]).toMatchObject({ label: 'Applications', data: [2, 5] });
        expect(chartMocks.lineOptions?.plugins?.legend).toEqual(
            expect.objectContaining({ display: true, onClick: expect.any(Function) })
        );
        expect(chartMocks.lineOptions?.plugins?.title).toEqual(
            expect.objectContaining({ text: 'Weekly Applications' })
        );
        expect(screen.getByText('Applications submitted over the past eight weeks.')).toBeInTheDocument();
        expect(screen.getByText('8-week totals: 7 applications')).toBeInTheDocument();
        expect(screen.queryByText(/0 interviews?/)).not.toBeInTheDocument();
    });

    test('uses the safe trend fallback when there is no previous week', () => {
        render(
            <ApplicationsLineChart
                weeklyApplications={[{ start_of_week: '2026-07-06', applications_count: '3' }]}
                interviews={[]}
                isLoading={false}
            />
        );

        expect(screen.getByText('No previous week data')).toBeInTheDocument();
    });

    test('keeps eight application points and adds aligned weekly interview points with the exact light colours', () => {
        const weeklyApplications: WeeklyApplicationCount[] = Array.from({ length: 8 }, (_, index) => ({
            start_of_week: new Date(Date.UTC(2026, 4, 18 + index * 7)).toISOString(),
            applications_count: String(index),
        }));
        const interviews = [
            createInterview(1, '2026-05-18T10:00:00.000Z', 'First Week'),
            createInterview(2, '2026-06-01T10:00:00.000Z', 'Third Week'),
            createInterview(3, 'invalid', 'Invalid Date'),
            createInterview(4, '2026-07-13T00:00:00.000Z', 'Outside Range'),
        ];

        render(
            <ApplicationsLineChart weeklyApplications={weeklyApplications} interviews={interviews} isLoading={false} />
        );

        expect(chartMocks.lineData?.datasets).toHaveLength(2);
        expect(chartMocks.lineData?.datasets[0]).toMatchObject({
            label: 'Applications',
            data: [0, 1, 2, 3, 4, 5, 6, 7],
            backgroundColor: '#17a2b8',
            borderColor: '#17a2b8',
            hidden: false,
        });
        expect(chartMocks.lineData?.datasets[1]).toMatchObject({
            label: 'Interviews',
            data: [1, 0, 1, 0, 0, 0, 0, 0],
            backgroundColor: '#0d6efd',
            borderColor: '#0d6efd',
            hidden: false,
        });
        expect(chartMocks.lineOptions?.plugins?.title).toEqual(
            expect.objectContaining({ text: 'Weekly Applications and Interviews' })
        );
        expect(screen.getByText('8-week totals: 28 applications · 2 interviews')).toBeInTheDocument();
    });

    test('uses the exact existing dark application and Interview status colours', () => {
        localStorage.setItem('theme', 'dark');

        render(
            <ApplicationsLineChart
                weeklyApplications={[{ start_of_week: '2026-07-06T00:00:00.000Z', applications_count: '1' }]}
                interviews={[createInterview(1, '2026-07-06T10:00:00.000Z', 'Interview Company')]}
                isLoading={false}
            />
        );

        expect(chartMocks.lineData?.datasets[0]).toMatchObject({
            backgroundColor: '#148f9e',
            borderColor: '#148f9e',
        });
        expect(chartMocks.lineData?.datasets[1]).toMatchObject({
            backgroundColor: '#0a58ca',
            borderColor: '#0a58ca',
        });
    });

    test('renders the trend chart when only interviews exist in the weekly range', () => {
        render(
            <ApplicationsLineChart
                weeklyApplications={[{ start_of_week: '2026-07-06T00:00:00.000Z', applications_count: '0' }]}
                interviews={[createInterview(1, '2026-07-06T10:00:00.000Z', 'Interview Company')]}
                isLoading={false}
            />
        );

        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByText('8-week totals: 0 applications · 1 interview')).toBeInTheDocument();
    });

    test('uses singular footer wording for one application and one interview', () => {
        render(
            <ApplicationsLineChart
                weeklyApplications={[{ start_of_week: '2026-07-06T00:00:00.000Z', applications_count: '1' }]}
                interviews={[createInterview(1, '2026-07-06T10:00:00.000Z', 'Interview Company')]}
                isLoading={false}
            />
        );

        expect(screen.getByText('8-week totals: 1 application · 1 interview')).toBeInTheDocument();
    });

    test('renders every pipeline stage and closed outcome in canonical order, including zero counts', () => {
        render(
            <JobSearchRoadmap
                statusCounts={[
                    statusCount('Accepted', 2),
                    statusCount('Offer', 0),
                    statusCount('Withdrawn', 1),
                    statusCount('Rejected', 4),
                    statusCount('Interview', 3),
                    statusCount('Applied', 1),
                ]}
                isLoading={false}
            />
        );

        expect(screen.getByRole('heading', { name: 'Job Search Roadmap' })).toBeInTheDocument();
        expect(screen.getByText('See Where Every Application Is Headed.')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Application Pipeline' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Closed Outcomes' })).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('list', {
                    name: 'Application pipeline. Applied: 1, Interview: 3, Offer: 0, Accepted: 2',
                })
            )
                .getAllByRole('listitem')
                .map((item) => item.textContent)
        ).toEqual(['Applied1', 'Interview3', 'Offer0', 'Accepted2']);
        expect(getLegendStatuses('Application pipeline legend')).toEqual(['Applied', 'Interview', 'Offer', 'Accepted']);
        expect(
            within(
                screen.getByRole('list', {
                    name: 'Closed outcomes. Rejected: 4, Withdrawn: 1, Ghosted: 0, Declined: 0',
                })
            )
                .getAllByRole('listitem')
                .map((item) => item.textContent)
        ).toEqual(['4Rejected', '1Withdrawn', '0Ghosted', '0Declined']);
        expect(getLegendStatuses('Closed outcomes legend')).toEqual(['Rejected', 'Withdrawn', 'Ghosted', 'Declined']);
        expect(screen.getByRole('img', { name: 'Offer: 0 applications' }).closest('li')).toHaveAttribute(
            'data-zero-count',
            'true'
        );
        expect(screen.getByRole('img', { name: 'Ghosted: 0 applications' }).closest('li')).toHaveAttribute(
            'data-zero-count',
            'true'
        );
    });

    test('keeps pipeline markers and the complete road fixed while a checkpoint is hidden', async () => {
        const onStatusSelect = vi.fn();
        render(
            <JobSearchRoadmap
                statusCounts={[
                    statusCount('Applied', 1),
                    statusCount('Interview', 2),
                    statusCount('Offer', 3),
                    statusCount('Accepted', 4),
                ]}
                isLoading={false}
                onStatusSelect={onStatusSelect}
            />
        );

        const getStagePosition = (status: JobStatus) => {
            const countByStatus: Partial<Record<JobStatus, number>> = {
                Accepted: 4,
                Applied: 1,
                Interview: 2,
                Offer: 3,
            };
            const count = countByStatus[status] ?? 0;
            const marker = screen.getByRole('button', {
                name: `${status}: ${count} ${count === 1 ? 'application' : 'applications'}`,
            });
            const stage = marker.closest('li');
            return {
                x: stage?.style.getPropertyValue('--stage-x'),
                y: stage?.style.getPropertyValue('--stage-y'),
            };
        };
        const positions = {
            Applied: getStagePosition('Applied'),
            Offer: getStagePosition('Offer'),
            Accepted: getStagePosition('Accepted'),
        };
        const roadPath = screen.getByTestId('pipeline-road').getAttribute('d');
        const startStyle = screen.getByTestId('pipeline-start').getAttribute('style');
        const finishStyle = screen.getByTestId('pipeline-finish').getAttribute('style');
        expect(roadPath).toContain('38 36');

        await userEvent.click(screen.getByRole('button', { name: 'Hide Interview stage' }));

        expect(screen.queryByRole('button', { name: 'Interview: 2 applications' })).not.toBeInTheDocument();
        expect(getStagePosition('Applied')).toEqual(positions.Applied);
        expect(getStagePosition('Offer')).toEqual(positions.Offer);
        expect(getStagePosition('Accepted')).toEqual(positions.Accepted);
        expect(screen.getByTestId('pipeline-road')).toHaveAttribute('d', roadPath);
        expect(screen.getByTestId('pipeline-start')).toHaveAttribute('style', startStyle);
        expect(screen.getByTestId('pipeline-finish')).toHaveAttribute('style', finishStyle);
        expect(screen.getByRole('button', { name: 'Show Interview stage' })).toBeInTheDocument();
        expect(onStatusSelect).not.toHaveBeenCalled();
    });

    test('normalizes pipeline marker and endpoint anchors to the road viewBox height', () => {
        render(<JobSearchRoadmap statusCounts={[statusCount('Applied', 1)]} isLoading={false} />);

        expect(screen.getByTestId('pipeline-road').closest('svg')).toHaveAttribute('viewBox', '0 0 100 80');
        expect(screen.getByRole('img', { name: 'Applied: 1 application' }).closest('li')).toHaveStyle({
            '--stage-y': '72.5%',
        });
        expect(screen.getByTestId('pipeline-start')).toHaveStyle({ '--sign-y': '86.25%' });
        expect(screen.getByTestId('pipeline-finish')).toHaveStyle({ '--flag-y': '35%' });
    });

    test('places each pipeline label above a pin whose stem begins below the circle', () => {
        render(<JobSearchRoadmap statusCounts={[statusCount('Offer', 3)]} isLoading={false} />);

        const marker = screen.getByRole('img', { name: 'Offer: 3 applications' });
        const pin = within(marker).getByTestId('pipeline-pin-Offer');
        expect(pin).toHaveAttribute('viewBox', '0 0 72 96');
        expect(marker.firstElementChild).toHaveTextContent('Offer');
        expect(marker.lastElementChild).toBe(pin);
        expect([...pin.querySelectorAll('[data-pin-part]')].map((part) => part.getAttribute('data-pin-part'))).toEqual([
            'stem',
            'bubble',
            'foot',
        ]);
        expect(pin.querySelector('[data-pin-part="stem"]')).toHaveAttribute('y1', '58');
        expect(pin.querySelector('[data-pin-part="foot"]')).toHaveAttribute('cy', '96');
    });

    test('starts each closed-outcome stem below its translucent count circle', () => {
        render(<JobSearchRoadmap statusCounts={[statusCount('Ghosted', 2)]} isLoading={false} />);

        const marker = screen.getByRole('img', { name: 'Ghosted: 2 applications' });
        const sign = within(marker).getByTestId('outcome-sign-Ghosted');

        expect(sign.querySelector('line')).toHaveAttribute('y1', '46');
    });

    test('centers the remaining closed outcomes after a legend filter', async () => {
        render(
            <JobSearchRoadmap
                statusCounts={[
                    statusCount('Rejected', 1),
                    statusCount('Withdrawn', 2),
                    statusCount('Ghosted', 3),
                    statusCount('Declined', 4),
                ]}
                isLoading={false}
                onStatusSelect={vi.fn()}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Hide Withdrawn outcome' }));

        expect(screen.queryByRole('button', { name: 'Withdrawn: 2 applications' })).not.toBeInTheDocument();
        expect(
            screen
                .getByRole('button', { name: 'Rejected: 1 application' })
                .closest('li')
                ?.style.getPropertyValue('--outcome-x')
        ).toBe(`${100 / 6}%`);
        expect(
            screen
                .getByRole('button', { name: 'Ghosted: 3 applications' })
                .closest('li')
                ?.style.getPropertyValue('--outcome-x')
        ).toBe('50%');
        expect(
            screen
                .getByRole('button', { name: 'Declined: 4 applications' })
                .closest('li')
                ?.style.getPropertyValue('--outcome-x')
        ).toBe(`${500 / 6}%`);
        expect(getLegendStatuses('Closed outcomes legend')).toEqual(['Rejected', 'Withdrawn', 'Ghosted', 'Declined']);
    });

    test('navigates from pipeline and closed markers but never from legend controls', async () => {
        const onStatusSelect = vi.fn();
        render(
            <JobSearchRoadmap
                statusCounts={[statusCount('Offer', 0), statusCount('Rejected', 1)]}
                isLoading={false}
                onStatusSelect={onStatusSelect}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Offer: 0 applications' }));
        await userEvent.click(screen.getByRole('button', { name: 'Rejected: 1 application' }));
        expect(onStatusSelect).toHaveBeenNthCalledWith(1, 'Offer');
        expect(onStatusSelect).toHaveBeenNthCalledWith(2, 'Rejected');

        onStatusSelect.mockClear();
        await userEvent.click(screen.getByRole('button', { name: 'Hide Offer stage' }));
        await userEvent.click(screen.getByRole('button', { name: 'Hide Rejected outcome' }));
        expect(onStatusSelect).not.toHaveBeenCalled();
    });

    test('disables hiding the final visible pipeline marker when the pipeline has applications', async () => {
        render(
            <JobSearchRoadmap
                statusCounts={[statusCount('Applied', 1), statusCount('Rejected', 2)]}
                isLoading={false}
            />
        );

        for (const status of ['Interview', 'Offer', 'Accepted']) {
            await userEvent.click(screen.getByRole('button', { name: `Hide ${status} stage` }));
        }

        const finalHideControl = screen.getByRole('button', { name: 'Hide Applied stage' });
        expect(finalHideControl).toBeDisabled();
        await userEvent.click(finalHideControl);
        expect(screen.getByRole('img', { name: 'Applied: 1 application' })).toBeInTheDocument();
        expect(screen.getByTestId('pipeline-road')).toBeInTheDocument();
    });

    test('allows an all-zero pipeline to hide and restore every marker', async () => {
        render(<JobSearchRoadmap statusCounts={[]} isLoading={false} />);

        for (const status of ['Applied', 'Interview', 'Offer', 'Accepted']) {
            await userEvent.click(screen.getByRole('button', { name: `Hide ${status} stage` }));
        }

        expect(screen.getByRole('list', { name: 'Application pipeline. All stages hidden' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Show Applied stage' })).toBeEnabled();
        expect(screen.getByTestId('pipeline-road')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Show Applied stage' }));
        expect(screen.getByRole('img', { name: 'Applied: 0 applications' })).toBeInTheDocument();
    });

    test('hides an empty closed-outcomes map but keeps its footer legend available for recovery', async () => {
        render(
            <JobSearchRoadmap
                statusCounts={[
                    statusCount('Rejected', 1),
                    statusCount('Withdrawn', 2),
                    statusCount('Ghosted', 3),
                    statusCount('Declined', 4),
                ]}
                isLoading={false}
            />
        );

        for (const status of ['Rejected', 'Withdrawn', 'Ghosted', 'Declined']) {
            await userEvent.click(screen.getByRole('button', { name: `Hide ${status} outcome` }));
        }

        expect(screen.queryByRole('heading', { name: 'Closed Outcomes' })).not.toBeInTheDocument();
        expect(screen.queryByRole('list', { name: 'Closed outcomes. All outcomes hidden' })).not.toBeInTheDocument();
        expect(getLegendStatuses('Closed outcomes legend')).toEqual(['Rejected', 'Withdrawn', 'Ghosted', 'Declined']);

        await userEvent.click(screen.getByRole('button', { name: 'Show Ghosted outcome' }));

        expect(screen.getByRole('heading', { name: 'Closed Outcomes' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Ghosted: 3 applications' }).closest('li')).toHaveStyle({
            '--outcome-x': '50%',
        });
    });

    test('keeps the full zero-count pipeline and closed-outcomes section', () => {
        render(<JobSearchRoadmap statusCounts={[]} isLoading={false} />);

        ['Applied', 'Interview', 'Offer', 'Accepted'].forEach((status) => {
            expect(screen.getByRole('img', { name: `${status}: 0 applications` })).toBeInTheDocument();
        });
        ['Rejected', 'Withdrawn', 'Ghosted', 'Declined'].forEach((status) => {
            expect(screen.getByRole('img', { name: `${status}: 0 applications` })).toBeInTheDocument();
        });
        expect(screen.queryByText('No applications in the pipeline yet.')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Closed Outcomes' })).toBeInTheDocument();
        expect(screen.queryByText('No closed outcomes yet.')).not.toBeInTheDocument();
        expect(getLegendStatuses('Application pipeline legend')).toEqual(['Applied', 'Interview', 'Offer', 'Accepted']);
        expect(getLegendStatuses('Closed outcomes legend')).toEqual(['Rejected', 'Withdrawn', 'Ghosted', 'Declined']);
        expect(screen.getByText('Select A Marker To Open Applications With That Status.')).toBeInTheDocument();
    });

    test('places trend tooltips above with a downward-facing caret when space allows', () => {
        expect(getTrendTooltipPlacement({ x: 150, y: 100 }, { width: 80, height: 30 }, chartArea)).toEqual({
            x: 110,
            y: 59,
            xAlign: 'center',
            yAlign: 'bottom',
        });
    });

    test('falls trend tooltips back to the left when above would overflow and clamps edge points', () => {
        expect(getTrendTooltipPlacement({ x: 280, y: 40 }, { width: 80, height: 40 }, chartArea)).toEqual({
            x: 189,
            y: 20,
            xAlign: 'right',
            yAlign: 'center',
        });
        expect(getTrendTooltipPlacement({ x: 25, y: 100 }, { width: 80, height: 30 }, chartArea)).toEqual({
            x: 20,
            y: 85,
            xAlign: 'right',
            yAlign: 'center',
        });
        expect(getTrendTooltipPlacement({ x: 315, y: 100 }, { width: 80, height: 30 }, chartArea)).toEqual({
            x: 224,
            y: 85,
            xAlign: 'right',
            yAlign: 'center',
        });
    });

    test('uses React state to hide and restore each trend line independently', () => {
        render(
            <ApplicationsLineChart
                weeklyApplications={[{ start_of_week: '2026-07-06T00:00:00.000Z', applications_count: '3' }]}
                interviews={[createInterview(1, '2026-07-06T10:00:00.000Z', 'Interview Company')]}
                isLoading={false}
            />
        );

        const legendOptions = chartMocks.lineOptions?.plugins?.legend;
        const onLegendClick = legendOptions && legendOptions !== false ? legendOptions.onClick : undefined;

        expect(legendOptions).toEqual(expect.objectContaining({ display: true, onClick: expect.any(Function) }));
        expect(chartMocks.linePlugins?.map((plugin) => plugin.id)).toContain('trendTooltipPositioning');
        expect(chartMocks.lineOptions?.plugins?.tooltip).toEqual(
            expect.objectContaining({ animation: false, caretPadding: 6, caretSize: 5 })
        );
        expect(screen.getByText('8-week totals: 3 applications · 1 interview')).toBeInTheDocument();
        act(() => onLegendClick?.({} as never, { datasetIndex: 0 } as never, {} as never));
        expect(chartMocks.lineData?.datasets[0].hidden).toBe(true);
        expect(chartMocks.lineData?.datasets[1].hidden).toBe(false);
        expect(screen.getByText('8-week totals: 3 applications · 1 interview')).toBeInTheDocument();

        act(() => onLegendClick?.({} as never, { datasetIndex: 1 } as never, {} as never));
        expect(chartMocks.lineData?.datasets[0].hidden).toBe(true);
        expect(chartMocks.lineData?.datasets[1].hidden).toBe(true);
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByText('8-week totals: 3 applications · 1 interview')).toBeInTheDocument();

        act(() => onLegendClick?.({} as never, { datasetIndex: 0 } as never, {} as never));
        expect(chartMocks.lineData?.datasets[0].hidden).toBe(false);
        expect(chartMocks.lineData?.datasets[1].hidden).toBe(true);
    });

    test('retains the complete dashboard empty state', () => {
        render(
            <DashboardContent
                applications={[]}
                statusCounts={[]}
                interviews={[]}
                weeklyApplications={[]}
                isLoading={false}
            />
        );

        expect(
            screen.getByText(
                'No job applications or interviews in the last eight weeks. Add some to see your progress here!'
            )
        ).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'No upcoming interviews' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Applied: 0 applications' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Closed Outcomes' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Rejected: 0 applications' })).toBeInTheDocument();
        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    test('retains the complete dashboard loading state', () => {
        render(
            <DashboardContent
                applications={[]}
                statusCounts={[statusCount('Applied', 1), statusCount('Rejected', 1)]}
                interviews={[]}
                weeklyApplications={[{ start_of_week: '2026-07-06', applications_count: '1' }]}
                isLoading
            />
        );

        expect(screen.getAllByRole('progressbar', { name: 'Loading' })).toHaveLength(5);
        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Weekly application summary')).not.toBeInTheDocument();
    });

    test('shows only the three nearest future interviews in order', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);

        const interviews = [
            createInterview(1, '2026-07-09T12:00:00.000Z', 'Past Company'),
            createInterview(2, '2026-07-14T12:00:00.000Z', 'Fourth Company'),
            createInterview(3, '2026-07-11T12:00:00.000Z', 'First Company'),
            createInterview(4, '2026-07-13T12:00:00.000Z', 'Third Company'),
            createInterview(5, '2026-07-12T12:00:00.000Z', 'Second Company'),
        ];

        render(<UpcomingInterviews interviews={interviews} isLoading={false} />);

        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            'First Company',
            'Second Company',
            'Third Company',
        ]);
        expect(
            within(screen.getByRole('list', { name: 'Upcoming interviews list' }))
                .getAllByRole('listitem')
                .map((item) => item.querySelector('[aria-hidden="true"]')?.textContent)
        ).toEqual(['1', '2', '3']);
        expect(screen.queryByText('Past Company')).not.toBeInTheDocument();
        expect(screen.queryByText('Fourth Company')).not.toBeInTheDocument();
    });

    test('includes an in-progress interview in the dashboard upcoming collection', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);

        render(
            <UpcomingInterviews
                interviews={[createInterview(1, '2026-07-10T11:30:00.000Z', 'In Progress Company')]}
                isLoading={false}
            />
        );

        expect(screen.getByRole('heading', { name: 'In Progress Company' })).toBeInTheDocument();
    });

    test('refreshes upcoming interview content when an interview ends while the dashboard remains open', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);
        const endingInterview = {
            ...createInterview(1, '2026-07-10T11:30:00.000Z', 'Ending Company'),
            interview_duration_minutes: 31,
        };

        render(
            <DashboardContent
                applications={[createApplication(1, 'Interview')]}
                statusCounts={[]}
                interviews={[endingInterview]}
                weeklyApplications={[]}
                isLoading={false}
            />
        );

        const dashboardStatistics = within(screen.getByRole('region', { name: 'Dashboard statistics' }));
        expect(screen.getByRole('heading', { name: 'Ending Company' })).toBeInTheDocument();
        expect(dashboardStatistics.getByText('Upcoming interviews').parentElement).toHaveTextContent('1');

        act(() => {
            vi.advanceTimersByTime(60 * 1000);
        });

        expect(screen.queryByRole('heading', { name: 'Ending Company' })).not.toBeInTheDocument();
        expect(dashboardStatistics.getByText('Upcoming interviews').parentElement).toHaveTextContent('0');
    });

    test('selects the exact upcoming interview from its accessible preview', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);
        const onInterviewSelect = vi.fn();
        const interview = createInterview(7, '2026-07-11T12:00:00.000Z', 'Target Company');

        render(<UpcomingInterviews interviews={[interview]} isLoading={false} onInterviewSelect={onInterviewSelect} />);

        screen.getByRole('button', { name: 'View Target Company interview' }).click();
        expect(onInterviewSelect).toHaveBeenCalledWith(7);
    });

    test('shows the upcoming-interviews empty state when no future interviews exist', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);

        render(
            <UpcomingInterviews
                interviews={[createInterview(1, '2026-07-09T12:00:00.000Z', 'Past Company')]}
                isLoading={false}
            />
        );

        expect(screen.getByRole('heading', { name: 'No upcoming interviews' })).toBeInTheDocument();
        expect(screen.getByText('Interviews you add will appear here.')).toBeInTheDocument();
    });

    test('shows current-state interview and offer rates', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);

        render(
            <DashboardStats
                interviewedApplicationCount={7}
                statusCounts={[
                    statusCount('Applied', 4),
                    statusCount('Interview', 2),
                    statusCount('Offer', 1),
                    statusCount('Accepted', 1),
                    statusCount('Declined', 2),
                ]}
                interviews={[
                    createInterview(1, '2026-07-09T12:00:00.000Z', 'Past Company'),
                    createInterview(2, '2026-07-11T12:00:00.000Z', 'Future Company'),
                ]}
                weeklyApplications={[{ start_of_week: '2026-07-06', applications_count: '4' }]}
                isLoading={false}
            />
        );

        expect(screen.getByText('Total active applications').parentElement).toHaveTextContent('10');
        expect(screen.getByText('Applied this week').parentElement).toHaveTextContent('4');
        expect(screen.getByText('Upcoming interviews').parentElement).toHaveTextContent('1');
        expect(screen.getByText('Interview rate').parentElement).toHaveTextContent('70%');
        expect(screen.getByText('Offer rate').parentElement).toHaveTextContent('40%');
    });

    test('uses explicit information controls to reveal the Interview Rate and Offer Rate calculations', async () => {
        render(
            <DashboardStats
                interviewedApplicationCount={2}
                statusCounts={[statusCount('Applied', 2), statusCount('Interview', 1), statusCount('Offer', 1)]}
                interviews={[]}
                weeklyApplications={[]}
                isLoading={false}
            />
        );

        const interviewInfo = screen.getByRole('button', { name: 'About Interview rate' });
        const offerInfo = screen.getByRole('button', { name: 'About Offer rate' });
        const interviewExplanation =
            'Applications with a recorded interview or later-stage status ÷ active applications.';
        const offerExplanation = 'Offer, Accepted or Declined applications ÷ total active applications.';
        const interviewValue = screen.getByText('50%').closest('[aria-hidden]');
        const interviewDetails = screen.getByText(interviewExplanation).closest('[aria-hidden]');

        expect(interviewInfo).toHaveAttribute('aria-expanded', 'false');
        expect(interviewInfo).toHaveAttribute('aria-controls', interviewDetails?.id);
        expect(interviewValue).toHaveAttribute('aria-hidden', 'false');
        expect(interviewDetails).toHaveAttribute('aria-hidden', 'true');
        expect(screen.queryByRole('button', { name: /Total active applications/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Interview rate: 50%/i })).not.toBeInTheDocument();

        interviewInfo.focus();
        await userEvent.keyboard('{Enter}');
        expect(interviewValue).toHaveAttribute('aria-hidden', 'true');
        expect(interviewDetails).toHaveAttribute('aria-hidden', 'false');
        expect(interviewInfo).toHaveAttribute('aria-expanded', 'true');

        await userEvent.keyboard(' ');
        expect(interviewValue).toHaveAttribute('aria-hidden', 'false');
        expect(interviewDetails).toHaveAttribute('aria-hidden', 'true');
        expect(interviewInfo).toHaveAttribute('aria-expanded', 'false');

        offerInfo.focus();
        await userEvent.keyboard('{Enter}');
        expect(screen.getByText(offerExplanation).closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'false');
        expect(offerInfo).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(offerInfo);
        expect(screen.getByText(offerExplanation).closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
        expect(offerInfo).toHaveAttribute('aria-expanded', 'false');
    });

    test('shows unavailable rates when there are no applications', () => {
        render(
            <DashboardStats
                interviewedApplicationCount={0}
                statusCounts={[]}
                interviews={[]}
                weeklyApplications={[]}
                isLoading={false}
            />
        );

        expect(screen.getAllByText('—')).toHaveLength(2);
    });
});
