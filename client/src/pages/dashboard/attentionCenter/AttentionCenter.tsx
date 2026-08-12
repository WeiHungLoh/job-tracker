import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useConfirm, type ConfirmOptions } from 'material-ui-confirm';
import LoadingSpinner from '../../../components/loadingSpinner/LoadingSpinner';
import PrimaryButton from '../../../components/button/PrimaryButton';
import type { JobApplication } from '../../application/models';
import type { JobInterview } from '../../interview/models';
import type { OfferEvaluation } from '../../offerDecision/models';
import ApplicationStatusBadge from '../../application/ApplicationStatusBadge';
import DashboardCard from '../shared/dashboardCard/DashboardCard';
import type { DashboardRecordOfferDecisionFilter } from '../dashboardNavigation';
import { getAttentionItems, type AttentionItem, type AttentionItemCategory } from './attentionItems';
import { createApplicationFollowUpDraft, createPostInterviewFollowUpDraft, type FollowUpDraft } from './followUpDrafts';
import FollowUpDraftDialog from './FollowUpDraftDialog';
import styles from './AttentionCenter.module.css';
import NeedsAttentionSettingsDialog from './NeedsAttentionSettingsDialog';
import { useUserPreferences } from '../../../components/userPreferences/UserPreferencesProvider';
import { getNeedsAttentionSettings } from './needsAttentionSettings';
import type { DashboardAttentionTarget } from '../dashboardNavigation';
import { scrollAndHighlight } from '../../../helper/highlightElement';

type AttentionCenterProps = {
    applications: readonly JobApplication[];
    interviews: readonly JobInterview[];
    isLoading: boolean;
    hasError?: boolean;
    currentTime?: Date;
    offerEvaluations?: readonly OfferEvaluation[];
    navigationTarget?: DashboardAttentionTarget | null;
    onAddInterview?: (application: JobApplication) => void;
    onOpenOfferComparison?: (application: JobApplication) => void;
    onRecordOfferDecision?: (application: JobApplication, filter: DashboardRecordOfferDecisionFilter) => void;
    onMarkApplicationGhosted?: (application: JobApplication) => Promise<void>;
    onMarkApplicationFollowUpSent?: (application: JobApplication) => void | Promise<void>;
    onMarkInterviewFollowUpSent?: (interview: JobInterview) => void | Promise<void>;
    onNavigationTargetHandled?: () => void;
    onRetry?: () => void;
};

type MarkApplicationGhostedActionProps = {
    application: JobApplication;
    onMarkApplicationGhosted?: (application: JobApplication) => Promise<void>;
};

const ACTION_LABELS: Record<AttentionItemCategory, string> = {
    'application-follow-up': 'Draft application follow-up',
    'application-follow-up-stale': 'Mark as Ghosted',
    'interview-unscheduled': 'Add interview',
    'offer-decision-overdue': 'Record offer decision',
    'offer-decision-due': 'Record offer decision',
    'offer-evaluation': 'Evaluate offer',
    'post-interview': 'Draft post-interview message',
    'post-interview-follow-up-stale': 'Mark as Ghosted',
};
const VISIBLE_ATTENTION_ITEMS = 6;

const MarkApplicationGhostedAction = ({ application, onMarkApplicationGhosted }: MarkApplicationGhostedActionProps) => {
    const confirm = useConfirm();
    const [isPending, setIsPending] = useState(false);
    const pendingRef = useRef(false);

    const handleMarkAsGhosted = async () => {
        if (!onMarkApplicationGhosted || pendingRef.current) {
            return;
        }

        const confirmation: ConfirmOptions = {
            title: 'Mark as Ghosted?',
            description: `${application.company_name} — ${application.job_title} will be marked as Ghosted.`,
            confirmationText: 'Mark as Ghosted',
            cancellationText: 'Cancel',
            confirmationButtonProps: { autoFocus: true, color: 'error', variant: 'contained' },
        };

        pendingRef.current = true;
        setIsPending(true);
        try {
            const { confirmed } = await confirm(confirmation);
            if (confirmed) {
                await onMarkApplicationGhosted(application);
            }
        } catch {
            // The owning Dashboard handles user-facing API errors.
        } finally {
            pendingRef.current = false;
            setIsPending(false);
        }
    };

    return (
        <PrimaryButton
            aria-label={`Mark as Ghosted for ${application.job_title} at ${application.company_name}`}
            className={styles.actionButton}
            isLoading={isPending}
            type='button'
            variant='secondary'
            onClick={() => void handleMarkAsGhosted()}
        >
            Mark as Ghosted
        </PrimaryButton>
    );
};

const AttentionCenter = ({
    applications,
    interviews,
    hasError = false,
    isLoading,
    currentTime = new Date(),
    offerEvaluations = [],
    navigationTarget,
    onAddInterview,
    onOpenOfferComparison,
    onRecordOfferDecision,
    onMarkApplicationGhosted,
    onMarkApplicationFollowUpSent,
    onMarkInterviewFollowUpSent,
    onNavigationTargetHandled,
    onRetry,
}: AttentionCenterProps) => {
    const { preferences } = useUserPreferences();
    const settings = getNeedsAttentionSettings(preferences);
    const attentionListRef = useRef<HTMLUListElement>(null);
    const navigationHighlightTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const handledNavigationTargetRef = useRef<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedFollowUp, setSelectedFollowUp] = useState<{
        draft: FollowUpDraft;
        item: AttentionItem;
    } | null>(null);
    const items = useMemo(
        () => getAttentionItems(applications, interviews, currentTime, offerEvaluations, settings),
        [applications, currentTime, interviews, offerEvaluations, settings]
    );
    const attentionCount = !isLoading && !hasError ? items.length : null;
    const isAttentionListScrollable = items.length > VISIBLE_ATTENTION_ITEMS;

    useEffect(
        () => () => {
            Object.values(navigationHighlightTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
            navigationHighlightTimeoutRef.current = {};
        },
        []
    );

    useEffect(() => {
        if (!navigationTarget) {
            handledNavigationTargetRef.current = null;
            return;
        }
        if (isLoading || hasError) {
            return;
        }

        const targetKey = `${navigationTarget.category}-${navigationTarget.jobId}`;
        if (handledNavigationTargetRef.current === targetKey) {
            return;
        }

        handledNavigationTargetRef.current = targetKey;
        const targetItem = items.find(
            (item) => item.application.job_id === navigationTarget.jobId && item.category === navigationTarget.category
        );
        if (targetItem) {
            scrollAndHighlight(
                `needs-attention-${targetKey}`,
                styles.highlighted,
                navigationHighlightTimeoutRef.current
            );
        }
        onNavigationTargetHandled?.();
    }, [hasError, isLoading, items, navigationTarget, onNavigationTargetHandled]);

    useLayoutEffect(() => {
        const list = attentionListRef.current;
        if (!list) {
            return;
        }

        list.style.removeProperty('max-height');
        if (!isAttentionListScrollable) {
            return;
        }

        const visibleItems = Array.from(list.children).slice(0, VISIBLE_ATTENTION_ITEMS) as HTMLElement[];
        const updateMaxHeight = () => {
            const lastVisibleItem = visibleItems.at(-1);
            if (!lastVisibleItem) {
                return;
            }

            const visibleHeight = Math.ceil(
                lastVisibleItem.getBoundingClientRect().bottom - list.getBoundingClientRect().top
            );
            if (visibleHeight > 0) {
                list.style.maxHeight = `${visibleHeight}px`;
            }
        };

        updateMaxHeight();
        window.addEventListener('resize', updateMaxHeight);
        const resizeObserver =
            typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => updateMaxHeight());
        visibleItems.forEach((item) => resizeObserver?.observe(item));

        return () => {
            window.removeEventListener('resize', updateMaxHeight);
            resizeObserver?.disconnect();
        };
    }, [isAttentionListScrollable, items]);

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
                onRecordOfferDecision?.(item.application, 'Evaluated Offers');
                break;
            case 'offer-decision-overdue':
                onRecordOfferDecision?.(item.application, 'Expired Evaluated Offers');
                break;
            case 'application-follow-up-stale':
            case 'post-interview-follow-up-stale':
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
                title={
                    <span className={styles.attentionTitle}>
                        Needs Attention
                        {attentionCount !== null && (
                            <span aria-hidden='true' className={styles.attentionCount}>
                                {attentionCount}
                            </span>
                        )}
                    </span>
                }
                description='Your highest-priority follow-ups, with suggested next steps.'
                headerAction={
                    <PrimaryButton
                        aria-label='Customise Dashboard Reminders'
                        className={styles.settingsButton}
                        onClick={() => setIsSettingsOpen(true)}
                        type='button'
                        variant='secondary'
                    >
                        Settings
                    </PrimaryButton>
                }
            >
                {settings.enabledCategories.length === 0 ? (
                    <div className={styles.centered}>
                        <div>
                            <h3>No Needs Attention reminders are enabled.</h3>
                            <p>Choose which dashboard reminders you want to see.</p>
                        </div>
                    </div>
                ) : hasError ? (
                    <div className={styles.centered}>
                        <div>
                            <h3>Unable to load Needs Attention.</h3>
                            {onRetry && (
                                <PrimaryButton onClick={onRetry} type='button' variant='secondary'>
                                    Try Again
                                </PrimaryButton>
                            )}
                        </div>
                    </div>
                ) : isLoading ? (
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
                    <ul
                        aria-label='Applications needing attention'
                        className={styles.attentionList}
                        ref={attentionListRef}
                        style={isAttentionListScrollable ? { overflowY: 'auto' } : undefined}
                        tabIndex={isAttentionListScrollable ? 0 : undefined}
                    >
                        {items.map((item) => {
                            const { application, category, message } = item;
                            const actionLabel = ACTION_LABELS[category];
                            const isDraftAction = category === 'application-follow-up' || category === 'post-interview';
                            const visibleActionLabel = isDraftAction ? 'Draft message' : actionLabel;
                            const actionClassName = [styles.actionButton, isDraftAction ? styles.draftActionButton : '']
                                .filter(Boolean)
                                .join(' ');

                            return (
                                <li
                                    className={`${styles.attentionItem} ${
                                        styles[application.job_status.toLowerCase()]
                                    }`}
                                    data-category={category}
                                    id={`needs-attention-${category}-${application.job_id}`}
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
                                        {category === 'application-follow-up-stale' ||
                                        category === 'post-interview-follow-up-stale' ? (
                                            <MarkApplicationGhostedAction
                                                application={application}
                                                onMarkApplicationGhosted={onMarkApplicationGhosted}
                                            />
                                        ) : (
                                            <PrimaryButton
                                                aria-label={`${actionLabel} for ${application.job_title} at ${application.company_name}`}
                                                className={actionClassName}
                                                type='button'
                                                variant='secondary'
                                                onClick={() => handleAttentionAction(item)}
                                            >
                                                {visibleActionLabel}
                                            </PrimaryButton>
                                        )}
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
            <NeedsAttentionSettingsDialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};

export default AttentionCenter;
