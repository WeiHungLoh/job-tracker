import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import DashboardCard from '../../shared/dashboardCard/DashboardCard';
import LoadingSpinner from '../../../../components/loadingSpinner/LoadingSpinner';
import StatusLegend from '../shared/StatusLegend';
import type { JobStatus } from '../../../application/models';
import type { StatusChartProps } from '../../dashboardTypes';
import {
    createInteractiveStatusBarChartOptions,
    createStatusBarChartData,
    createStatusBarChartOptions,
    statusBarTooltipPlugin,
} from '../shared/chartConfig';
import { getStatusCountMap } from '../../dashboardSelectors';
import styles from './ClosedOutcomesChart.module.css';
import { useTheme } from '../../../../components/theme/ThemeContext';
import useStatusChartVisibility from '../shared/useStatusChartVisibility';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const CLOSED_STATUSES: readonly JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Declined'];

const ClosedOutcomesChart = ({ statusCounts, isLoading, onStatusSelect }: StatusChartProps) => {
    const { theme } = useTheme();
    const countByStatus = useMemo(() => getStatusCountMap(statusCounts), [statusCounts]);
    const renderedStatuses = useMemo(
        () => CLOSED_STATUSES.filter((status) => (countByStatus[status] ?? 0) > 0),
        [countByStatus]
    );
    const { hiddenStatuses, visibleStatuses, toggleStatus } = useStatusChartVisibility(renderedStatuses);
    const data = useMemo(
        () => createStatusBarChartData(visibleStatuses, countByStatus, theme),
        [countByStatus, theme, visibleStatuses]
    );
    const options = useMemo(
        () =>
            onStatusSelect
                ? createInteractiveStatusBarChartOptions(theme, onStatusSelect)
                : createStatusBarChartOptions(theme),
        [onStatusSelect, theme]
    );
    const chartLabel =
        visibleStatuses.length === 0
            ? 'All bars hidden'
            : visibleStatuses.map((status) => `${status}: ${countByStatus[status] ?? 0}`).join(', ');

    return (
        <DashboardCard title='Closed Outcomes' description='Applications that are no longer active.'>
            {isLoading ? (
                <div className={styles.centered}>
                    <LoadingSpinner size='sm' />
                </div>
            ) : renderedStatuses.length === 0 ? (
                <p className={styles.centered}>No closed outcomes yet.</p>
            ) : (
                <>
                    <div className={styles.chartArea} role='img' aria-label={`Closed outcomes. ${chartLabel}`}>
                        <Bar key={theme} data={data} options={options} plugins={[statusBarTooltipPlugin]} />
                    </div>
                    <StatusLegend
                        label='Closed outcomes legend'
                        statuses={renderedStatuses}
                        hiddenStatuses={hiddenStatuses}
                        onStatusToggle={toggleStatus}
                    />
                </>
            )}
        </DashboardCard>
    );
};

export default ClosedOutcomesChart;
