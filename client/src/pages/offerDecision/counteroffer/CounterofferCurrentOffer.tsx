import { calculateOfferDecisionScore } from '../offerEvaluation';
import { OFFER_DECISION_CATEGORIES } from '../offerDecisionConfig';
import type { OfferDecisionApplication } from '../models';
import styles from './CounterofferPlanDialog.module.css';

type CounterofferCurrentOfferProps = {
    application: OfferDecisionApplication;
};

const CounterofferCurrentOffer = ({ application }: CounterofferCurrentOfferProps) => {
    const evaluation = application.evaluation;
    if (!evaluation) {
        return null;
    }

    return (
        <section aria-labelledby='counteroffer-current-heading' className={styles.currentOffer}>
            <div className={styles.sectionHeading}>
                <div>
                    <span className={styles.sectionEyebrow}>Saved evaluation</span>
                    <h3 id='counteroffer-current-heading'>Current offer</h3>
                    <p>This is your actual saved offer and will not be changed by the plan.</p>
                </div>
            </div>
            <div className={styles.currentColumns}>
                <section aria-labelledby='counteroffer-current-terms-heading' className={styles.detailCard}>
                    <h4 id='counteroffer-current-terms-heading'>Compensation and terms</h4>
                    <dl className={styles.reviewGrid}>
                        <div>
                            <dt>Currency</dt>
                            <dd>{evaluation.details.currency}</dd>
                        </div>
                        <div>
                            <dt>Monthly base salary</dt>
                            <dd>
                                {evaluation.details.currency} {evaluation.details.monthly_base_salary?.toLocaleString()}
                            </dd>
                        </div>
                        <div>
                            <dt>Bonus</dt>
                            <dd>{evaluation.details.bonus || '-'}</dd>
                        </div>
                        <div>
                            <dt>Annual leave</dt>
                            <dd>
                                {evaluation.details.annual_leave_days === null
                                    ? '-'
                                    : `${evaluation.details.annual_leave_days} days`}
                            </dd>
                        </div>
                        <div>
                            <dt>Work arrangement</dt>
                            <dd>{evaluation.details.work_arrangement || 'Not specified'}</dd>
                        </div>
                    </dl>
                </section>
                <section aria-labelledby='counteroffer-current-ratings-heading' className={styles.detailCard}>
                    <h4 id='counteroffer-current-ratings-heading'>Current ratings</h4>
                    <dl className={styles.currentRatings}>
                        {OFFER_DECISION_CATEGORIES.map((category) => (
                            <div key={category.key}>
                                <dt>{category.label}</dt>
                                <dd>{evaluation.ratings[category.key]}/5</dd>
                            </div>
                        ))}
                        <div className={styles.fitRatingTile}>
                            <dt>Current Fit rating</dt>
                            <dd>{calculateOfferDecisionScore(evaluation.ratings)}%</dd>
                        </div>
                    </dl>
                </section>
            </div>
        </section>
    );
};

export default CounterofferCurrentOffer;
