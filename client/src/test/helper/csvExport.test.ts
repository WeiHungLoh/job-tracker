import { createApplicationCsvData, createInterviewCsvData, escapeCsvFormula } from '../../helper/csvExport';
import { APPLICATION_CSV_HEADERS } from '../../pages/application/models';
import { INTERVIEW_CSV_HEADERS } from '../../pages/interview/models';

describe('escapeCsvFormula', () => {
    test.each([
        ['=SUM(1,1)', "'=SUM(1,1)"],
        ['+SUM(1,1)', "'+SUM(1,1)"],
        ['-CMD', "'-CMD"],
        ['@HYPERLINK("https://evil.example","Click")', '\'@HYPERLINK("https://evil.example","Click")'],
        ['\t=SUM(1,1)', "'\t=SUM(1,1)"],
        ['\r=SUM(1,1)', "'\r=SUM(1,1)"],
        ['   =SUM(1,1)', "'   =SUM(1,1)"],
        ['normal text', 'normal text'],
        ['N/A', 'N/A'],
    ])('escapes dangerous spreadsheet input %#', (value, expected) => {
        expect(escapeCsvFormula(value)).toBe(expected);
    });

    test('leaves non-string values unchanged', () => {
        expect(escapeCsvFormula(123)).toBe(123);
        expect(escapeCsvFormula(null)).toBeNull();
        expect(escapeCsvFormula(undefined)).toBeUndefined();
    });
});

describe('CSV export data', () => {
    test('formats dates, preserves N/A fallbacks, and sanitizes application fields', () => {
        const [application] = createApplicationCsvData([
            {
                application_date: '2025-06-20T00:00:00Z',
                application_follow_up_sent_at: '2025-06-22T09:30:00Z',
                company_name: '=SUM(1,1)',
                is_pinned: true,
                job_location: '   =REMOTE()',
                job_posting_url: '+https://evil.example',
                job_status: '-CMD',
                job_title: '@HYPERLINK("https://evil.example","Click")',
                notes: '',
            },
        ]);

        expect(application).toMatchObject({
            application_date: expect.stringMatching(/20 June 2025/),
            application_follow_up_sent_at: expect.stringMatching(/22 June 2025/),
            company_name: "'=SUM(1,1)",
            is_pinned: 'Yes',
            job_location: "'   =REMOTE()",
            job_posting_url: "'+https://evil.example",
            job_status: "'-CMD",
            job_title: '\'@HYPERLINK("https://evil.example","Click")',
            notes: 'N/A',
        });
    });

    test('formats dates, preserves N/A fallbacks, and sanitizes interview fields', () => {
        const [interview] = createInterviewCsvData([
            {
                company_name: '=SUM(1,1)',
                follow_up_sent_at: '2025-06-22T09:30:00Z',
                interview_date: '2025-06-20T00:00:00Z',
                interview_duration_minutes: 60,
                interview_location: '\t=LOCATION()',
                interview_notes: '\r=NOTES()',
                interview_type: '+TECHNICAL()',
                is_pinned: true,
                job_status: '-CMD',
                job_title: '@HYPERLINK("https://evil.example","Click")',
            },
        ]);

        expect(interview).toMatchObject({
            company_name: "'=SUM(1,1)",
            follow_up_sent_at: expect.stringMatching(/22 June 2025/),
            interview_date: expect.stringMatching(/20 June 2025/),
            interview_duration_minutes: 60,
            interview_location: "'\t=LOCATION()",
            interview_notes: "'\r=NOTES()",
            interview_type: "'+TECHNICAL()",
            is_pinned: 'Yes',
            job_status: "'-CMD",
            job_title: '\'@HYPERLINK("https://evil.example","Click")',
            notes: "'\r=NOTES()",
        });

        const [emptyOptionalFields] = createInterviewCsvData([
            {
                company_name: 'Normal Company',
                interview_date: '2025-06-20T00:00:00Z',
                interview_duration_minutes: 60,
                interview_location: '',
                interview_notes: '',
                interview_type: '',
                is_pinned: false,
                job_title: 'Engineer',
            },
        ]);
        expect(emptyOptionalFields).toMatchObject({
            follow_up_sent_at: 'N/A',
            interview_location: 'N/A',
            interview_notes: 'N/A',
            interview_type: 'N/A',
            notes: 'N/A',
        });
    });

    test('exports missing application follow-up dates as N/A', () => {
        const [application] = createApplicationCsvData([
            {
                application_date: '2025-06-20T00:00:00Z',
                application_follow_up_sent_at: null,
                company_name: 'Normal Company',
                is_pinned: false,
                job_location: '',
                job_posting_url: '',
                job_status: 'Applied',
                job_title: 'Engineer',
                notes: '',
            },
        ]);

        expect(application.application_follow_up_sent_at).toBe('N/A');
    });

    test('includes follow-up sent columns in application and interview exports', () => {
        expect(APPLICATION_CSV_HEADERS).toContainEqual({
            label: 'Follow-up Sent',
            key: 'application_follow_up_sent_at',
        });
        expect(INTERVIEW_CSV_HEADERS).toContainEqual({
            label: 'Follow-up Sent',
            key: 'follow_up_sent_at',
        });
    });
});
