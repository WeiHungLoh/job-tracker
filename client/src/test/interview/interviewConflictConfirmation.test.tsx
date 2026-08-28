import { screen } from '@testing-library/react';
import { JobTrackerAPIError } from '../../api/models';
import {
    createInterviewConflictConfirmation,
    isInterviewSchedulingConflictError,
} from '../../pages/interview/interviewConflictConfirmation';
import type { InterviewSchedulingConflictResponse } from '../../pages/interview/models';
import { render } from '../renderWithProviders';

const conflict = {
    interview_id: 51,
    job_id: 12,
    company_name: 'Grab',
    job_title: 'Software Engineer',
    interview_date: new Date(2026, 6, 25, 14, 0).toISOString(),
    interview_duration_minutes: 60,
    interview_type: 'Technical Interview',
};

const conflictResponse: InterviewSchedulingConflictResponse = {
    code: 'INTERVIEW_SCHEDULING_CONFLICT',
    message: 'This interview overlaps with an existing active interview.',
    conflicts: [conflict],
};

describe('interview conflict confirmation', () => {
    test('strictly identifies a structured 409 scheduling conflict', () => {
        expect(isInterviewSchedulingConflictError(new JobTrackerAPIError('Conflict', 409, conflictResponse))).toBe(
            true
        );
        expect(isInterviewSchedulingConflictError(new JobTrackerAPIError(conflictResponse.message, 409))).toBe(false);
        expect(
            isInterviewSchedulingConflictError(
                new JobTrackerAPIError('Conflict', 409, {
                    ...conflictResponse,
                    conflicts: [{ ...conflict, interview_date: 'invalid' }],
                })
            )
        ).toBe(false);
        expect(isInterviewSchedulingConflictError(new JobTrackerAPIError('Conflict', 500, conflictResponse))).toBe(
            false
        );
    });

    test('uses the shared single-conflict wording and existing local range formatting', () => {
        const confirmation = createInterviewConflictConfirmation([conflict]);

        expect(confirmation).toMatchObject({
            title: 'Possible scheduling conflict',
            confirmationText: 'Add anyway',
            cancellationText: 'Cancel',
            confirmationButtonProps: { autoFocus: true },
        });
        render(<>{confirmation.content ?? confirmation.description}</>);
        expect(screen.getByText(/This interview overlaps with your Technical Interview/i)).toHaveTextContent(
            'Technical Interview for Software Engineer at Grab on 25 July 2026 from 2:00 pm to 3:00 pm.'
        );
    });

    test('uses an Interview fallback and an explicitly numbered ordered list for multiple conflicts', () => {
        const confirmation = createInterviewConflictConfirmation([
            {
                ...conflict,
                interview_id: 52,
                company_name: 'Stripe',
                job_title: 'Platform Engineer',
                interview_date: new Date(2026, 6, 25, 15, 30).toISOString(),
                interview_duration_minutes: 30,
            },
            { ...conflict, interview_type: '' },
        ]);

        render(<>{confirmation.content ?? confirmation.description}</>);
        expect(screen.getByText('This interview overlaps with multiple existing interviews:')).toBeInTheDocument();
        const list = screen.getByRole('list');
        expect(list.tagName).toBe('OL');
        expect(list.style.display).toBe('grid');
        expect(list.style.gap).toBe('var(--spaceControl)');
        expect(list.style.paddingLeft).toBe('0px');
        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            '1) Interview for Software Engineer at Grab on 25 July 2026 from 2:00 pm to 3:00 pm.',
            '2) Technical Interview for Platform Engineer at Stripe on 25 July 2026 from 3:30 pm to 4:00 pm.',
        ]);
    });

    test('sorts three or more conflicts chronologically and numbers every interview sequentially', () => {
        const confirmation = createInterviewConflictConfirmation([
            {
                ...conflict,
                interview_id: 53,
                company_name: 'Shopee',
                job_title: 'Frontend Engineer',
                interview_date: new Date(2026, 6, 25, 14, 45).toISOString(),
                interview_duration_minutes: 75,
                interview_type: '',
            },
            conflict,
            {
                ...conflict,
                interview_id: 52,
                company_name: 'GovTech',
                job_title: 'Backend Engineer',
                interview_date: new Date(2026, 6, 25, 14, 30).toISOString(),
                interview_type: 'Behavioural Interview',
            },
        ]);

        render(<>{confirmation.content ?? confirmation.description}</>);
        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            '1) Technical Interview for Software Engineer at Grab on 25 July 2026 from 2:00 pm to 3:00 pm.',
            '2) Behavioural Interview for Backend Engineer at GovTech on 25 July 2026 from 2:30 pm to 3:30 pm.',
            '3) Interview for Frontend Engineer at Shopee on 25 July 2026 from 2:45 pm to 4:00 pm.',
        ]);
    });
});
