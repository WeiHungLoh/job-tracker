import {
    APPLICATION_PIPELINE_STATUSES,
    type ApplicationPipelineStatus,
} from '../../../application/applicationStatusGroups';

export type RoadmapPoint = {
    x: number;
    y: number;
};

export const PIPELINE_ROAD_VIEWBOX_HEIGHT = 80;

export const PIPELINE_STAGE_POINTS: Record<ApplicationPipelineStatus, RoadmapPoint> = {
    Applied: { x: 13, y: 58 },
    Interview: { x: 38, y: 36 },
    Offer: { x: 64, y: 58 },
    Accepted: { x: 88, y: 35 },
};

export const PIPELINE_ROAD_POINTS: readonly RoadmapPoint[] = [
    { x: 3, y: 69 },
    ...APPLICATION_PIPELINE_STATUSES.map((status) => PIPELINE_STAGE_POINTS[status]),
    { x: 96, y: 28 },
];

export const PIPELINE_ROAD_PATH = PIPELINE_ROAD_POINTS.slice(1).reduce((path, point, index) => {
    const previousPoint = PIPELINE_ROAD_POINTS[index];
    const controlX = (previousPoint.x + point.x) / 2;

    return `${path} C ${controlX} ${previousPoint.y} ${controlX} ${point.y} ${point.x} ${point.y}`;
}, `M ${PIPELINE_ROAD_POINTS[0].x} ${PIPELINE_ROAD_POINTS[0].y}`);

export const getCenteredOutcomePosition = (index: number, count: number): number =>
    count > 0 ? ((index * 2 + 1) * 50) / count : 50;
