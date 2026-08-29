import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import { useMemo, useState } from 'react';
import formatDate, { parseCalendarDate } from '../../../../helper/dateFormatter';
import { Line } from 'react-chartjs-2';
import DashboardCard from '../../shared/dashboardCard/DashboardCard';
import LoadingSpinner from '../../../../components/loadingSpinner/LoadingSpinner';
import type { ApplicationsLineChartProps } from '../../dashboardTypes';
import styles from './ApplicationsLineChart.module.css';
import { useTheme } from '../../../../components/theme/ThemeContext';
import {
    CHART_COLORS,
    DASHBOARD_TOOLTIP_OPTIONS,
    LEGEND_LABELS,
    TREND_SERIES_COLORS,
    TITLE_FONT,
    TITLE_PADDING,
    trendTooltipPlugin,
} from './chartConfig';
import { getWeeklyInterviewCounts } from '../../dashboardSelectors';
import PrimaryButton from '../../../../components/button/PrimaryButton';

ChartJS.register(CategoryScale, Legend, LineElement, LinearScale, PointElement, Title, Tooltip);

const formatTotal = (count: number, singular: string): string => `${count} ${count === 1 ? singular : `${singular}s`}`;

const ApplicationsLineChart = ({
    interviews,
    weeklyApplications,
    hasError = false,
    interviewsAvailable = true,
    isLoading,
    onRetry,
}: ApplicationsLineChartProps) => {
    const { theme } = useTheme();
    const [applicationsVisible, setApplicationsVisible] = useState(true);
    const [interviewsVisible, setInterviewsVisible] = useState(true);

    const weeks = useMemo(() => {
        return [...weeklyApplications].sort(
            (firstWeek, secondWeek) =>
                parseCalendarDate(firstWeek.start_of_week).getTime() -
                parseCalendarDate(secondWeek.start_of_week).getTime()
        );
    }, [weeklyApplications]);

    const counts = useMemo(
        () =>
            weeks.map((week) => {
                const count = Number(week.applications_count);
                return Number.isFinite(count) ? count : 0;
            }),
        [weeks]
    );
    const total = useMemo(() => counts.reduce((sum, count) => sum + count, 0), [counts]);
    const interviewCounts = useMemo(
        () => (interviewsAvailable ? getWeeklyInterviewCounts(interviews, weeks) : []),
        [interviews, interviewsAvailable, weeks]
    );
    const interviewTotal = useMemo(() => interviewCounts.reduce((sum, count) => sum + count, 0), [interviewCounts]);
    const showInterviewSeries = interviewsAvailable && interviewTotal > 0;
    const thisWeekCount = counts.at(-1) ?? 0;
    const lastWeekCount = counts.at(-2);
    const difference = lastWeekCount === undefined ? undefined : thisWeekCount - lastWeekCount;
    const comparison =
        difference === undefined
            ? 'No previous week data'
            : difference === 0
            ? 'Same as last week'
            : `${difference > 0 ? '+' : ''}${difference} vs last week`;
    const comparisonClassName =
        difference === undefined || difference === 0
            ? styles.neutral
            : difference > 0
            ? styles.positive
            : styles.negative;
    const bestWeekCount = counts.length > 0 ? Math.max(...counts) : 0;

    const data = useMemo(() => {
        return {
            labels: weeks.map((week) => formatDate(parseCalendarDate(week.start_of_week)).formattedDay),
            datasets: [
                {
                    label: 'Applications',
                    data: counts,
                    backgroundColor: TREND_SERIES_COLORS.applications[theme],
                    borderColor: TREND_SERIES_COLORS.applications[theme],
                    hidden: !applicationsVisible,
                },
                ...(showInterviewSeries
                    ? [
                          {
                              label: 'Interviews',
                              data: interviewCounts,
                              backgroundColor: TREND_SERIES_COLORS.interviews[theme],
                              borderColor: TREND_SERIES_COLORS.interviews[theme],
                              hidden: !interviewsVisible,
                          },
                      ]
                    : []),
            ],
        };
    }, [applicationsVisible, counts, interviewCounts, interviewsVisible, showInterviewSeries, theme, weeks]);

    const chartColors = CHART_COLORS[theme];

    return (
        <DashboardCard
            title='Job Search Activity'
            description={
                showInterviewSeries
                    ? 'Applications submitted and interviews scheduled over the past eight weeks.'
                    : 'Applications submitted over the past eight weeks.'
            }
        >
            {!isLoading && !hasError && (
                <div className={styles.summary} aria-label='Weekly application summary'>
                    <div className={`${styles.summaryItem} ${styles.current}`}>
                        <span>Applications this week</span>
                        <strong>{thisWeekCount}</strong>
                    </div>
                    <div className={`${styles.summaryItem} ${comparisonClassName}`}>
                        <span>Application change</span>
                        <strong>{comparison}</strong>
                    </div>
                    <div className={`${styles.summaryItem} ${styles.best}`}>
                        <span>Best application week</span>
                        <strong>{bestWeekCount}</strong>
                    </div>
                </div>
            )}
            {hasError ? (
                <div className={styles.centered}>
                    <div>
                        <p>Unable to load application trends.</p>
                        {onRetry && (
                            <PrimaryButton onClick={onRetry} type='button' variant='secondary'>
                                Try again
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            ) : isLoading ? (
                <div className={styles.centered}>
                    <LoadingSpinner size='sm' />
                </div>
            ) : total === 0 && interviewTotal === 0 ? (
                <p className={styles.centered}>
                    No job applications or interviews in the last eight weeks. Add some to see your progress here!
                </p>
            ) : (
                <>
                    <div className={styles.chartArea}>
                        <Line
                            key={theme}
                            data={data}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    x: { ticks: { color: chartColors.tick }, grid: { color: chartColors.grid } },
                                    y: {
                                        beginAtZero: true,
                                        ticks: { color: chartColors.tick, precision: 0 },
                                        grid: { color: chartColors.grid },
                                    },
                                },
                                plugins: {
                                    title: {
                                        display: true,
                                        text: showInterviewSeries
                                            ? 'Weekly Applications and Interviews'
                                            : 'Weekly Applications',
                                        font: TITLE_FONT,
                                        padding: TITLE_PADDING,
                                        color: chartColors.title,
                                    },
                                    legend: {
                                        display: true,
                                        position: 'bottom' as const,
                                        labels: { ...LEGEND_LABELS, color: chartColors.legend },
                                        onClick: (_event, legendItem) => {
                                            if (legendItem.datasetIndex === 0) {
                                                setApplicationsVisible((isVisible) => !isVisible);
                                            } else if (legendItem.datasetIndex === 1) {
                                                setInterviewsVisible((isVisible) => !isVisible);
                                            }
                                        },
                                    },
                                    tooltip: DASHBOARD_TOOLTIP_OPTIONS,
                                },
                            }}
                            plugins={[trendTooltipPlugin]}
                        />
                    </div>
                    <p className={styles.total}>
                        8-week totals: {formatTotal(total, 'application')}
                        {showInterviewSeries ? ` · ${formatTotal(interviewTotal, 'interview')}` : ''}
                    </p>
                </>
            )}
        </DashboardCard>
    );
};

export default ApplicationsLineChart;
