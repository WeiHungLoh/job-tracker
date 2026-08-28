import { screen } from '@testing-library/react';
import { JobTrackerAPIError } from '../../api/models';
import {
    createInterviewOfferDeadlineConfirmation,
    findInterviewOfferDeadlineWarnings,
    isInterviewOfferDeadlineWarningError,
} from '../../pages/interview/interviewOfferDeadlineWarning';
import type { InterviewOfferDeadlineWarningResponse } from '../../pages/interview/models';
import { render } from '../renderWithProviders';

const warning = {
    job_id: 12,
    company_name: 'Grab',
    job_title: 'Software Engineer',
    decision_deadline: new Date(2026, 6, 25, 15, 0).toISOString(),
};

const warningResponse: InterviewOfferDeadlineWarningResponse = {
    code: 'INTERVIEW_OFFER_DEADLINE_WARNING',
    message: 'This interview may finish after an active offer deadline.',
    warnings: [warning],
};

describe('interview offer deadline warning', () => {
    test('strictly identifies a structured 409 offer deadline warning', () => {
        expect(isInterviewOfferDeadlineWarningError(new JobTrackerAPIError('Conflict', 409, warningResponse))).toBe(
            true
        );
        expect(isInterviewOfferDeadlineWarningError(new JobTrackerAPIError(warningResponse.message, 409))).toBe(false);
        expect(
            isInterviewOfferDeadlineWarningError(
                new JobTrackerAPIError('Conflict', 409, {
                    ...warningResponse,
                    warnings: [{ ...warning, decision_deadline: 'invalid' }],
                })
            )
        ).toBe(false);
        expect(isInterviewOfferDeadlineWarningError(new JobTrackerAPIError('Conflict', 500, warningResponse))).toBe(
            false
        );
    });

    test('uses simple wording when the interview starts after the deadline', () => {
        const confirmation = createInterviewOfferDeadlineConfirmation([warning], new Date(2026, 6, 25, 15, 30), 60);

        expect(confirmation).toMatchObject({
            title: 'Offer deadline warning',
            confirmationText: 'Add anyway',
            cancellationText: 'Cancel',
            confirmationButtonProps: { autoFocus: true },
        });
        render(<>{confirmation.content ?? confirmation.description}</>);
        expect(screen.getByText(/This interview starts after the offer deadline/i)).toHaveTextContent(
            'This interview starts after the offer deadline for Software Engineer at Grab. The offer deadline is 25 July 2026 at 3:00 pm.'
        );
        expect(screen.getByText(/You may want to ask for more time/i)).toBeInTheDocument();
    });

    test('explains when an interview starts before but ends after a deadline', () => {
        const confirmation = createInterviewOfferDeadlineConfirmation([warning], new Date(2026, 6, 25, 14, 30), 60);

        render(<>{confirmation.content ?? confirmation.description}</>);
        expect(screen.getByText(/This interview ends after the offer deadline/i)).toHaveTextContent(
            'This interview ends after the offer deadline for Software Engineer at Grab. The offer deadline is 25 July 2026 at 3:00 pm.'
        );
    });

    test('finds only other active offers with a saved deadline reached by a future interview', () => {
        const applications = [
            {
                job_id: 11,
                company_name: 'Target',
                job_title: 'Target role',
                application_date: '2026-01-01T00:00:00.000Z',
                job_status: 'Interview' as const,
                job_location: '',
                job_posting_url: '',
                notes: '',
            },
            {
                job_id: 12,
                company_name: 'Grab',
                job_title: 'Software Engineer',
                application_date: '2026-01-01T00:00:00.000Z',
                job_status: 'Offer' as const,
                job_location: '',
                job_posting_url: '',
                notes: '',
            },
            {
                job_id: 13,
                company_name: 'Past',
                job_title: 'Expired offer',
                application_date: '2026-01-01T00:00:00.000Z',
                job_status: 'Accepted' as const,
                job_location: '',
                job_posting_url: '',
                notes: '',
            },
            {
                job_id: 14,
                company_name: 'Expired',
                job_title: 'Expired offer',
                application_date: '2026-01-01T00:00:00.000Z',
                job_status: 'Offer' as const,
                job_location: '',
                job_posting_url: '',
                notes: '',
            },
        ];
        const evaluations = {
            12: { job_id: 12, ratings: {}, details: { decision_deadline: warning.decision_deadline } },
            13: {
                job_id: 13,
                ratings: {},
                details: { decision_deadline: new Date(2026, 6, 24, 15, 0).toISOString() },
            },
            14: {
                job_id: 14,
                ratings: {},
                details: { decision_deadline: new Date(2026, 6, 25, 11, 0).toISOString() },
            },
        };

        expect(
            findInterviewOfferDeadlineWarnings(
                applications,
                evaluations,
                {
                    jobId: 11,
                    interviewDate: new Date(2026, 6, 25, 14, 30),
                    interviewDurationMinutes: 60,
                },
                new Date(2026, 6, 25, 12, 0)
            )
        ).toEqual([warning]);
    });
});
