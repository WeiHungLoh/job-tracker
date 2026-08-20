import {
    APPLICATION_PIPELINE_STATUSES,
    CLOSED_OUTCOME_STATUSES,
} from '../../pages/application/applicationStatusGroups';
import {
    PIPELINE_ROAD_PATH,
    PIPELINE_ROAD_POINTS,
    PIPELINE_STAGE_POINTS,
    getCenteredOutcomePosition,
} from '../../pages/dashboard/charts/jobSearchRoadmap/roadmapGeometry';

describe('job search roadmap geometry', () => {
    test('keeps the canonical pipeline and closed-outcome orders', () => {
        expect(APPLICATION_PIPELINE_STATUSES).toEqual(['Applied', 'Interview', 'Offer', 'Accepted']);
        expect(CLOSED_OUTCOME_STATUSES).toEqual(['Rejected', 'Withdrawn', 'Ghosted', 'Declined']);
    });

    test('keeps one complete pipeline road through every canonical checkpoint', () => {
        expect(PIPELINE_ROAD_POINTS).toEqual([
            { x: 3, y: 69 },
            PIPELINE_STAGE_POINTS.Applied,
            PIPELINE_STAGE_POINTS.Interview,
            PIPELINE_STAGE_POINTS.Offer,
            PIPELINE_STAGE_POINTS.Accepted,
            { x: 96, y: 28 },
        ]);

        APPLICATION_PIPELINE_STATUSES.forEach((status) => {
            const point = PIPELINE_STAGE_POINTS[status];
            expect(PIPELINE_ROAD_PATH).toContain(`${point.x} ${point.y}`);
        });
    });

    test('centers one through four visible closed outcomes', () => {
        expect(
            [1, 2, 3, 4].map((count) =>
                Array.from({ length: count }, (_, index) => getCenteredOutcomePosition(index, count))
            )
        ).toEqual([[50], [25, 75], [100 / 6, 50, 500 / 6], [12.5, 37.5, 62.5, 87.5]]);
    });
});
