import { useId, useMemo, type CSSProperties, type ReactNode } from 'react';
import LoadingSpinner from '../../../../components/loadingSpinner/LoadingSpinner';
import PrimaryButton from '../../../../components/button/PrimaryButton';
import type { JobStatus } from '../../../application/models';
import {
    APPLICATION_PIPELINE_STATUSES,
    CLOSED_OUTCOME_STATUSES,
    type ApplicationPipelineStatus,
} from '../../../application/applicationStatusGroups';
import { getStatusCountMap } from '../../dashboardSelectors';
import type { StatusChartProps } from '../../dashboardTypes';
import DashboardCard from '../../shared/dashboardCard/DashboardCard';
import StatusLegend from './StatusLegend';
import useStatusChartVisibility from './useStatusChartVisibility';
import {
    PIPELINE_ROAD_PATH,
    PIPELINE_ROAD_POINTS,
    PIPELINE_ROAD_VIEWBOX_HEIGHT,
    PIPELINE_STAGE_POINTS,
    getCenteredOutcomePosition,
} from './roadmapGeometry';
import styles from './JobSearchRoadmap.module.css';

type RoadmapStyle = CSSProperties & Record<`--${string}`, string>;

const statusClassNames: Record<JobStatus, string> = {
    Accepted: styles.accepted,
    Applied: styles.applied,
    Declined: styles.declined,
    Ghosted: styles.ghosted,
    Interview: styles.interview,
    Offer: styles.offer,
    Rejected: styles.rejected,
    Withdrawn: styles.withdrawn,
};

const getCollectionLabel = (
    label: string,
    visibleStatuses: readonly JobStatus[],
    countByStatus: Partial<Record<JobStatus, number>>,
    emptyLabel: string
) =>
    visibleStatuses.length === 0
        ? `${label}. ${emptyLabel}`
        : `${label}. ${visibleStatuses.map((status) => `${status}: ${countByStatus[status] ?? 0}`).join(', ')}`;

const getMarkerLabel = (status: JobStatus, count: number) =>
    `${status}: ${count} ${count === 1 ? 'application' : 'applications'}`;

const getRoadYPercent = (y: number) => (y / PIPELINE_ROAD_VIEWBOX_HEIGHT) * 100;

const PipelineSectionIcon = () => (
    <svg aria-hidden='true' className={styles.sectionIcon} viewBox='0 0 24 24'>
        <path d='M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z' />
        <circle cx='12' cy='10' r='2.25' />
    </svg>
);

const ClosedSectionIcon = () => (
    <svg aria-hidden='true' className={styles.sectionIcon} viewBox='0 0 24 24'>
        <path d='M7 21V8m0 0h9l2-2-2-2H7M4 8h3' />
    </svg>
);

const MarkerControl = ({
    children,
    className,
    disabled,
    label,
    onSelect,
    status,
}: {
    children: ReactNode;
    className: string;
    disabled: boolean;
    label: string;
    onSelect?: (status: JobStatus) => void;
    status: JobStatus;
}) =>
    onSelect ? (
        <button
            aria-label={label}
            className={className}
            data-stage={status}
            disabled={disabled}
            onClick={() => onSelect(status)}
            tabIndex={disabled ? -1 : undefined}
            type='button'
        >
            {children}
        </button>
    ) : (
        <div aria-label={label} className={className} data-stage={status} role='img'>
            {children}
        </div>
    );

const PipelinePin = ({ count, status }: { count: number; status: JobStatus }) => (
    <svg
        aria-hidden='true'
        className={styles.pipelinePin}
        data-testid={`pipeline-pin-${status}`}
        focusable='false'
        viewBox='0 0 72 96'
    >
        <line className={styles.pinStem} data-pin-part='stem' x1='36' x2='36' y1='58' y2='96' />
        <circle className={styles.pinBubble} cx='36' cy='30' data-pin-part='bubble' r='28' />
        <circle className={styles.pinFoot} cx='36' cy='96' data-pin-part='foot' r='7' />
        <circle className={styles.pinFootCenter} cx='36' cy='96' r='2.5' />
        <text className={styles.pinCount} dominantBaseline='middle' textAnchor='middle' x='36' y='30'>
            {count}
        </text>
    </svg>
);

const OutcomeSign = ({ count, status }: { count: number; status: JobStatus }) => (
    <svg
        aria-hidden='true'
        className={styles.outcomeSign}
        data-testid={`outcome-sign-${status}`}
        focusable='false'
        viewBox='0 0 84 88'
    >
        <line className={styles.outcomeStem} x1='42' x2='42' y1='46' y2='74' />
        <path className={styles.outcomeFlag} d='M34 62H62L74 72 62 82H34Z' />
        <circle className={styles.outcomeBubble} cx='42' cy='24' r='22' />
        <text className={styles.outcomeCount} dominantBaseline='middle' textAnchor='middle' x='42' y='24'>
            {count}
        </text>
    </svg>
);

const JobSearchRoadmap = ({ statusCounts, hasError = false, isLoading, onRetry, onStatusSelect }: StatusChartProps) => {
    const pipelineHeadingId = useId();
    const closedHeadingId = useId();
    const countByStatus = useMemo(() => getStatusCountMap(statusCounts), [statusCounts]);
    const pipelineStatuses = APPLICATION_PIPELINE_STATUSES;
    const closedStatuses = CLOSED_OUTCOME_STATUSES;
    const {
        hiddenStatuses: hiddenPipelineStatuses,
        visibleStatuses: visiblePipelineStatuses,
        toggleStatus: togglePipelineStatus,
    } = useStatusChartVisibility(pipelineStatuses);
    const {
        hiddenStatuses: hiddenClosedStatuses,
        visibleStatuses: visibleClosedStatuses,
        toggleStatus: toggleClosedStatus,
    } = useStatusChartVisibility(closedStatuses);
    const roadStart = PIPELINE_ROAD_POINTS[0];
    const roadFinish = PIPELINE_ROAD_POINTS[PIPELINE_ROAD_POINTS.length - 1];
    const pipelineTotal = pipelineStatuses.reduce((total, status) => total + (countByStatus[status] ?? 0), 0);
    const closedTotal = closedStatuses.reduce((total, status) => total + (countByStatus[status] ?? 0), 0);
    const hasVisibleClosedOutcomes = visibleClosedStatuses.length > 0;
    const disabledPipelineStatuses: ReadonlySet<ApplicationPipelineStatus> =
        pipelineTotal > 0 && visiblePipelineStatuses.length === 1 ? new Set(visiblePipelineStatuses) : new Set();
    const pipelineLabel = getCollectionLabel(
        'Application pipeline',
        visiblePipelineStatuses,
        countByStatus,
        'All stages hidden'
    );
    const closedLabel = getCollectionLabel(
        'Closed outcomes',
        visibleClosedStatuses,
        countByStatus,
        'All outcomes hidden'
    );

    return (
        <>
            <DashboardCard
                className={styles.card}
                description='See Where Every Application Is Headed.'
                title='Job Search Roadmap'
            >
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
                ) : (
                    <>
                        <section aria-labelledby={pipelineHeadingId} className={styles.pipelineSection}>
                            <h3 id={pipelineHeadingId}>
                                <PipelineSectionIcon />
                                Application Pipeline
                                <span aria-hidden='true' className={styles.sectionCount}>
                                    {pipelineTotal}
                                </span>
                            </h3>
                            <div className={styles.pipelineMap}>
                                <svg
                                    aria-hidden='true'
                                    className={styles.roadSvg}
                                    preserveAspectRatio='none'
                                    viewBox='0 0 100 80'
                                >
                                    <g>
                                        <path
                                            className={styles.roadContour}
                                            d={PIPELINE_ROAD_PATH}
                                            data-testid='pipeline-road-contour'
                                            transform='translate(0 -5)'
                                        />
                                        <path
                                            className={styles.roadContour}
                                            d={PIPELINE_ROAD_PATH}
                                            data-testid='pipeline-road-contour'
                                            transform='translate(0 5)'
                                        />
                                    </g>
                                    <g>
                                        <path className={styles.roadEdge} d={PIPELINE_ROAD_PATH} />
                                        <path
                                            className={styles.roadSurface}
                                            d={PIPELINE_ROAD_PATH}
                                            data-testid='pipeline-road'
                                            pathLength='100'
                                        />
                                        <path
                                            className={styles.roadProgress}
                                            d={PIPELINE_ROAD_PATH}
                                            data-testid='pipeline-road-progress'
                                            pathLength='100'
                                        />
                                        <path className={styles.roadCenter} d={PIPELINE_ROAD_PATH} pathLength='100' />
                                    </g>
                                </svg>
                                <span
                                    aria-hidden='true'
                                    className={styles.startSign}
                                    data-testid='pipeline-start'
                                    style={
                                        {
                                            '--sign-x': `${roadStart.x}%`,
                                            '--sign-y': `${getRoadYPercent(roadStart.y)}%`,
                                        } as RoadmapStyle
                                    }
                                >
                                    <span>Start</span>
                                </span>
                                <span
                                    aria-hidden='true'
                                    className={styles.finishFlag}
                                    data-testid='pipeline-finish'
                                    style={
                                        {
                                            '--flag-x': `${roadFinish.x}%`,
                                            '--flag-y': `${getRoadYPercent(roadFinish.y)}%`,
                                        } as RoadmapStyle
                                    }
                                />
                                <ol aria-label={pipelineLabel} className={styles.pipelineList}>
                                    {pipelineStatuses.map((status) => {
                                        const count = countByStatus[status] ?? 0;
                                        const point = PIPELINE_STAGE_POINTS[status];
                                        const isHidden = hiddenPipelineStatuses.has(status);
                                        const isZeroCount = count === 0;

                                        return (
                                            <li
                                                aria-hidden={isHidden || undefined}
                                                className={`${styles.pipelineStage} ${statusClassNames[status]} ${
                                                    isZeroCount ? styles.zeroCount : ''
                                                } ${isHidden ? styles.markerHidden : ''}`}
                                                data-zero-count={isZeroCount ? 'true' : undefined}
                                                key={status}
                                                style={
                                                    {
                                                        '--stage-x': `${point.x}%`,
                                                        '--stage-y': `${getRoadYPercent(point.y)}%`,
                                                    } as RoadmapStyle
                                                }
                                            >
                                                <MarkerControl
                                                    className={styles.pipelineMarker}
                                                    disabled={isHidden || isZeroCount}
                                                    label={getMarkerLabel(status, count)}
                                                    onSelect={onStatusSelect}
                                                    status={status}
                                                >
                                                    <span className={styles.stageName}>{status}</span>
                                                    <PipelinePin count={count} status={status} />
                                                </MarkerControl>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        </section>

                        <section
                            aria-hidden={!hasVisibleClosedOutcomes || undefined}
                            aria-labelledby={closedHeadingId}
                            className={`${styles.closedSection} ${
                                hasVisibleClosedOutcomes ? '' : styles.closedSectionHidden
                            }`}
                            data-testid='closed-outcomes-section'
                        >
                            <h3 id={closedHeadingId}>
                                <ClosedSectionIcon />
                                Closed Outcomes
                                <span aria-hidden='true' className={styles.sectionCount}>
                                    {closedTotal}
                                </span>
                            </h3>
                            <div className={styles.outcomeMap}>
                                <ol aria-label={closedLabel} className={styles.outcomeList}>
                                    {closedStatuses.map((status, originalIndex) => {
                                        const count = countByStatus[status] ?? 0;
                                        const visibleIndex = visibleClosedStatuses.indexOf(status);
                                        const isHidden = hiddenClosedStatuses.has(status);
                                        const isZeroCount = count === 0;
                                        const position = isHidden
                                            ? getCenteredOutcomePosition(originalIndex, closedStatuses.length)
                                            : getCenteredOutcomePosition(visibleIndex, visibleClosedStatuses.length);

                                        return (
                                            <li
                                                aria-hidden={isHidden || undefined}
                                                className={`${styles.outcome} ${statusClassNames[status]} ${
                                                    isZeroCount ? styles.zeroCount : ''
                                                } ${isHidden ? styles.outcomeHidden : ''}`}
                                                data-zero-count={isZeroCount ? 'true' : undefined}
                                                key={status}
                                                style={{ '--outcome-x': `${position}%` } as RoadmapStyle}
                                            >
                                                <MarkerControl
                                                    className={styles.outcomeMarker}
                                                    disabled={isHidden || isZeroCount}
                                                    label={getMarkerLabel(status, count)}
                                                    onSelect={onStatusSelect}
                                                    status={status}
                                                >
                                                    <OutcomeSign count={count} status={status} />
                                                    <span className={styles.outcomeName}>{status}</span>
                                                </MarkerControl>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        </section>

                        <div className={styles.legends}>
                            <div className={styles.legendGroup}>
                                <span className={styles.legendLabel}>Application Pipeline</span>
                                <StatusLegend
                                    className={styles.legendList}
                                    disabledStatuses={disabledPipelineStatuses}
                                    itemName='stage'
                                    label='Application pipeline legend'
                                    statuses={pipelineStatuses}
                                    hiddenStatuses={hiddenPipelineStatuses}
                                    onStatusToggle={togglePipelineStatus}
                                />
                            </div>
                            <div className={styles.legendGroup}>
                                <span className={styles.legendLabel}>Closed Outcomes</span>
                                <StatusLegend
                                    className={styles.legendList}
                                    itemName='outcome'
                                    label='Closed outcomes legend'
                                    statuses={closedStatuses}
                                    hiddenStatuses={hiddenClosedStatuses}
                                    onStatusToggle={toggleClosedStatus}
                                />
                            </div>
                        </div>
                    </>
                )}
            </DashboardCard>
            {!hasError && !isLoading && (
                <p className={styles.markerHint}>Select A Marker To Open Applications With That Status.</p>
            )}
        </>
    );
};

export default JobSearchRoadmap;
