import { useRef, type MouseEvent } from 'react';
import PrimaryButton from '../../components/button/PrimaryButton';
import ControlDropdown from '../../components/activityControls/ControlDropdown';
import { useToast } from '../../components/toast/ToastProvider';
import formatDate from '../../helper/dateFormatter';
import { buildGoogleCalendarUrl, CALENDAR_ERROR_MESSAGE, downloadIcsEvent } from '../../helper/calendarEvent';
import ApplicationStatusBadge from '../application/ApplicationStatusBadge';
import { OFFER_DECISION_CATEGORIES } from './offerDecisionConfig';
import { calculateOfferDecisionScore } from './offerEvaluation';
import { buildOfferDeadlineCalendarEvent, buildOfferDeadlineIcsFilename } from './offerDeadlineCalendar';
import OfferEvaluationForm, { type OfferFieldRefs } from './OfferEvaluationForm';
import type {
    OfferDecisionApplication,
    OfferDecisionCategory,
    OfferDecisionRating,
    OfferDecisionValues,
    OfferDetails,
    OfferEvaluation,
    OfferEvaluationFormErrors,
    OfferDecisionStatus,
} from './models';
import styles from './OfferEvaluation.module.css';

type OfferEvaluationCardProps = {
    allowCalendarExport: boolean;
    allowDelete: boolean;
    allowEdit: boolean;
    application: OfferDecisionApplication;
    areStatusActionsDisabled: boolean;
    counterofferAction?: {
        hasPlan: boolean;
        onOpen: () => void;
        placement?: 'card' | 'menu';
    };
    draft: OfferEvaluation | undefined;
    errors: OfferEvaluationFormErrors;
    expanded: boolean;
    expired: boolean;
    id: string;
    isDeleting: boolean;
    isSaving: boolean;
    isStatusUpdating: boolean;
    onCancel: () => void;
    onDecisionDeadlineValidityChange: (hasBadInput: boolean) => void;
    onDelete?: () => void;
    onDetailsChange: (details: OfferDetails, field: keyof OfferEvaluationFormErrors) => void;
    onEdit: () => void;
    onRatingChange: (category: OfferDecisionCategory, value: OfferDecisionRating) => void;
    onSave: (decisionDeadlineHasBadInput: boolean, refs: OfferFieldRefs) => void;
    onStart: () => void;
    onUpdateOfferStatus?: (status: OfferDecisionStatus) => void;
    onToggleExpanded: () => void;
};

const DecisionScore = ({ companyName, score }: { companyName: string; score: number }) => (
    <div className={styles.score}>
        <div className={styles.scoreHeader}>
            <span>Fit rating</span>
            <strong>{score}%</strong>
        </div>
        <progress aria-label={`${companyName} offer fit rating`} max={100} value={score} />
    </div>
);

const DecisionDeadlineSummary = ({ deadline }: { deadline: string }) => (
    <div className={styles.deadlineSummary}>
        <span>Decision deadline</span>
        <strong>{formatDate(deadline).formattedDate}</strong>
    </div>
);

const OfferRatingsReview = ({ ratings }: { ratings: OfferDecisionValues }) => (
    <div className={styles.reviewSection}>
        <h4>Fit breakdown</h4>
        <dl className={styles.reviewValues}>
            {OFFER_DECISION_CATEGORIES.map((category) => (
                <div className={styles.reviewValue} key={category.key}>
                    <dt>{category.label}</dt>
                    <dd>{ratings[category.key]}/5</dd>
                </div>
            ))}
        </dl>
    </div>
);

const OfferDetailsReview = ({ details }: { details: OfferDetails }) => (
    <div className={styles.reviewSection}>
        <h4>Compensation and terms</h4>
        <dl className={styles.detailsReview}>
            <div>
                <dt>Monthly Base Salary</dt>
                <dd>{`${details.currency} ${details.monthly_base_salary?.toLocaleString()}`}</dd>
            </div>
            {details.bonus !== '' && (
                <div>
                    <dt>Bonus</dt>
                    <dd>{details.bonus}</dd>
                </div>
            )}
            {details.annual_leave_days !== null && (
                <div>
                    <dt>Annual Leave</dt>
                    <dd>{details.annual_leave_days} days</dd>
                </div>
            )}
            {details.work_arrangement !== '' && (
                <div>
                    <dt>Work Arrangement</dt>
                    <dd>{details.work_arrangement}</dd>
                </div>
            )}
            {details.pros !== '' && (
                <div>
                    <dt>Pros</dt>
                    <dd>{details.pros}</dd>
                </div>
            )}
            {details.concerns !== '' && (
                <div>
                    <dt>Cons</dt>
                    <dd>{details.concerns}</dd>
                </div>
            )}
        </dl>
    </div>
);

const OfferEvaluationActionsMenu = ({
    allowCalendarExport,
    allowEdit,
    application,
    areStatusActionsDisabled,
    counterofferAction,
    isStatusUpdating,
    onEdit,
    onUpdateOfferStatus,
}: Pick<
    OfferEvaluationCardProps,
    | 'allowEdit'
    | 'allowCalendarExport'
    | 'application'
    | 'areStatusActionsDisabled'
    | 'counterofferAction'
    | 'isStatusUpdating'
    | 'onUpdateOfferStatus'
> & {
    onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
}) => {
    const { showErrorToast } = useToast();

    if (!allowCalendarExport && !allowEdit && !counterofferAction && !onUpdateOfferStatus) {
        return null;
    }

    const menuLabel = `More actions for ${application.company_name}`;
    if (isStatusUpdating) {
        return (
            <PrimaryButton aria-label={menuLabel} isLoading type='button' variant='secondary'>
                More...
            </PrimaryButton>
        );
    }

    const editAction = (
        <PrimaryButton
            aria-label={`Edit evaluation for ${application.company_name}`}
            onClick={onEdit}
            type='button'
            variant='secondary'
        >
            Edit evaluation
        </PrimaryButton>
    );
    const counterofferLabel = counterofferAction?.hasPlan ? 'View counteroffer plan' : 'Plan counteroffer';
    const counterofferButton = counterofferAction ? (
        <PrimaryButton
            aria-label={`${counterofferLabel} for ${application.company_name}`}
            onClick={counterofferAction.onOpen}
            type='button'
            variant='secondary'
        >
            {counterofferLabel}
        </PrimaryButton>
    ) : null;
    const handleGoogleCalendar = () => {
        try {
            const event = buildOfferDeadlineCalendarEvent(application);
            window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
        } catch {
            showErrorToast(CALENDAR_ERROR_MESSAGE);
        }
    };
    const handleIcsDownload = () => {
        try {
            downloadIcsEvent(buildOfferDeadlineCalendarEvent(application), buildOfferDeadlineIcsFilename(application));
        } catch {
            showErrorToast(CALENDAR_ERROR_MESSAGE);
        }
    };
    const statusActions: Array<{ label: string; status: OfferDecisionStatus }> =
        application.job_status === 'Offer'
            ? [
                  { label: 'Accept offer', status: 'Accepted' },
                  { label: 'Decline offer', status: 'Declined' },
              ]
            : application.job_status === 'Accepted'
            ? [
                  { label: 'Change to Offer', status: 'Offer' },
                  { label: 'Change to Declined', status: 'Declined' },
              ]
            : application.job_status === 'Declined'
            ? [
                  { label: 'Change to Offer', status: 'Offer' },
                  { label: 'Change to Accepted', status: 'Accepted' },
              ]
            : [];

    if (!allowCalendarExport && !onUpdateOfferStatus && !allowEdit) {
        return counterofferButton;
    }

    if (!allowCalendarExport && !onUpdateOfferStatus && !counterofferAction) {
        return editAction;
    }

    return (
        <ControlDropdown
            closeOnSelect
            dropdownAriaLabel={menuLabel}
            dropdownClassName={styles.cardActionDropdown}
            dropdownRole='menu'
            id={`offer-evaluation-${application.job_id}-more`}
            label='More...'
            triggerAriaLabel={menuLabel}
            triggerClassName={styles.cardActionTrigger}
            triggerStyle='activity'
        >
            <div className={styles.cardActionOptions}>
                {allowEdit && (
                    <PrimaryButton
                        aria-label={`Edit evaluation for ${application.company_name}`}
                        className={styles.cardActionOption}
                        onClick={onEdit}
                        role='menuitem'
                        type='button'
                        variant='secondary'
                    >
                        Edit evaluation
                    </PrimaryButton>
                )}
                {counterofferAction && (
                    <PrimaryButton
                        aria-label={`${counterofferLabel} for ${application.company_name}`}
                        className={styles.cardActionOption}
                        onClick={counterofferAction.onOpen}
                        role='menuitem'
                        type='button'
                        variant='secondary'
                    >
                        {counterofferLabel}
                    </PrimaryButton>
                )}
                {allowCalendarExport && (
                    <>
                        <PrimaryButton
                            aria-label={`Add ${application.company_name} offer deadline to Google Calendar`}
                            className={styles.cardActionOption}
                            onClick={handleGoogleCalendar}
                            role='menuitem'
                            type='button'
                            variant='secondary'
                        >
                            Add to Google Calendar
                        </PrimaryButton>
                        <PrimaryButton
                            aria-label={`Add ${application.company_name} offer deadline to Apple Calendar or Outlook`}
                            className={styles.cardActionOption}
                            onClick={handleIcsDownload}
                            role='menuitem'
                            type='button'
                            variant='secondary'
                        >
                            Add to Apple Calendar / Outlook (.ics)
                        </PrimaryButton>
                    </>
                )}
                {onUpdateOfferStatus &&
                    statusActions.map(({ label, status }) => (
                        <PrimaryButton
                            aria-label={`${label} ${application.job_status === 'Offer' ? 'from' : 'for'} ${
                                application.company_name
                            }`}
                            className={styles.cardActionOption}
                            disabled={areStatusActionsDisabled}
                            key={status}
                            onClick={() => onUpdateOfferStatus(status)}
                            role='menuitem'
                            type='button'
                            variant='secondary'
                        >
                            {label}
                        </PrimaryButton>
                    ))}
            </div>
        </ControlDropdown>
    );
};

const OfferEvaluationCard = ({
    allowCalendarExport,
    allowDelete,
    allowEdit,
    application,
    areStatusActionsDisabled,
    counterofferAction,
    draft,
    errors,
    expanded,
    expired,
    id,
    isDeleting,
    isSaving,
    isStatusUpdating,
    onCancel,
    onDecisionDeadlineValidityChange,
    onDelete,
    onDetailsChange,
    onEdit,
    onRatingChange,
    onSave,
    onStart,
    onUpdateOfferStatus,
    onToggleExpanded,
}: OfferEvaluationCardProps) => {
    const cardRef = useRef<HTMLElement>(null);
    const savedEvaluation = application.evaluation;
    const evaluation = draft ?? savedEvaluation;
    const editing = Boolean(draft);
    const scrollToCard = (block: ScrollLogicalPosition) => {
        window.setTimeout(() => {
            cardRef.current?.scrollIntoView?.({ behavior: 'smooth', block });
        }, 0);
    };
    const handleCancel = () => {
        onCancel();
        scrollToCard(savedEvaluation ? 'end' : 'start');
    };
    const handleEditClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        onEdit();
    };
    const handleStart = (event: MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        onStart();
    };
    const handleToggleExpanded = (event: MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        onToggleExpanded();
        if (expanded) {
            scrollToCard('start');
        }
    };
    const counterofferActionIsDirect = counterofferAction?.placement === 'card';

    return (
        <article
            aria-label={`${application.company_name} ${application.job_title}`}
            className={styles.evaluationCard}
            id={id}
            ref={cardRef}
        >
            <header className={styles.cardHeader}>
                <div>
                    <h3>{application.company_name}</h3>
                    <p>{application.job_title}</p>
                </div>
                <div className={styles.badges}>
                    {expired && <span className={styles.expiredBadge}>Expired</span>}
                    <ApplicationStatusBadge compact jobStatus={application.job_status} />
                </div>
            </header>

            {!evaluation ? (
                <div className={styles.startEvaluation}>
                    <p>Add the offer terms and ratings when you are ready to compare it.</p>
                    <PrimaryButton
                        aria-label={`Add evaluation for ${application.company_name}`}
                        onClick={handleStart}
                        type='button'
                        variant='compact'
                    >
                        Add evaluation
                    </PrimaryButton>
                </div>
            ) : (
                <>
                    {!editing && <DecisionDeadlineSummary deadline={evaluation.details.decision_deadline} />}
                    <DecisionScore
                        companyName={application.company_name}
                        score={calculateOfferDecisionScore(evaluation.ratings)}
                    />
                    {editing ? (
                        <OfferEvaluationForm
                            application={application}
                            errors={errors}
                            evaluation={evaluation}
                            isSaving={isSaving}
                            onCancel={handleCancel}
                            onDecisionDeadlineValidityChange={onDecisionDeadlineValidityChange}
                            onDetailsChange={onDetailsChange}
                            onRatingChange={onRatingChange}
                            onSave={onSave}
                        />
                    ) : (
                        <>
                            {expanded && (
                                <>
                                    <OfferRatingsReview ratings={evaluation.ratings} />
                                    <OfferDetailsReview details={evaluation.details} />
                                </>
                            )}
                            <div className={styles.cardActions}>
                                <PrimaryButton
                                    aria-label={`${expanded ? 'Hide' : 'Show'} details for ${application.company_name}`}
                                    disabled={isStatusUpdating}
                                    onClick={handleToggleExpanded}
                                    type='button'
                                    variant='secondary'
                                >
                                    {expanded ? 'Hide details' : 'Show details'}
                                </PrimaryButton>
                                {savedEvaluation && counterofferActionIsDirect && (
                                    <PrimaryButton
                                        aria-label={`View counteroffer plan for ${application.company_name}`}
                                        disabled={isStatusUpdating}
                                        onClick={counterofferAction.onOpen}
                                        type='button'
                                        variant='secondary'
                                    >
                                        View counteroffer plan
                                    </PrimaryButton>
                                )}
                                <OfferEvaluationActionsMenu
                                    allowCalendarExport={allowCalendarExport}
                                    allowEdit={allowEdit}
                                    application={application}
                                    areStatusActionsDisabled={areStatusActionsDisabled}
                                    counterofferAction={
                                        savedEvaluation && !counterofferActionIsDirect ? counterofferAction : undefined
                                    }
                                    isStatusUpdating={isStatusUpdating}
                                    onEdit={handleEditClick}
                                    onUpdateOfferStatus={onUpdateOfferStatus}
                                />
                                {savedEvaluation && allowDelete && onDelete && (
                                    <PrimaryButton
                                        aria-label={`Delete evaluation for ${application.company_name}`}
                                        disabled={isStatusUpdating}
                                        isLoading={isDeleting}
                                        onClick={onDelete}
                                        type='button'
                                        variant='destructive'
                                    >
                                        Delete
                                    </PrimaryButton>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
        </article>
    );
};

export default OfferEvaluationCard;
