import { useRef, useState } from 'react';
import { useConfirm } from 'material-ui-confirm';
import { createBulkOfferDeadlineCalendarExportConfirmation } from '../../components/confirmation/bulkConfirmations';
import { useToast } from '../../components/toast/ToastProvider';
import { CALENDAR_ERROR_MESSAGE, downloadBulkIcsEvents } from '../../helper/calendarEvent';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';
import { groupOfferDecisionApplications } from './offerDecisionGrouping';
import { buildOfferDeadlineCalendarEvent, BULK_OFFER_DEADLINE_ICS_FILENAME } from './offerDeadlineCalendar';
import type { OfferDecisionApplication } from './models';

type BulkOfferDeadlineCalendarExportOptions = {
    applications: readonly OfferDecisionApplication[];
    hasCompleteEvaluatedOffers: boolean;
    loadAllEvaluatedOffers?: () => Promise<OfferDecisionApplication[]>;
};

export const useBulkOfferDeadlineCalendarExport = ({
    applications,
    hasCompleteEvaluatedOffers,
    loadAllEvaluatedOffers,
}: BulkOfferDeadlineCalendarExportOptions) => {
    const confirm = useConfirm();
    const { showErrorToast } = useToast();
    const [isLoadingOffers, setIsLoadingOffers] = useState(false);
    const exportPendingRef = useRef(false);
    const loadedEligibleOffers = hasCompleteEvaluatedOffers
        ? groupOfferDecisionApplications([...applications])['Evaluated Offers']
        : [];
    const canExport = hasCompleteEvaluatedOffers ? loadedEligibleOffers.length > 0 : Boolean(loadAllEvaluatedOffers);

    const exportOfferDeadlines = async () => {
        if (!canExport || exportPendingRef.current) {
            return;
        }

        exportPendingRef.current = true;
        let eligibleOffers = loadedEligibleOffers;

        try {
            if (!hasCompleteEvaluatedOffers) {
                setIsLoadingOffers(true);
                try {
                    const loadedApplications = await loadAllEvaluatedOffers?.();
                    eligibleOffers = groupOfferDecisionApplications(loadedApplications ?? [])['Evaluated Offers'];
                } catch (error) {
                    showErrorToast(
                        getErrorToastMessage(
                            error,
                            'Unable to load active evaluated offer deadlines. Please try again.'
                        )
                    );
                    return;
                } finally {
                    setIsLoadingOffers(false);
                }
            }

            if (eligibleOffers.length === 0) {
                return;
            }

            const { confirmed } = await confirm(
                createBulkOfferDeadlineCalendarExportConfirmation(eligibleOffers.length)
            );
            if (!confirmed) {
                return;
            }

            try {
                downloadBulkIcsEvents(
                    eligibleOffers.map(buildOfferDeadlineCalendarEvent),
                    BULK_OFFER_DEADLINE_ICS_FILENAME
                );
            } catch {
                showErrorToast(CALENDAR_ERROR_MESSAGE);
            }
        } finally {
            exportPendingRef.current = false;
        }
    };

    return { canExport, exportOfferDeadlines, isLoadingOffers };
};
