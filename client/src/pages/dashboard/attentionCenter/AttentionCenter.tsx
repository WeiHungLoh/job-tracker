import { useMemo, useState } from 'react';
import LoadingSpinner from '../../../components/loadingSpinner/LoadingSpinner';
import PrimaryButton from '../../../components/button/PrimaryButton';
import type { JobApplication } from '../../application/models';
import type { JobInterview } from '../../interview/models';
import type { OfferEvaluation } from '../../offerDecision/models';
import ApplicationStatusBadge from '../../application/ApplicationStatusBadge';
import DashboardCard from '../shared/dashboardCard/DashboardCard';
import { getAttentionItems, type AttentionItem, type AttentionItemCategory } from './attentionItems';
import { createApplicationFollowUpDraft, createPostInterviewFollowUpDraft, type FollowUpDraft } from './followUpDrafts';
import FollowUpDraftDialog from './FollowUpDraftDialog';
import styles from './AttentionCenter.module.css';

type AttentionCenterProps = {
    applications: readonly JobApplication[];
    interviews: readonly JobInterview[];
    isLoading: boolean;
    currentTime?: Date;
    offerEvaluations?: readonly OfferEvaluation[];
    onAddInterview?: (application: JobApplication) => void;
    onOpenOfferComparison?: (application: JobApplication) => void;
    onOpenOfferDecisionApplication?: (application: JobApplication) => void;
    onMarkApplicationFollowUpSent?: (application: JobApplication) => void | Promise<void>;
    onMarkInterviewFollowUpSent?: (interview: JobInterview) => void | Promise<void>;
};

const ACTION_LABELS: Record<AttentionItemCategory, string> = {
    'application-follow-up': 'Draft application follow-up',
    'interview-unscheduled': 'Add interview',
    'offer-decision-due': 'Record offer decision',
    'offer-evaluation': 'Evaluate offer',
    'post-interview': 'Draft post-interview message',
};

const AttentionCenter = ({
    applications,
    interviews,
    isLoading,
    currentTime = new Date(),
    offerEvaluations = [],
    onAddInterview,
    onOpenOfferComparison,
    onOpenOfferDecisionApplication,
    onMarkApplicationFollowUpSent,
    onMarkInterviewFollowUpSent,
}: AttentionCenterProps) => {
    const [selectedFollowUp, setSelectedFollowUp] = useState<{
        draft: FollowUpDraft;
        item: AttentionItem;
    } | null>(null);
    const items = useMemo(
        () => getAttentionItems(applications, interviews, currentTime, offerEvaluations),
        [applications, currentTime, interviews, offerEvaluations]
    );

    const handleAttentionAction = (item: AttentionItem) => {
        switch (item.category) {
            case 'application-follow-up':
                setSelectedFollowUp({ draft: createApplicationFollowUpDraft(item.application), item });
                break;
            case 'post-interview':
                if (item.latestCompletedInterview) {
                    setSelectedFollowUp({
                        draft: createPostInterviewFollowUpDraft(item.application, item.latestCompletedInterview),
                        item,
                    });
                }
                break;
            case 'interview-unscheduled':
                onAddInterview?.(item.application);
                break;
            case 'offer-evaluation':
                onOpenOfferComparison?.(item.application);
                break;
            case 'offer-decision-due':
                onOpenOfferDecisionApplication?.(item.application);
                break;
        }
    };

    const selectedApplication = selectedFollowUp?.item.application;
    const selectedInterview = selectedFollowUp?.item.latestCompletedInterview;
    const markAsSentLabel =
        selectedFollowUp?.item.category === 'application-follow-up' && selectedApplication
            ? `Mark application follow-up as sent for ${selectedApplication.job_title} at ${selectedApplication.company_name}`
            : selectedFollowUp?.item.category === 'post-interview' && selectedApplication
            ? `Mark post-interview follow-up as sent for ${selectedApplication.job_title} at ${selectedApplication.company_name}`
            : undefined;
    const handleMarkAsSent =
        selectedFollowUp?.item.category === 'application-follow-up' &&
        selectedApplication &&
        onMarkApplicationFollowUpSent
            ? () => onMarkApplicationFollowUpSent(selectedApplication)
            : selectedFollowUp?.item.category === 'post-interview' && selectedInterview && onMarkInterviewFollowUpSent
            ? () => onMarkInterviewFollowUpSent(selectedInterview)
            : undefined;

    return (
        <>
            <DashboardCard
                className={styles.attentionCard}
                title='Needs Attention'
                description='Your highest-priority follow-ups, with suggested next steps.'
            >
                {isLoading ? (
                    <div className={styles.centered}>
                        <LoadingSpinner size='sm' />
                    </div>
                ) : items.length === 0 ? (
                    <div className={styles.centered}>
                        <div>
                            <h3>You&apos;re all caught up</h3>
                            <p>No applications need attention right now.</p>
                        </div>
                    </div>
                ) : (
                    <ul className={styles.attentionList} aria-label='Applications needing attention'>
                        {items.map((item) => {
                            const { application, category, message } = item;
                            const actionLabel = ACTION_LABELS[category];

                            return (
                                <li
                                    className={`${styles.attentionItem} ${
                                        styles[application.job_status.toLowerCase()]
                                    }`}
                                    data-category={category}
                                    key={application.job_id}
                                >
                                    <div className={styles.itemHeading}>
                                        <div className={styles.applicationDetails}>
                                            <h3>{application.company_name}</h3>
                                            <p>{application.job_title}</p>
                                        </div>
                                        <ApplicationStatusBadge compact jobStatus={application.job_status} />
                                    </div>
                                    <p className={styles.reason}>{message}</p>
                                    <div className={styles.actionRow}>
                                        <PrimaryButton
                                            aria-label={`${actionLabel} for ${application.job_title} at ${application.company_name}`}
                                            className={styles.actionButton}
                                            type='button'
                                            variant='secondary'
                                            onClick={() => handleAttentionAction(item)}
                                        >
                                            {actionLabel}
                                        </PrimaryButton>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </DashboardCard>
            <FollowUpDraftDialog
                draft={selectedFollowUp?.draft ?? null}
                markAsSentLabel={markAsSentLabel}
                onClose={() => setSelectedFollowUp(null)}
                onMarkAsSent={handleMarkAsSent}
            />
        </>
    );
};

export default AttentionCenter;
