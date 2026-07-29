import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import InterviewCard from '../../pages/interview/InterviewCard';
import applicationStyles from '../../pages/application/ApplicationCard.module.css';
import interviewStyles from '../../pages/interview/InterviewCard.module.css';
import type { ArchivedJobInterview, JobInterview } from '../../pages/interview/models';
import { render } from '../renderWithProviders';

const futureInterview: JobInterview = {
    company_name: 'Acme',
    interview_date: '2099-08-15T09:30:00Z',
    interview_duration_minutes: 60,
    interview_id: 42,
    interview_location: 'Singapore',
    interview_notes: 'Bring examples',
    interview_type: 'Technical Interview',
    job_id: 7,
    job_title: 'Software Engineer',
    meeting_url: '',
    is_pinned: false,
};

const renderJobCard = (interview: JobInterview = futureInterview, onDelete = vi.fn()) => {
    render(
        <MemoryRouter>
            <InterviewCard
                applicationRoute='/application/view'
                index={0}
                interview={interview}
                isDeleting={false}
                isUpdatingPin={false}
                onDelete={onDelete}
                onPinToggle={vi.fn()}
                onViewApplicationClick={vi.fn()}
                variant='job'
            />
        </MemoryRouter>
    );

    return { onDelete };
};

const getCalendarTrigger = () => screen.getByRole('button', { name: 'Add to calendar' });

const queryCalendarTrigger = () => screen.queryByRole('button', { name: 'Add to calendar' });

describe('InterviewCard calendar options', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    test('shows Add to calendar only for a future active interview', () => {
        renderJobCard();

        expect(getCalendarTrigger()).toBeInTheDocument();
    });

    test('does not show Add to calendar for a past active interview', () => {
        renderJobCard({ ...futureInterview, interview_date: '2020-01-01T00:00:00Z' });

        expect(queryCalendarTrigger()).not.toBeInTheDocument();
        expect(screen.getByText('Completed')).toHaveClass(applicationStyles.accepted);
        expect(screen.getByRole('article', { name: 'Acme interview' }).className).toContain('overdue');
    });

    test('uses the Upcoming Interview pill for the countdown until an interview starts', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-13T12:00:00Z'));

        try {
            renderJobCard({
                ...futureInterview,
                interview_date: '2026-07-13T12:30:00Z',
                interview_duration_minutes: 60,
            });

            expect(screen.getByText('Time left: 0 days 0 hours 30 minutes')).toHaveClass(
                applicationStyles.upcomingBadge,
                interviewStyles.timingBadge
            );
        } finally {
            vi.useRealTimers();
        }
    });

    test('keeps an in-progress interview upcoming, hides calendar controls, and delays overdue styling', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-13T12:00:00Z'));

        try {
            renderJobCard({
                ...futureInterview,
                interview_date: '2026-07-13T11:30:00Z',
                interview_duration_minutes: 60,
            });

            expect(queryCalendarTrigger()).not.toBeInTheDocument();
            expect(screen.getByText('Time left: 0 days 0 hours 30 minutes')).toHaveClass(applicationStyles.rejected);
            expect(screen.getByRole('article', { name: 'Acme interview' }).className).not.toContain('overdue');
        } finally {
            vi.useRealTimers();
        }
    });

    test('does not show Add to calendar for an invalid active interview date', () => {
        renderJobCard({ ...futureInterview, interview_date: 'not-a-date' });

        expect(queryCalendarTrigger()).not.toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Acme interview' }).className).not.toContain('overdue');
    });

    test('combines Board and overdue styling for a past interview', () => {
        render(
            <MemoryRouter>
                <InterviewCard
                    applicationRoute='/application/view'
                    index={0}
                    interview={{ ...futureInterview, interview_date: '2020-01-01T00:00:00Z' }}
                    isDeleting={false}
                    isUpdatingPin={false}
                    layout='board'
                    onDelete={vi.fn()}
                    onPinToggle={vi.fn()}
                    onViewApplicationClick={vi.fn()}
                    variant='job'
                />
            </MemoryRouter>
        );

        const card = screen.getByRole('article', { name: 'Acme interview' });
        expect(card.className).toContain('board');
        expect(card.className).toContain('overdue');
    });

    test('does not show Add to calendar for an archived interview', () => {
        const archivedInterview: ArchivedJobInterview = {
            ...futureInterview,
            archived_interview_id: 42,
            archived_job_id: 7,
        };

        render(
            <MemoryRouter>
                <InterviewCard
                    applicationRoute='/application/archived'
                    index={0}
                    interview={archivedInterview}
                    isDeleting={false}
                    onDelete={vi.fn()}
                    onViewApplicationClick={vi.fn()}
                    variant='archived'
                />
            </MemoryRouter>
        );

        expect(queryCalendarTrigger()).not.toBeInTheDocument();
    });

    test('opens both calendar actions and Google Calendar in a protected new tab', async () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        renderJobCard();
        const trigger = getCalendarTrigger();

        await userEvent.click(trigger);

        const googleCalendarAction = screen.getByRole('button', { name: 'Add to Google Calendar' });
        expect(screen.getByRole('group', { name: 'Calendar options' })).toBeInTheDocument();
        expect(googleCalendarAction).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add to Apple Calendar / Outlook (.ics)' })).toBeInTheDocument();

        await userEvent.tab();
        expect(googleCalendarAction).toHaveFocus();
        await userEvent.click(googleCalendarAction);

        expect(open).toHaveBeenCalledWith(
            expect.stringContaining('https://calendar.google.com/calendar/render?'),
            '_blank',
            'noopener,noreferrer'
        );
        expect(screen.queryByRole('group', { name: 'Calendar options' })).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    test('downloads an iCalendar file and revokes its temporary URL', async () => {
        const createObjectURL = vi.fn(() => 'blob:calendar-event');
        const revokeObjectURL = vi.fn();
        let downloadedFilename = '';
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
        const anchorClick = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(function (this: HTMLAnchorElement) {
                downloadedFilename = this.download;
            });
        renderJobCard();

        await userEvent.click(getCalendarTrigger());
        await userEvent.click(screen.getByRole('button', { name: 'Add to Apple Calendar / Outlook (.ics)' }));

        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(anchorClick).toHaveBeenCalledOnce();
        expect(downloadedFilename).toBe('Acme-Technical-Interview.ics');
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:calendar-event');
        expect(screen.queryByRole('group', { name: 'Calendar options' })).not.toBeInTheDocument();
    });

    test('shows the standard frontend error toast when calendar creation fails', async () => {
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: vi.fn(() => {
                throw new Error('Unable to create object URL');
            }),
        });
        renderJobCard();

        await userEvent.click(getCalendarTrigger());
        await userEvent.click(screen.getByRole('button', { name: 'Add to Apple Calendar / Outlook (.ics)' }));

        expect(await screen.findByText('Unable to create the calendar event. Please try again.')).toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Calendar options' })).not.toBeInTheDocument();
    });

    test('closes on Escape, restores trigger focus, and closes on outside click', async () => {
        renderJobCard();
        const trigger = getCalendarTrigger();

        await userEvent.click(trigger);
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(screen.queryByRole('group', { name: 'Calendar options' })).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();

        await userEvent.click(trigger);
        fireEvent.mouseDown(document.body);

        expect(screen.queryByRole('group', { name: 'Calendar options' })).not.toBeInTheDocument();
    });

    test('preserves the existing Delete action', async () => {
        const { onDelete } = renderJobCard();

        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(onDelete).toHaveBeenCalledOnce();
    });

    test('places List notes between the interview date and timing status', () => {
        renderJobCard();

        const date = screen.getByText(/Interview Date:/);
        const timeLeft = screen.getByText(/Time left:/);
        const notes = screen.getByText('Notes: Bring examples');

        expect(date.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(notes.compareDocumentPosition(timeLeft) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('shows the meeting URL after the follow-up badge in List and below Actions in Board', async () => {
        const interview = {
            ...futureInterview,
            follow_up_sent_at: '2026-07-27T07:42:00.000Z',
            meeting_url: 'https://meet.example.com/room',
        };
        renderJobCard(interview);

        const listFollowUp = screen.getByRole('status');
        const listMeetingURL = screen.getByRole('link', { name: 'Click here to enter meeting' });
        expect(listMeetingURL).toHaveAttribute('href', 'https://meet.example.com/room');
        expect(listMeetingURL).toHaveAttribute('target', '_blank');
        expect(listFollowUp.compareDocumentPosition(listMeetingURL) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        render(
            <MemoryRouter>
                <InterviewCard
                    applicationRoute='/application/view'
                    index={0}
                    interview={interview}
                    isDeleting={false}
                    isUpdatingPin={false}
                    layout='board'
                    onDelete={vi.fn()}
                    onPinToggle={vi.fn()}
                    onViewApplicationClick={vi.fn()}
                    variant='job'
                />
            </MemoryRouter>
        );

        const boardCard = screen.getAllByRole('article', { name: 'Acme interview' })[1];
        const boardActions = within(boardCard).getByText('Actions').closest('details');
        expect(within(boardCard).getByRole('link', { name: 'Click here to view meeting' })).not.toBeVisible();
        await userEvent.click(within(boardCard).getByText('Actions'));
        const boardMeetingURL = within(boardCard).getByRole('link', { name: 'Click here to view meeting' });
        expect(boardMeetingURL).toHaveAttribute('href', 'https://meet.example.com/room');
        expect(boardMeetingURL).toHaveAttribute('target', '_blank');
        const actionButtons = within(boardCard).getByRole('button', { name: 'Delete' }).parentElement;
        expect(boardMeetingURL.compareDocumentPosition(actionButtons!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(boardActions).toHaveAttribute('open');
    });

    test('uses shared Board actions and hides List-only interview details', async () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        render(
            <MemoryRouter>
                <InterviewCard
                    applicationRoute='/demo/application/view'
                    index={0}
                    interview={futureInterview}
                    isDeleting={false}
                    isUpdatingPin={false}
                    layout='board'
                    onDelete={vi.fn()}
                    onPinToggle={vi.fn()}
                    onViewApplicationClick={vi.fn()}
                    variant='job'
                />
            </MemoryRouter>
        );

        expect(screen.getByRole('article', { name: 'Acme interview' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: '1. Acme' })).toBeInTheDocument();
        expect(screen.getByText('Software Engineer')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Software Engineer' })).not.toBeInTheDocument();
        expect(screen.queryByText('Singapore')).not.toBeInTheDocument();
        expect(screen.queryByText('Technical Interview')).not.toBeInTheDocument();
        expect(screen.queryByText(/Job Title:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Interview Type:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Interview Date:/)).not.toBeInTheDocument();
        expect(screen.queryByText('Notes: Bring examples')).not.toBeInTheDocument();
        expect(screen.queryByText(/time left/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /review corresponding job application/i })).not.toBeInTheDocument();
        const actions = screen.getByText('Actions').closest('details');
        expect(actions).not.toHaveAttribute('open');

        await userEvent.click(screen.getByText('Actions'));

        expect(actions).toHaveAttribute('open');
        expect(getCalendarTrigger()).toBeInTheDocument();
        const deleteButton = screen.getByRole('button', { name: 'Delete' });
        expect(deleteButton.parentElement?.className).toContain('compactActions');
        expect(deleteButton.className).toContain('boardDeleteButton');

        await userEvent.click(getCalendarTrigger());
        expect(screen.getByRole('group', { name: 'Calendar options' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add to Google Calendar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add to Apple Calendar / Outlook (.ics)' })).toBeInTheDocument();

        const trigger = getCalendarTrigger();
        await userEvent.click(screen.getByRole('button', { name: 'Add to Google Calendar' }));
        expect(open).toHaveBeenCalledWith(
            expect.stringContaining('https://calendar.google.com/calendar/render?'),
            '_blank',
            'noopener,noreferrer'
        );
        expect(screen.queryByRole('group', { name: 'Calendar options' })).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });
});
