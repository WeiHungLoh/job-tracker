import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, screen } from '@testing-library/react';
import AuthProductIntro, { AUTH_FOCUSED_MODE_STORAGE_KEY } from '../../components/authProductIntro/AuthProductIntro';
import { render } from '../renderWithProviders';
import { routes } from '../../routes';
import userEvent from '@testing-library/user-event';

globalThis.fetch = vi.fn();

const LocationProbe = () => {
    const location = useLocation();
    return <div data-testid='current-path'>{location.pathname}</div>;
};

const renderIntro = (onSubmit = vi.fn(), initialRoute = routes.signIn) => {
    render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <AuthProductIntro>
                <form onSubmit={onSubmit}>
                    <label htmlFor='email'>Email</label>
                    <input id='email' />
                    <label htmlFor='password'>Password</label>
                    <input id='password' />
                    <button type='submit'>Sign in</button>
                </form>
            </AuthProductIntro>
            <LocationProbe />
        </MemoryRouter>
    );

    return { onSubmit };
};

describe('AuthProductIntro demo action', () => {
    beforeEach(() => {
        fetch.mockReset();
        localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
    });

    test('renders the approved Demo-first story without benefit cards', () => {
        renderIntro();

        const heading = screen.getByRole('heading', { name: 'Your job search. One clear view.' });
        const description = screen.getByText(
            'Keep applications, interviews and offers in one place, so you always know what to do next.'
        );
        const demoLink = screen.getByRole('link', { name: /explore demo/i });
        const guideLink = screen.getByRole('link', { name: /see how it works/i });
        const carousel = screen.getByRole('region', { name: 'Job Tracker product preview' });

        expect(heading.compareDocumentPosition(description)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(description.compareDocumentPosition(demoLink)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(demoLink.compareDocumentPosition(carousel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(guideLink).toBeInTheDocument();
        expect(
            screen.getByText(
                'Explore Job Tracker with sample data. No account needed. The demo resets when you refresh the page.'
            )
        ).toBeInTheDocument();
        expect(screen.queryByText('See where every application stands')).not.toBeInTheDocument();
        expect(screen.queryByText('Keep interviews, notes and follow-ups together')).not.toBeInTheDocument();
    });

    test('keeps Explore Demo unique and isolated from authentication state', async () => {
        const { onSubmit } = renderIntro();

        const demoLinks = screen.getAllByRole('link', { name: /explore demo/i });
        expect(demoLinks).toHaveLength(1);
        expect(demoLinks[0]).toHaveAttribute('href', routes.demoViewApplications);
        expect(demoLinks[0]).toHaveAttribute('target', '_blank');
        expect(demoLinks[0]).toHaveAttribute('rel', 'noreferrer');

        await userEvent.click(demoLinks[0]);

        expect(screen.getByTestId('current-path')).toHaveTextContent(routes.signIn);
        expect(onSubmit).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBeNull();
    });

    test('keeps the user guide link in a new tab', () => {
        renderIntro();

        const guideLink = screen.getByRole('link', { name: /see how it works/i });
        expect(guideLink).toHaveAttribute('href', routes.userGuide);
        expect(guideLink).toHaveAttribute('target', '_blank');
        expect(guideLink).toHaveAttribute('rel', 'noreferrer');
    });

    test('keeps account access inert until the Sign in trigger opens it', async () => {
        vi.useFakeTimers();
        renderIntro();

        const trigger = screen.getByRole('button', { name: 'Sign in' });
        const product = screen.getByLabelText('Your job search. One clear view.', { selector: 'section' });
        const accountPanel = document.querySelector('#auth-account-panel');

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(accountPanel).toHaveAttribute('aria-hidden', 'true');
        expect(accountPanel).toHaveAttribute('inert');

        await userEvent.click(trigger);
        act(() => vi.advanceTimersByTime(559));
        expect(screen.getByLabelText('Email', { exact: true })).not.toHaveFocus();

        act(() => vi.advanceTimersByTime(1));

        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBe('true');
        expect(product).toHaveAttribute('aria-hidden', 'true');
        expect(product).toHaveAttribute('inert');
        expect(accountPanel).not.toHaveAttribute('aria-hidden');
        expect(accountPanel).not.toHaveAttribute('inert');
        expect(screen.getByLabelText('Email', { exact: true })).toHaveFocus();

        vi.useRealTimers();
    });

    test('uses Create account as the trigger on the sign-up route', () => {
        renderIntro(vi.fn(), routes.signUp);

        expect(screen.getByRole('button', { name: 'Create account' })).toHaveAttribute(
            'aria-controls',
            'auth-account-panel'
        );
    });

    test('closes account access without clearing values and returns focus to the trigger', async () => {
        renderIntro();

        const trigger = screen.getByRole('button', { name: 'Sign in' });
        await userEvent.click(trigger);

        const email = screen.getByLabelText('Email', { exact: true });
        await userEvent.type(email, 'user@example.com');
        await userEvent.click(screen.getByRole('button', { name: 'Back to product' }));

        expect(email).toHaveValue('user@example.com');
        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBeNull();
        expect(trigger).toHaveFocus();
        expect(document.querySelector('#auth-account-panel')).toHaveAttribute('inert');
    });

    test('closes account access with Escape', async () => {
        renderIntro();

        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
        await userEvent.keyboard('{Escape}');

        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBeNull();
        expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('aria-expanded', 'false');
    });

    test('restores an open drawer from storage without forcing focus', () => {
        localStorage.setItem(AUTH_FOCUSED_MODE_STORAGE_KEY, 'true');
        renderIntro();

        expect(document.querySelector('#auth-account-panel')).not.toHaveAttribute('inert');
        expect(screen.getByLabelText('Email', { exact: true })).not.toHaveFocus();
    });
});
