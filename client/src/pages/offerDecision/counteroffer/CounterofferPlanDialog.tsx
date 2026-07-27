import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfirm } from 'material-ui-confirm';
import { JobTrackerAPIError } from '../../../api/models';
import PrimaryButton from '../../../components/button/PrimaryButton';
import LoadingSpinner from '../../../components/loadingSpinner/LoadingSpinner';
import { useToast } from '../../../components/toast/ToastProvider';
import { getErrorToastMessage } from '../../../helper/getErrorToastMessage';
import CounterofferIdealOffer from './CounterofferIdealOffer';
import {
    buildCounterofferConclusion,
    counterofferPlanValuesAreEqual,
    createCounterofferPlanFromEvaluation,
    isCounterofferPlanningEligible,
    validateCounterofferPlan,
} from './counterofferPlan';
import { calculateOfferDecisionScore } from '../offerEvaluation';
import { OFFER_DECISION_CATEGORIES } from '../offerDecisionConfig';
import type {
    CounterofferPlan,
    CounterofferPlanErrors,
    OfferDecisionApplication,
    SaveCounterofferPlanRequest,
} from '../models';
import styles from './CounterofferPlanDialog.module.css';

type CounterofferPlanDialogProps = {
    application: OfferDecisionApplication | null;
    applications: OfferDecisionApplication[];
    hasPlan: boolean;
    onClose: () => void;
    onDelete: (jobId: number) => Promise<void>;
    onGet: (jobId: number) => Promise<CounterofferPlan>;
    onPlanAvailabilityChange: (jobId: number, hasPlan: boolean) => void;
    onSave: (jobId: number, request: SaveCounterofferPlanRequest) => Promise<void>;
    readOnly: boolean;
};

type DialogMode = 'create' | 'view' | 'edit';

const clonePlan = (plan: CounterofferPlan): CounterofferPlan => ({
    ...plan,
    ratings: { ...plan.ratings },
});

const getDialogTitle = (mode: DialogMode): string => {
    if (mode === 'create') {
        return 'Plan counteroffer';
    }
    return mode === 'edit' ? 'Edit counteroffer plan' : 'Counteroffer plan';
};

const CurrentOfferPanel = ({ application }: { application: OfferDecisionApplication }) => {
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
                            <dd>{evaluation.details.bonus || 'Not included'}</dd>
                        </div>
                        <div>
                            <dt>Annual leave</dt>
                            <dd>
                                {evaluation.details.annual_leave_days === null
                                    ? 'Not included'
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

const CounterofferPlanDialog = ({
    application,
    applications,
    hasPlan,
    onClose,
    onDelete,
    onGet,
    onPlanAvailabilityChange,
    onSave,
    readOnly,
}: CounterofferPlanDialogProps) => {
    const confirm = useConfirm();
    const { showErrorToast, showSuccessToast } = useToast();
    const [mode, setMode] = useState<DialogMode>('create');
    const [plan, setPlan] = useState<CounterofferPlan | null>(null);
    const [baselinePlan, setBaselinePlan] = useState<CounterofferPlan | null>(null);
    const [savedPlan, setSavedPlan] = useState<CounterofferPlan | null>(null);
    const [submittedErrors, setSubmittedErrors] = useState<CounterofferPlanErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const initializedJobIdRef = useRef<number | undefined>(undefined);
    const requestIdRef = useRef(0);

    const canEdit = application ? isCounterofferPlanningEligible(application, readOnly) : false;
    const liveErrors = useMemo<CounterofferPlanErrors>(() => {
        if (!application?.evaluation || !plan || mode === 'view') {
            return {};
        }
        const validation = validateCounterofferPlan(plan, application.evaluation);
        return !validation.isValid && validation.errors.fit_rating ? { fit_rating: validation.errors.fit_rating } : {};
    }, [application, mode, plan]);
    const errors = { ...submittedErrors, ...liveErrors };
    const dirty = Boolean(plan && baselinePlan && !counterofferPlanValuesAreEqual(plan, baselinePlan));

    const initializeNewPlan = (selectedApplication: OfferDecisionApplication) => {
        const nextPlan = createCounterofferPlanFromEvaluation(selectedApplication.evaluation!);
        setMode('create');
        setPlan(nextPlan);
        setBaselinePlan(clonePlan(nextPlan));
        setSavedPlan(null);
        setSubmittedErrors({});
        setIsLoading(false);
        setLoadFailed(false);
    };

    const loadPlan = async (selectedApplication: OfferDecisionApplication) => {
        const requestId = ++requestIdRef.current;
        setIsLoading(true);
        setLoadFailed(false);
        setMode('view');
        setPlan(null);
        setSubmittedErrors({});
        try {
            const loadedPlan = await onGet(selectedApplication.job_id);
            if (requestId !== requestIdRef.current) {
                return;
            }
            setPlan(clonePlan(loadedPlan));
            setSavedPlan(clonePlan(loadedPlan));
            setBaselinePlan(clonePlan(loadedPlan));
        } catch (error) {
            if (requestId !== requestIdRef.current) {
                return;
            }
            if (error instanceof JobTrackerAPIError && error.status === 404) {
                onPlanAvailabilityChange(selectedApplication.job_id, false);
                if (isCounterofferPlanningEligible(selectedApplication, readOnly)) {
                    initializeNewPlan(selectedApplication);
                } else {
                    showErrorToast('Counteroffer plan was not found.');
                    onClose();
                }
                return;
            }
            setLoadFailed(true);
            showErrorToast(getErrorToastMessage(error, 'Unable to load the counteroffer plan. Please try again.'));
        } finally {
            if (requestId === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        if (!application) {
            initializedJobIdRef.current = undefined;
            requestIdRef.current += 1;
            return;
        }
        if (initializedJobIdRef.current === application.job_id) {
            return;
        }

        initializedJobIdRef.current = application.job_id;
        if (hasPlan) {
            void loadPlan(application);
        } else {
            initializeNewPlan(application);
        }
    }, [application, hasPlan]);

    if (!application || !application.evaluation) {
        return null;
    }

    const updatePlan = (updatedPlan: CounterofferPlan) => {
        setPlan(updatedPlan);
        setSubmittedErrors({});
    };

    const confirmDiscard = async (): Promise<boolean> => {
        if (!dirty) {
            return true;
        }
        const { confirmed } = await confirm({
            title: 'Discard counteroffer changes?',
            description: 'Your unsaved Ideal offer terms and ratings will be lost.',
            confirmationText: 'Discard changes',
            cancellationText: 'Keep editing',
        });
        return confirmed;
    };

    const requestClose = async () => {
        if (isSaving || isDeleting || !(await confirmDiscard())) {
            return;
        }
        onClose();
    };

    const cancelChanges = async () => {
        if (!(await confirmDiscard())) {
            return;
        }
        if (mode === 'create') {
            onClose();
            return;
        }
        const restored = clonePlan(savedPlan ?? baselinePlan!);
        setPlan(restored);
        setBaselinePlan(clonePlan(restored));
        setSubmittedErrors({});
        setMode('view');
    };

    const focusFirstError = (validationErrors: CounterofferPlanErrors) => {
        window.setTimeout(() => {
            const target =
                document.getElementById('counteroffer-error-focus') ??
                document.getElementById(
                    `counteroffer-${application.job_id}-ideal-${
                        validationErrors.monthly_base_salary
                            ? 'monthly-base-salary'
                            : validationErrors.bonus
                            ? 'bonus'
                            : validationErrors.annual_leave_days
                            ? 'annual-leave'
                            : validationErrors.work_arrangement
                            ? 'work-arrangement'
                            : 'career_growth'
                    }`
                );
            target?.focus();
            target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        }, 0);
    };

    const savePlan = async () => {
        if (isSaving || !plan) {
            return;
        }
        const validation = validateCounterofferPlan(plan, application.evaluation!);
        if (!validation.isValid) {
            setSubmittedErrors(validation.errors);
            focusFirstError(validation.errors);
            showErrorToast(
                validation.errors.fit_rating
                    ? 'The Ideal offer has a lower fit rating than the current offer. Review the highlighted ratings before saving.'
                    : 'Review the highlighted Ideal offer fields before saving.'
            );
            return;
        }

        const wasSaved = savedPlan !== null;
        setIsSaving(true);
        try {
            await onSave(application.job_id, validation.request);
            const persistedPlan = clonePlan(validation.request);
            setSavedPlan(clonePlan(persistedPlan));
            setPlan(persistedPlan);
            setBaselinePlan(clonePlan(persistedPlan));
            setSubmittedErrors({});
            setMode('view');
            onPlanAvailabilityChange(application.job_id, true);
            showSuccessToast(wasSaved ? 'Counteroffer plan updated.' : 'Counteroffer plan saved.');
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to save the counteroffer plan. Please try again.'));
        } finally {
            setIsSaving(false);
        }
    };

    const deletePlan = async () => {
        if (isDeleting) {
            return;
        }
        const { confirmed } = await confirm({
            title: 'Delete counteroffer plan?',
            description: 'This removes the Ideal offer. The original offer evaluation will not be changed.',
            confirmationText: 'Delete',
            cancellationText: 'Cancel',
            confirmationButtonProps: { autoFocus: true },
        });
        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        try {
            await onDelete(application.job_id);
            onPlanAvailabilityChange(application.job_id, false);
            onClose();
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to delete the counteroffer plan. Please try again.'));
        } finally {
            setIsDeleting(false);
        }
    };

    const title = getDialogTitle(mode);
    const editable = mode !== 'view';

    return (
        <Dialog
            aria-describedby='counteroffer-plan-description'
            fullWidth
            maxWidth='md'
            onClose={() => void requestClose()}
            open
            PaperProps={{ className: styles.dialogPaper }}
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent className={styles.dialogContent}>
                <div className={styles.applicationContext}>
                    <strong>{application.company_name}</strong>
                    <span>{application.job_title}</span>
                </div>
                <p className={styles.description} id='counteroffer-plan-description'>
                    Compare one Ideal offer with your current saved offer. You control every rating, and nothing here
                    changes the actual evaluation or contacts the company.
                </p>

                {isLoading ? (
                    <div className={styles.loadingState}>
                        <LoadingSpinner title='Loading counteroffer plan' />
                    </div>
                ) : loadFailed ? (
                    <div className={styles.loadError} role='alert'>
                        <p>Unable to load the counteroffer plan. Please try again.</p>
                        <div>
                            <Button onClick={() => void loadPlan(application)} variant='contained'>
                                Try again
                            </Button>
                            <Button onClick={onClose} variant='outlined'>
                                Close
                            </Button>
                        </div>
                    </div>
                ) : plan ? (
                    <div className={styles.planFlow}>
                        <CurrentOfferPanel application={application} />
                        <CounterofferIdealOffer
                            application={application}
                            conclusion={buildCounterofferConclusion(
                                application,
                                calculateOfferDecisionScore(plan.ratings),
                                applications
                            )}
                            editable={editable}
                            errors={errors}
                            onChange={updatePlan}
                            plan={plan}
                        />
                    </div>
                ) : null}
            </DialogContent>
            {!isLoading && !loadFailed && plan && (
                <DialogActions className={styles.actions} data-button-count={mode === 'view' && canEdit ? 3 : 2}>
                    {mode === 'view' ? (
                        <>
                            <PrimaryButton
                                aria-label='Delete counteroffer plan'
                                isLoading={isDeleting}
                                onClick={() => void deletePlan()}
                                type='button'
                                variant='destructive'
                            >
                                Delete
                            </PrimaryButton>
                            <span className={styles.actionSpacer} />
                            <PrimaryButton disabled={isDeleting} onClick={onClose} type='button' variant='secondary'>
                                Close
                            </PrimaryButton>
                            {canEdit && (
                                <PrimaryButton
                                    disabled={isDeleting}
                                    onClick={() => setMode('edit')}
                                    type='button'
                                    variant='default'
                                >
                                    Edit
                                </PrimaryButton>
                            )}
                        </>
                    ) : (
                        <>
                            <PrimaryButton
                                disabled={isSaving}
                                onClick={() => void cancelChanges()}
                                type='button'
                                variant='secondary'
                            >
                                {mode === 'create' ? 'Cancel' : 'Cancel changes'}
                            </PrimaryButton>
                            <PrimaryButton
                                disabled={isSaving}
                                onClick={() => void savePlan()}
                                type='button'
                                variant='default'
                            >
                                {isSaving ? 'Saving…' : 'Save'}
                            </PrimaryButton>
                        </>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default CounterofferPlanDialog;
