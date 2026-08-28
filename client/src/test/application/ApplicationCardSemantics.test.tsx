import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ApplicationCard from '../../pages/application/ApplicationCard';
import DemoApplicationCard from '../../pages/demo/application/DemoApplicationCard';
import type { ArchivedJobApplication } from '../../pages/application/models';

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
        expect(notes).toBeDisabled();
        expect(notes).toHaveAttribute('readonly');
    });
});
