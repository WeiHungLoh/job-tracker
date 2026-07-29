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
import styles from './ApplicationPipelineChart.module.css';
import { useTheme } from '../../../../components/theme/ThemeContext';
import useStatusChartVisibility from '../shared/useStatusChartVisibility';
import PrimaryButton from '../../../../components/button/PrimaryButton';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const PIPELINE_STATUSES: readonly JobStatus[] = ['Applied', 'Interview', 'Offer', 'Accepted'];

const ApplicationPipelineChart = ({
    statusCounts,
    hasError = false,
    isLoading,
    onRetry,
    onStatusSelect,
}: StatusChartProps) => {
    const { theme } = useTheme();
    const countByStatus = useMemo(() => getStatusCountMap(statusCounts), [statusCounts]);
    const renderedStatuses = useMemo(
        () => PIPELINE_STATUSES.filter((status) => (countByStatus[status] ?? 0) > 0),
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
        <DashboardCard title='Application Pipeline' description='Current progression from Applied to Accepted.'>
            {hasError ? (
                <div className={styles.centered}>
                    <div>
                        <p>Unable to load application statistics.</p>
                        {onRetry && (
                            <PrimaryButton onClick={onRetry} type='button' variant='secondary'>
                                Try Again
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            ) : isLoading ? (
                <div className={styles.centered}>
                    <LoadingSpinner size='sm' />
                </div>
            ) : renderedStatuses.length === 0 ? (
                <p className={styles.centered}>No applications in the pipeline yet.</p>
            ) : (
                <>
                    <div className={styles.chartArea} role='img' aria-label={`Application pipeline. ${chartLabel}`}>
                        <Bar key={theme} data={data} options={options} plugins={[statusBarTooltipPlugin]} />
                    </div>
                    <StatusLegend
                        label='Application pipeline legend'
                        statuses={renderedStatuses}
                        hiddenStatuses={hiddenStatuses}
                        onStatusToggle={toggleStatus}
                    />
                </>
            )}
        </DashboardCard>
    );
};

export default ApplicationPipelineChart;
