import type { FallbackScreenProps, FallbackScreenVariant } from './models';
import PrimaryButton from '../button/PrimaryButton';
import Icon from '../icon/Icon';
import styles from './FallbackScreen.module.css';

type FallbackContent = {
    actionLabel?: string;
    graphicLabel: string;
    message: string;
    routeState: 'authenticationError' | 'moving' | 'notFound' | 'routeError';
    stages: readonly [string, string, string];
    title: string;
};

const FALLBACK_CONTENT: Record<FallbackScreenVariant, FallbackContent> = {
    authenticationError: {
        actionLabel: 'Try again',
        graphicLabel: 'Session verification stopped at the Verify checkpoint',
        message: 'Try again to continue to Job Tracker.',
        routeState: 'authenticationError',
        stages: ['Sign in', 'Verify', 'Ready'],
        title: 'We couldn’t confirm your session',
    },
    loading: {
        graphicLabel: 'Loading',
        message: 'This should only take a moment.',
        routeState: 'moving',
        stages: ['Sign in', 'Verify', 'Ready'],
        title: 'Checking your session',
    },
    notFound: {
        actionLabel: 'View applications',
        graphicLabel: 'The requested route ends at a missing destination',
        message: 'It may have moved, or the link may be out of date.',
        routeState: 'notFound',
        stages: ['Job Tracker', 'This link', '404'],
        title: 'This page isn’t on the route',
    },
    pageLoading: {
        graphicLabel: 'Loading',
        message: 'Putting your applications in place.',
        routeState: 'moving',
        stages: ['Applied', 'Interview', 'Offer'],
        title: 'Opening your tracker',
    },
    routeError: {
        actionLabel: 'Reload page',
        graphicLabel: 'The page route is interrupted before Ready',
        message: 'Reload the page to try again.',
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

const FallbackRoute = ({ content, isLoading }: { content: FallbackContent; isLoading: boolean }) => (
    <div
        aria-label={content.graphicLabel}
        className={`${styles.routeMap} ${ROUTE_STATE_STYLES[content.routeState]}`}
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

            <path
                className={styles.routeTrack}
                d='M42 108C101 108 116 44 184 44s84 72 143 34c27-17 35-40 49-40'
                pathLength='100'
            />
            <path
                className={styles.routeActive}
                d='M42 108C101 108 116 44 184 44s84 72 143 34c27-17 35-40 49-40'
                pathLength='100'
                stroke='url(#fallbackRouteGradient)'
            />

            <g className={styles.routeNode} transform='translate(42 108)'>
                <circle r='7' />
            </g>
            <g className={`${styles.routeNode} ${styles.middleNode}`} transform='translate(184 44)'>
                <circle r='7' />
            </g>
            <g className={`${styles.routeNode} ${styles.finalNode}`} transform='translate(376 38)'>
                <circle r='7' />
            </g>

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

        <span className={`${styles.routeLabel} ${styles.routeLabelStart}`}>{content.stages[0]}</span>
        <span className={`${styles.routeLabel} ${styles.routeLabelMiddle}`}>{content.stages[1]}</span>
        <span className={`${styles.routeLabel} ${styles.routeLabelFinal}`}>{content.stages[2]}</span>
    </div>
);

const FallbackScreen = ({ variant = 'loading', onAction }: FallbackScreenProps) => {
    const isLoading = variant === 'loading' || variant === 'pageLoading';
    const content = FALLBACK_CONTENT[variant];

    return (
        <main className={styles.fallback} aria-live='polite' aria-busy={isLoading}>
            <header aria-label='Job Tracker' className={styles.brandLine}>
                <span aria-hidden='true' className={styles.brandIcon}>
                    <Icon name='briefcase' size={16} />
                </span>
                <span className={styles.brandName}>Job Tracker</span>
            </header>
            <div className={styles.content}>
                <FallbackRoute content={content} isLoading={isLoading} />
                <div className={styles.copy}>
                    <h1>{content.title}</h1>
                    <p className={styles.message}>{content.message}</p>
                    {content.actionLabel && onAction && (
                        <PrimaryButton onClick={onAction} type='button'>
                            {content.actionLabel}
                        </PrimaryButton>
                    )}
                </div>
            </div>
        </main>
    );
};

export default FallbackScreen;
