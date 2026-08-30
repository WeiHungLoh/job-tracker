import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ApplicationCard from '../../pages/application/ApplicationCard';
import DemoApplicationCard from '../../pages/demo/application/DemoApplicationCard';
import type { ArchivedJobApplication, JobApplication } from '../../pages/application/models';

const archivedApplication: ArchivedJobApplication = {
    archived_job_id: 42,
    application_date: '2026-08-20T00:00:00Z',
    company_name: 'Acme Labs',
    is_pinned: false,
    job_location: 'Singapore',
    job_posting_url: '',
    job_status: 'Applied',
    job_title: 'Engineer',
    notes: 'Archived note',
};

const activeApplication: JobApplication = {
    application_date: '2026-08-20T00:00:00Z',
    company_name: 'Acme Labs',
    is_pinned: false,
    job_id: 7,
    job_location: 'Singapore',
    job_posting_url: 'https://example.com/job',
    job_status: 'Interview',
    job_title: 'Engineer',
    notes: '',
};

const editableNotesProps = {
    note: '',
    noteSaveStatus: 'idle' as const,
    onEditNotes: vi.fn(),
    onNotesBlur: vi.fn(),
    onRetryNotes: vi.fn(),
};

test('gives active application card controls contextual names without changing their visible labels', () => {
    render(
        <MemoryRouter>
            <ApplicationCard
                {...editableNotesProps}
                application={activeApplication}
                editedJobStatus='Interview'
                hasInterview
                hasOfferEvaluation={false}
                index={0}
                isArchiving={false}
                isDeleting={false}
                isEditingStatus={false}
                isUpdatingPin={false}
                isUpdatingStatus={false}
                onArchive={vi.fn()}
                onDelete={vi.fn()}
                onJobStatusChange={vi.fn()}
                onPinToggle={vi.fn()}
                onToggleStatusEditor={vi.fn()}
                showArchive
                showNotes={false}
                upcomingInterviewCount={0}
                variant='job'
            />
            <DemoApplicationCard
                {...editableNotesProps}
                application={activeApplication}
                editedJobStatus='Interview'
                hasInterview
                hasOfferEvaluation={false}
                index={0}
                isArchiving={false}
                isDeleting={false}
                isEditingStatus={false}
                isUpdatingPin={false}
                onArchive={vi.fn()}
                onDelete={vi.fn()}
                onJobStatusChange={vi.fn()}
                onPinToggle={vi.fn()}
                onToggleStatusEditor={vi.fn()}
                showArchive
                showNotes={false}
                upcomingInterviewCount={0}
                variant='job'
            />
        </MemoryRouter>
    );

    expect(screen.getAllByRole('button', { name: 'Edit status for Engineer at Acme Labs' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete application for Engineer at Acme Labs' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Archive application for Engineer at Acme Labs' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Add interview for Engineer at Acme Labs' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'View job posting for Engineer at Acme Labs' })).toHaveLength(2);
    screen.getAllByRole('button', { name: /for Engineer at Acme Labs$/ }).forEach((button) => {
        expect(button).toHaveTextContent(/^(Edit status|Delete|Archive)$/);
    });
});

describe.each([
    ['production', ApplicationCard, { isUnarchiving: false, onUnarchive: vi.fn() }],
    ['Demo', DemoApplicationCard, { isRestoring: false, onRestore: vi.fn() }],
] as const)('%s application card semantics', (_name, Card, variantProps) => {
    test('exposes the card as a labelled article without changing its content', () => {
        render(
            <MemoryRouter>
                <Card
                    application={archivedApplication}
                    index={0}
                    isDeleting={false}
                    onDelete={vi.fn()}
                    showNotes
                    variant='archived'
                    {...variantProps}
                />
            </MemoryRouter>
        );

        expect(screen.getByRole('article', { name: 'Acme Labs application' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '1. Acme Labs' })).toBeInTheDocument();

        const notes = screen.getByRole('textbox', { name: 'Notes for Acme Labs' });
        expect(notes).toHaveValue('Archived note');
        expect(notes).not.toBeDisabled();
        expect(notes).toHaveAttribute('readonly');
        notes.focus();
        expect(notes).toHaveFocus();

        expect(
            screen.getByRole('button', { name: 'Unarchive application for Engineer at Acme Labs' })
        ).toHaveTextContent('Unarchive');
        expect(screen.getByRole('button', { name: 'Delete application for Engineer at Acme Labs' })).toHaveTextContent(
            'Delete'
        );
    });
});
