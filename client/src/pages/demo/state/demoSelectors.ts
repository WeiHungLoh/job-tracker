import type {
    ArchivedJobApplication,
    JobApplication,
    JobStatusCount,
    WeeklyApplicationCount,
} from '../../application/models';
import { JOB_STATUSES } from '../../application/models';
import { sortApplications } from '../../application/applicationSorting';
import type { DemoState } from '../models';
import { startOfLocalWeek, toDateString } from './demoDates';
import { getInterviewTiming } from '../../../helper/interviewTiming';
import type { OfferDecisionApplication, OfferDecisionWorkspaceData } from '../../offerDecision/models';

export const selectApplications = (state: DemoState): JobApplication[] => {
    const selectedStatuses = state.preferences.application_job_statuses;
    const sortOrder =
        state.preferences.application_view_mode === 'board'
            ? state.preferences.application_board_sort_order
            : state.preferences.application_list_sort_order;

    return sortApplications(
        state.applications.filter((application) => selectedStatuses.includes(application.job_status)),
        sortOrder
    );
};

export const selectArchivedApplications = (state: DemoState): ArchivedJobApplication[] => {
    const selectedStatuses = state.preferences.archived_application_job_statuses;
    const sortOrder =
        state.preferences.archived_application_view_mode === 'board'
            ? state.preferences.archived_application_board_sort_order
            : state.preferences.archived_application_list_sort_order;

    return sortApplications(
        state.archivedApplications.filter((application) => selectedStatuses.includes(application.job_status)),
        sortOrder
    );
};

export const selectInterviewJobIdSet = (state: DemoState): Set<number> => {
    return new Set(state.interviews.map((interview) => interview.job_id));
};

export const selectUpcomingInterviewCountByJob = (state: DemoState, now = new Date()): Record<number, number> => {
    const counts: Record<number, number> = {};

    state.interviews.forEach((interview) => {
        if (getInterviewTiming(interview, now).hasNotEnded) {
            counts[interview.job_id] = (counts[interview.job_id] || 0) + 1;
        }
    });

    return counts;
};

const getOfferDecisionStatusOrder = (application: OfferDecisionApplication): number => {
    if (application.job_status === 'Offer') {
        return 1;
    }
    return 2;
};

const compareOfferDecisionApplications = (
    firstApplication: OfferDecisionApplication,
    secondApplication: OfferDecisionApplication
): number => {
    const statusDifference =
        getOfferDecisionStatusOrder(firstApplication) - getOfferDecisionStatusOrder(secondApplication);
    if (statusDifference !== 0) {
        return statusDifference;
    }

    const companyDifference = firstApplication.company_name.localeCompare(secondApplication.company_name);
    if (companyDifference !== 0) {
        return companyDifference;
    }

    const titleDifference = firstApplication.job_title.localeCompare(secondApplication.job_title);
    return titleDifference !== 0 ? titleDifference : firstApplication.job_id - secondApplication.job_id;
};

export const selectOfferDecisionWorkspace = (state: DemoState): OfferDecisionWorkspaceData => {
    const applications = state.applications
        .filter(
            (application) => application.job_status === 'Offer' || Boolean(state.offerEvaluations[application.job_id])
        )
        .map<OfferDecisionApplication>((application) => ({
            job_id: application.job_id,
            company_name: application.company_name,
            job_title: application.job_title,
            job_status: application.job_status,
            application_date: application.application_date,
            evaluation: state.offerEvaluations[application.job_id] ?? null,
            has_counteroffer_plan: Boolean(state.counterofferPlans[application.job_id]),
            counteroffer_plan: state.counterofferPlans[application.job_id] ?? null,
        }))
        .sort(compareOfferDecisionApplications);

    return { applications };
};

export const selectArchivedOfferDecisionWorkspace = (state: DemoState): OfferDecisionWorkspaceData => {
    const applications = state.archivedApplications
        .filter((application) => Boolean(state.offerEvaluations[application.archived_job_id]))
        .map<OfferDecisionApplication>((application) => ({
            job_id: application.archived_job_id,
            company_name: application.company_name,
            job_title: application.job_title,
            job_status: application.job_status,
            application_date: application.application_date,
            evaluation: state.offerEvaluations[application.archived_job_id],
            has_counteroffer_plan: Boolean(state.counterofferPlans[application.archived_job_id]),
            counteroffer_plan: state.counterofferPlans[application.archived_job_id] ?? null,
        }))
        .sort(compareOfferDecisionApplications);

    return { applications };
};

export const selectJobStatusCounts = (state: DemoState): JobStatusCount[] => {
    return JOB_STATUSES.map((jobStatus) => {
        const count = state.applications.filter((application) => application.job_status === jobStatus).length;
        return { job_status: jobStatus, count: String(count) };
    }).filter((statusCount) => Number(statusCount.count) > 0);
};

export const selectWeeklyApplications = (state: DemoState, now = new Date()): WeeklyApplicationCount[] => {
    const currentWeekStart = startOfLocalWeek(now);
    const weekStarts = Array.from({ length: 8 }, (_, index) => {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(currentWeekStart.getDate() - (7 - index) * 7);
        return weekStart;
    });

    return weekStarts.map((weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const count = state.applications.filter((application) => {
            const applicationDate = new Date(application.application_date);
            return applicationDate >= weekStart && applicationDate < weekEnd;
        }).length;

        return {
            start_of_week: toDateString(weekStart),
            applications_count: String(count),
        };
    });
};
