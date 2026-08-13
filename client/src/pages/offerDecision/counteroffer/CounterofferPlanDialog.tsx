import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useConfirm } from 'material-ui-confirm';
import { JobTrackerAPIError } from '../../../api/models';
import PrimaryButton from '../../../components/button/PrimaryButton';
import LoadingSpinner from '../../../components/loadingSpinner/LoadingSpinner';
import { createDestructiveConfirmationButtonProps } from '../../../components/confirmation/destructiveConfirmationButtonProps';
import { useToast } from '../../../components/toast/ToastProvider';
import { getErrorToastMessage } from '../../../helper/getErrorToastMessage';
import CounterofferCurrentOffer from './CounterofferCurrentOffer';
import CounterofferIdealOffer from './CounterofferIdealOffer';
import {
    buildCounterofferConclusion,
    counterofferPlanValuesAreEqual,
    createCounterofferPlanFromEvaluation,
    isCounterofferPlanningEligible,
    validateCounterofferPlan,
} from './counterofferPlan';
import { calculateOfferDecisionScore } from '../offerEvaluation';
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
        return 'Plan Counteroffer';
    }
    return mode === 'edit' ? 'Edit Counteroffer Plan' : 'Counteroffer Plan';
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

    const requestClose = () => {
        if (isSaving || isDeleting) {
            return;
        }
        onClose();
    };

    const cancelChanges = () => {
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
            const target = document.getElementById(
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
            if (validation.errors.unchanged) {
                showErrorToast(validation.errors.unchanged);
                return;
            }
            setSubmittedErrors(validation.errors);
            focusFirstError(validation.errors);
            if (validation.errors.fit_rating) {
                showErrorToast('The Ideal offer cannot have a lower fit rating than the current offer.');
            }
            return;
        }
        if (mode === 'edit' && baselinePlan && counterofferPlanValuesAreEqual(validation.request, baselinePlan)) {
            showErrorToast('Change at least one term or rating for the Ideal offer.');
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

    const submitPlan = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void savePlan();
    };

    const handlePlanFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        const target = event.target;
        if (event.key === 'Escape' && target instanceof HTMLInputElement) {
            event.preventDefault();
            event.stopPropagation();
            cancelChanges();
        }
    };

    const handlePlanKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        const target = event.target;
        if (event.key !== 'Enter' || mode === 'view' || (target instanceof HTMLTextAreaElement && !event.shiftKey)) {
            return;
        }
        event.preventDefault();
        void savePlan();
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
            confirmationButtonProps: createDestructiveConfirmationButtonProps(),
        });
        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        try {
            await onDelete(application.job_id);
            onPlanAvailabilityChange(application.job_id, false);
            showSuccessToast('Counteroffer plan deleted.');
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
            onClose={requestClose}
            onKeyDown={handlePlanKeyDown}
            open
            PaperProps={{ className: styles.dialogPaper }}
        >
            <DialogTitle className={styles.dialogTitle}>{title}</DialogTitle>
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
                            <PrimaryButton onClick={() => void loadPlan(application)} type='button' variant='default'>
                                Try again
                            </PrimaryButton>
                            <PrimaryButton onClick={onClose} type='button' variant='secondary'>
                                Close
                            </PrimaryButton>
                        </div>
                    </div>
                ) : plan ? (
                    <form
                        className={styles.planFlow}
                        id='counteroffer-plan-form'
                        noValidate
                        onKeyDown={handlePlanFormKeyDown}
                        onSubmit={submitPlan}
                    >
                        <CounterofferCurrentOffer application={application} />
                        <CounterofferIdealOffer
                            application={application}
                            conclusion={buildCounterofferConclusion(
                                application,
                                calculateOfferDecisionScore(plan.ratings),
                                applications
                            )}
                            editable={editable}
                            errors={submittedErrors}
                            onChange={updatePlan}
                            plan={plan}
                        />
                    </form>
                ) : null}
            </DialogContent>
            {!isLoading && !loadFailed && plan && (
                <DialogActions className={styles.actions}>
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
                                onClick={cancelChanges}
                                type='button'
                                variant='secondary'
                            >
                                {mode === 'create' ? 'Cancel' : 'Cancel changes'}
                            </PrimaryButton>
                            <PrimaryButton
                                aria-label='Save'
                                form='counteroffer-plan-form'
                                isLoading={isSaving}
                                type='submit'
                                variant='default'
                            >
                                Save
                            </PrimaryButton>
                        </>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default CounterofferPlanDialog;
