import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ApplicationCard from '../../pages/application/ApplicationCard';
import ApplicationBoardCard from '../../pages/application/jobApplication/applicationBoard/ApplicationBoardCard';
import InterviewCard from '../../pages/interview/InterviewCard';
import type { ArchivedJobApplication, JobApplication } from '../../pages/application/models';
import type { ArchivedJobInterview, JobInterview } from '../../pages/interview/models';

vi.mock('@dnd-kit/core', () => ({
    useDraggable: () => ({
        attributes: {},
        isDragging: false,
        listeners: {},
        setActivatorNodeRef: vi.fn(),
        setNodeRef: vi.fn(),
        transform: null,
    }),
}));

const sentAt = '2026-07-27T07:42:00.000Z';
const application: JobApplication = {
    job_id: 1,
    company_name: 'Acme',
    job_title: 'Engineer',
    application_date: '2026-07-01T08:00:00.000Z',
    job_status: 'Applied',
    job_location: '',
    job_posting_url: '',
    notes: '',
    application_follow_up_sent_at: sentAt,
};
const archivedApplication: ArchivedJobApplication = {
    ...application,
    archived_job_id: 1,
};
delete (archivedApplication as Partial<JobApplication>).job_id;

const interview: JobInterview = {
    interview_id: 11,
    job_id: 1,
    company_name: 'Acme',
    job_title: 'Engineer',
    interview_date: '2026-07-01T08:00:00.000Z',
    interview_duration_minutes: 60,
    interview_location: 'Remote',
    interview_type: 'Technical',
    interview_notes: '',
    follow_up_sent_at: sentAt,
};
const archivedInterview: ArchivedJobInterview = {
    ...interview,
    archived_interview_id: 11,
    archived_job_id: 1,
};
delete (archivedInterview as Partial<JobInterview>).interview_id;
delete (archivedInterview as Partial<JobInterview>).job_id;

const commonApplicationProps = {
    editedJobStatus: 'Applied' as const,
    hasInterview: false,
    hasOfferEvaluation: false,
    index: 0,
    isArchiving: false,
    isDeleting: false,
    isEditingStatus: false,
    isUpdatingStatus: false,
    isUndoingFollowUp: false,
    note: '',
    noteSaveStatus: 'idle' as const,
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onEditNotes: vi.fn(),
    onJobStatusChange: vi.fn(),
    onNotesBlur: vi.fn(),
    onRetryNotes: vi.fn(),
    onToggleStatusEditor: vi.fn(),
    showArchive: true,
    showNotes: false,
    upcomingInterviewCount: 0,
};

describe('follow-up card variants', () => {
    test('active application list shows full timestamp and Undo while archived list is read-only', () => {
        const onUndoFollowUp = vi.fn();
        const { rerender } = render(
            <MemoryRouter>
                <ApplicationCard
                    {...commonApplicationProps}
                    application={application}
                    onUndoFollowUp={onUndoFollowUp}
                    variant='job'
                />
            </MemoryRouter>
        );

        expect(screen.getByRole('status')).toHaveTextContent('Follow-up sent');
        expect(screen.getByRole('status')).toHaveTextContent('Follow-up sent on');
        expect(screen.getByRole('button', { name: 'Undo follow-up for Engineer at Acme' })).toBeInTheDocument();

        rerender(
            <MemoryRouter>
                <ApplicationCard
                    application={archivedApplication}
                    index={0}
                    isDeleting={false}
                    isUnarchiving={false}
                    onDelete={vi.fn()}
                    onUnarchive={vi.fn()}
                    showNotes={false}
                    variant='archived'
                />
            </MemoryRouter>
        );

        expect(screen.getByRole('status')).toHaveTextContent('Follow-up sent');
        expect(screen.queryByRole('button', { name: /undo follow-up/i })).not.toBeInTheDocument();
    });

    test('application board keeps compact status on the face and Undo inside Actions', async () => {
        const onUndoFollowUp = vi.fn();
        render(
            <ApplicationBoardCard
                application={application}
                hasInterview={false}
                hasOfferEvaluation={false}
                isArchiving={false}
                isDeleting={false}
                isUpdatingStatus={false}
                isUndoingFollowUp={false}
                note=''
                noteSaveStatus='idle'
                onArchive={vi.fn()}
                onDelete={vi.fn()}
                onEditNotes={vi.fn()}
                onNotesBlur={vi.fn()}
                onNotesVisibilityChange={vi.fn()}
                onRetryNotes={vi.fn()}
                onStatusChange={vi.fn()}
                onUndoFollowUp={onUndoFollowUp}
                upcomingInterviewCount={0}
            />
        );

        const compactStatus = screen.getByText('Follow-up sent · 27 Jul');
        const undoButton = screen.getByRole('button', { name: 'Undo follow-up for Engineer at Acme' });
        expect(compactStatus).toBeInTheDocument();
        expect(compactStatus.contains(undoButton)).toBe(false);
        expect(undoButton.closest('details')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Actions'));
        await userEvent.click(undoButton);

        expect(onUndoFollowUp).toHaveBeenCalledWith(application);
    });

    test.each([
        { layout: 'list' as const, record: interview, variant: 'job' as const },
        { layout: 'board' as const, record: interview, variant: 'job' as const },
        { layout: 'list' as const, record: archivedInterview, variant: 'archived' as const },
        { layout: 'board' as const, record: archivedInterview, variant: 'archived' as const },
    ])('interview $variant $layout renders the persisted follow-up state', async ({ layout, record, variant }) => {
        const onUndoFollowUp = vi.fn();
        render(
            <MemoryRouter>
                <InterviewCard
                    applicationRoute='/applications'
                    currentTime={new Date('2026-07-27T12:00:00.000Z')}
                    index={0}
                    interview={record as never}
                    isDeleting={false}
                    isUpdatingPin={false}
                    layout={layout}
                    onDelete={vi.fn()}
                    onPinToggle={vi.fn()}
                    onUndoFollowUp={variant === 'job' ? onUndoFollowUp : undefined}
                    onViewApplicationClick={vi.fn()}
                    variant={variant as never}
                />
            </MemoryRouter>
        );

        if (layout === 'board') {
            expect(screen.getByText('Follow-up sent · 27 Jul')).toBeInTheDocument();
            await userEvent.click(screen.getByText('Actions'));
        }
        expect(screen.getAllByText(/Follow-up sent/).length).toBeGreaterThan(0);
        if (variant === 'job') {
            expect(screen.getByRole('button', { name: 'Undo follow-up for Engineer at Acme' })).toBeInTheDocument();
        } else {
            expect(screen.queryByRole('button', { name: /undo follow-up/i })).not.toBeInTheDocument();
        }
    });
});
