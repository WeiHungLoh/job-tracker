import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import AddInterview from '../../../pages/interview/jobInterview/addInterview/AddInterview';
import ViewApplication from '../../../pages/application/jobApplication/viewApplication/ViewApplication';
import { render as renderWithToast } from '../../renderWithProviders';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from 'material-ui-confirm';
import { defaultConfirmOptions } from '../../../components/confirmation/defaultConfirmOptions';

globalThis.fetch = vi.fn();

vi.mock('../../../hooks/useUnsavedChangesBlocker', () => ({
    useUnsavedChangesBlocker: vi.fn(),
}));

const mockApplication = {
    job_id: 1,
    company_name: 'IRAS',
    job_title: 'Data Engineer',
};

const schedulingConflict = {
    interview_id: 51,
    job_id: 2,
    company_name: 'Grab',
    job_title: 'Software Engineer',
    interview_date: new Date(2026, 6, 25, 14, 0).toISOString(),
    interview_duration_minutes: 60,
    interview_type: 'Technical Interview',
};

const conflictResponse = (
    data: unknown = {
        code: 'INTERVIEW_SCHEDULING_CONFLICT',
        message: 'This interview overlaps with an existing active interview.',
        conflicts: [schedulingConflict],
    }
) => ({
    ok: false,
    status: 409,
    statusText: 'Conflict',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
});

const offerDeadlineWarningResponse = (
    data: unknown = {
        code: 'INTERVIEW_OFFER_DEADLINE_WARNING',
        message: 'This interview may finish after an active offer deadline.',
        warnings: [
            {
                job_id: 3,
                company_name: 'Stripe',
                job_title: 'Platform Engineer',
                decision_deadline: new Date(2026, 6, 25, 15, 0).toISOString(),
            },
        ],
    }
) => conflictResponse(data);

const successResponse = () => ({
    ok: true,
    status: 201,
    headers: new Headers({ 'content-type': 'text/plain' }),
    text: async () => 'Successfully added an interview!',
});

const render = (ui: ReactNode) =>
    renderWithToast(<ConfirmProvider defaultOptions={defaultConfirmOptions}>{ui}</ConfirmProvider>);

const fillCompleteInterviewForm = () => {
    fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2026-07-25T14:30' } });
    fireEvent.change(screen.getByLabelText('Duration (minutes)'), { target: { value: '90' } });
    userEvent.type(screen.getByLabelText('Interview Location'), '  Zoom  ');
    userEvent.type(screen.getByLabelText('Interview Type (optional)'), '  Panel  ');
    userEvent.type(screen.getByLabelText('Additional Notes (optional)'), '  Prepare examples.  ');
};

const expectCompleteInterviewFormValues = () => {
    expect(screen.getByLabelText('Interview Date')).toHaveValue('2026-07-25T14:30');
    expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(90);
    expect(screen.getByLabelText('Interview Location')).toHaveValue('  Zoom  ');
    expect(screen.getByLabelText('Interview Type (optional)')).toHaveValue('  Panel  ');
    expect(screen.getByLabelText('Additional Notes (optional)')).toHaveValue('  Prepare examples.  ');
};

describe('AddInterview page', () => {
    beforeEach(() => {
        fetch.mockReset();
    });

    test('renders correctly when state is passed', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'Successfully added an interview!',
        });

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                    <Route path='/application/view' element={<ViewApplication />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/you are adding an interview for/i)).toBeInTheDocument();
        expect(screen.getByText(/iras/i)).toBeInTheDocument();
        expect(screen.getByText(/data engineer/i)).toBeInTheDocument();
        expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);
        expect(screen.getByLabelText('Duration (minutes)')).toHaveAttribute('min', '1');
        expect(screen.getByLabelText('Duration (minutes)')).toHaveAttribute('max', '1440');
        expect(screen.getByLabelText('Duration (minutes)')).toHaveAttribute('step', '1');
        expect(screen.getByLabelText('Additional Notes (optional)').tagName).toBe('TEXTAREA');
        expect(screen.getByLabelText('Additional Notes (optional)')).toHaveAttribute('maxlength', '3000');
        expect(screen.getByLabelText('Meeting URL (optional)')).toHaveAttribute('maxlength', '2048');

        fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2025-08-03T14:30' } });
        fireEvent.change(screen.getByLabelText('Duration (minutes)'), { target: { value: '90' } });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom');
        userEvent.type(screen.getByLabelText('Interview Type (optional)'), 'HR');
        userEvent.type(screen.getByLabelText('Meeting URL (optional)'), 'https://meet.example.com/room');
        userEvent.type(screen.getByLabelText('Additional Notes (optional)'), '2nd round');
        userEvent.click(screen.getByTestId('add-interview'));

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
            interviewDate: new Date(2025, 7, 3, 14, 30).toISOString(),
            interviewDurationMinutes: 90,
            interviewLocation: 'Zoom',
            interviewType: 'HR',
            jobId: 1,
            meetingURL: 'https://meet.example.com/room',
            notes: '2nd round',
        });
        await waitFor(() => {
            expect(screen.getByLabelText('Interview Date')).toHaveValue('');
            expect(screen.getByLabelText('Interview Location')).toHaveValue('');
            expect(screen.getByLabelText('Interview Type (optional)')).toHaveValue('');
            expect(screen.getByLabelText('Meeting URL (optional)')).toHaveValue('');
            expect(screen.getByLabelText('Additional Notes (optional)')).toHaveValue('');
            expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);
        });
    });

    test('rejects a meeting URL without a valid suffix and focuses the field', async () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2025-08-03T14:30' } });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom');
        userEvent.type(screen.getByLabelText('Meeting URL (optional)'), 'https://meeting');
        userEvent.click(screen.getByTestId('add-interview'));

        const error = await screen.findByText('URL must be in a valid format.');
        const meetingURLInput = screen.getByLabelText('Meeting URL (optional)');
        expect(meetingURLInput).toHaveAttribute('aria-invalid', 'true');
        expect(meetingURLInput).toHaveAttribute('aria-describedby', error.id);
        expect(document.activeElement).toBe(meetingURLInput);
        expect(fetch).not.toHaveBeenCalled();
    });

    test('submits once when Enter is pressed in a form field', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'Successfully added an interview!',
        });

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2025-08-03T14:30' } });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom{enter}');

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    });

    test('keeps Enter as a notes newline and submits once with Shift+Enter', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'Successfully added an interview!',
        });

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2025-08-03T14:30' } });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom');
        const notes = screen.getByLabelText('Additional Notes (optional)');
        await userEvent.type(notes, 'First line{enter}Second line');
        expect(notes).toHaveValue('First line\nSecond line');
        expect(fetch).not.toHaveBeenCalled();

        fireEvent.keyDown(notes, { key: 'Enter', shiftKey: true });

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).notes).toBe('First line\nSecond line');
    });

    test('View Interviews and Back do not submit the form', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                    <Route path='/interview/view' element={<p>Interviews</p>} />
                </Routes>
            </MemoryRouter>
        );

        const viewInterviewsButton = screen.getByRole('button', { name: 'View Interviews' });
        const backButton = screen.getByRole('button', { name: 'Back' });
        expect(viewInterviewsButton).toHaveAttribute('type', 'button');
        expect(backButton).toHaveAttribute('type', 'button');
        userEvent.click(viewInterviewsButton);

        expect(fetch).not.toHaveBeenCalled();
    });

    test('shows separate accessible required errors and focuses the interview date first', async () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        const dateInput = screen.getByLabelText('Interview Date');
        const scrollIntoView = vi.fn();
        dateInput.scrollIntoView = scrollIntoView;
        userEvent.click(screen.getByTestId('add-interview'));

        const locationInput = screen.getByLabelText('Interview Location');
        const dateError = await screen.findByText('Please enter an interview date.');
        const locationError = screen.getByText('Please enter an interview location.');
        expect(dateInput).toHaveAttribute('aria-invalid', 'true');
        expect(dateInput).toHaveAttribute('aria-describedby', dateError.id);
        expect(dateError).toHaveAttribute('role', 'alert');
        expect(locationInput).toHaveAttribute('aria-invalid', 'true');
        expect(locationInput).toHaveAttribute('aria-describedby', locationError.id);
        expect(document.activeElement).toBe(dateInput);
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('clears only the edited interview error and preserves values after client validation fails', async () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        userEvent.type(screen.getByLabelText('Interview Type (optional)'), 'Technical');
        userEvent.click(screen.getByTestId('add-interview'));
        await screen.findByText('Please enter an interview date.');

        const dateInput = screen.getByLabelText('Interview Date');
        fireEvent.change(dateInput, { target: { value: '2025-08-03T14:30' } });

        expect(screen.queryByText('Please enter an interview date.')).not.toBeInTheDocument();
        expect(screen.getByText('Please enter an interview location.')).toBeInTheDocument();
        expect(dateInput).not.toHaveAttribute('aria-invalid');
        expect(dateInput).not.toHaveAttribute('aria-describedby');
        expect(dateInput).toHaveValue('2025-08-03T14:30');
        expect(screen.getByLabelText('Interview Type (optional)')).toHaveValue('Technical');
    });

    test('rejects a whitespace-only interview location', async () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2025-08-03T14:30' } });
        userEvent.type(screen.getByLabelText('Interview Location'), '   ');
        userEvent.click(screen.getByTestId('add-interview'));

        const locationError = await screen.findByText('Please enter an interview location.');
        const locationInput = screen.getByLabelText('Interview Location');
        expect(locationInput).toHaveAttribute('aria-describedby', locationError.id);
        expect(document.activeElement).toBe(locationInput);
        expect(fetch).not.toHaveBeenCalled();
    });

    test('shows the duration range error for an invalid duration', async () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2025-08-03T14:30' } });
        fireEvent.change(screen.getByLabelText('Duration (minutes)'), { target: { value: '1441' } });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom');
        userEvent.click(screen.getByTestId('add-interview'));

        await waitFor(() =>
            expect(screen.getByText('Please enter a duration between 1 and 1440 minutes')).toBeInTheDocument()
        );
        const durationInput = screen.getByLabelText('Duration (minutes)');
        const durationError = screen.getByText('Please enter a duration between 1 and 1440 minutes');
        expect(durationInput).toHaveAttribute('aria-invalid', 'true');
        expect(durationInput).toHaveAttribute('aria-describedby', durationError.id);
        expect(document.activeElement).toBe(durationInput);
        expect(fetch).not.toHaveBeenCalled();
    });

    test('does not submit an interview date equal to the job application date', async () => {
        const mockApp = {
            ...mockApplication,
            application_date: '2025-08-03T14:30:00',
        };

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApp } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), {
            target: { value: '2025-08-03T14:30' },
        });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom');
        userEvent.click(screen.getByTestId('add-interview'));

        await waitFor(() =>
            expect(screen.getByText('Interview date must be after the application date.')).toBeInTheDocument()
        );
        expect(document.activeElement).toBe(screen.getByLabelText('Interview Date'));
        expect(fetch).not.toHaveBeenCalled();
    });

    test('does not submit an interview date with a year above 9999', async () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), {
            target: { value: '20300-03-30T00:00' },
        });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom');
        userEvent.click(screen.getByTestId('add-interview'));

        await waitFor(() => expect(screen.getByText('Please enter a valid interview date.')).toBeInTheDocument());
        expect(fetch).not.toHaveBeenCalled();
    });

    test('trims interview text inputs before submitting them', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'Successfully added an interview!',
        });

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2025-08-03T14:30' } });
        userEvent.type(screen.getByLabelText('Interview Location'), '  Zoom  ');
        userEvent.type(screen.getByLabelText('Interview Type (optional)'), '  HR  ');
        userEvent.type(screen.getByLabelText('Additional Notes (optional)'), '   ');
        userEvent.click(screen.getByTestId('add-interview'));

        await waitFor(() => expect(fetch).toHaveBeenCalled());

        const request = fetch.mock.calls[0][1] as RequestInit;
        expect(JSON.parse(request.body as string)).toMatchObject({
            interviewLocation: 'Zoom',
            interviewType: 'HR',
            notes: '',
        });
    });

    test('applies maximum lengths to interview text inputs', () => {
        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByLabelText('Interview Location')).toHaveAttribute('maxlength', '200');
        expect(screen.getByLabelText('Interview Type (optional)')).toHaveAttribute('maxlength', '100');
        expect(screen.getByLabelText('Additional Notes (optional)')).toHaveAttribute('maxlength', '3000');
        expect(screen.getByLabelText('Interview Date')).toHaveAttribute('max', '9999-12-31T23:59');
    });

    test('preserves form contents after a backend error', async () => {
        fetch.mockResolvedValueOnce({
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Interview fields are invalid.' }),
            ok: false,
            status: 422,
            statusText: 'Unprocessable Entity',
        });

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), {
            target: { value: '2025-08-03T14:30' },
        });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom');
        userEvent.type(screen.getByLabelText('Interview Type (optional)'), 'Technical');
        userEvent.click(screen.getByTestId('add-interview'));

        await waitFor(() => expect(screen.getByText('Interview fields are invalid.')).toBeInTheDocument());
        expect(screen.getByLabelText('Interview Date')).toHaveValue('2025-08-03T14:30');
        expect(screen.getByLabelText('Interview Location')).toHaveValue('Zoom');
        expect(screen.getByLabelText('Interview Type (optional)')).toHaveValue('Technical');
    });

    test('opens the scheduling-conflict dialog without showing an error toast', async () => {
        fetch.mockResolvedValueOnce(conflictResponse());

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        userEvent.click(screen.getByTestId('add-interview'));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: 'Possible Scheduling Conflict' })).toBeInTheDocument();
        expect(dialog).toHaveTextContent('Technical Interview for Software Engineer at Grab');
        expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Add Anyway' })).toBeInTheDocument();
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    test('opens the offer-deadline dialog without showing an error toast', async () => {
        fetch.mockResolvedValueOnce(offerDeadlineWarningResponse());

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        userEvent.click(screen.getByTestId('add-interview'));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: 'Offer Deadline Warning' })).toBeInTheDocument();
        expect(dialog).toHaveTextContent('Platform Engineer at Stripe');
        expect(dialog).toHaveTextContent('You may want to ask for more time');
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    test('cancels an offer deadline warning without retrying or changing form values', async () => {
        fetch.mockResolvedValueOnce(offerDeadlineWarningResponse());

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        userEvent.click(screen.getByTestId('add-interview'));
        const dialog = await screen.findByRole('dialog', { name: 'Offer Deadline Warning' });
        userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(fetch).toHaveBeenCalledTimes(1);
        expectCompleteInterviewFormValues();
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    test('handles a scheduling conflict and offer deadline warning before creating once', async () => {
        fetch
            .mockResolvedValueOnce(conflictResponse())
            .mockResolvedValueOnce(offerDeadlineWarningResponse())
            .mockResolvedValueOnce(successResponse());

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        userEvent.click(screen.getByTestId('add-interview'));
        userEvent.click(await screen.findByRole('button', { name: 'Add Anyway' }));
        const offerDeadlineDialog = await screen.findByRole('dialog', { name: 'Offer Deadline Warning' });
        userEvent.click(within(offerDeadlineDialog).getByRole('button', { name: 'Add Anyway' }));

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
        const schedulingRetry = JSON.parse((fetch.mock.calls[1][1] as RequestInit).body as string);
        const deadlineRetry = JSON.parse((fetch.mock.calls[2][1] as RequestInit).body as string);
        expect(schedulingRetry).toMatchObject({ allowSchedulingConflict: true });
        expect(schedulingRetry).not.toHaveProperty('allowOfferDeadlineWarning');
        expect(deadlineRetry).toMatchObject({
            allowSchedulingConflict: true,
            allowOfferDeadlineWarning: true,
        });
        expect(await screen.findByText('Successfully added an interview!')).toBeInTheDocument();
        expect(screen.getAllByTestId('toast')).toHaveLength(1);
    });

    test('accepts a past interview response without opening the scheduling-conflict dialog', async () => {
        fetch.mockResolvedValueOnce(successResponse());

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Interview Date'), { target: { value: '2025-08-03T14:30' } });
        userEvent.type(screen.getByLabelText('Interview Location'), 'Zoom');
        userEvent.click(screen.getByTestId('add-interview'));

        expect(await screen.findByText('Successfully added an interview!')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('cancels a conflict without retrying or changing form values', async () => {
        fetch.mockResolvedValueOnce(conflictResponse());

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        userEvent.click(screen.getByTestId('add-interview'));
        userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(fetch).toHaveBeenCalledTimes(1);
        expectCompleteInterviewFormValues();
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    test('adds anyway with the exact normalized request, then succeeds and resets once', async () => {
        fetch.mockResolvedValueOnce(conflictResponse()).mockResolvedValueOnce(successResponse());

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        userEvent.click(screen.getByTestId('add-interview'));
        userEvent.click(await screen.findByRole('button', { name: 'Add Anyway' }));

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        const firstRequest = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string);
        const confirmedRequest = JSON.parse((fetch.mock.calls[1][1] as RequestInit).body as string);
        const { allowSchedulingConflict, ...confirmedRequestWithoutOverride } = confirmedRequest;
        expect(firstRequest).not.toHaveProperty('allowSchedulingConflict');
        expect(allowSchedulingConflict).toBe(true);
        expect(confirmedRequestWithoutOverride).toEqual(firstRequest);
        await waitFor(() => expect(screen.getByText('Successfully added an interview!')).toBeInTheDocument());
        expect(screen.getAllByTestId('toast')).toHaveLength(1);
        expect(screen.getByLabelText('Interview Date')).toHaveValue('');
        expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);
        expect(screen.getByLabelText('Interview Location')).toHaveValue('');
        expect(screen.getByLabelText('Interview Type (optional)')).toHaveValue('');
        expect(screen.getByLabelText('Additional Notes (optional)')).toHaveValue('');
    });

    test('renders every conflict returned by the server', async () => {
        fetch.mockResolvedValueOnce(
            conflictResponse({
                code: 'INTERVIEW_SCHEDULING_CONFLICT',
                message: 'This interview overlaps with existing active interviews.',
                conflicts: [
                    schedulingConflict,
                    {
                        ...schedulingConflict,
                        interview_id: 52,
                        company_name: 'Stripe',
                        job_title: 'Platform Engineer',
                    },
                ],
            })
        );

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        userEvent.click(screen.getByTestId('add-interview'));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
        expect(dialog).toHaveTextContent('Grab');
        expect(dialog).toHaveTextContent('Stripe');
    });

    test('handles a malformed scheduling conflict through the normal error-toast path', async () => {
        fetch.mockResolvedValueOnce(
            conflictResponse({
                code: 'INTERVIEW_SCHEDULING_CONFLICT',
                message: 'Malformed conflict response',
                conflicts: [{ ...schedulingConflict, interview_date: 'invalid' }],
            })
        );

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        userEvent.click(screen.getByTestId('add-interview'));

        expect(await screen.findByText('Malformed conflict response')).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expectCompleteInterviewFormValues();
    });

    test('prevents duplicate submissions while the initial request and override retry are pending', async () => {
        let resolveInitialRequest: (response: ReturnType<typeof conflictResponse>) => void = () => undefined;
        let resolveRetry: (response: ReturnType<typeof successResponse>) => void = () => undefined;
        const initialRequest = new Promise<ReturnType<typeof conflictResponse>>((resolve) => {
            resolveInitialRequest = resolve;
        });
        const retry = new Promise<ReturnType<typeof successResponse>>((resolve) => {
            resolveRetry = resolve;
        });
        fetch.mockReturnValueOnce(initialRequest).mockReturnValueOnce(retry);

        render(
            <MemoryRouter initialEntries={[{ pathname: '/interview/add', state: { app: mockApplication } }]}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                </Routes>
            </MemoryRouter>
        );

        fillCompleteInterviewForm();
        const form = screen.getByTestId('add-interview').closest('form');
        expect(form).not.toBeNull();
        fireEvent.submit(form as HTMLFormElement);
        fireEvent.submit(form as HTMLFormElement);

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        expect(screen.getByTestId('add-interview')).toBeDisabled();

        resolveInitialRequest(conflictResponse());
        fireEvent.click(await screen.findByRole('button', { name: 'Add Anyway' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        fireEvent.submit(form as HTMLFormElement);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('add-interview')).toBeDisabled();

        resolveRetry(successResponse());
        await waitFor(() => expect(screen.getByText('Successfully added an interview!')).toBeInTheDocument());
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('redirects to /application/view when no state is passed', async () => {
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => [],
        });

        render(
            <MemoryRouter initialEntries={['/interview/add']}>
                <Routes>
                    <Route path='/interview/add' element={<AddInterview />} />
                    <Route path='/application/view' element={<ViewApplication />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText(/filter by/i)).toBeInTheDocument());
    });
});
