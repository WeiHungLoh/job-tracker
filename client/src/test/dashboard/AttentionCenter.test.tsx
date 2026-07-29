import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttentionCenter from '../../pages/dashboard/attentionCenter/AttentionCenter';
import boardStyles from '../../pages/application/applicationBoard/ApplicationBoard.module.css';
import { getApplicationBoardStatusClassName } from '../../pages/application/applicationBoard/statusClassNames';
import type { JobApplication, JobStatus } from '../../pages/application/models';
import type { JobInterview } from '../../pages/interview/models';
import type { OfferEvaluation } from '../../pages/offerDecision/models';
import { render } from '../renderWithProviders';

const currentTime = new Date('2026-07-10T12:00:00.000Z');

const createApplication = (
    jobId: number,
    jobStatus: JobStatus,
    applicationDate = '2026-06-20T12:00:00.000Z'
): JobApplication => ({
    job_id: jobId,
    company_name: `Company ${jobId}`,
    job_title: `Role ${jobId}`,
    application_date: applicationDate,
    job_status: jobStatus,
    job_location: '',
    job_posting_url: '',
    notes: '',
});

const createInterview = (jobId: number, interviewDate: string): JobInterview => ({
    interview_id: jobId,
    job_id: jobId,
    company_name: `Company ${jobId}`,
    job_title: `Role ${jobId}`,
    interview_date: interviewDate,
    interview_duration_minutes: 60,
    interview_location: '',
    interview_type: '',
    interview_notes: '',
});

describe('AttentionCenter', () => {
    beforeEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders one category-specific action after every factual attention reason', () => {
        const onAddInterview = vi.fn();
        const onOpenOfferComparison = vi.fn();
        const onRecordOfferDecision = vi.fn();
        const applications = [
            createApplication(1, 'Interview'),
            createApplication(2, 'Interview'),
            { ...createApplication(3, 'Offer'), has_offer_evaluation: false },
            createApplication(4, 'Applied'),
            { ...createApplication(5, 'Offer'), has_offer_evaluation: true },
        ];
        const offerEvaluations: OfferEvaluation[] = [
            {
                job_id: 5,
                ratings: {
                    career_growth: 3,
                    company_culture_fit: 3,
                    work_life_balance: 3,
                    compensation: 3,
                },
                details: {
                    currency: 'SGD',
                    monthly_base_salary: 8000,
                    bonus: '',
                    annual_leave_days: 18,
                    work_arrangement: 'Hybrid',
                    decision_deadline: '2026-07-12T12:00:00.000Z',
                    pros: '',
                    concerns: '',
                },
            },
        ];

        render(
            <AttentionCenter
                applications={applications}
                interviews={[createInterview(1, '2026-07-02T11:00:00.000Z')]}
                currentTime={currentTime}
                isLoading={false}
                onAddInterview={onAddInterview}
                offerEvaluations={offerEvaluations}
                onOpenOfferComparison={onOpenOfferComparison}
                onRecordOfferDecision={onRecordOfferDecision}
            />
        );

        const list = screen.getByRole('list', { name: 'Applications needing attention' });
        const items = within(list).getAllByRole('listitem');
        expect(items).toHaveLength(5);
        items.forEach((item) => expect(within(item).getAllByRole('button')).toHaveLength(1));
        expect(within(list).getByText('Company 1')).toBeInTheDocument();
        expect(within(list).getByText('Company 2')).toBeInTheDocument();
        expect(within(list).getByText('Role 1')).toBeInTheDocument();
        expect(within(list).getAllByText('Interview')).toHaveLength(2);
        expect(within(list).getAllByText('Offer')).toHaveLength(2);
        expect(within(list).getByText('Applied')).toBeInTheDocument();
        within(list)
            .getAllByText('Interview')
            .forEach((badge) =>
                expect(badge).toHaveClass(boardStyles.statusBadge, getApplicationBoardStatusClassName('Interview'))
            );
        within(list)
            .getAllByText('Offer')
            .forEach((badge) =>
                expect(badge).toHaveClass(boardStyles.statusBadge, getApplicationBoardStatusClassName('Offer'))
            );
        expect(within(list).getByText('Applied')).toHaveClass(
            boardStyles.statusBadge,
            getApplicationBoardStatusClassName('Applied')
        );
        expect(
            within(list).getByText(
                'Your latest recorded interview ended on 2 July 2026 (8 days ago), and the application is still at Interview.'
            )
        ).toBeInTheDocument();
        expect(
            within(list).getByText('This application is at Interview, but no interview has been scheduled.')
        ).toBeInTheDocument();
        expect(
            within(list).getByText(
                'This offer has not been evaluated yet. Add its details to compare it and record a deadline.'
            )
        ).toBeInTheDocument();
        expect(
            within(list).getByText(
                'The decision deadline is 12 July 2026 (2 days away). Review the evaluated offer and mark it as Accepted or Declined once decided.'
            )
        ).toBeInTheDocument();
        expect(
            within(list).getByText('Applied on 20 June 2026 (20 days ago). No interview has been recorded.')
        ).toBeInTheDocument();
        expect(screen.getByText('Your highest-priority follow-ups, with suggested next steps.')).toBeInTheDocument();
        expect(within(list).getByText('Draft application follow-up')).toBeInTheDocument();
        expect(within(list).getByText('Draft post-interview message')).toBeInTheDocument();
        expect(within(list).getByText('Add interview')).toBeInTheDocument();
        expect(within(list).getByText('Evaluate offer')).toBeInTheDocument();
        expect(within(list).getByText('Record offer decision')).toBeInTheDocument();
        expect(within(list).queryByText('•')).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.queryByText(/view application/i)).not.toBeInTheDocument();

        void userEvent.click(within(list).getByRole('button', { name: 'Add interview for Role 2 at Company 2' }));
        expect(onAddInterview).toHaveBeenCalledWith(applications[1]);

        void userEvent.click(within(list).getByRole('button', { name: 'Evaluate offer for Role 3 at Company 3' }));
        expect(onOpenOfferComparison).toHaveBeenCalledWith(applications[2]);

        void userEvent.click(
            within(list).getByRole('button', { name: 'Record offer decision for Role 5 at Company 5' })
        );
        expect(onRecordOfferDecision).toHaveBeenCalledWith(applications[4]);
    });

    test('opens static deterministic drafts, closes without changing the attention item, and restores the draft', async () => {
        render(
            <AttentionCenter
                applications={[createApplication(1, 'Applied')]}
                interviews={[]}
                currentTime={currentTime}
                isLoading={false}
            />
        );

        const action = screen.getByRole('button', {
            name: 'Draft application follow-up for Role 1 at Company 1',
        });
        await userEvent.click(action);

        expect(screen.getByRole('dialog', { name: 'Draft application follow-up' })).toBeInTheDocument();
        expect(screen.getByText('Follow-up on my Role 1 application at Company 1')).toBeInTheDocument();
        expect(screen.getByText(/^Dear Hiring Team,/)).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(document.querySelector('[contenteditable="true"]')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(action).toBeInTheDocument();

        await userEvent.click(action);
        expect(screen.getByText('Follow-up on my Role 1 application at Company 1')).toBeInTheDocument();
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(action).toBeInTheDocument();
    });

    test('uses the latest completed interview in the post-interview draft', async () => {
        const earlierInterview = {
            ...createInterview(1, '2026-06-20T11:00:00.000Z'),
            interview_id: 10,
        };
        const latestInterview = {
            ...createInterview(1, '2026-07-02T11:00:00.000Z'),
            interview_id: 11,
        };

        render(
            <AttentionCenter
                applications={[createApplication(1, 'Interview')]}
                interviews={[earlierInterview, latestInterview]}
                currentTime={currentTime}
                isLoading={false}
            />
        );

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Draft post-interview message for Role 1 at Company 1',
            })
        );

        expect(screen.getByRole('dialog', { name: 'Draft post-interview message' })).toBeInTheDocument();
        expect(screen.getByText(/^Hi \[Interviewer's name\],/)).toBeInTheDocument();
        expect(screen.getByText(/on 2 July 2026 about the Role 1 position/)).toBeInTheDocument();
        expect(screen.queryByText(/20 June 2026 about the Role 1 position/)).not.toBeInTheDocument();
    });

    test('copies the exact plain-text draft, keeps the dialog open, and reports success', async () => {
        const writeText = vi.mocked(navigator.clipboard.writeText);
        render(
            <AttentionCenter
                applications={[createApplication(1, 'Applied')]}
                interviews={[]}
                currentTime={currentTime}
                isLoading={false}
            />
        );

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Draft application follow-up for Role 1 at Company 1',
            })
        );
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Copy message' }));
        });

        expect(writeText).toHaveBeenCalledWith(`Subject: Follow-up on my Role 1 application at Company 1

Dear Hiring Team,

I hope you’re doing well. I’m following up on my application for the Role 1 position at Company 1, submitted on 20 June 2026.

I remain very interested in the opportunity and would appreciate any update you can share regarding the status of my application.

Thank you for your time and consideration.

Best regards,
[Your name]`);
        expect(screen.getByRole('dialog', { name: 'Draft application follow-up' })).toBeInTheDocument();
        expect(await screen.findByText('Follow-up message copied to clipboard.')).toBeInTheDocument();
    });

    test('keeps the static draft open and reports clipboard failure', async () => {
        vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Clipboard unavailable'));
        render(
            <AttentionCenter
                applications={[createApplication(1, 'Applied')]}
                interviews={[]}
                currentTime={currentTime}
                isLoading={false}
            />
        );

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Draft application follow-up for Role 1 at Company 1',
            })
        );
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Copy message' }));
        });

        expect(screen.getByRole('dialog', { name: 'Draft application follow-up' })).toBeInTheDocument();
        expect(screen.getByText(/^Dear Hiring Team,/)).toBeInTheDocument();
        expect(
            await screen.findByText('Unable to copy the follow-up message. Please select and copy it manually.')
        ).toBeInTheDocument();
    });

    test('marks the selected application follow-up, closes the dialog, and shows a success toast', async () => {
        const application = createApplication(1, 'Applied');
        const onMarkApplicationFollowUpSent = vi.fn().mockResolvedValue(undefined);
        render(
            <AttentionCenter
                applications={[application]}
                interviews={[]}
                currentTime={currentTime}
                isLoading={false}
                onMarkApplicationFollowUpSent={onMarkApplicationFollowUpSent}
            />
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Draft application follow-up for Role 1 at Company 1' })
        );
        const markButton = screen.getByRole('button', {
            name: 'Mark application follow-up as sent for Role 1 at Company 1',
        });
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        const copyButton = screen.getByRole('button', { name: 'Copy message' });

        expect(markButton.compareDocumentPosition(cancelButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(cancelButton.compareDocumentPosition(copyButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        await act(async () => {
            await userEvent.click(markButton);
        });

        expect(onMarkApplicationFollowUpSent).toHaveBeenCalledWith(application);
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(await screen.findByText('Follow-up marked as sent.')).toBeInTheDocument();
    });

    test('marks the exact selected interview and keeps the dialog open when marking fails', async () => {
        const application = createApplication(1, 'Interview');
        const interview = { ...createInterview(1, '2026-07-02T11:00:00.000Z'), interview_id: 41 };
        const onMarkInterviewFollowUpSent = vi.fn().mockRejectedValue(new Error('Database unavailable'));
        render(
            <AttentionCenter
                applications={[application]}
                interviews={[interview]}
                currentTime={currentTime}
                isLoading={false}
                onMarkInterviewFollowUpSent={onMarkInterviewFollowUpSent}
            />
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Draft post-interview message for Role 1 at Company 1' })
        );
        await act(async () => {
            await userEvent.click(
                screen.getByRole('button', {
                    name: 'Mark post-interview follow-up as sent for Role 1 at Company 1',
                })
            );
        });

        expect(onMarkInterviewFollowUpSent).toHaveBeenCalledWith(interview);
        expect(screen.getByRole('dialog', { name: 'Draft post-interview message' })).toBeInTheDocument();
        expect(await screen.findByText('Unable to mark the follow-up as sent. Please try again.')).toBeInTheDocument();
    });

    test('copying the message does not mark a follow-up as sent', async () => {
        const onMarkApplicationFollowUpSent = vi.fn();
        render(
            <AttentionCenter
                applications={[createApplication(1, 'Applied')]}
                interviews={[]}
                currentTime={currentTime}
                isLoading={false}
                onMarkApplicationFollowUpSent={onMarkApplicationFollowUpSent}
            />
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Draft application follow-up for Role 1 at Company 1' })
        );
        await act(async () => {
            await userEvent.click(screen.getByRole('button', { name: 'Copy message' }));
        });

        expect(onMarkApplicationFollowUpSent).not.toHaveBeenCalled();
    });

    test('keeps upcoming interviews in their existing dashboard card', () => {
        render(
            <AttentionCenter
                applications={[createApplication(1, 'Interview')]}
                interviews={[createInterview(1, '2026-07-11T10:00:00.000Z')]}
                currentTime={currentTime}
                isLoading={false}
            />
        );

        expect(screen.getByText("You're all caught up")).toBeInTheDocument();
        expect(screen.queryByText('Company 1')).not.toBeInTheDocument();
    });

    test('shows a compact loading state', () => {
        render(<AttentionCenter applications={[]} interviews={[]} currentTime={currentTime} isLoading />);

        expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
    });
});
