import type { CounterofferRequestedChange } from './counterofferPlan';
import styles from './CounterofferPlanDialog.module.css';

type CounterofferRequestedChangesProps = {
    changes: CounterofferRequestedChange[];
    ratingsChanged: boolean;
};

const CounterofferRequestedChanges = ({ changes, ratingsChanged }: CounterofferRequestedChangesProps) => (
    <section aria-labelledby='counteroffer-requested-changes-heading' className={styles.requestedChanges}>
        <h5 id='counteroffer-requested-changes-heading'>Requested Changes</h5>
        {changes.length === 0 ? (
            <p className={styles.noRequestedChanges}>
                {ratingsChanged ? 'No changes in offer fields (only ratings changed).' : 'No requested changes yet.'}
            </p>
        ) : (
            <ul className={styles.requestedChangeList}>
                {changes.map((change) => {
                    const headingId = `counteroffer-requested-change-${change.key}`;
                    return (
                        <li key={change.key}>
                            <article aria-labelledby={headingId} className={styles.requestedChange}>
                                <h6 id={headingId}>{change.label}</h6>
                                <div className={styles.requestedChangeColumns}>
                                    <div className={styles.requestedChangeColumn}>
                                        <span className={styles.requestedChangeLabel}>Current</span>
                                        <span className={styles.requestedChangeValue}>{change.currentValue}</span>
                                    </div>
                                    <div className={styles.requestedChangeColumn}>
                                        <span className={styles.requestedChangeLabel}>Ideal</span>
                                        <span className={styles.requestedChangeValue}>{change.idealValue}</span>
                                    </div>
                                </div>
                            </article>
                        </li>
                    );
                })}
            </ul>
        )}
    </section>
);

export default CounterofferRequestedChanges;
