import type { CreateApplicationRequest, CreateApplicationResult } from './models.js';
import { findPotentialDuplicateApplication, insertJobApplication } from './repository.js';

export const createApplication = async (
    userId: number,
    input: CreateApplicationRequest
): Promise<CreateApplicationResult> => {
    if (input.allowDuplicate !== true) {
        const duplicate = await findPotentialDuplicateApplication(
            userId,
            input.companyName,
            input.jobTitle,
            input.jobURL
        );
        if (duplicate) {
            return { status: 'duplicate', duplicate };
        }
    }

    await insertJobApplication(
        userId,
        input.companyName,
        input.jobTitle,
        input.appDate === null ? null : new Date(input.appDate).toISOString(),
        input.jobStatus,
        input.jobLocation,
        input.jobURL
    );
    return { status: 'created' };
};
