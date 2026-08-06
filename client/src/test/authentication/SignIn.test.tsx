import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AUTH_FOCUSED_MODE_STORAGE_KEY } from '../../components/authProductIntro/AuthProductIntro';
import SignIn from '../../pages/authentication/signIn/SignIn';
import { render } from '../renderWithProviders';
import { routes } from '../../routes';
import userEvent from '@testing-library/user-event';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual('react-router-dom')),
    useNavigate: () => mockNavigate,
}));

globalThis.fetch = vi.fn();

const openSignInPanel = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

const mockUnauthenticatedSession = (signInResponse: object) => {
    globalThis.fetch.mockImplementation(async (url: string) => {
        if (url.endsWith('/authentication/sessions/current') || url.endsWith('/authentication/sessions/refresh')) {
            return {
                ok: false,
                status: 401,
            };
        }

        return signInResponse;
    });
};

describe('User sign in flow', () => {
    beforeEach(() => {
        fetch.mockReset();
        fetch.mockResolvedValue({
            headers: new Headers(),
            ok: true,
            status: 200,
            statusText: '',
            url: '',
            json: async () => ({}),
            text: async () => '',
        });
        mockNavigate.mockReset();
        localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
        localStorage.removeItem('theme');
    });

    afterEach(() => {
        localStorage.removeItem(AUTH_FOCUSED_MODE_STORAGE_KEY);
        localStorage.removeItem('theme');
    });

    test('signs in successfully and redirects to /application/add page', async () => {
        mockUnauthenticatedSession({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Successfully signed in' }),
        });

        render(
            <MemoryRouter>
                <SignIn />
            </MemoryRouter>
        );

        await openSignInPanel();
        userEvent.type(screen.getByLabelText(/email/i), 'starboy98@hotmail.com');
        userEvent.type(screen.getByLabelText(/^password$/i), '123456');
        userEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'starboy98@hotmail.com', password: '123456' }),
            })
        );

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/application/add'));
    });

    test('shows the generic authentication error when the account does not exist', async () => {
        mockUnauthenticatedSession({
            ok: false,
            status: 401,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Invalid email or password.' }),
        });

        render(
            <MemoryRouter>
                <SignIn />
            </MemoryRouter>
        );

        await openSignInPanel();
        userEvent.type(screen.getByLabelText(/email/i), 'starboy98@hotmail.com');
        userEvent.type(screen.getByLabelText(/^password$/i), '123456');
        userEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'starboy98@hotmail.com', password: '123456' }),
            })
        );

        await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeInTheDocument());
        expect(screen.getByRole('button', { name: /back to product/i })).toBeInTheDocument();
        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBe('true');
    });

    test('shows the same generic authentication error for an incorrect password', async () => {
        mockUnauthenticatedSession({
            ok: false,
            status: 401,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Invalid email or password.' }),
        });

        render(
            <MemoryRouter>
                <SignIn />
            </MemoryRouter>
        );

        await openSignInPanel();
        userEvent.type(screen.getByLabelText(/email/i), 'starboy98@hotmail.com');
        userEvent.type(screen.getByLabelText(/^password$/i), '123456');
        userEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/authentication/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'starboy98@hotmail.com', password: '123456' }),
            })
        );

        await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeInTheDocument());
    });

    test('links user to sign up page', async () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SignIn />
            </MemoryRouter>
        );

        await openSignInPanel();
        expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/sign-up');
    });

    test('displays the product introduction with sign-in account access closed', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SignIn />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /your job search\. one clear view\./i })).toBeInTheDocument();
        expect(screen.getByText(/keep applications, interviews and offers in one place/i)).toBeInTheDocument();
        expect(
            screen.getByRole('img', {
                name: /job tracker dashboard showing application, interview and priority statistics/i,
            })
        ).toHaveAttribute('src', expect.stringContaining('light-dashboard.webp'));
        expect(screen.getAllByRole('tab')).toHaveLength(4);
        expect(screen.queryByText(/jobtracker\.weihungloh\.com/)).not.toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /explore demo/i })).toHaveLength(1);
        expect(screen.getByRole('link', { name: /explore demo/i })).toHaveAttribute(
            'href',
            routes.demoViewApplications
        );
        expect(screen.getByRole('link', { name: /see how it works/i })).toHaveAttribute('href', '/user-guide');
        expect(screen.queryByRole('button', { name: /back to product/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
        expect(document.querySelector('#auth-account-panel')).toHaveAttribute('inert');
    });

    test('selects each primary product preview from the feature tabs', async () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SignIn />
            </MemoryRouter>
        );

        const previews = [
            ['Applications', 'light-list-applications.webp'],
            ['Interviews', 'light-list-interview.webp'],
            ['Offer Comparison', 'light-offer-comparison.webp'],
        ];

        for (const [label, image] of previews) {
            userEvent.click(screen.getByRole('tab', { name: label }));
            await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining(image)));
            await waitFor(() =>
                expect(document.querySelector('[data-preview-layer="outgoing"]')?.className).toContain(
                    'previewLayerOutgoing'
                )
            );
            fireEvent.transitionEnd(document.querySelector('[data-preview-layer="incoming"]') as HTMLElement);
        }
    });

    test('supports left and right keyboard navigation in the feature tabs', async () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SignIn />
            </MemoryRouter>
        );

        const dashboardTab = screen.getByRole('tab', { name: 'Dashboard' });
        dashboardTab.focus();
        fireEvent.keyDown(dashboardTab, { key: 'ArrowRight' });
        await waitFor(() =>
            expect(screen.getByRole('tab', { name: 'Applications' })).toHaveAttribute('aria-selected', 'true')
        );
        await waitFor(() =>
            expect(document.querySelector('[data-preview-layer="outgoing"]')?.className).toContain(
                'previewLayerOutgoing'
            )
        );
        fireEvent.transitionEnd(document.querySelector('[data-preview-layer="incoming"]') as HTMLElement);

        fireEvent.keyDown(screen.getByRole('tab', { name: 'Applications' }), { key: 'ArrowLeft' });
        await waitFor(() => expect(dashboardTab).toHaveAttribute('aria-selected', 'true'));
    });

    test('uses dark preview images in dark mode', async () => {
        localStorage.setItem('theme', 'dark');

        render(
            <MemoryRouter initialEntries={['/']}>
                <SignIn />
            </MemoryRouter>
        );

        expect(
            screen.getByRole('img', {
                name: /job tracker dashboard showing application, interview and priority statistics/i,
            })
        ).toHaveAttribute('src', expect.stringContaining('dark-dashboard.webp'));

        userEvent.click(screen.getByRole('tab', { name: 'Applications' }));
        await waitFor(() =>
            expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('dark-list-applications.webp'))
        );
    });

    test('keeps carousel navigation available in fullscreen and supports both close methods', async () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SignIn />
            </MemoryRouter>
        );

        const imageButton = screen.getByRole('button', { name: /open dashboard screenshot in fullscreen/i });
        userEvent.click(imageButton);

        const dialog = screen.getByRole('dialog', { name: /dashboard screenshot viewer/i });
        expect(document.body).toHaveStyle({ overflow: 'hidden' });
        expect(document.documentElement).toHaveStyle({ overflow: 'hidden' });
        expect(within(dialog).getByRole('button', { name: /close fullscreen preview/i })).toHaveFocus();

        userEvent.click(within(dialog).getByRole('button', { name: /next screenshot/i }));
        const applicationsDialog = await screen.findByRole('dialog', { name: /applications screenshot viewer/i });
        fireEvent.load(within(applicationsDialog).getByRole('img'));
        fireEvent.transitionEnd(applicationsDialog.querySelector('[data-preview-track="fullscreen"]') as HTMLElement);

        userEvent.click(screen.getByRole('button', { name: /show interviews/i }));
        expect(await screen.findByRole('dialog', { name: /interviews screenshot viewer/i })).toBeInTheDocument();

        userEvent.click(screen.getByRole('button', { name: /close fullscreen preview/i }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(imageButton).toHaveFocus());
        expect(screen.getAllByRole('tab')).toHaveLength(4);
        expect(document.body).not.toHaveStyle({ overflow: 'hidden' });

        userEvent.click(imageButton);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('opens account access from the Sign in stage trigger', async () => {
        render(
            <MemoryRouter>
                <SignIn />
            </MemoryRouter>
        );

        await openSignInPanel();

        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBe('true');
        expect(document.querySelector('[aria-labelledby="auth-product-heading"]')).toHaveAttribute(
            'aria-hidden',
            'true'
        );
        expect(screen.getByRole('heading', { name: /sign in to job tracker/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back to product/i })).toBeInTheDocument();
    });

    test('restores the overview without clearing entered sign-in details', async () => {
        render(
            <MemoryRouter>
                <SignIn />
            </MemoryRouter>
        );

        await openSignInPanel();
        const emailInput = screen.getByLabelText('Email', { exact: true });
        const passwordInput = screen.getByLabelText('Password', { exact: true });
        userEvent.type(emailInput, 'user@example.com');
        userEvent.type(passwordInput, 'saved password');
        userEvent.click(screen.getByRole('button', { name: /show password/i }));

        expect(screen.getByRole('button', { name: /back to product/i })).toBeInTheDocument();
        userEvent.click(screen.getByRole('button', { name: /back to product/i }));

        expect(localStorage.getItem(AUTH_FOCUSED_MODE_STORAGE_KEY)).toBeNull();
        expect(screen.getByRole('heading', { name: /your job search\. one clear view\./i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /explore demo/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /see how it works/i })).toBeInTheDocument();
        expect(emailInput).toHaveValue('user@example.com');
        expect(passwordInput).toHaveValue('saved password');
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(screen.queryByRole('button', { name: /back to product/i })).not.toBeInTheDocument();
    });

    test('restores focused mode immediately from localStorage', () => {
        localStorage.setItem(AUTH_FOCUSED_MODE_STORAGE_KEY, 'true');

        render(
            <MemoryRouter>
                <SignIn />
            </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /back to product/i })).toBeInTheDocument();
        expect(document.querySelector('#auth-account-panel')).not.toHaveAttribute('inert');
        expect(document.querySelector('[aria-labelledby="auth-product-heading"]')).toHaveAttribute(
            'aria-hidden',
            'true'
        );
    });
});
