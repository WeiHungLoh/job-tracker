import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AUTH_FOCUSED_MODE_STORAGE_KEY } from '../../components/authProductIntro/AuthProductIntro';
import SignUp from '../../pages/authentication/signUp/SignUp';
import { render } from '../renderWithProviders';
import { routes } from '../../routes';
import userEvent from '@testing-library/user-event';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual('react-router-dom')),
    useNavigate: () => mockNavigate,
}));

globalThis.fetch = vi.fn();
const VALID_PASSWORD = 'correct horse battery staple';

const openSignUpPanel = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
};

const mockUnauthenticatedSession = (signUpResponse: object) => {
    globalThis.fetch.mockImplementation(async (url: string) => {
        if (url.endsWith('/authentication/sessions/current') || url.endsWith('/authentication/sessions/refresh')) {
            return {
                ok: false,
                status: 401,
            };
        }

        return signUpResponse;
    });
};

describe('User sign up flow', () => {
    beforeEach(() => {
        fetch.mockReset();
        mockNavigate.mockReset();
        localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
    });

    afterEach(() => {
        localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
    });

    test('signs up successfully and redirects to SignIn page', async () => {
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

        mockUnauthenticatedSession({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'User successfully registered',
        });

        render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        await openSignUpPanel();
        userEvent.type(screen.getByLabelText(/email/i), 'StarBoy98@Hotmail.COM');
        userEvent.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
        userEvent.click(screen.getByRole('button', { name: /sign up/i }));
        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBe('true');

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'starboy98@hotmail.com', password: VALID_PASSWORD }),
            })
        );

        await waitFor(() =>
            expect(screen.getByText('Sign up successful — redirecting you to sign-in page')).toBeInTheDocument()
        );

        expect(screen.getByLabelText(/email/i)).toBeDisabled();
        expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Back to product' })).toBeDisabled();
        const signInLink = screen.getByRole('link', { name: 'Already have an account? Sign in' });
        expect(signInLink).toHaveAttribute('aria-disabled', 'true');
        expect(signInLink).toHaveAttribute('tabindex', '-1');
        expect(fireEvent.click(signInLink)).toBe(false);

        const redirectTimerIndex = setTimeoutSpy.mock.calls.reduce(
            (latestIndex, [, delay], index) => (delay === 1500 ? index : latestIndex),
            -1
        );
        const redirectTimer = setTimeoutSpy.mock.calls[redirectTimerIndex];
        expect(redirectTimer).toBeDefined();

        const redirectToSignIn = redirectTimer?.[0];
        const redirectTimerId = setTimeoutSpy.mock.results[redirectTimerIndex]?.value;
        if (redirectTimerId !== undefined) {
            clearTimeout(redirectTimerId);
        }
        expect(redirectToSignIn).toBeTypeOf('function');
        if (typeof redirectToSignIn === 'function') {
            redirectToSignIn();
        }

        expect(mockNavigate).toHaveBeenCalledWith('/');
        setTimeoutSpy.mockRestore();
    });

    test('clears the delayed sign-in redirect when the page unmounts', async () => {
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
        const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
        mockUnauthenticatedSession({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'User successfully registered',
        });

        const { unmount } = render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        await openSignUpPanel();
        await userEvent.type(screen.getByLabelText(/email/i), 'person@example.com');
        await userEvent.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
        await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
        await screen.findByText('Sign up successful — redirecting you to sign-in page');

        const redirectTimerIndex = setTimeoutSpy.mock.calls.reduce(
            (latestIndex, [, delay], index) => (delay === 1500 ? index : latestIndex),
            -1
        );
        const redirectTimerId = setTimeoutSpy.mock.results[redirectTimerIndex]?.value;
        expect(redirectTimerId).toBeDefined();

        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalledWith(redirectTimerId);
        expect(mockNavigate).not.toHaveBeenCalledWith('/');
        setTimeoutSpy.mockRestore();
        clearTimeoutSpy.mockRestore();
    });

    test('locks account access while sign up is pending', async () => {
        let resolveSignUp: ((value: Response) => void) | undefined;

        globalThis.fetch.mockImplementation(async (url: string) => {
            if (url.endsWith('/authentication/sessions/current') || url.endsWith('/authentication/sessions/refresh')) {
                return { ok: false, status: 401 } as Response;
            }

            return new Promise<Response>((resolve) => {
                resolveSignUp = resolve;
            });
        });

        render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        await openSignUpPanel();
        await userEvent.type(screen.getByLabelText(/email/i), 'person@example.com');
        await userEvent.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
        await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

        const submitButton = await screen.findByRole('button', { name: 'Sign up' });
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveAttribute('aria-busy', 'true');

        const backToProductButton = screen.getByRole('button', { name: 'Back to product' });
        expect(backToProductButton).toBeDisabled();
        await userEvent.click(backToProductButton);
        expect(screen.getByRole('region', { name: 'Account access' })).not.toHaveAttribute('inert');

        resolveSignUp?.(
            new Response('User successfully registered', {
                headers: { 'content-type': 'text/plain' },
                status: 201,
            })
        );
    });

    test('shows an error when the account already exists', async () => {
        mockUnauthenticatedSession({
            ok: false,
            status: 409,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'An account with this email already exists.' }),
        });

        render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        await openSignUpPanel();
        userEvent.type(screen.getByLabelText(/email/i), 'starboy98@hotmail.com');
        userEvent.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
        userEvent.click(screen.getByRole('button', { name: /sign up/i }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'starboy98@hotmail.com', password: VALID_PASSWORD }),
            })
        );

        await waitFor(() => expect(screen.getByText('An account with this email already exists')).toBeInTheDocument());
        expect(mockNavigate).not.toHaveBeenCalledWith('/');
    });

    test('links user to sign in page', async () => {
        render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        await openSignUpPanel();
        expect(screen.getByRole('link', { name: 'Already have an account? Sign in' })).toHaveAttribute('href', '/');
    });

    test('rejects a short password before calling the sign-up endpoint', async () => {
        mockUnauthenticatedSession({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'User successfully registered',
        });

        render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        await openSignUpPanel();
        userEvent.type(screen.getByLabelText(/email/i), 'new-user@example.com');
        userEvent.type(screen.getByLabelText(/^password$/i), 'short');
        userEvent.click(screen.getByRole('button', { name: /sign up/i }));

        await waitFor(() => expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument());
        expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/authentication/users'))).toBe(false);
        expect(screen.getByRole('button', { name: /back to product/i })).toBeInTheDocument();
    });

    test('shows a password-strength meter while entering a password', async () => {
        mockUnauthenticatedSession({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'User successfully registered',
        });

        render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        await openSignUpPanel();
        const passwordInput = screen.getByLabelText(/^password$/i);
        const unicodePassword = `${'x'.repeat(63)}😀`;
        expect(passwordInput).toHaveAttribute('maxlength', '72');
        userEvent.type(passwordInput, unicodePassword);

        expect(passwordInput).toHaveValue(unicodePassword);
        expect(await screen.findByText(/password strength:/i)).toBeInTheDocument();
    });

    test('displays the product introduction with account access closed', () => {
        render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /your job search\. one clear view\./i })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /explore demo/i })).toHaveLength(1);
        expect(screen.getByRole('link', { name: /explore demo/i })).toHaveAttribute(
            'href',
            routes.demoViewApplications
        );
        expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
        expect(document.querySelector('#auth-account-panel')).toHaveAttribute('inert');
    });

    test('opens account access from the Create account stage trigger', async () => {
        render(
            <MemoryRouter initialEntries={['/sign-up']}>
                <SignUp />
            </MemoryRouter>
        );

        await openSignUpPanel();

        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBe('true');
        expect(document.querySelector('[aria-labelledby="auth-product-heading"]')).toHaveAttribute(
            'aria-hidden',
            'true'
        );
        expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
        expect(screen.getByText('Track your applications and interviews in one place.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back to product/i })).toBeInTheDocument();
        expect(screen.getAllByLabelText(/^password$/i)).toHaveLength(1);
        expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
    });
});
