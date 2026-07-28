import type { JobStatus } from './models';

type ApplicationFormValues = {
    applicationDate: string;
    companyName: string;
    jobLocation: string;
    jobStatus: JobStatus;
    jobTitle: string;
    jobURL: string;
};

export const hasUnsavedApplicationFormChanges = ({
    applicationDate,
    companyName,
    jobLocation,
    jobStatus,
    jobTitle,
    jobURL,
}: ApplicationFormValues): boolean =>
    companyName !== '' ||
    jobTitle !== '' ||
    jobStatus !== 'Applied' ||
    applicationDate !== '' ||
    jobLocation !== '' ||
    jobURL !== '';
