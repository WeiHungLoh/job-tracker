import type { ConfirmOptions } from 'material-ui-confirm';
import { JobTrackerAPIError } from '../../api/models';
import type { JobApplication } from '../application/models';
import type { InterviewOfferDeadlineWarning, InterviewOfferDeadlineWarningResponse } from './models';

type OfferDeadlineEvaluation = {
    details: {
        decision_deadline: string;
    };
};

type ProposedInterview = {
    jobId: number;
    interviewDate: Date;
    interviewDurationMinutes: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0;

const isOfferDeadlineWarning = (value: unknown): value is InterviewOfferDeadlineWarning => {
    if (!isRecord(value)) {
        return false;
    }

    return (
        isPositiveInteger(value.job_id) &&
        typeof value.company_name === 'string' &&
        value.company_name.trim().length > 0 &&
        typeof value.job_title === 'string' &&
        value.job_title.trim().length > 0 &&
        typeof value.decision_deadline === 'string' &&
        !Number.isNaN(Date.parse(value.decision_deadline))
    );
};

export const isInterviewOfferDeadlineWarningError = (
    error: unknown
): error is JobTrackerAPIError & { data: InterviewOfferDeadlineWarningResponse } => {
    if (!(error instanceof JobTrackerAPIError) || error.status !== 409 || !isRecord(error.data)) {
        return false;
    }

    return (
        error.data.code === 'INTERVIEW_OFFER_DEADLINE_WARNING' &&
        typeof error.data.message === 'string' &&
        error.data.message.trim().length > 0 &&
        Array.isArray(error.data.warnings) &&
        error.data.warnings.length > 0 &&
        error.data.warnings.every(isOfferDeadlineWarning)
    );
};

const formatDeadline = (deadline: string): string =>
    new Date(deadline)
        .toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
        .replace(',', ' at');

const getWarningDescription = (
    warning: InterviewOfferDeadlineWarning,
    interviewStart: Date,
    interviewDurationMinutes: number
): string => {
    const deadline = new Date(warning.decision_deadline);
    const interviewEnd = new Date(interviewStart.getTime() + interviewDurationMinutes * 60 * 1000);
    const timing =
        interviewStart.getTime() === deadline.getTime()
            ? 'starts at'
            : interviewStart > deadline
            ? 'starts after'
            : interviewEnd > deadline
            ? 'ends after'
            : 'reaches';

    return `This interview ${timing} the offer deadline for ${warning.job_title} at ${
        warning.company_name
    }. The offer deadline is ${formatDeadline(warning.decision_deadline)}.`;
};

const sortWarningsByDeadline = (warnings: readonly InterviewOfferDeadlineWarning[]): InterviewOfferDeadlineWarning[] =>
    [...warnings].sort(
        (firstWarning, secondWarning) =>
            Date.parse(firstWarning.decision_deadline) - Date.parse(secondWarning.decision_deadline) ||
            firstWarning.job_id - secondWarning.job_id
    );

export const createInterviewOfferDeadlineConfirmation = (
    warnings: readonly InterviewOfferDeadlineWarning[],
    interviewStart: Date,
    interviewDurationMinutes: number
): ConfirmOptions => {
    const orderedWarnings = sortWarningsByDeadline(warnings);
    const options: ConfirmOptions = {
        title: 'Offer Deadline Warning',
        confirmationText: 'Add Anyway',
        cancellationText: 'Cancel',
        confirmationButtonProps: { autoFocus: true },
    };
    const advice = <p>You may want to ask for more time or see if this interview can happen sooner.</p>;

    if (orderedWarnings.length === 1) {
        options.content = (
            <>
                <p>{getWarningDescription(orderedWarnings[0], interviewStart, interviewDurationMinutes)}</p>
                {advice}
            </>
        );
        return options;
    }

    options.content = (
        <>
            <p>This interview may happen too late for these active offers:</p>
            <ol
                style={{
                    display: 'grid',
                    gap: 'var(--spaceControl)',
                    listStyleType: 'none',
                    paddingLeft: 0,
                }}
            >
                {orderedWarnings.map((warning, index) => (
                    <li key={warning.job_id}>
                        {index + 1}) {getWarningDescription(warning, interviewStart, interviewDurationMinutes)}
                    </li>
                ))}
            </ol>
            {advice}
        </>
    );
    return options;
};

export const findInterviewOfferDeadlineWarnings = (
    applications: readonly JobApplication[],
    evaluations: Readonly<Record<number, OfferDeadlineEvaluation>>,
    interview: ProposedInterview,
    currentTime: Date
): InterviewOfferDeadlineWarning[] => {
    if (interview.interviewDate < currentTime) {
        return [];
    }

    const interviewEnd = interview.interviewDate.getTime() + interview.interviewDurationMinutes * 60 * 1000;

    return applications
        .filter((application) => application.job_id !== interview.jobId && application.job_status === 'Offer')
        .flatMap((application) => {
            const deadlineValue = evaluations[application.job_id]?.details.decision_deadline;
            const deadline = deadlineValue ? new Date(deadlineValue) : undefined;
            if (
                !deadline ||
                Number.isNaN(deadline.getTime()) ||
                deadline < currentTime ||
                deadline.getTime() > interviewEnd
            ) {
                return [];
            }

            return [
                {
                    job_id: application.job_id,
                    company_name: application.company_name,
                    job_title: application.job_title,
                    decision_deadline: deadline.toISOString(),
                },
            ];
        })
        .sort(
            (firstWarning, secondWarning) =>
                Date.parse(firstWarning.decision_deadline) - Date.parse(secondWarning.decision_deadline) ||
                firstWarning.job_id - secondWarning.job_id
        );
};
