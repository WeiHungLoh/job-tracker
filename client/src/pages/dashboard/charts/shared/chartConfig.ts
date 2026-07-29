import type {
    ActiveElement,
    ChartArea,
    ChartData,
    ChartOptions,
    Plugin,
    Point,
    TooltipModel,
    TooltipXAlignment,
    TooltipYAlignment,
} from 'chart.js';
import type { Theme } from '../../../../components/theme/models';
import { JOB_STATUSES, type JobStatus } from '../../../application/models';
import type { DashboardStatusSelectHandler, StatusCountMap } from '../../dashboardTypes';

export const TITLE_FONT = { size: 16, weight: 'bold' } as const;
export const TITLE_PADDING = { top: 20, bottom: 20 };
export const LEGEND_LABELS = {
    usePointStyle: true,
    pointStyle: 'circle' as const,
    padding: 20,
    font: { size: 14 },
};

export const CHART_COLORS = {
    light: { title: '#343a40', tick: '#666', grid: 'rgba(0,0,0,0.1)', legend: '#343a40' },
    dark: { title: '#dee2e6', tick: '#adb5bd', grid: 'rgba(255,255,255,0.12)', legend: '#dee2e6' },
} as const;

const TOOLTIP_CARET_SIZE = 5;
const TOOLTIP_GAP = 6;

// The placement plugins run after Chart.js measures the tooltip. Disabling tooltip animations keeps those
// chart-area-constrained coordinates from being replaced by the default animation target during the draw.
export const DASHBOARD_TOOLTIP_OPTIONS = {
    animation: false,
    caretPadding: TOOLTIP_GAP,
    caretSize: TOOLTIP_CARET_SIZE,
} as const;

type TooltipSize = {
    width: number;
    height: number;
};

type TooltipPlacement = Point & {
    xAlign: TooltipXAlignment;
    yAlign: TooltipYAlignment;
};

const clampTooltipCoordinate = (coordinate: number, start: number, end: number, size: number): number => {
    return Math.min(Math.max(coordinate, start), Math.max(start, end - size));
};

export const getStatusBarTooltipPlacement = (
    anchor: Point,
    tooltipSize: TooltipSize,
    chartArea: ChartArea
): TooltipPlacement => {
    const rightX = anchor.x + TOOLTIP_CARET_SIZE + TOOLTIP_GAP;
    const hasRoomOnRight = rightX + tooltipSize.width <= chartArea.right;
    const preferredX = hasRoomOnRight ? rightX : anchor.x - TOOLTIP_CARET_SIZE - TOOLTIP_GAP - tooltipSize.width;

    return {
        x: clampTooltipCoordinate(preferredX, chartArea.left, chartArea.right, tooltipSize.width),
        y: clampTooltipCoordinate(
            anchor.y - tooltipSize.height / 2,
            chartArea.top,
            chartArea.bottom,
            tooltipSize.height
        ),
        xAlign: hasRoomOnRight ? 'left' : 'right',
        yAlign: 'center',
    };
};

export const getTrendTooltipPlacement = (
    anchor: Point,
    tooltipSize: TooltipSize,
    chartArea: ChartArea
): TooltipPlacement => {
    const aboveX = anchor.x - tooltipSize.width / 2;
    const aboveY = anchor.y - TOOLTIP_CARET_SIZE - TOOLTIP_GAP - tooltipSize.height;
    const fitsAbove =
        aboveY >= chartArea.top && aboveX >= chartArea.left && aboveX + tooltipSize.width <= chartArea.right;

    if (fitsAbove) {
        return {
            x: aboveX,
            y: aboveY,
            xAlign: 'center',
            yAlign: 'bottom',
        };
    }

    return {
        x: clampTooltipCoordinate(
            anchor.x - TOOLTIP_CARET_SIZE - TOOLTIP_GAP - tooltipSize.width,
            chartArea.left,
            chartArea.right,
            tooltipSize.width
        ),
        y: clampTooltipCoordinate(
            anchor.y - tooltipSize.height / 2,
            chartArea.top,
            chartArea.bottom,
            tooltipSize.height
        ),
        xAlign: 'right',
        yAlign: 'center',
    };
};

const applyTooltipPlacement = <TType extends 'bar' | 'line'>(
    tooltip: TooltipModel<TType>,
    placement: TooltipPlacement
) => {
    tooltip.x = placement.x;
    tooltip.y = placement.y;
    tooltip.xAlign = placement.xAlign;
    tooltip.yAlign = placement.yAlign;
};

export const statusBarTooltipPlugin: Plugin<'bar'> = {
    id: 'statusBarTooltipPositioning',
    beforeTooltipDraw(chart, { tooltip }) {
        applyTooltipPlacement(
            tooltip,
            getStatusBarTooltipPlacement(
                { x: tooltip.caretX, y: tooltip.caretY },
                { width: tooltip.width, height: tooltip.height },
                chart.chartArea
            )
        );
    },
};

export const trendTooltipPlugin: Plugin<'line'> = {
    id: 'trendTooltipPositioning',
    beforeTooltipDraw(chart, { tooltip }) {
        applyTooltipPlacement(
            tooltip,
            getTrendTooltipPlacement(
                { x: tooltip.caretX, y: tooltip.caretY },
                { width: tooltip.width, height: tooltip.height },
                chart.chartArea
            )
        );
    },
};

export const STATUS_COLORS: Record<JobStatus, { light: string; dark: string }> = {
    Accepted: { light: '#198754', dark: '#146c43' },
    Applied: { light: '#17a2b8', dark: '#148f9e' },
    Declined: { light: 'rebeccapurple', dark: '#663399' },
    Ghosted: { light: '#6c757d', dark: '#5c636a' },
    Interview: { light: '#0d6efd', dark: '#0a58ca' },
    Offer: { light: '#ffc107', dark: '#d39e00' },
    Rejected: { light: '#dc3545', dark: '#b02a37' },
    Withdrawn: { light: '#8b5e3c', dark: '#7a4a2e' },
};

export const createStatusBarChartData = (
    statuses: readonly JobStatus[],
    countByStatus: StatusCountMap,
    theme: Theme
): ChartData<'bar'> => ({
    labels: [...statuses],
    datasets: [
        {
            label: 'Applications',
            data: statuses.map((status) => countByStatus[status] ?? 0),
            backgroundColor: statuses.map((status) => STATUS_COLORS[status][theme]),
            borderColor: statuses.map((status) => STATUS_COLORS[status][theme]),
            borderWidth: 1,
            borderRadius: 4,
        },
    ],
});

export const createStatusBarChartOptions = (theme: Theme): ChartOptions<'bar'> => {
    const colors = CHART_COLORS[theme];

    return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                beginAtZero: true,
                ticks: { color: colors.tick, precision: 0 },
                grid: { color: colors.grid },
            },
            y: {
                ticks: { color: colors.tick },
                grid: { display: false },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: DASHBOARD_TOOLTIP_OPTIONS,
        },
    };
};

export const getClickedJobStatus = (elements: ActiveElement[], labels: unknown[] | undefined): JobStatus | null => {
    const label = elements.length > 0 ? labels?.[elements[0].index] : undefined;
    return typeof label === 'string' && JOB_STATUSES.includes(label as JobStatus) ? (label as JobStatus) : null;
};

export const createInteractiveStatusBarChartOptions = (
    theme: Theme,
    onStatusSelect: DashboardStatusSelectHandler
): ChartOptions<'bar'> => ({
    ...createStatusBarChartOptions(theme),
    onClick: (_event, elements, chart) => {
        const status = getClickedJobStatus(elements, chart.data.labels);
        if (status) {
            onStatusSelect(status);
        }
    },
    onHover: (event, elements) => {
        const target = event.native?.target;
        if (target instanceof HTMLElement) {
            target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
    },
});
