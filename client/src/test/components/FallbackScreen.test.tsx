import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import FallbackScreen from '../../components/fallbackScreen/FallbackScreen';

describe('FallbackScreen', () => {
    test.each([
        {
            variant: 'pageLoading' as const,
            title: 'Opening your tracker',
            message: 'Putting your applications in place.',
            stages: ['Applied', 'Interview', 'Offer', 'Accepted'],
            nodeCount: 4,
        },
        {
            variant: 'loading' as const,
            title: 'Checking your session',
            message: 'This should only take a moment.',
            stages: ['Sign in', 'Verify', 'Ready'],
            nodeCount: 3,
        },
    ])('shows the active application route for $variant', ({ variant, title, message, stages, nodeCount }) => {
        render(<FallbackScreen variant={variant} />);

        expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
        const route = screen.getByRole('progressbar', { name: 'Loading' });

        expect(route).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
        expect(screen.getByText(message)).toBeInTheDocument();
        stages.forEach((stage) => expect(within(route).getByText(stage)).toBeInTheDocument());
        expect(route.querySelectorAll('[data-route-node]')).toHaveLength(nodeCount);
        expect(
            [...route.querySelectorAll('[data-route-node]')].map((node) => node.getAttribute('data-route-node'))
        ).toEqual(stages);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test.each([
        {
            variant: 'authenticationError' as const,
            title: 'We couldn’t confirm your session',
            message: 'Try again to continue to Job Tracker.',
            action: 'Try again',
            graphicLabel: 'Session verification stopped at the Verify checkpoint',
            stages: ['Sign in', 'Verify', 'Ready'],
        },
        {
            variant: 'preferencesError' as const,
            title: 'We couldn’t load your saved settings',
            message: 'You’re signed in, but your display preferences aren’t available right now.',
            action: 'Try again',
            graphicLabel: 'Saved settings stopped at the Preferences checkpoint',
            stages: ['Signed in', 'Preferences', 'Ready'],
        },
        {
            variant: 'routeError' as const,
            title: 'We couldn’t load this page',
            message: 'Reload the page to try again.',
            action: 'Reload page',
            graphicLabel: 'The page route is interrupted before Ready',
            stages: ['Request', 'Page', 'Ready'],
        },
        {
            variant: 'notFound' as const,
            title: 'This page isn’t on the route',
            message: 'It may have moved, or the link may be out of date.',
            action: 'View applications',
            graphicLabel: 'The requested route ends at a missing destination',
            stages: ['Job Tracker', 'This link', '404'],
        },
    ])(
        'shows a static route and recovery action for $variant',
        ({ variant, title, message, action, graphicLabel, stages }) => {
            const onAction = vi.fn();
            render(<FallbackScreen variant={variant} onAction={onAction} />);

            expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false');
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
            const route = screen.getByRole('img', { name: graphicLabel });

            expect(route).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
            expect(screen.getByText(message)).toBeInTheDocument();
            stages.forEach((stage) => expect(within(route).getByText(stage)).toBeInTheDocument());
            expect(route.querySelectorAll('[data-route-node]')).toHaveLength(3);
            expect(
                [...route.querySelectorAll('[data-route-node]')].map((node) => node.getAttribute('data-route-node'))
            ).toEqual(stages);

            fireEvent.click(screen.getByRole('button', { name: action }));
            expect(onAction).toHaveBeenCalledOnce();
        }
    );

    test('keeps only the compact Job Tracker identity above the fallback content', () => {
        render(<FallbackScreen variant='pageLoading' />);

        const brand = screen.getByLabelText('Job Tracker');

        expect(brand).toHaveTextContent('Job Tracker');
        expect(brand.querySelector('svg')).toBeInTheDocument();
        expect(brand).not.toHaveTextContent('JJob Tracker');
        expect(screen.queryByText('Page loading')).not.toBeInTheDocument();
        expect(screen.queryByText('Opening Job Tracker')).not.toBeInTheDocument();
    });

    test('supports contextual primary and secondary recovery actions', () => {
        const onPrimaryAction = vi.fn();
        const onSecondaryAction = vi.fn();

        render(
            <FallbackScreen
                actionLabel='Back to Demo'
                onAction={onPrimaryAction}
                onSecondaryAction={onSecondaryAction}
                secondaryActionLabel='Go back'
                variant='notFound'
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Back to Demo' }));
        fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

        expect(onPrimaryAction).toHaveBeenCalledOnce();
        expect(onSecondaryAction).toHaveBeenCalledOnce();
    });

    test.each(['authenticationError', 'loading', 'notFound', 'pageLoading', 'preferencesError', 'routeError'] as const)(
        'uses and restores the Job Tracker document title for %s',
        (variant) => {
            document.title = 'Previous page';
            const previousTitle = document.title;
            const { unmount } = render(<FallbackScreen variant={variant} />);

            expect(document.title).toBe('Job Tracker');

            unmount();
            expect(document.title).toBe(previousTitle);
        }
    );
});
