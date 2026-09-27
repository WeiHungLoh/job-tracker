import { toSupportedQueryValues } from '../../shared/http/validation.js';
import type { JobStatus } from './models.js';
import { JOB_STATUSES } from './models.js';

export const isJobStatus = (value: unknown): value is JobStatus =>
    typeof value === 'string' && JOB_STATUSES.includes(value as JobStatus);

export const isJobStatusArray = (value: unknown): value is JobStatus[] => {
    return Array.isArray(value) && value.every(isJobStatus) && new Set(value).size === value.length;
};

export const toJobStatusQueryValues = (value: unknown): JobStatus[] | undefined =>
    toSupportedQueryValues(value, JOB_STATUSES);
