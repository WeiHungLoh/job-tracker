import type { ChartArea, Plugin, Point, TooltipModel, TooltipXAlignment, TooltipYAlignment } from 'chart.js';

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

// The placement plugin runs after Chart.js measures the tooltip. Disabling tooltip animations keeps those
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

const applyTooltipPlacement = (tooltip: TooltipModel<'line'>, placement: TooltipPlacement) => {
    tooltip.x = placement.x;
    tooltip.y = placement.y;
    tooltip.xAlign = placement.xAlign;
    tooltip.yAlign = placement.yAlign;
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

export const TREND_SERIES_COLORS = {
    applications: { light: '#17a2b8', dark: '#148f9e' },
    interviews: { light: '#0d6efd', dark: '#0a58ca' },
} as const;
