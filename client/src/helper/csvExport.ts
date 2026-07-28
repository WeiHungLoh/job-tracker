import formatDate from './dateFormatter';

const DANGEROUS_CSV_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export const escapeCsvFormula = (value: unknown): unknown => {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmedStart = value.trimStart();
    const shouldEscape = DANGEROUS_CSV_PREFIXES.some(
        (prefix) => value.startsWith(prefix) || trimmedStart.startsWith(prefix)
    );

    return shouldEscape ? `'${value}` : value;
};

type ApplicationCsvSource = {
    application_date: string;
    company_name: string;
    is_pinned: boolean;
    job_location: string;
    job_posting_url: string;
    job_status: string;
    job_title: string;
    notes: string;
};

type InterviewCsvSource = {
    company_name: string;
    interview_date: string;
    interview_duration_minutes: number;
    interview_location: string;
    interview_type: string;
    interview_notes: string;
    is_pinned: boolean;
    job_status?: string;
    job_title: string;
    meeting_url: string;
};

const escapeOptionalCsvFormula = (value: string) => escapeCsvFormula(value || 'N/A');

export const createApplicationCsvData = <T extends ApplicationCsvSource>(applications: T[]) => {
    return applications.map((application) => ({
        ...application,
        application_date: formatDate(application.application_date).formattedDate,
        company_name: escapeCsvFormula(application.company_name),
        is_pinned: application.is_pinned ? 'Yes' : 'No',
        job_title: escapeCsvFormula(application.job_title),
        job_location: escapeOptionalCsvFormula(application.job_location),
        job_posting_url: escapeOptionalCsvFormula(application.job_posting_url),
        job_status: escapeCsvFormula(application.job_status),
        notes: escapeOptionalCsvFormula(application.notes),
    }));
};

export const createInterviewCsvData = <T extends InterviewCsvSource>(interviews: T[]) => {
    return interviews.map((interview) => {
        const interviewNotes = escapeOptionalCsvFormula(interview.interview_notes);

        return {
            ...interview,
            company_name: escapeCsvFormula(interview.company_name),
            interview_date: formatDate(interview.interview_date).formattedDate,
            interview_location: escapeOptionalCsvFormula(interview.interview_location),
            interview_notes: interviewNotes,
            interview_type: escapeOptionalCsvFormula(interview.interview_type),
            is_pinned: interview.is_pinned ? 'Yes' : 'No',
            job_status: escapeCsvFormula(interview.job_status),
            job_title: escapeCsvFormula(interview.job_title),
            meeting_url: escapeOptionalCsvFormula(interview.meeting_url),
            notes: interviewNotes,
        };
    });
};
