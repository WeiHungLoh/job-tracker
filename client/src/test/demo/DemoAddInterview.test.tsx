import { useEffect, useRef } from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from 'material-ui-confirm';
import { MemoryRouter } from 'react-router-dom';
import { defaultConfirmOptions } from '../../components/confirmation/defaultConfirmOptions';
import { render as renderWithToast } from '../renderWithProviders';
import DemoAddInterview from '../../pages/demo/interview/jobInterview/addInterview/DemoAddInterview';
import { DemoProvider, useDemo } from '../../pages/demo/context/DemoContext';
import type { DemoAction } from '../../pages/demo/state/demoReducer';
import type { JobApplication } from '../../pages/application/models';

vi.mock('../../hooks/useUnsavedChangesBlocker', () => ({
    useUnsavedChangesBlocker: vi.fn(),
}));

const targetApplication: JobApplication = {
    job_id: 101,
    company_name: 'HorizonAI Labs',
    job_title: 'Frontend Engineer',
    application_date: '2026-01-01T00:00:00.000Z',
    job_status: 'Applied',
    job_location: 'Singapore',
    job_posting_url: '',
    notes: '',
};

const createInterviewAction = (jobId: number, startHour = 10, startMinute = 0): DemoAction => ({
    type: 'CREATE_INTERVIEW',
    payload: {
        jobId,
        interviewDate: new Date(2030, 0, 10, startHour, startMinute),
        interviewDurationMinutes: 60,
        interviewLocation: 'Zoom',
        interviewType: 'Technical Interview',
        notes: '',
    },
});

const DemoStateHarness = ({ setupActions }: { setupActions: DemoAction[] }) => {
    const { dispatch, state } = useDemo();
    const setupAppliedRef = useRef(false);

    useEffect(() => {
        if (setupAppliedRef.current) {
            return;
        }

        setupAppliedRef.current = true;
        setupActions.forEach(dispatch);
    }, [dispatch, setupActions]);

    return (
        <>
            <output data-testid='active-interview-count' hidden>
                {state.interviews.length}
            </output>
            <output data-testid='archived-interview-count' hidden>
                {state.archivedInterviews.length}
            </output>
        </>
    );
};

const renderDemoAddInterview = (setupActions: DemoAction[] = []) =>
    renderWithToast(
        <MemoryRouter initialEntries={[{ pathname: '/demo/interview/add', state: { app: targetApplication } }]}>
            <DemoProvider>
                <ConfirmProvider defaultOptions={defaultConfirmOptions}>
                    <DemoAddInterview />
                    <DemoStateHarness setupActions={setupActions} />
                </ConfirmProvider>
            </DemoProvider>
        </MemoryRouter>
    );

const fillInterviewForm = (startHour = 10, startMinute = 30) => {
    fireEvent.change(screen.getByLabelText('Interview date'), {
        target: { value: `2030-01-10T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}` },
    });
    userEvent.type(screen.getByLabelText('Interview location'), 'Zoom');
    userEvent.type(screen.getByLabelText('Interview type (optional)'), 'Panel');
    userEvent.type(screen.getByLabelText('Additional notes (optional)'), 'Prepare examples');
};

const submitInterview = () => userEvent.click(screen.getByTestId('add-interview'));
const getActiveInterviewCount = () => Number(screen.getByTestId('active-interview-count').textContent);

describe('Demo Add Interview scheduling conflicts', () => {
    beforeEach(() => {
        vi.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test('detects a same-application conflict', async () => {
        renderDemoAddInterview([createInterviewAction(101)]);
        await waitFor(() => expect(getActiveInterviewCount()).toBeGreaterThan(0));
        const initialCount = getActiveInterviewCount();

        fillInterviewForm();
        submitInterview();

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('Technical Interview for Frontend Engineer at HorizonAI Labs');
        expect(getActiveInterviewCount()).toBe(initialCount);
    });

    test('detects a different-application conflict', async () => {
        renderDemoAddInterview([createInterviewAction(102)]);
        await waitFor(() => expect(getActiveInterviewCount()).toBeGreaterThan(0));

        fillInterviewForm();
        submitInterview();

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('Technical Interview for Full Stack Developer at ByteForge Systems');
    });

    test('Cancel preserves all values and does not dispatch', async () => {
        renderDemoAddInterview([createInterviewAction(101)]);
        await waitFor(() => expect(getActiveInterviewCount()).toBeGreaterThan(0));
        const initialCount = getActiveInterviewCount();

        fillInterviewForm();
        submitInterview();
        fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(getActiveInterviewCount()).toBe(initialCount);
        expect(screen.getByLabelText('Interview date')).toHaveValue('2030-01-10T10:30');
        expect(screen.getByLabelText('Interview location')).toHaveValue('Zoom');
        expect(screen.getByLabelText('Interview type (optional)')).toHaveValue('Panel');
        expect(screen.getByLabelText('Additional notes (optional)')).toHaveValue('Prepare examples');
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    test('keeps Enter as a notes newline and submits with Shift+Enter', async () => {
        renderDemoAddInterview();
        const initialCount = getActiveInterviewCount();
        fireEvent.change(screen.getByLabelText('Interview date'), { target: { value: '2031-01-10T10:30' } });
        userEvent.type(screen.getByLabelText('Interview location'), 'Zoom');
        const notes = screen.getByLabelText('Additional notes (optional)');
        await userEvent.type(notes, 'First line{enter}Second line');

        expect(notes).toHaveValue('First line\nSecond line');
        expect(getActiveInterviewCount()).toBe(initialCount);

        fireEvent.keyDown(notes, { key: 'Enter', shiftKey: true });

        const warningDialog = await screen.findByRole('dialog', { name: 'Offer deadline warning' });
        fireEvent.click(within(warningDialog).getByRole('button', { name: 'Add anyway' }));
        await waitFor(() => expect(getActiveInterviewCount()).toBe(initialCount + 1));
    });

    test('confirming both warnings dispatches once, shows success once, and resets once', async () => {
        renderDemoAddInterview([createInterviewAction(101)]);
        await waitFor(() => expect(getActiveInterviewCount()).toBeGreaterThan(0));
        const initialCount = getActiveInterviewCount();

        fillInterviewForm();
        submitInterview();
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('button', { name: 'Add anyway' })).toHaveFocus();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Add anyway' }));
        const deadlineDialog = await screen.findByRole('dialog', { name: 'Offer deadline warning' });
        fireEvent.click(within(deadlineDialog).getByRole('button', { name: 'Add anyway' }));

        await waitFor(() => expect(getActiveInterviewCount()).toBe(initialCount + 1));
        expect(screen.getAllByTestId('toast')).toHaveLength(1);
        expect(screen.getByText('Successfully added an interview')).toBeInTheDocument();
        expect(screen.getByLabelText('Interview date')).toHaveValue('');
        expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);
        expect(screen.getByLabelText('Interview location')).toHaveValue('');
        expect(screen.getByLabelText('Interview type (optional)')).toHaveValue('');
        expect(screen.getByLabelText('Additional notes (optional)')).toHaveValue('');
    });

    test('allows a boundary-touching interview after only the offer deadline warning', async () => {
        renderDemoAddInterview([createInterviewAction(101)]);
        await waitFor(() => expect(getActiveInterviewCount()).toBeGreaterThan(0));
        const initialCount = getActiveInterviewCount();

        fillInterviewForm(11, 0);
        submitInterview();
        const deadlineDialog = await screen.findByRole('dialog', { name: 'Offer deadline warning' });
        fireEvent.click(within(deadlineDialog).getByRole('button', { name: 'Add anyway' }));

        await waitFor(() => expect(getActiveInterviewCount()).toBe(initialCount + 1));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    test('ignores interviews moved to the archived demo collection', async () => {
        renderDemoAddInterview([createInterviewAction(102), { type: 'ARCHIVE_APPLICATION', payload: { jobId: 102 } }]);
        await waitFor(() => expect(screen.getByTestId('archived-interview-count')).not.toHaveTextContent('0'));
        const initialCount = getActiveInterviewCount();

        fillInterviewForm();
        submitInterview();
        const deadlineDialog = await screen.findByRole('dialog', { name: 'Offer deadline warning' });
        fireEvent.click(within(deadlineDialog).getByRole('button', { name: 'Add anyway' }));

        await waitFor(() => expect(getActiveInterviewCount()).toBe(initialCount + 1));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    test('adds a past overlapping interview normally using a fixed current time', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2030, 0, 10, 12, 0));
        renderDemoAddInterview([createInterviewAction(101)]);
        const initialCount = getActiveInterviewCount();

        fillInterviewForm();
        submitInterview();
        await act(async () => undefined);

        expect(getActiveInterviewCount()).toBe(initialCount + 1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('Successfully added an interview')).toBeInTheDocument();
    });

    test('uses the same ordered numbering as production for multiple future conflicts', async () => {
        renderDemoAddInterview([createInterviewAction(101), createInterviewAction(102, 10, 15)]);
        await waitFor(() => expect(getActiveInterviewCount()).toBeGreaterThan(1));

        fillInterviewForm();
        submitInterview();

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('list').tagName).toBe('OL');
        expect(
            within(dialog)
                .getAllByRole('listitem')
                .map((item) => item.textContent)
        ).toEqual([expect.stringMatching(/^1\) /), expect.stringMatching(/^2\) /)]);
    });

    test('warns about active demo offer deadlines and adds only after confirmation', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2030, 0, 1, 9, 0));
        renderDemoAddInterview();
        const initialCount = getActiveInterviewCount();

        fillInterviewForm();
        submitInterview();
        await act(async () => undefined);
        const schedulingDialog = screen.getByRole('dialog', { name: 'Possible scheduling conflict' });
        fireEvent.click(within(schedulingDialog).getByRole('button', { name: 'Add anyway' }));
        await act(async () => undefined);

        const dialog = screen.getByRole('dialog', { name: 'Offer deadline warning' });
        expect(dialog).toHaveTextContent('these active offers');
        expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
        expect(getActiveInterviewCount()).toBe(initialCount);

        fireEvent.click(within(dialog).getByRole('button', { name: 'Add anyway' }));
        await act(async () => undefined);

        expect(getActiveInterviewCount()).toBe(initialCount + 1);
        expect(screen.getAllByTestId('toast')).toHaveLength(1);
    });
});
