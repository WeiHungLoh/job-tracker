import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { UserPreferencesProvider } from '../../components/userPreferences/UserPreferencesProvider';
import DemoViewArchivedApplication from '../../pages/demo/application/archivedApplication/viewArchivedApplication/DemoViewArchivedApplication';
import DemoViewApplication from '../../pages/demo/application/jobApplication/viewApplication/DemoViewApplication';
import { DemoProvider, useDemo } from '../../pages/demo/context/DemoContext';
import { createDemoInitialState } from '../../pages/demo/state/demoInitialState';
import { render } from '../renderWithProviders';
import userEvent from '@testing-library/user-event';

const mockConfirm = vi.fn();

vi.mock('material-ui-confirm', () => ({
    useConfirm: () => mockConfirm,
}));

const DemoPreferenceBridge = ({ children }: { children: ReactNode }) => {
    const { state, updatePreferences } = useDemo();

    return (
        <UserPreferencesProvider preferences={state.preferences} updatePreferences={updatePreferences}>
            {children}
        </UserPreferencesProvider>
    );
};

const DemoStateProbe = () => {
    const { state } = useDemo();

    return (
        <>
            <output data-testid='active-application-count'>{state.applications.length}</output>
            <output data-testid='active-interview-count'>{state.interviews.length}</output>
            <output data-testid='archived-application-count'>{state.archivedApplications.length}</output>
            <output data-testid='archived-interview-count'>{state.archivedInterviews.length}</output>
        </>
    );
};

const renderDemo = (page: ReactNode) =>
    render(
        <MemoryRouter>
            <DemoProvider>
                <DemoPreferenceBridge>
                    {page}
                    <DemoStateProbe />
                </DemoPreferenceBridge>
            </DemoProvider>
        </MemoryRouter>
    );

const getApplicationCard = (companyName: string) => {
    const heading = screen.getByRole('heading', { level: 2, name: new RegExp(`^\\d+\\. ${companyName}$`) });
    const card = heading.closest('[id]');

    if (!card) {
        throw new Error(`Expected a demo application card for ${companyName}.`);
    }

    return card as HTMLElement;
};

const clickConfirmedAction = async (button: HTMLElement) => {
    await act(async () => {
        await userEvent.click(button);
    });
};

const expectCount = (testId: string, expected: number) => {
    expect(screen.getByTestId(testId)).toHaveTextContent(String(expected));
};

describe('demo single-application relation confirmations', () => {
    beforeEach(() => {
        mockConfirm.mockReset();
    });

    test('archives an active application with its exact active-interview count and reducer cascade', async () => {
        const initialState = createDemoInitialState();
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        renderDemo(<DemoViewApplication />);

        await clickConfirmedAction(
            within(getApplicationCard('Merlion Cloud')).getByRole('button', { name: /^Archive application for / })
        );

        expect(mockConfirm).toHaveBeenCalledWith({
            title: 'Confirm archive',
            description: 'Archive this active job application and its 2 related active interviews?',
            confirmationText: 'Archive',
            cancellationText: 'Cancel',
            confirmationButtonProps: { autoFocus: true },
        });
        await waitFor(() => {
            expectCount('active-application-count', initialState.applications.length - 1);
            expectCount('active-interview-count', initialState.interviews.length - 2);
            expectCount('archived-application-count', initialState.archivedApplications.length + 1);
            expectCount('archived-interview-count', initialState.archivedInterviews.length + 2);
        });
    });

    test('deletes an active application with its exact active-interview count and reducer cascade', async () => {
        const initialState = createDemoInitialState();
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        renderDemo(<DemoViewApplication />);

        await clickConfirmedAction(
            within(getApplicationCard('Merlion Cloud')).getByRole('button', { name: /^Delete application for / })
        );

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Confirm deletion',
                description:
                    'Delete this active job application and its 2 related active interviews? This action is permanent and cannot be undone.',
                confirmationText: 'Delete',
            })
        );
        await waitFor(() => {
            expectCount('active-application-count', initialState.applications.length - 1);
            expectCount('active-interview-count', initialState.interviews.length - 2);
            expectCount('archived-application-count', initialState.archivedApplications.length);
            expectCount('archived-interview-count', initialState.archivedInterviews.length);
        });
    });

    test('unarchives an archived application with its exact archived-interview count and reducer cascade', async () => {
        const initialState = createDemoInitialState();
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        renderDemo(<DemoViewArchivedApplication />);

        await clickConfirmedAction(
            within(getApplicationCard('Riverlane Studio')).getByRole('button', {
                name: /^Unarchive application for /,
            })
        );

        expect(mockConfirm).toHaveBeenCalledWith({
            title: 'Confirm unarchive',
            description: 'Unarchive this archived job application and its 1 related archived interview?',
            confirmationText: 'Unarchive',
            cancellationText: 'Cancel',
            confirmationButtonProps: { autoFocus: true },
        });
        await waitFor(() => {
            expectCount('active-application-count', initialState.applications.length + 1);
            expectCount('active-interview-count', initialState.interviews.length + 1);
            expectCount('archived-application-count', initialState.archivedApplications.length - 1);
            expectCount('archived-interview-count', initialState.archivedInterviews.length - 1);
        });
    });

    test('deletes an archived application with its exact archived-interview count and reducer cascade', async () => {
        const initialState = createDemoInitialState();
        mockConfirm.mockResolvedValueOnce({ confirmed: true });
        renderDemo(<DemoViewArchivedApplication />);

        await clickConfirmedAction(
            within(getApplicationCard('Riverlane Studio')).getByRole('button', {
                name: /^Delete application for /,
            })
        );

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Confirm deletion',
                description:
                    'Delete this archived job application and its 1 related archived interview? This action is permanent and cannot be undone.',
                confirmationText: 'Delete',
            })
        );
        await waitFor(() => {
            expectCount('active-application-count', initialState.applications.length);
            expectCount('active-interview-count', initialState.interviews.length);
            expectCount('archived-application-count', initialState.archivedApplications.length - 1);
            expectCount('archived-interview-count', initialState.archivedInterviews.length - 1);
        });
    });

    test('guards an application synchronously while its confirmation is pending', async () => {
        let resolveConfirmation: ((result: { confirmed: boolean }) => void) | undefined;
        mockConfirm.mockImplementationOnce(
            () =>
                new Promise<{ confirmed: boolean }>((resolve) => {
                    resolveConfirmation = resolve;
                })
        );
        renderDemo(<DemoViewApplication />);
        const archiveButton = within(getApplicationCard('HorizonAI Labs')).getByRole('button', {
            name: /^Archive application for /,
        });

        fireEvent.click(archiveButton);
        fireEvent.click(archiveButton);

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
        expect(archiveButton).toBeDisabled();

        await act(async () => {
            resolveConfirmation?.({ confirmed: false });
        });
        await waitFor(() => expect(archiveButton).toBeEnabled());
    });
});
