import {
    OFFER_ANNUAL_LEAVE_DAYS_MAX,
    OFFER_DECISION_CATEGORIES,
    OFFER_DECISION_VALUE_MAX,
    OFFER_DECISION_VALUE_MIN,
    OFFER_DETAILS_MAX_LENGTHS,
    OFFER_MONTHLY_BASE_SALARY_MAX,
    OFFER_WORK_ARRANGEMENTS,
} from '../offerDecisionConfig';
import { calculateCounterofferPlanResult, formatFitRatingDifference, formatRatingDifference } from './counterofferPlan';
import type {
    CounterofferPlan,
    CounterofferPlanErrors,
    OfferDecisionApplication,
    OfferDecisionCategory,
    OfferDecisionRating,
} from '../models';
import styles from './CounterofferPlanDialog.module.css';

type CounterofferIdealOfferProps = {
    application: OfferDecisionApplication;
    conclusion: string;
    editable: boolean;
    errors: CounterofferPlanErrors;
    onChange: (plan: CounterofferPlan) => void;
    plan: CounterofferPlan;
};

const FieldError = ({ id, message }: { id: string; message?: string }) =>
    message ? (
        <span className={styles.fieldError} id={id}>
            {message}
        </span>
    ) : null;

const errorProps = (id: string, message?: string) => ({
    'aria-describedby': message ? id : undefined,
    'aria-invalid': Boolean(message),
});

const ReviewTerms = ({ application, plan }: { application: OfferDecisionApplication; plan: CounterofferPlan }) => (
    <dl aria-label='Ideal offer terms' className={styles.reviewGrid}>
        <div>
            <dt>Currency</dt>
            <dd>{application.evaluation?.details.currency}</dd>
        </div>
        <div>
            <dt>Monthly base salary</dt>
            <dd>
                {application.evaluation?.details.currency} {plan.monthly_base_salary.toLocaleString()}
            </dd>
        </div>
        <div>
            <dt>Bonus</dt>
            <dd>{plan.bonus || 'Not included'}</dd>
        </div>
        <div>
            <dt>Annual leave</dt>
            <dd>{plan.annual_leave_days === null ? 'Not included' : `${plan.annual_leave_days} days`}</dd>
        </div>
        <div>
            <dt>Work arrangement</dt>
            <dd>{plan.work_arrangement || 'Not specified'}</dd>
        </div>
    </dl>
);

const CounterofferIdealOffer = ({
    application,
    conclusion,
    editable,
    errors,
    onChange,
    plan,
}: CounterofferIdealOfferProps) => {
    const evaluation = application.evaluation;
    if (!evaluation) {
        return null;
    }

    const idPrefix = `counteroffer-${application.job_id}-ideal`;
    const result = calculateCounterofferPlanResult(evaluation, plan);
    const updatePlan = (changes: Partial<CounterofferPlan>) => onChange({ ...plan, ...changes });
    const updateRating = (category: OfferDecisionCategory, rating: OfferDecisionRating) =>
        updatePlan({ ratings: { ...plan.ratings, [category]: rating } });

    return (
        <section aria-labelledby='counteroffer-ideal-heading' className={styles.idealOffer}>
            <div className={styles.sectionHeading}>
                <div>
                    <span className={styles.sectionEyebrow}>Your counteroffer</span>
                    <h3 id='counteroffer-ideal-heading'>Ideal offer</h3>
                    <p>The preferred realistic terms you would ask the company to agree to.</p>
                </div>
            </div>

            <div className={styles.idealColumns}>
                <section aria-labelledby={`${idPrefix}-terms-heading`} className={styles.detailCard}>
                    <h4 id={`${idPrefix}-terms-heading`}>Compensation and terms</h4>
                    {editable ? (
                        <div className={styles.formGrid}>
                            <label className={styles.field} htmlFor={`${idPrefix}-currency`}>
                                <span>Currency</span>
                                <input
                                    aria-label={`${application.company_name} Ideal offer currency`}
                                    id={`${idPrefix}-currency`}
                                    readOnly
                                    value={evaluation.details.currency}
                                />
                            </label>
                            <label className={styles.field} htmlFor={`${idPrefix}-monthly-base-salary`}>
                                <span>Monthly base salary</span>
                                <input
                                    {...errorProps(`${idPrefix}-monthly-base-salary-error`, errors.monthly_base_salary)}
                                    aria-label={`${application.company_name} Ideal offer monthly base salary`}
                                    id={`${idPrefix}-monthly-base-salary`}
                                    max={OFFER_MONTHLY_BASE_SALARY_MAX}
                                    min={0}
                                    onChange={(event) =>
                                        updatePlan({
                                            monthly_base_salary:
                                                event.target.value === '' ? Number.NaN : Number(event.target.value),
                                        })
                                    }
                                    required
                                    step={1}
                                    type='number'
                                    value={Number.isNaN(plan.monthly_base_salary) ? '' : plan.monthly_base_salary}
                                />
                                <FieldError
                                    id={`${idPrefix}-monthly-base-salary-error`}
                                    message={errors.monthly_base_salary}
                                />
                            </label>
                            <label className={styles.field} htmlFor={`${idPrefix}-bonus`}>
                                <span>Bonus (Optional)</span>
                                <input
                                    {...errorProps(`${idPrefix}-bonus-error`, errors.bonus)}
                                    aria-label={`${application.company_name} Ideal offer bonus`}
                                    id={`${idPrefix}-bonus`}
                                    maxLength={OFFER_DETAILS_MAX_LENGTHS.bonus}
                                    onChange={(event) => updatePlan({ bonus: event.target.value })}
                                    value={plan.bonus}
                                />
                                <FieldError id={`${idPrefix}-bonus-error`} message={errors.bonus} />
                            </label>
                            <label className={styles.field} htmlFor={`${idPrefix}-annual-leave`}>
                                <span>Annual leave days (Optional)</span>
                                <input
                                    {...errorProps(`${idPrefix}-annual-leave-error`, errors.annual_leave_days)}
                                    aria-label={`${application.company_name} Ideal offer annual leave days`}
                                    id={`${idPrefix}-annual-leave`}
                                    max={OFFER_ANNUAL_LEAVE_DAYS_MAX}
                                    min={0}
                                    onChange={(event) =>
                                        updatePlan({
                                            annual_leave_days:
                                                event.target.value === '' ? null : Number(event.target.value),
                                        })
                                    }
                                    step={1}
                                    type='number'
                                    value={plan.annual_leave_days ?? ''}
                                />
                                <FieldError id={`${idPrefix}-annual-leave-error`} message={errors.annual_leave_days} />
                            </label>
                            <label className={styles.field} htmlFor={`${idPrefix}-work-arrangement`}>
                                <span>Work arrangement (Optional)</span>
                                <select
                                    {...errorProps(`${idPrefix}-work-arrangement-error`, errors.work_arrangement)}
                                    aria-label={`${application.company_name} Ideal offer work arrangement`}
                                    id={`${idPrefix}-work-arrangement`}
                                    onChange={(event) =>
                                        updatePlan({
                                            work_arrangement: event.target
                                                .value as CounterofferPlan['work_arrangement'],
                                        })
                                    }
                                    value={plan.work_arrangement}
                                >
                                    <option value=''>Not specified</option>
                                    {OFFER_WORK_ARRANGEMENTS.map((arrangement) => (
                                        <option key={arrangement} value={arrangement}>
                                            {arrangement}
                                        </option>
                                    ))}
                                </select>
                                <FieldError
                                    id={`${idPrefix}-work-arrangement-error`}
                                    message={errors.work_arrangement}
                                />
                            </label>
                        </div>
                    ) : (
                        <ReviewTerms application={application} plan={plan} />
                    )}
                </section>

                <section aria-labelledby={`${idPrefix}-ratings-heading`} className={styles.detailCard}>
                    <h4 id={`${idPrefix}-ratings-heading`}>Ideal ratings</h4>
                    <div aria-label='Ideal offer rating changes' className={styles.ratingComparison}>
                        {OFFER_DECISION_CATEGORIES.map((category) => {
                            const currentRating = evaluation.ratings[category.key];
                            const idealRating = plan.ratings[category.key];
                            const ratingDifference = idealRating - currentRating;
                            const differenceId = `${idPrefix}-${category.key}-difference`;
                            return (
                                <div className={styles.ratingComparisonRow} key={category.key}>
                                    <div className={styles.ratingCardHeading}>
                                        <strong className={styles.ratingFactor}>{category.label}</strong>
                                        <span className={styles.idealRatingValue}>{idealRating}/5</span>
                                    </div>
                                    <span
                                        className={styles.ratingChange}
                                        data-direction={
                                            ratingDifference > 0
                                                ? 'positive'
                                                : ratingDifference < 0
                                                ? 'negative'
                                                : 'neutral'
                                        }
                                        id={differenceId}
                                    >
                                        {formatRatingDifference(currentRating, idealRating)}
                                    </span>
                                    {editable && (
                                        <input
                                            aria-describedby={differenceId}
                                            aria-label={`${application.company_name} Ideal offer ${category.label} rating`}
                                            className={styles.ratingSlider}
                                            id={`${idPrefix}-${category.key}`}
                                            max={OFFER_DECISION_VALUE_MAX}
                                            min={OFFER_DECISION_VALUE_MIN}
                                            onChange={(event) =>
                                                updateRating(
                                                    category.key,
                                                    Number(event.target.value) as OfferDecisionRating
                                                )
                                            }
                                            step={1}
                                            type='range'
                                            value={idealRating}
                                        />
                                    )}
                                </div>
                            );
                        })}
                        <div className={`${styles.ratingComparisonRow} ${styles.fitRatingTile}`}>
                            <div className={styles.ratingCardHeading}>
                                <strong className={styles.ratingFactor}>Ideal Fit rating</strong>
                                <span className={styles.idealRatingValue}>{result.idealFitRating}%</span>
                            </div>
                        </div>
                    </div>
                    <FieldError id={`${idPrefix}-ratings-error`} message={errors.ratings} />
                </section>
            </div>

            {errors.plan && (
                <div className={styles.planError} role='alert'>
                    <FieldError id={`${idPrefix}-plan-error`} message={errors.plan} />
                </div>
            )}

            <section
                aria-labelledby={`${idPrefix}-result-heading`}
                aria-live='polite'
                className={styles.scenarioResult}
            >
                <h4 id={`${idPrefix}-result-heading`}>Ideal offer result</h4>
                <dl className={styles.resultValues}>
                    <div>
                        <dt>Compared with current</dt>
                        <dd
                            data-direction={
                                result.idealFitRating > result.currentFitRating
                                    ? 'positive'
                                    : result.idealFitRating < result.currentFitRating
                                    ? 'negative'
                                    : 'neutral'
                            }
                        >
                            {formatFitRatingDifference(result.currentFitRating, result.idealFitRating)}
                        </dd>
                    </div>
                </dl>
                <p>{conclusion}</p>
                <FieldError id='counteroffer-fit-error' message={errors.fit_rating} />
                {errors.fit_rating && (
                    <span
                        aria-describedby='counteroffer-fit-error'
                        aria-label='Ideal offer fit rating error'
                        className={styles.focusTarget}
                        id='counteroffer-error-focus'
                        tabIndex={-1}
                    >
                        Review the Ideal offer
                    </span>
                )}
            </section>
        </section>
    );
};

export default CounterofferIdealOffer;
