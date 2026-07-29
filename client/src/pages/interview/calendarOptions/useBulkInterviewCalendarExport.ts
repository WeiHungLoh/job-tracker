import { useMemo } from 'react';
import { useConfirm } from 'material-ui-confirm';
import { useToast } from '../../../components/toast/ToastProvider';
import { createBulkCalendarExportConfirmation } from '../../../components/confirmation/bulkConfirmations';
import { getUpcomingInterviews } from '../../../helper/interviewTiming';
import type { JobInterview } from '../models';
import { CALENDAR_ERROR_MESSAGE, downloadBulkIcsEvents } from '../../../helper/calendarEvent';
import { buildInterviewCalendarEvent, BULK_INTERVIEW_ICS_FILENAME } from './interviewCalendarEvent';

export const useBulkInterviewCalendarExport = (interviews: readonly JobInterview[], currentTime: Date) => {
    const confirm = useConfirm();
    const { showErrorToast } = useToast();
    const upcomingInterviewCount = useMemo(
        () => getUpcomingInterviews(interviews, currentTime).length,
        [currentTime, interviews]
    );

    const exportUpcomingInterviews = async () => {
        const upcomingInterviews = getUpcomingInterviews(interviews);
        if (upcomingInterviews.length === 0) {
            return;
        }

        const { confirmed } = await confirm(createBulkCalendarExportConfirmation(upcomingInterviews.length));
        if (!confirmed) {
            return;
        }

        try {
            downloadBulkIcsEvents(upcomingInterviews.map(buildInterviewCalendarEvent), BULK_INTERVIEW_ICS_FILENAME);
        } catch {
            showErrorToast(CALENDAR_ERROR_MESSAGE);
        }
    };

    return { exportUpcomingInterviews, upcomingInterviewCount };
};
