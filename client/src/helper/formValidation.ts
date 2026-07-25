import { isInvalidDatetimeLocalInput, parseDatetimeLocal } from './dateFormatter';
import { INTERVIEW_DURATION_MINUTES_MAX, INTERVIEW_DURATION_MINUTES_MIN } from './interviewTiming';

export const FIELD_MAX_LENGTHS = {
    companyName: 150,
    jobTitle: 150,
    location: 200,
    interviewType: 100,
    jobURL: 2048,
    notes: 3000,
} as const;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MAX_BYTES = 72;

const HOSTNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/i;

type ValidForm<TValues> = {
    isValid: true;
    values: TValues;
};

type InvalidForm<TErrors> = {
    errors: TErrors;
    isValid: false;
};

type FormValidationResult<TValues, TErrors> = ValidForm<TValues> | InvalidForm<TErrors>;

export type ApplicationFormErrors = {
    applicationDate?: string;
    companyName?: string;
    jobLocation?: string;
    jobTitle?: string;
    jobURL?: string;
};

export type ApplicationFormField = keyof ApplicationFormErrors;

export type InterviewFormErrors = {
    interviewDate?: string;
    interviewDurationMinutes?: string;
    interviewLocation?: string;
    interviewType?: string;
    notes?: string;
};

export type InterviewFormField = keyof InterviewFormErrors;

type ApplicationFormInput = {
    applicationDate: string;
    applicationDateValidity?: ValidityState;
    companyName: string;
    jobLocation: string;
    jobTitle: string;
    jobURL: string;
};

type ValidApplicationFormValues = {
    applicationDate: Date;
    companyName: string;
    jobLocation: string;
    jobTitle: string;
    jobURL: string;
};

type InterviewFormInput = {
    applicationDate: string;
    interviewDate: string;
    interviewDateValidity?: ValidityState;
    interviewDurationMinutes: string;
    interviewDurationValidity?: ValidityState;
    interviewLocation: string;
    interviewType: string;
    notes: string;
};

type ValidInterviewFormValues = {
    interviewDate: Date;
    interviewDurationMinutes: number;
    interviewLocation: string;
    interviewType: string;
    notes: string;
};

const invalidForm = <TErrors>(errors: TErrors): InvalidForm<TErrors> => ({ errors, isValid: false });

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const getPasswordValidationError = (value: string): string | undefined => {
    const passwordLength = [...value].length;
    if (passwordLength < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (passwordLength > PASSWORD_MAX_LENGTH) {
        return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
    }
    if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
        return 'Password is too long when encoded. Use fewer Unicode characters.';
    }
    return undefined;
};

export const isValidHttpURL = (value: string): boolean => {
    try {
        const parsedURL = new URL(value);
        return (
            (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') &&
            HOSTNAME_PATTERN.test(parsedURL.hostname)
        );
    } catch {
        return false;
    }
};

export const validateApplicationForm = (
    { applicationDate, applicationDateValidity, companyName, jobLocation, jobTitle, jobURL }: ApplicationFormInput,
    currentDate = new Date()
): FormValidationResult<ValidApplicationFormValues, ApplicationFormErrors> => {
    const trimmedCompanyName = companyName.trim();
    const trimmedJobTitle = jobTitle.trim();
    const trimmedJobLocation = jobLocation.trim();
    const trimmedJobURL = jobURL.trim();
    const errors: ApplicationFormErrors = {};

    if (!trimmedCompanyName) {
        errors.companyName = 'Please enter a company name.';
    }

    if (!trimmedJobTitle) {
        errors.jobTitle = 'Please enter a job title.';
    }

    if (trimmedCompanyName.length > FIELD_MAX_LENGTHS.companyName) {
        errors.companyName = `Company name must be ${FIELD_MAX_LENGTHS.companyName} characters or fewer.`;
    }

    if (trimmedJobTitle.length > FIELD_MAX_LENGTHS.jobTitle) {
        errors.jobTitle = `Job title must be ${FIELD_MAX_LENGTHS.jobTitle} characters or fewer.`;
    }

    if (trimmedJobLocation.length > FIELD_MAX_LENGTHS.location) {
        errors.jobLocation = `Job location must be ${FIELD_MAX_LENGTHS.location} characters or fewer.`;
    }

    if (trimmedJobURL.length > FIELD_MAX_LENGTHS.jobURL) {
        errors.jobURL = `Job URL must be ${FIELD_MAX_LENGTHS.jobURL} characters or fewer.`;
    }

    const applicationDateIsInvalid = isInvalidDatetimeLocalInput(applicationDate, applicationDateValidity);
    let parsedApplicationDate = currentDate;

    if (applicationDateIsInvalid) {
        errors.applicationDate = 'Please enter a valid application date.';
    } else if (applicationDate) {
        parsedApplicationDate = parseDatetimeLocal(applicationDate);

        if (parsedApplicationDate > currentDate) {
            errors.applicationDate = 'Application date cannot be later than the current date.';
        }
    }

    if (!errors.jobURL && trimmedJobURL && !isValidHttpURL(trimmedJobURL)) {
        errors.jobURL = 'URL must be in a valid format.';
    }

    if (Object.keys(errors).length > 0) {
        return invalidForm(errors);
    }

    return {
        isValid: true,
        values: {
            applicationDate: parsedApplicationDate,
            companyName: trimmedCompanyName,
            jobLocation: trimmedJobLocation,
            jobTitle: trimmedJobTitle,
            jobURL: trimmedJobURL,
        },
    };
};

export const validateInterviewForm = ({
    applicationDate,
    interviewDate,
    interviewDateValidity,
    interviewDurationMinutes,
    interviewDurationValidity,
    interviewLocation,
    interviewType,
    notes,
}: InterviewFormInput): FormValidationResult<ValidInterviewFormValues, InterviewFormErrors> => {
    const trimmedInterviewLocation = interviewLocation.trim();
    const trimmedInterviewType = interviewType.trim();
    const trimmedNotes = notes.trim();
    const parsedDuration = Number(interviewDurationMinutes);
    const errors: InterviewFormErrors = {};
    const interviewDateIsInvalid = isInvalidDatetimeLocalInput(interviewDate, interviewDateValidity);
    let parsedInterviewDate: Date | undefined;

    if (interviewDateIsInvalid) {
        errors.interviewDate = 'Please enter a valid interview date.';
    } else if (!interviewDate) {
        errors.interviewDate = 'Please enter an interview date.';
    } else {
        parsedInterviewDate = parseDatetimeLocal(interviewDate);
        if (parsedInterviewDate <= new Date(applicationDate)) {
            errors.interviewDate = 'Interview date must be after the job application date.';
        }
    }

    if (!trimmedInterviewLocation) {
        errors.interviewLocation = 'Please enter an interview location.';
    } else if (trimmedInterviewLocation.length > FIELD_MAX_LENGTHS.location) {
        errors.interviewLocation = `Interview location must be ${FIELD_MAX_LENGTHS.location} characters or fewer.`;
    }

    if (
        !interviewDurationMinutes.trim() ||
        interviewDurationValidity?.badInput ||
        interviewDurationValidity?.rangeUnderflow ||
        interviewDurationValidity?.rangeOverflow ||
        interviewDurationValidity?.stepMismatch ||
        !Number.isInteger(parsedDuration) ||
        parsedDuration < INTERVIEW_DURATION_MINUTES_MIN ||
        parsedDuration > INTERVIEW_DURATION_MINUTES_MAX
    ) {
        errors.interviewDurationMinutes = `Please enter a duration between ${INTERVIEW_DURATION_MINUTES_MIN} and ${INTERVIEW_DURATION_MINUTES_MAX} minutes`;
    }

    if (trimmedInterviewType.length > FIELD_MAX_LENGTHS.interviewType) {
        errors.interviewType = `Interview type must be ${FIELD_MAX_LENGTHS.interviewType} characters or fewer.`;
    }

    if (trimmedNotes.length > FIELD_MAX_LENGTHS.notes) {
        errors.notes = `Notes must be ${FIELD_MAX_LENGTHS.notes} characters or fewer.`;
    }

    if (Object.keys(errors).length > 0) {
        return invalidForm(errors);
    }

    return {
        isValid: true,
        values: {
            interviewDate: parsedInterviewDate as Date,
            interviewDurationMinutes: parsedDuration,
            interviewLocation: trimmedInterviewLocation,
            interviewType: trimmedInterviewType,
            notes: trimmedNotes,
        },
    };
};
