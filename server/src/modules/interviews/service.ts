import { getInterviewOfferDeadlineWarnings } from '../offers/api.js';
import type { CreateInterviewRequest, CreateInterviewResult } from './models.js';
import { getInterviewSchedulingConflicts, insertInterview } from './repository.js';

export const createInterview = async (
    userId: number,
    input: CreateInterviewRequest
): Promise<CreateInterviewResult> => {
    const normalizedInterviewDate = new Date(input.interviewDate).toISOString();
    if (input.allowSchedulingConflict !== true) {
        const conflicts = await getInterviewSchedulingConflicts(
            input.jobId,
            userId,
            normalizedInterviewDate,
            input.interviewDurationMinutes
        );
        if (conflicts.length > 0) {
            return { status: 'scheduling-conflict', conflicts };
        }
    }

    if (input.allowOfferDeadlineWarning !== true) {
        const warnings = await getInterviewOfferDeadlineWarnings(
            input.jobId,
            userId,
            normalizedInterviewDate,
            input.interviewDurationMinutes
        );
        if (warnings.length > 0) {
            return { status: 'offer-deadline-warning', warnings };
        }
    }

    const status = await insertInterview(
        input.jobId,
        userId,
        normalizedInterviewDate,
        input.interviewDurationMinutes,
        input.interviewLocation,
        input.interviewType,
        input.meetingURL ?? '',
        input.notes
    );
    return { status };
};
