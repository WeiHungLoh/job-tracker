import type { JobApplication } from '../../pages/application/models';
import type { JobInterview } from '../../pages/interview/models';
import {
    createApplicationFollowUpDraft,
    createPostInterviewFollowUpDraft,
} from '../../pages/dashboard/attentionCenter/followUpDrafts';

const application: JobApplication = {
    job_id: 12,
    company_name: 'Acme',
    job_title: 'Software Engineer',
    application_date: '2026-07-13T09:30:00.000Z',
    job_status: 'Applied',
    job_location: 'Singapore',
    job_posting_url: 'https://example.com/job',
    notes: 'Private application note',
};

const interview: JobInterview = {
    interview_id: 34,
    job_id: 12,
    company_name: 'Acme',
    job_title: 'Software Engineer',
    interview_date: '2026-07-15T08:00:00.000Z',
    interview_duration_minutes: 90,
    interview_location: 'Private meeting room',
    interview_type: 'Panel',
    interview_notes: 'Private interview note',
};

describe('follow-up draft generation', () => {
    test('creates the exact deterministic application follow-up without mutating its input', () => {
        const originalApplication = structuredClone(application);

        const firstDraft = createApplicationFollowUpDraft(application);
        const secondDraft = createApplicationFollowUpDraft(application);

        expect(firstDraft).toEqual({
            title: 'Draft application follow-up',
            subject: 'Follow-up on my Software Engineer application at Acme',
            message: `Dear Hiring Team,

I hope you’re doing well. I’m following up on my application for the Software Engineer position at Acme, submitted on 13 July 2026.

I remain very interested in the opportunity and would appreciate any update you can share regarding the status of my application.

Thank you for your time and consideration.

Best regards,
[Your name]`,
        });
        expect(secondDraft).toEqual(firstDraft);
        expect(application).toEqual(originalApplication);
        expect(firstDraft.message).not.toContain("[Recruiter's name]");
        expect(firstDraft.message).not.toContain('days ago');
        expect(firstDraft.message).not.toContain('Private application note');
        expect(firstDraft.message).not.toContain('https://example.com/job');
    });

    test('creates the exact deterministic post-interview draft without mutating either input', () => {
        const originalApplication = structuredClone(application);
        const originalInterview = structuredClone(interview);

        const firstDraft = createPostInterviewFollowUpDraft(application, interview);
        const secondDraft = createPostInterviewFollowUpDraft(application, interview);

        expect(firstDraft).toEqual({
            title: 'Draft post-interview message',
            subject: 'Follow-up after my Software Engineer interview at Acme',
            message: `Hi [Interviewer's name],

Thank you again for taking the time to speak with me on 15 July 2026 about the Software Engineer position at Acme. I enjoyed learning more about the role and remain very interested in the opportunity.

I’m following up to ask whether there are any updates regarding the next steps in the hiring process.

Thank you for your time.

Best regards,
[Your name]`,
        });
        expect(secondDraft).toEqual(firstDraft);
        expect(application).toEqual(originalApplication);
        expect(interview).toEqual(originalInterview);
        expect(firstDraft.message).not.toContain('13 July 2026');
        expect(firstDraft.message).not.toContain('Private meeting room');
        expect(firstDraft.message).not.toContain('Private interview note');
        expect(firstDraft.message).not.toContain('90');
    });
});
