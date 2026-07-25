import {
    FIELD_MAX_LENGTHS,
    getPasswordValidationError,
    normalizeEmail,
    PASSWORD_MAX_BYTES,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    validateApplicationForm,
    validateInterviewForm,
} from '../../helper/formValidation';

describe('authentication form validation', () => {
    test('normalizes email addresses', () => {
        expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });

    test('enforces password length without composition rules', () => {
        expect(getPasswordValidationError('x'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(
            'Password must be at least 8 characters.'
        );
        expect(getPasswordValidationError('x'.repeat(PASSWORD_MIN_LENGTH))).toBeUndefined();
        expect(getPasswordValidationError('x'.repeat(PASSWORD_MAX_LENGTH))).toBeUndefined();
        expect(getPasswordValidationError('words with spaces')).toBeUndefined();
        expect(getPasswordValidationError(`${'x'.repeat(63)}😀`)).toBeUndefined();
        expect(getPasswordValidationError('x'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(
            'Password must be 64 characters or fewer.'
        );
        expect(getPasswordValidationError('😀'.repeat(16))).toBeUndefined();
        expect(getPasswordValidationError('x'.repeat(PASSWORD_MAX_BYTES - 16) + '😀'.repeat(5))).toBe(
            'Password is too long when encoded. Use fewer Unicode characters.'
        );
        expect(getPasswordValidationError('😀'.repeat(19))).toBe(
            'Password is too long when encoded. Use fewer Unicode characters.'
        );
    });
});

describe('job tracker form validation', () => {
    test('normalizes valid application form values', () => {
        const result = validateApplicationForm(
            {
                applicationDate: '',
                companyName: '  Acme  ',
                jobLocation: '  Remote  ',
                jobTitle: '  Engineer  ',
                jobURL: '  https://jobs.example.com/engineer  ',
            },
            new Date('2026-07-08T10:00:00')
        );

        expect(result).toEqual({
            isValid: true,
            values: {
                applicationDate: new Date('2026-07-08T10:00:00'),
                companyName: 'Acme',
                jobLocation: 'Remote',
                jobTitle: 'Engineer',
                jobURL: 'https://jobs.example.com/engineer',
            },
        });
    });

    test('returns every detectable application field error in one pass', () => {
        expect(
            validateApplicationForm({
                applicationDate: 'not-a-date',
                companyName: '   ',
                jobLocation: 'x'.repeat(FIELD_MAX_LENGTHS.location + 1),
                jobTitle: '',
                jobURL: 'not-a-url',
            })
        ).toEqual({
            errors: {
                applicationDate: 'Please enter a valid application date.',
                companyName: 'Please enter a company name.',
                jobLocation: `Job location must be ${FIELD_MAX_LENGTHS.location} characters or fewer.`,
                jobTitle: 'Please enter a job title.',
                jobURL: 'URL must be in a valid format.',
            },
            isValid: false,
        });
    });

    test('returns every detectable interview field error in one pass', () => {
        expect(
            validateInterviewForm({
                applicationDate: '2026-07-08T10:00',
                interviewDate: 'not-a-date',
                interviewDurationMinutes: '1.5',
                interviewLocation: '   ',
                interviewType: 'x'.repeat(FIELD_MAX_LENGTHS.interviewType + 1),
                notes: 'x'.repeat(FIELD_MAX_LENGTHS.notes + 1),
            })
        ).toEqual({
            errors: {
                interviewDate: 'Please enter a valid interview date.',
                interviewDurationMinutes: 'Please enter a duration between 1 and 1440 minutes',
                interviewLocation: 'Please enter an interview location.',
                interviewType: `Interview type must be ${FIELD_MAX_LENGTHS.interviewType} characters or fewer.`,
                notes: `Notes must be ${FIELD_MAX_LENGTHS.notes} characters or fewer.`,
            },
            isValid: false,
        });
    });

    test.each([
        [
            'companyName',
            { companyName: 'x'.repeat(FIELD_MAX_LENGTHS.companyName + 1) },
            `Company name must be ${FIELD_MAX_LENGTHS.companyName} characters or fewer.`,
        ],
        [
            'jobTitle',
            { jobTitle: 'x'.repeat(FIELD_MAX_LENGTHS.jobTitle + 1) },
            `Job title must be ${FIELD_MAX_LENGTHS.jobTitle} characters or fewer.`,
        ],
        [
            'jobURL',
            { jobURL: 'x'.repeat(FIELD_MAX_LENGTHS.jobURL + 1) },
            `Job URL must be ${FIELD_MAX_LENGTHS.jobURL} characters or fewer.`,
        ],
        [
            'applicationDate',
            { applicationDate: '2999-01-01T00:00' },
            'Application date cannot be later than the current date.',
        ],
    ] as const)('maps the application rule to the %s field', (field, overrides, message) => {
        const result = validateApplicationForm(
            {
                applicationDate: '',
                companyName: 'Acme',
                jobLocation: '',
                jobTitle: 'Engineer',
                jobURL: '',
                ...overrides,
            },
            new Date('2026-07-08T10:00:00')
        );

        expect(result).toEqual({ errors: { [field]: message }, isValid: false });
    });

    test.each([
        ['interviewDate', { interviewDate: '' }, 'Please enter an interview date.'],
        [
            'interviewDate',
            { interviewDate: '2026-07-08T10:00' },
            'Interview date must be after the job application date.',
        ],
        [
            'interviewLocation',
            { interviewLocation: 'x'.repeat(FIELD_MAX_LENGTHS.location + 1) },
            `Interview location must be ${FIELD_MAX_LENGTHS.location} characters or fewer.`,
        ],
    ] as const)('maps the interview rule to the %s field', (field, overrides, message) => {
        const result = validateInterviewForm({
            applicationDate: '2026-07-08T10:00',
            interviewDate: '2026-07-09T10:00',
            interviewDurationMinutes: '60',
            interviewLocation: 'Zoom',
            interviewType: '',
            notes: '',
            ...overrides,
        });

        expect(result).toEqual({ errors: { [field]: message }, isValid: false });
    });

    test.each(['', '0', '-1', '1441', '1.5'])('rejects invalid interview duration %s', (duration) => {
        expect(
            validateInterviewForm({
                applicationDate: '2026-07-08T10:00',
                interviewDate: '2026-07-09T10:00',
                interviewDurationMinutes: duration,
                interviewLocation: 'Zoom',
                interviewType: '',
                notes: '',
            })
        ).toEqual({
            errors: { interviewDurationMinutes: 'Please enter a duration between 1 and 1440 minutes' },
            isValid: false,
        });
    });

    test('returns separate errors when the interview date and location are missing', () => {
        expect(
            validateInterviewForm({
                applicationDate: '2026-07-08T10:00',
                interviewDate: '',
                interviewDurationMinutes: '60',
                interviewLocation: '',
                interviewType: '',
                notes: '',
            })
        ).toEqual({
            errors: {
                interviewDate: 'Please enter an interview date.',
                interviewLocation: 'Please enter an interview location.',
            },
            isValid: false,
        });
    });

    test.each(['1', '60', '1440'])('accepts valid interview duration %s', (duration) => {
        const result = validateInterviewForm({
            applicationDate: '2026-07-08T10:00',
            interviewDate: '2026-07-09T10:00',
            interviewDurationMinutes: duration,
            interviewLocation: 'Zoom',
            interviewType: '',
            notes: '',
        });

        expect(result).toMatchObject({
            isValid: true,
            values: { interviewDurationMinutes: Number(duration) },
        });
    });

    test('accepts existing text-length, URL and date boundaries', () => {
        const urlPrefix = 'https://example.com/';
        const applicationResult = validateApplicationForm(
            {
                applicationDate: '0001-01-01T00:00',
                companyName: 'x'.repeat(FIELD_MAX_LENGTHS.companyName),
                jobLocation: 'x'.repeat(FIELD_MAX_LENGTHS.location),
                jobTitle: 'x'.repeat(FIELD_MAX_LENGTHS.jobTitle),
                jobURL: `${urlPrefix}${'x'.repeat(FIELD_MAX_LENGTHS.jobURL - urlPrefix.length)}`,
            },
            new Date('2026-07-08T10:00:00')
        );
        const interviewResult = validateInterviewForm({
            applicationDate: '2026-07-08T10:00',
            interviewDate: '9999-12-31T23:59',
            interviewDurationMinutes: '1440',
            interviewLocation: 'x'.repeat(FIELD_MAX_LENGTHS.location),
            interviewType: 'x'.repeat(FIELD_MAX_LENGTHS.interviewType),
            notes: 'x'.repeat(FIELD_MAX_LENGTHS.notes),
        });

        expect(applicationResult).toMatchObject({ isValid: true });
        expect(interviewResult).toMatchObject({ isValid: true });
    });

    test('normalizes valid interview values without mutating either form input', () => {
        const applicationInput = {
            applicationDate: '',
            companyName: '  Acme  ',
            jobLocation: '  Remote  ',
            jobTitle: '  Engineer  ',
            jobURL: '  https://jobs.example.com/engineer  ',
        };
        const interviewInput = {
            applicationDate: '2026-07-08T10:00',
            interviewDate: '2026-07-09T10:00',
            interviewDurationMinutes: '60',
            interviewLocation: '  Zoom  ',
            interviewType: '  Technical  ',
            notes: '  Prepare examples  ',
        };
        const originalApplicationInput = { ...applicationInput };
        const originalInterviewInput = { ...interviewInput };

        const applicationResult = validateApplicationForm(applicationInput, new Date('2026-07-08T10:00:00'));
        const interviewResult = validateInterviewForm(interviewInput);

        expect(applicationInput).toEqual(originalApplicationInput);
        expect(interviewInput).toEqual(originalInterviewInput);
        expect(applicationResult).toMatchObject({
            isValid: true,
            values: {
                companyName: 'Acme',
                jobLocation: 'Remote',
                jobTitle: 'Engineer',
                jobURL: 'https://jobs.example.com/engineer',
            },
        });
        expect(interviewResult).toEqual({
            isValid: true,
            values: {
                interviewDate: new Date(2026, 6, 9, 10, 0),
                interviewDurationMinutes: 60,
                interviewLocation: 'Zoom',
                interviewType: 'Technical',
                notes: 'Prepare examples',
            },
        });
    });
});
