import type { FallbackScreenProps, FallbackScreenVariant } from './models';
import PrimaryButton from '../button/PrimaryButton';
import BrandMark from '../brandMark/BrandMark';
import { APPLICATION_PIPELINE_STATUSES } from '../../pages/application/applicationStatusGroups';
import styles from './FallbackScreen.module.css';
import { useEffect } from 'react';

type FallbackContent = {
    actionLabel?: string;
    graphicLabel: string;
    message: string;
    routeKind: 'application' | 'generic';
    routeState: 'authenticationError' | 'moving' | 'notFound' | 'routeError';
    stages: readonly string[];
    title: string;
};

type RoutePoint = {
    x: number;
    y: number;
};

const GENERIC_ROUTE_PATH = 'M42 108C101 108 116 44 184 44s84 72 143 34c27-17 35-40 49-40';
const APPLICATION_ROUTE_PATH = 'M42 108 C88 108 101 44 150 44 S220 98 270 98 S336 38 376 38';

const GENERIC_ROUTE_POINTS: readonly RoutePoint[] = [
    { x: 42, y: 108 },
    { x: 184, y: 44 },
    { x: 376, y: 38 },
];
const APPLICATION_ROUTE_POINTS: readonly RoutePoint[] = [
    { x: 42, y: 108 },
    { x: 150, y: 44 },
    { x: 270, y: 98 },
    { x: 376, y: 38 },
];

const FALLBACK_CONTENT: Record<FallbackScreenVariant, FallbackContent> = {
    authenticationError: {
        actionLabel: 'Try again',
        graphicLabel: 'Session verification stopped at the Verify checkpoint',
        message: 'Try again to continue to Job Tracker.',
        routeKind: 'generic',
        routeState: 'authenticationError',
        stages: ['Sign in', 'Verify', 'Ready'],
        title: 'We couldn’t confirm your session',
    },
    loading: {
        graphicLabel: 'Loading',
        message: 'This should only take a moment.',
        routeKind: 'generic',
        routeState: 'moving',
        stages: ['Sign in', 'Verify', 'Ready'],
        title: 'Checking your session',
    },
    notFound: {
        actionLabel: 'View applications',
        graphicLabel: 'The requested route ends at a missing destination',
        message: 'It may have moved, or the link may be out of date.',
        routeKind: 'generic',
        routeState: 'notFound',
        stages: ['Job Tracker', 'This link', '404'],
        title: 'This page isn’t on the route',
    },
    pageLoading: {
        graphicLabel: 'Loading',
        message: 'Putting your applications in place.',
        routeKind: 'application',
        routeState: 'moving',
        stages: APPLICATION_PIPELINE_STATUSES,
        title: 'Opening your tracker',
    },
    routeError: {
        actionLabel: 'Reload page',
        graphicLabel: 'The page route is interrupted before Ready',
        message: 'Reload the page to try again.',
        routeKind: 'generic',
        routeState: 'routeError',
        stages: ['Request', 'Page', 'Ready'],
        title: 'We couldn’t load this page',
    },
};

const ROUTE_STATE_STYLES: Record<FallbackContent['routeState'], string> = {
    authenticationError: styles.authenticationError,
    moving: styles.routeMoving,
    notFound: styles.notFound,
    routeError: styles.routeError,
};

const DOCUMENT_TITLES: Record<FallbackScreenVariant, string> = {
    authenticationError: 'Session Error | Job Tracker',
    loading: 'Checking Session | Job Tracker',
    notFound: 'Page Not Found | Job Tracker',
    pageLoading: 'Loading | Job Tracker',
    routeError: 'Page Error | Job Tracker',
};

const FallbackRoute = ({ content, isLoading }: { content: FallbackContent; isLoading: boolean }) => {
    const isApplicationRoute = content.routeKind === 'application';
    const routePath = isApplicationRoute ? APPLICATION_ROUTE_PATH : GENERIC_ROUTE_PATH;
    const routePoints = isApplicationRoute ? APPLICATION_ROUTE_POINTS : GENERIC_ROUTE_POINTS;
    const routeKindClass = isApplicationRoute ? styles.applicationRoute : styles.genericRoute;

    return (
        <div
            aria-label={content.graphicLabel}
            className={`${styles.routeMap} ${routeKindClass} ${ROUTE_STATE_STYLES[content.routeState]}`}
            role={isLoading ? 'progressbar' : 'img'}
        >
            <svg aria-hidden='true' className={styles.routeSvg} viewBox='0 0 420 170'>
                <defs>
                    <linearGradient id='fallbackRouteGradient' x1='0' x2='1' y1='0' y2='0'>
                        <stop offset='0' stopColor='var(--colorPrimary)' />
                        <stop offset='0.56' stopColor='var(--routeAccentWarm)' />
                        <stop offset='1' stopColor='var(--colorPrimary)' />
                    </linearGradient>
                    <linearGradient id='fallbackTicketGradient' x1='0' x2='0' y1='0' y2='1'>
                        <stop offset='0' stopColor='var(--routeAccentWarm)' />
                        <stop offset='1' stopColor='var(--colorPrimary)' />
                    </linearGradient>
                </defs>

                <path className={styles.routeTrack} d={routePath} pathLength='100' />
                <path
                    className={styles.routeActive}
                    d={routePath}
                    pathLength='100'
                    stroke='url(#fallbackRouteGradient)'
                />

                {routePoints.map((point, index) => (
                    <g
                        className={`${styles.routeNode} ${index === 1 ? styles.middleNode : ''} ${
                            index === routePoints.length - 1 ? styles.finalNode : ''
                        }`}
                        data-route-node={content.stages[index]}
                        key={content.stages[index]}
                        transform={`translate(${point.x} ${point.y})`}
                    >
                        <circle r='7' />
                    </g>
                ))}

                <g className={styles.ticket} aria-hidden='true'>
                    <rect className={styles.ticketPaper} height='34' rx='8' width='56' x='-28' y='-17' />
                    <rect fill='url(#fallbackTicketGradient)' height='34' rx='3' width='6' x='-28' y='-17' />
                    <circle className={styles.ticketHole} cx='-11' cy='0' r='4' />
                    <path className={styles.ticketDetails} d='M-2-5h17M-2 1h13M-11 9h26' />
                </g>

                <g className={styles.errorMark} transform='translate(184 44)'>
                    <circle r='14' />
                    <text textAnchor='middle' x='0' y='5'>
                        !
                    </text>
                </g>

                <g className={styles.routeBreak} transform='translate(268 86)'>
                    <path d='M-8-8 0 0M2 2l8 8' />
                </g>

                <g className={styles.missingEnd} transform='translate(376 38)'>
                    <circle r='15' />
                    <text textAnchor='middle' x='0' y='5'>
                        ?
                    </text>
                </g>
            </svg>

            {routePoints.map((point, index) => (
                <span
                    className={styles.routeLabel}
                    key={content.stages[index]}
                    style={{ left: `${(point.x / 420) * 100}%`, top: `${((point.y + 20) / 170) * 100}%` }}
                >
                    {content.stages[index]}
                </span>
            ))}
        </div>
    );
};

const FallbackScreen = ({
    actionLabel,
    variant = 'loading',
    onAction,
    onSecondaryAction,
    secondaryActionLabel,
}: FallbackScreenProps) => {
    const isLoading = variant === 'loading' || variant === 'pageLoading';
    const content = FALLBACK_CONTENT[variant];
    const primaryActionLabel = actionLabel ?? content.actionLabel;
    const hasPrimaryAction = Boolean(primaryActionLabel && onAction);
    const hasSecondaryAction = Boolean(secondaryActionLabel && onSecondaryAction);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = DOCUMENT_TITLES[variant];

        return () => {
            document.title = previousTitle;
        };
    }, [variant]);

    return (
        <main className={styles.fallback} aria-live='polite' aria-busy={isLoading}>
            <header aria-label='Job Tracker' className={styles.brandLine}>
                <BrandMark size='sm' />
                <span className={styles.brandName}>Job Tracker</span>
            </header>
            <div className={styles.content}>
                <FallbackRoute content={content} isLoading={isLoading} />
                <div className={styles.copy}>
                    <h1>{content.title}</h1>
                    <p className={styles.message}>{content.message}</p>
                    {(hasPrimaryAction || hasSecondaryAction) && (
                        <div className={styles.actions}>
                            {hasPrimaryAction && (
                                <PrimaryButton onClick={onAction} type='button'>
                                    {primaryActionLabel}
                                </PrimaryButton>
                            )}
                            {hasSecondaryAction && (
                                <PrimaryButton onClick={onSecondaryAction} type='button' variant='secondary'>
                                    {secondaryActionLabel}
                                </PrimaryButton>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default FallbackScreen;
