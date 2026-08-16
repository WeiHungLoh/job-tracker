import { JOB_STATUS_ORDER, type ApplicationListSortOrder, type JobStatus } from './models';

type SortableApplication = {
    application_date: string;
    company_name: string;
    is_pinned: boolean;
    job_status: JobStatus;
};

const compareApplicationDates = (firstDate: string, secondDate: string): number =>
    Date.parse(firstDate) - Date.parse(secondDate);

const compareCompanyNames = (firstCompanyName: string, secondCompanyName: string): number =>
    firstCompanyName.localeCompare(secondCompanyName, undefined, { sensitivity: 'base' });

const compareCompanyNamesWithNewestFirst = (
    firstApplication: SortableApplication,
    secondApplication: SortableApplication,
    direction: 'asc' | 'desc'
): number => {
    const byCompany =
        direction === 'asc'
            ? compareCompanyNames(firstApplication.company_name, secondApplication.company_name)
            : compareCompanyNames(secondApplication.company_name, firstApplication.company_name);

    return byCompany || compareApplicationDates(secondApplication.application_date, firstApplication.application_date);
};

export const shouldAutoScrollAfterStatusChange = (
    autoScrollEnabled: boolean,
    sortOrder: ApplicationListSortOrder
): boolean => autoScrollEnabled && sortOrder === 'job_status';

export const sortApplications = <Application extends SortableApplication>(
    applications: readonly Application[],
    sortOrder: ApplicationListSortOrder
): Application[] => {
    return [...applications].sort((firstApplication, secondApplication) => {
        const byPinned = Number(Boolean(secondApplication.is_pinned)) - Number(Boolean(firstApplication.is_pinned));
        if (byPinned !== 0) {
            return byPinned;
        }

        switch (sortOrder) {
            case 'job_status': {
                const byStatus =
                    JOB_STATUS_ORDER[firstApplication.job_status] - JOB_STATUS_ORDER[secondApplication.job_status];

                return (
                    byStatus ||
                    compareApplicationDates(secondApplication.application_date, firstApplication.application_date) ||
                    compareCompanyNames(firstApplication.company_name, secondApplication.company_name)
                );
            }
            case 'application_date_desc': {
                const byDate = compareApplicationDates(
                    secondApplication.application_date,
                    firstApplication.application_date
                );

                return byDate || compareCompanyNames(firstApplication.company_name, secondApplication.company_name);
            }
            case 'application_date_asc': {
                const byDate = compareApplicationDates(
                    firstApplication.application_date,
                    secondApplication.application_date
                );

                return byDate || compareCompanyNames(firstApplication.company_name, secondApplication.company_name);
            }
            case 'company_name_asc':
                return compareCompanyNamesWithNewestFirst(firstApplication, secondApplication, 'asc');
            case 'company_name_desc':
                return compareCompanyNamesWithNewestFirst(firstApplication, secondApplication, 'desc');
        }
    });
};
