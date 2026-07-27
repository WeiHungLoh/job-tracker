import PrimaryButton from '../../components/button/PrimaryButton';
import ControlDropdown from '../../components/activityControls/ControlDropdown';
import formatDate from '../../helper/dateFormatter';
import ApplicationStatusBadge from '../application/ApplicationStatusBadge';
import { OFFER_DECISION_CATEGORIES } from './offerDecisionConfig';
import { calculateOfferDecisionScore } from './offerEvaluation';
import OfferEvaluationForm, { type OfferFieldRefs } from './OfferEvaluationForm';
import type {
    OfferDecisionApplication,
    OfferDecisionCategory,
    OfferDecisionRating,
    OfferDecisionValues,
    OfferDetails,
    OfferEvaluation,
    OfferEvaluationFormErrors,
} from './models';
import styles from './OfferEvaluation.module.css';

type OfferEvaluationCardProps = {
    allowDelete: boolean;
    allowEdit: boolean;
    application: OfferDecisionApplication;
    counterofferAction?: {
        hasPlan: boolean;
        onOpen: () => void;
    };
    draft: OfferEvaluation | undefined;
    errors: OfferEvaluationFormErrors;
    expanded: boolean;
    expired: boolean;
    isDeleting: boolean;
    isSaving: boolean;
    onCancel: () => void;
    onDelete?: () => void;
    onDetailsChange: (details: OfferDetails, field: keyof OfferEvaluationFormErrors) => void;
    onEdit: () => void;
    onRatingChange: (category: OfferDecisionCategory, value: OfferDecisionRating) => void;
    onSave: (decisionDeadlineHasBadInput: boolean, refs: OfferFieldRefs) => void;
    onStart: () => void;
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
    allowEdit,
    application,
    counterofferAction,
    onEdit,
}: Pick<OfferEvaluationCardProps, 'allowEdit' | 'application' | 'counterofferAction' | 'onEdit'>) => {
    if (!allowEdit && !counterofferAction) {
        return null;
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

    if (!allowEdit) {
        return counterofferButton;
    }

    if (!counterofferAction) {
        return editAction;
    }

    const menuLabel = `More actions for ${application.company_name}`;
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
            </div>
        </ControlDropdown>
    );
};

const OfferEvaluationCard = ({
    allowDelete,
    allowEdit,
    application,
    counterofferAction,
    draft,
    errors,
    expanded,
    expired,
    isDeleting,
    isSaving,
    onCancel,
    onDelete,
    onDetailsChange,
    onEdit,
    onRatingChange,
    onSave,
    onStart,
    onToggleExpanded,
}: OfferEvaluationCardProps) => {
    const savedEvaluation = application.evaluation;
    const evaluation = draft ?? savedEvaluation;
    const editing = Boolean(draft);

    return (
        <article aria-label={`${application.company_name} ${application.job_title}`} className={styles.evaluationCard}>
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
                        onClick={onStart}
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
                            onCancel={onCancel}
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
                                    onClick={onToggleExpanded}
                                    type='button'
                                    variant='secondary'
                                >
                                    {expanded ? 'Hide details' : 'Show details'}
                                </PrimaryButton>
                                <OfferEvaluationActionsMenu
                                    allowEdit={allowEdit}
                                    application={application}
                                    counterofferAction={savedEvaluation ? counterofferAction : undefined}
                                    onEdit={onEdit}
                                />
                                {savedEvaluation && allowDelete && onDelete && (
                                    <PrimaryButton
                                        aria-label={`Delete evaluation for ${application.company_name}`}
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
