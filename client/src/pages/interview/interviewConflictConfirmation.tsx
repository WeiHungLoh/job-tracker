import type { ConfirmOptions } from 'material-ui-confirm';
import { JobTrackerAPIError } from '../../api/models';
import type { InterviewSchedulingConflict, InterviewSchedulingConflictResponse } from './models';
import {
    getInterviewTiming,
    INTERVIEW_DURATION_MINUTES_MAX,
    INTERVIEW_DURATION_MINUTES_MIN,
} from '../../helper/interviewTiming';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0;

const isSchedulingConflict = (value: unknown): value is InterviewSchedulingConflict => {
    if (!isRecord(value)) {
        return false;
    }

    return (
        isPositiveInteger(value.interview_id) &&
        isPositiveInteger(value.job_id) &&
        typeof value.company_name === 'string' &&
        value.company_name.trim().length > 0 &&
        typeof value.job_title === 'string' &&
        value.job_title.trim().length > 0 &&
        typeof value.interview_date === 'string' &&
        !Number.isNaN(Date.parse(value.interview_date)) &&
        isPositiveInteger(value.interview_duration_minutes) &&
        value.interview_duration_minutes >= INTERVIEW_DURATION_MINUTES_MIN &&
        value.interview_duration_minutes <= INTERVIEW_DURATION_MINUTES_MAX &&
        typeof value.interview_type === 'string'
    );
};

export const isInterviewSchedulingConflictError = (
    error: unknown
): error is JobTrackerAPIError & { data: InterviewSchedulingConflictResponse } => {
    if (!(error instanceof JobTrackerAPIError) || error.status !== 409 || !isRecord(error.data)) {
        return false;
    }

    return (
        error.data.code === 'INTERVIEW_SCHEDULING_CONFLICT' &&
        typeof error.data.message === 'string' &&
        error.data.message.trim().length > 0 &&
        Array.isArray(error.data.conflicts) &&
        error.data.conflicts.length > 0 &&
        error.data.conflicts.every(isSchedulingConflict)
    );
};

const getConflictDescription = (conflict: InterviewSchedulingConflict): string => {
    const interviewType = conflict.interview_type.trim() || 'Interview';
    const timing = getInterviewTiming(conflict);

    return `${interviewType} for ${conflict.job_title} at ${conflict.company_name} on ${timing.formattedRange}`;
};

const sortConflictsChronologically = (
    conflicts: readonly InterviewSchedulingConflict[]
): InterviewSchedulingConflict[] =>
    [...conflicts].sort((firstConflict, secondConflict) => {
        const startDifference =
            getInterviewTiming(firstConflict).start.getTime() - getInterviewTiming(secondConflict).start.getTime();
        return startDifference || firstConflict.interview_id - secondConflict.interview_id;
    });

export const createInterviewConflictConfirmation = (
    conflicts: readonly InterviewSchedulingConflict[]
): ConfirmOptions => {
    const options: ConfirmOptions = {
        title: 'Possible scheduling conflict',
        confirmationText: 'Add anyway',
        cancellationText: 'Cancel',
        confirmationButtonProps: { autoFocus: true },
    };

    if (conflicts.length === 1) {
        options.description = `This interview overlaps with your ${getConflictDescription(conflicts[0])}.`;
        return options;
    }

    const orderedConflicts = sortConflictsChronologically(conflicts);
    options.content = (
        <>
            <p>This interview overlaps with multiple existing interviews:</p>
            <ol
                style={{
                    display: 'grid',
                    gap: 'var(--spaceControl)',
                    listStyleType: 'none',
                    paddingLeft: 0,
                }}
            >
                {orderedConflicts.map((conflict, index) => (
                    <li key={conflict.interview_id}>
                        {index + 1}) {getConflictDescription(conflict)}.
                    </li>
                ))}
            </ol>
        </>
    );
    return options;
};
