import { formatLongDate } from '../../../helper/dateFormatter';
import type { JobApplication } from '../../application/models';
import type { JobInterview } from '../../interview/models';

export type FollowUpDraft = {
    title: 'Draft application follow-up' | 'Draft post-interview message';
    subject: string;
    message: string;
};

export const createApplicationFollowUpDraft = (application: JobApplication): FollowUpDraft => ({
    title: 'Draft application follow-up',
    subject: `Follow-up on my ${application.job_title} application at ${application.company_name}`,
    message: `Dear Hiring Team,

I hope you’re doing well. I’m following up on my application for the ${application.job_title} position at ${
        application.company_name
    }, submitted on ${formatLongDate(application.application_date)}.

I remain very interested in the opportunity and would appreciate any update you can share regarding the status of my application.

Thank you for your time and consideration.

Best regards,
[Your name]`,
});

export const createPostInterviewFollowUpDraft = (
    application: JobApplication,
    interview: JobInterview
): FollowUpDraft => ({
    title: 'Draft post-interview message',
    subject: `Follow-up after my ${application.job_title} interview at ${application.company_name}`,
    message: `Hi [Interviewer's name],

Thank you again for taking the time to speak with me on ${formatLongDate(interview.interview_date)} about the ${
        application.job_title
    } position at ${
        application.company_name
    }. I enjoyed learning more about the role and remain very interested in the opportunity.

I’m following up to ask whether there are any updates regarding the next steps in the hiring process.

Thank you for your time.

Best regards,
[Your name]`,
});
