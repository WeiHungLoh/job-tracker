import { toSupportedQueryValues } from '../../shared/http/validation.js';
import type { InterviewTimeFilter } from './models.js';
import { INTERVIEW_TIME_FILTERS } from './models.js';

const isInterviewTimeFilter = (value: unknown): value is InterviewTimeFilter =>
    typeof value === 'string' && INTERVIEW_TIME_FILTERS.includes(value as InterviewTimeFilter);

export const isInterviewTimeFilterArray = (value: unknown): value is InterviewTimeFilter[] => {
    return Array.isArray(value) && value.every(isInterviewTimeFilter) && new Set(value).size === value.length;
};

export const toInterviewTimeFilterQueryValues = (value: unknown): InterviewTimeFilter[] | undefined =>
    toSupportedQueryValues(value, INTERVIEW_TIME_FILTERS);
