import { useEffect, useRef } from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from 'material-ui-confirm';
import { MemoryRouter } from 'react-router-dom';
import { defaultConfirmOptions } from '../../components/confirmation/defaultConfirmOptions';
import { render as renderWithToast } from '../renderWithProviders';
import DemoAddApplication from '../../pages/demo/application/jobApplication/addApplication/DemoAddApplication';
import { DemoProvider, useDemo } from '../../pages/demo/context/DemoContext';
import type { DemoAction } from '../../pages/demo/state/demoReducer';
import formatDate from '../../helper/dateFormatter';

vi.mock('../../hooks/useUnsavedChangesBlocker', () => ({
    useUnsavedChangesBlocker: vi.fn(),
}));

const ACTIVE_DUPLICATE_ACTION: DemoAction = {
    type: 'CREATE_APPLICATION',
    payload: {
        applicationDate: new Date('2026-03-03T02:30:00.000Z'),
        companyName: 'Morgan Stanley',
        jobLocation: 'Singapore',
        jobStatus: 'Applied',
        jobTitle: 'Software Engineer',
        jobURL: '',
    },
};

const URL_DUPLICATE_ACTION: DemoAction = {
    type: 'CREATE_APPLICATION',
    payload: {
        applicationDate: new Date('2026-02-14T04:15:00.000Z'),
        companyName: 'URL Seed Company',
        jobLocation: 'Remote',
        jobStatus: 'Applied',
        jobTitle: 'Original URL Role',
        jobURL: 'https://jobs.example.com/roles/seeded',
    },
};

const DemoStateHarness = ({ setupAction }: { setupAction?: DemoAction }) => {
    const { dispatch, state } = useDemo();
    const setupAppliedRef = useRef(false);

    useEffect(() => {
        if (!setupAction || setupAppliedRef.current) {
            return;
        }

        setupAppliedRef.current = true;
        dispatch(setupAction);
    }, [dispatch, setupAction]);

    const latestApplication = state.applications[state.applications.length - 1];

    return (
        <>
            <output data-testid='active-application-count' hidden>
                {state.applications.length}
            </output>
            <output data-testid='archived-application-count' hidden>
                {state.archivedApplications.length}
            </output>
            <output data-testid='latest-application-company' hidden>
                {latestApplication?.company_name ?? ''}
            </output>
            <output data-testid='latest-application-title' hidden>
                {latestApplication?.job_title ?? ''}
            </output>
            <output data-testid='latest-application-url' hidden>
                {latestApplication?.job_posting_url ?? ''}
            </output>
        </>
    );
};

const renderDemoAddApplication = (setupAction?: DemoAction) =>
    renderWithToast(
        <MemoryRouter>
            <DemoProvider>
                <ConfirmProvider defaultOptions={defaultConfirmOptions}>
                    <DemoAddApplication />
                    <DemoStateHarness setupAction={setupAction} />
                </ConfirmProvider>
            </DemoProvider>
        </MemoryRouter>
    );

const getActiveApplicationCount = () => Number(screen.getByTestId('active-application-count').textContent);

const waitForSeededApplication = async (companyName: string) => {
    await waitFor(() => expect(screen.getByTestId('latest-application-company')).toHaveTextContent(companyName));
};

const fillCompleteDuplicateForm = () => {
    userEvent.type(screen.getByLabelText(/company name/i), '  Morgan Stanley  ');
    userEvent.type(screen.getByLabelText(/job title/i), '  Software Engineer  ');
    userEvent.selectOptions(screen.getByLabelText(/job status/i), 'Interview');
    fireEvent.change(screen.getByLabelText(/application date/i), {
        target: { value: '2025-08-03T14:30' },
    });
    userEvent.type(screen.getByLabelText(/job location/i), '  Singapore  ');
    userEvent.type(screen.getByLabelText(/job posting url/i), '  https://example.com/jobs/1  ');
};

const expectCompleteDuplicateFormValues = () => {
    expect(screen.getByLabelText(/company name/i)).toHaveValue('  Morgan Stanley  ');
    expect(screen.getByLabelText(/job title/i)).toHaveValue('  Software Engineer  ');
    expect(screen.getByLabelText(/job status/i)).toHaveValue('Interview');
    expect(screen.getByLabelText(/application date/i)).toHaveValue('2025-08-03T14:30');
    expect(screen.getByLabelText(/job location/i)).toHaveValue('  Singapore  ');
    expect(screen.getByLabelText(/job posting url/i)).toHaveValue('  https://example.com/jobs/1  ');
};

const submitApplication = () => userEvent.click(screen.getByRole('button', { name: /^add application$/i }));

const clickDialogAction = async (button: HTMLElement) => {
    await act(async () => {
        await userEvent.click(button);
    });
};

describe('Demo Add Application duplicate confirmation', () => {
    beforeEach(() => {
        vi.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
        vi.restoreAllMocks();
    });

    test('keeps normal application creation synchronous with the existing success toast and reset', async () => {
        renderDemoAddApplication();
        const initialApplicationCount = getActiveApplicationCount();

        userEvent.type(screen.getByLabelText(/company name/i), '  Demo Form Company  ');
        userEvent.type(screen.getByLabelText(/job title/i), '  Demo Form Engineer  ');
        userEvent.selectOptions(screen.getByLabelText(/job status/i), 'Interview');
        userEvent.type(screen.getByLabelText(/job location/i), '  Singapore  ');
        userEvent.type(screen.getByLabelText(/job posting url/i), '  https://jobs.example.com/demo-form-engineer  ');
        submitApplication();

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount + 1));
        expect(screen.getByText('Successfully added a job application')).toBeInTheDocument();
        expect(screen.getByLabelText(/company name/i)).toHaveValue('');
        expect(screen.getByLabelText(/job title/i)).toHaveValue('');
        expect(screen.getByLabelText(/job status/i)).toHaveValue('Applied');
        expect(screen.getByLabelText(/job location/i)).toHaveValue('');
        expect(screen.getByLabelText(/job posting url/i)).toHaveValue('');
    });

    test('shows normalized active duplicate details with exactly Cancel and Add Anyway actions', async () => {
        renderDemoAddApplication(ACTIVE_DUPLICATE_ACTION);
        await waitForSeededApplication('Morgan Stanley');
        const initialApplicationCount = getActiveApplicationCount();

        userEvent.type(screen.getByLabelText(/company name/i), '  mOrGaN   sTaNlEy  ');
        userEvent.type(screen.getByLabelText(/job title/i), '  SOFTWARE    ENGINEER  ');
        submitApplication();

        const dialog = await screen.findByRole('dialog');
        const formattedApplicationDate = formatDate(
            ACTIVE_DUPLICATE_ACTION.payload.applicationDate.toISOString()
        ).formattedDate;

        expect(within(dialog).getByRole('heading', { name: 'Possible Duplicate Application' })).toBeInTheDocument();
        expect(dialog).toHaveTextContent('Morgan Stanley');
        expect(dialog).toHaveTextContent('Software Engineer');
        expect(dialog).toHaveTextContent(formattedApplicationDate);
        expect(within(dialog).getAllByRole('button')).toHaveLength(2);
        expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Add Anyway' })).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: /view existing/i })).not.toBeInTheDocument();
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount));
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    test('shows the submit button as pending while duplicate confirmation is open', async () => {
        renderDemoAddApplication(ACTIVE_DUPLICATE_ACTION);
        await waitForSeededApplication('Morgan Stanley');

        await userEvent.type(screen.getByLabelText(/company name/i), 'Morgan Stanley');
        await userEvent.type(screen.getByLabelText(/job title/i), 'Software Engineer');
        await submitApplication();

        await screen.findByRole('dialog');

        const submitButton = document.querySelector<HTMLButtonElement>('form button[type="submit"]');
        expect(submitButton).not.toBeNull();
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });

    test('checks archived applications for duplicates', async () => {
        renderDemoAddApplication();
        const initialApplicationCount = getActiveApplicationCount();
        const initialArchivedApplicationCount = screen.getByTestId('archived-application-count').textContent;

        userEvent.type(screen.getByLabelText(/company name/i), 'Riverlane Studio');
        userEvent.type(screen.getByLabelText(/job title/i), 'Frontend Developer');
        submitApplication();

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('Riverlane Studio');
        expect(dialog).toHaveTextContent('Frontend Developer');
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount));
        expect(screen.getByTestId('archived-application-count')).toHaveTextContent(
            initialArchivedApplicationCount ?? ''
        );
    });

    test('detects a URL-only duplicate seeded through the demo reducer action', async () => {
        renderDemoAddApplication(URL_DUPLICATE_ACTION);
        await waitForSeededApplication('URL Seed Company');
        const initialApplicationCount = getActiveApplicationCount();

        userEvent.type(screen.getByLabelText(/company name/i), 'Completely Different Company');
        userEvent.type(screen.getByLabelText(/job title/i), 'Completely Different Role');
        userEvent.type(screen.getByLabelText(/job posting url/i), `  ${URL_DUPLICATE_ACTION.payload.jobURL}  `);
        submitApplication();

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('URL Seed Company');
        expect(dialog).toHaveTextContent('Original URL Role');
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount));
        expect(screen.getByTestId('latest-application-url')).toHaveTextContent(URL_DUPLICATE_ACTION.payload.jobURL);
    });

    test('Cancel preserves every field without creating or showing a toast', async () => {
        renderDemoAddApplication(ACTIVE_DUPLICATE_ACTION);
        await waitForSeededApplication('Morgan Stanley');
        const initialApplicationCount = getActiveApplicationCount();

        fillCompleteDuplicateForm();
        submitApplication();
        await clickDialogAction(await screen.findByRole('button', { name: 'Cancel' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount));
        expectCompleteDuplicateFormValues();
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    test('Escape preserves every field without creating or showing a toast', async () => {
        renderDemoAddApplication(ACTIVE_DUPLICATE_ACTION);
        await waitForSeededApplication('Morgan Stanley');
        const initialApplicationCount = getActiveApplicationCount();

        fillCompleteDuplicateForm();
        submitApplication();
        const dialog = await screen.findByRole('dialog');
        fireEvent.keyDown(dialog, { key: 'Escape' });

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount));
        expectCompleteDuplicateFormValues();
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    test('clicking Add Anyway creates exactly once, shows success, and resets normalized values', async () => {
        renderDemoAddApplication(ACTIVE_DUPLICATE_ACTION);
        await waitForSeededApplication('Morgan Stanley');
        const initialApplicationCount = getActiveApplicationCount();

        fillCompleteDuplicateForm();
        submitApplication();
        await clickDialogAction(await screen.findByRole('button', { name: 'Add Anyway' }));

        await waitFor(() =>
            expect(screen.getByTestId('active-application-count')).toHaveTextContent(
                String(initialApplicationCount + 1)
            )
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getAllByTestId('toast')).toHaveLength(1);
        expect(screen.getByText('Successfully added a job application')).toBeInTheDocument();
        expect(screen.getByTestId('latest-application-company')).toHaveTextContent('Morgan Stanley');
        expect(screen.getByTestId('latest-application-title')).toHaveTextContent('Software Engineer');
        expect(screen.getByLabelText(/company name/i)).toHaveValue('');
        expect(screen.getByLabelText(/job title/i)).toHaveValue('');
        expect(screen.getByLabelText(/job status/i)).toHaveValue('Applied');
        expect(screen.getByLabelText(/application date/i)).toHaveValue('');
        expect(screen.getByLabelText(/job location/i)).toHaveValue('');
        expect(screen.getByLabelText(/job posting url/i)).toHaveValue('');
    });

    test('autofocuses Add Anyway and confirms with Enter exactly once', async () => {
        renderDemoAddApplication(ACTIVE_DUPLICATE_ACTION);
        await waitForSeededApplication('Morgan Stanley');
        const initialApplicationCount = getActiveApplicationCount();

        userEvent.type(screen.getByLabelText(/company name/i), 'Morgan Stanley');
        userEvent.type(screen.getByLabelText(/job title/i), 'Software Engineer');
        submitApplication();

        const addAnywayButton = await screen.findByRole('button', { name: 'Add Anyway' });
        await waitFor(() => expect(addAnywayButton).toHaveFocus());
        await act(async () => {
            userEvent.keyboard('{enter}');
        });

        await waitFor(() =>
            expect(screen.getByTestId('active-application-count')).toHaveTextContent(
                String(initialApplicationCount + 1)
            )
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getAllByTestId('toast')).toHaveLength(1);
        expect(screen.getByLabelText(/company name/i)).toHaveValue('');
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount + 1));
    });

    test('holds one pending submission through repeated submits and creates once after confirmation', async () => {
        renderDemoAddApplication(ACTIVE_DUPLICATE_ACTION);
        await waitForSeededApplication('Morgan Stanley');
        const initialApplicationCount = getActiveApplicationCount();

        userEvent.type(screen.getByLabelText(/company name/i), 'Morgan Stanley');
        userEvent.type(screen.getByLabelText(/job title/i), 'Software Engineer');
        const form = screen.getByRole('button', { name: /^add application$/i }).closest('form');
        expect(form).not.toBeNull();

        await act(async () => {
            fireEvent.submit(form!);
            fireEvent.submit(form!);
            fireEvent.submit(form!);
        });

        await screen.findByRole('dialog');
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount));

        await clickDialogAction(screen.getByRole('button', { name: 'Add Anyway' }));
        await waitFor(() =>
            expect(screen.getByTestId('active-application-count')).toHaveTextContent(
                String(initialApplicationCount + 1)
            )
        );
        expect(screen.getAllByTestId('toast')).toHaveLength(1);
    });

    test('keeps inline validation, ARIA, and first-invalid focus without opening a dialog', async () => {
        renderDemoAddApplication();
        const initialApplicationCount = getActiveApplicationCount();

        submitApplication();

        const companyNameInput = screen.getByLabelText(/company name/i);
        const jobTitleInput = screen.getByLabelText(/job title/i);
        const companyNameError = await screen.findByText('Please enter a company name.');
        const jobTitleError = screen.getByText('Please enter a job title.');

        expect(companyNameInput).toHaveAttribute('aria-invalid', 'true');
        expect(companyNameInput).toHaveAttribute('aria-describedby', companyNameError.id);
        expect(jobTitleInput).toHaveAttribute('aria-invalid', 'true');
        expect(jobTitleInput).toHaveAttribute('aria-describedby', jobTitleError.id);
        expect(document.activeElement).toBe(companyNameInput);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByTestId('active-application-count')).toHaveTextContent(String(initialApplicationCount));
        expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });
});
