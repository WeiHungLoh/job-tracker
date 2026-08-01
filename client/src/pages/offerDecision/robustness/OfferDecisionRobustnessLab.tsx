import { useMemo, useState } from 'react';
import PrimaryButton from '../../../components/button/PrimaryButton';
import { OFFER_DECISION_CATEGORIES } from '../offerDecisionConfig';
import { calculateOfferDecisionScore } from '../offerEvaluation';
import type { OfferDecisionCategory, OfferDecisionRating } from '../models';
import {
    DEFAULT_OFFER_DECISION_IMPORTANCE,
    analyzeOfferDecisionRobustness,
    type EvaluatedOfferDecisionApplication,
    type OfferDecisionImportance,
} from './offerDecisionRobustnessCalculations';
import styles from './OfferDecisionRobustnessLab.module.css';

type OfferDecisionRobustnessLabProps = {
    applications: readonly EvaluatedOfferDecisionApplication[];
};

const PANEL_ID = 'offer-decision-robustness-panel';

const createBalancedImportance = (): OfferDecisionImportance => ({
    ...DEFAULT_OFFER_DECISION_IMPORTANCE,
});

const getSavedFitRating = (jobId: number, applications: readonly EvaluatedOfferDecisionApplication[]): number => {
    const application = applications.find((candidate) => candidate.job_id === jobId);
    return application ? calculateOfferDecisionScore(application.evaluation.ratings) : 0;
};

const getFitChangeLabel = (difference: number): string => {
    if (difference === 0) {
        return 'No change';
    }
    const prefix = difference > 0 ? '+' : '';
    const pointLabel = Math.abs(difference) === 1 ? 'percentage point' : 'percentage points';

    return `${prefix}${difference} ${pointLabel}`;
};

const OfferDecisionRobustnessLab = ({ applications }: OfferDecisionRobustnessLabProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [importance, setImportance] = useState<OfferDecisionImportance>(createBalancedImportance);

    const analysis = useMemo(
        () => (applications.length >= 2 ? analyzeOfferDecisionRobustness(applications, importance) : null),
        [applications, importance]
    );

    if (!analysis) {
        return null;
    }

    const closeLab = () => {
        setImportance(createBalancedImportance());
        setIsOpen(false);
    };

    const updateImportance = (category: OfferDecisionCategory, value: OfferDecisionRating) => {
        setImportance((current) => ({ ...current, [category]: value }));
    };

    return (
        <section aria-labelledby='robustness-lab-heading' className={styles.lab}>
            <div className={styles.header}>
                <div>
                    <h3 id='robustness-lab-heading'>Try different priorities</h3>
                    <p>Change what matters most and see whether your top offer changes.</p>
                </div>
                <PrimaryButton
                    aria-controls={PANEL_ID}
                    aria-expanded={isOpen}
                    onClick={isOpen ? closeLab : () => setIsOpen(true)}
                    type='button'
                    variant='secondary'
                >
                    {isOpen ? 'Close' : 'Try priorities'}
                </PrimaryButton>
            </div>

            {isOpen && (
                <div className={styles.content} id={PANEL_ID}>
                    <div className={styles.controls}>
                        <p className={styles.temporaryNote}>
                            Move the sliders to preview how prioritising each category changes every offer&apos;s fit.
                        </p>
                        <fieldset className={styles.importanceFields}>
                            <legend>How important is each category?</legend>
                            {OFFER_DECISION_CATEGORIES.map((category) => {
                                const inputId = `robustness-importance-${category.key}`;
                                const value = importance[category.key];
                                return (
                                    <label className={styles.importanceField} htmlFor={inputId} key={category.key}>
                                        <span className={styles.importanceHeader}>
                                            <strong>{category.label}</strong>
                                            <output htmlFor={inputId}>{value} / 5</output>
                                        </span>
                                        <input
                                            aria-label={`${category.label} importance`}
                                            id={inputId}
                                            max={5}
                                            min={1}
                                            onChange={(event) =>
                                                updateImportance(
                                                    category.key,
                                                    Number(event.target.value) as OfferDecisionRating
                                                )
                                            }
                                            step={1}
                                            type='range'
                                            value={value}
                                        />
                                    </label>
                                );
                            })}
                        </fieldset>
                        <PrimaryButton
                            aria-label='Reset importance to balanced'
                            onClick={() => setImportance(createBalancedImportance())}
                            type='button'
                            variant='secondary'
                        >
                            Reset to balanced
                        </PrimaryButton>
                    </div>

                    <div className={styles.results}>
                        <h4>New fit rating with these priorities</h4>
                        <ol aria-label='Offer results' className={styles.ranking}>
                            {analysis.currentRanking.map((result) => {
                                const savedFitRating = getSavedFitRating(result.jobId, applications);
                                const fitDifference = result.score - savedFitRating;
                                const fitChangeClass =
                                    fitDifference > 0
                                        ? styles.increasedFit
                                        : fitDifference < 0
                                        ? styles.decreasedFit
                                        : styles.unchangedFit;
                                return (
                                    <li key={result.jobId}>
                                        <div className={styles.rankingHeader}>
                                            <span>
                                                <strong>{result.companyName}</strong>
                                                <span>{result.jobTitle}</span>
                                            </span>
                                            <span className={styles.fitResult}>
                                                <strong className={styles.newFitRating}>{result.score}%</strong>
                                                <span className={`${styles.fitChange} ${fitChangeClass}`}>
                                                    {getFitChangeLabel(fitDifference)}
                                                </span>
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                        <details className={styles.explanation}>
                            <summary>How different priorities work</summary>
                            <p>
                                Each fit rating is the average of the category ratings. Moving a priority slider changes
                                how much that category influences the comparison: 1 counts least and 5 counts most. The
                                percentage shown is the new weighted fit rating. Your saved evaluation stays unchanged.
                            </p>
                        </details>
                    </div>
                </div>
            )}
        </section>
    );
};

export default OfferDecisionRobustnessLab;
