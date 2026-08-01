import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect, useRef } from 'react';
import ApplicationStatusBadge from '../../application/ApplicationStatusBadge';
import PrimaryButton from '../../../components/button/PrimaryButton';
import OfferEvaluationForm, { type OfferFieldRefs } from '../OfferEvaluationForm';
import { calculateOfferDecisionScore } from '../offerEvaluation';
import type {
    OfferDecisionApplication,
    OfferDecisionCategory,
    OfferDecisionRating,
    OfferDetails,
    OfferEvaluation,
    OfferEvaluationFormErrors,
} from '../models';
import dialogStyles from './OfferEvaluationDialog.module.css';
import evaluationStyles from '../OfferEvaluation.module.css';

export type OfferEvaluationDialogMode = 'add' | 'edit';

type OfferEvaluationDialogProps = {
    application: OfferDecisionApplication;
    errors: OfferEvaluationFormErrors;
    evaluation: OfferEvaluation;
    expired: boolean;
    isSaving: boolean;
    mode: OfferEvaluationDialogMode;
    submitOnEnterWhenUnfocused?: boolean;
    onCancel: () => void;
    onDecisionDeadlineValidityChange: (hasBadInput: boolean) => void;
    onDetailsChange: (details: OfferDetails, field: keyof OfferEvaluationFormErrors) => void;
    onRatingChange: (category: OfferDecisionCategory, value: OfferDecisionRating) => void;
    onSave: (decisionDeadlineHasBadInput: boolean, refs: OfferFieldRefs) => void;
};

const OfferEvaluationDialog = ({
    application,
    errors,
    evaluation,
    expired,
    isSaving,
    mode,
    submitOnEnterWhenUnfocused = false,
    onCancel,
    onDecisionDeadlineValidityChange,
    onDetailsChange,
    onRatingChange,
    onSave,
}: OfferEvaluationDialogProps) => {
    const titleId = `offer-evaluation-dialog-title-${application.job_id}`;
    const dialogTitle = mode === 'add' ? 'Add Evaluation' : 'Edit Evaluation';
    const formId = `offer-evaluation-dialog-form-${application.job_id}`;
    const score = calculateOfferDecisionScore(evaluation.ratings);
    const formRef = useRef<HTMLFormElement>(null);
    useEffect(() => {
        if (!submitOnEnterWhenUnfocused) {
            return;
        }

        const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key !== 'Enter' || event.shiftKey) {
                return;
            }
            const target = event.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLSelectElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLButtonElement
            ) {
                return;
            }
            event.preventDefault();
            formRef.current?.requestSubmit();
        };

        document.addEventListener('keydown', handleDocumentKeyDown);
        return () => document.removeEventListener('keydown', handleDocumentKeyDown);
    }, [submitOnEnterWhenUnfocused]);

    return (
        <Dialog
            aria-labelledby={titleId}
            fullWidth
            maxWidth='md'
            onClose={onCancel}
            open
            PaperProps={{ className: dialogStyles.dialogPaper }}
        >
            <DialogTitle className={dialogStyles.dialogTitle} id={titleId}>
                {dialogTitle}
            </DialogTitle>
            <DialogContent className={dialogStyles.dialogContent}>
                <div className={dialogStyles.editor}>
                    <header className={evaluationStyles.cardHeader}>
                        <div>
                            <h2>{application.company_name}</h2>
                            <p>{application.job_title}</p>
                        </div>
                        <div className={evaluationStyles.badges}>
                            {expired && <span className={evaluationStyles.expiredBadge}>Expired</span>}
                            <ApplicationStatusBadge compact jobStatus={application.job_status} />
                        </div>
                    </header>
                    <div className={evaluationStyles.score}>
                        <div className={evaluationStyles.scoreHeader}>
                            <span>Fit rating</span>
                            <strong>{score}%</strong>
                        </div>
                        <progress aria-label={`${application.company_name} offer fit rating`} max={100} value={score} />
                    </div>
                    <OfferEvaluationForm
                        application={application}
                        errors={errors}
                        evaluation={evaluation}
                        formId={formId}
                        formRef={formRef}
                        isSaving={isSaving}
                        onCancel={onCancel}
                        onDecisionDeadlineValidityChange={onDecisionDeadlineValidityChange}
                        onDetailsChange={onDetailsChange}
                        onRatingChange={onRatingChange}
                        onSave={onSave}
                        showActions={false}
                    />
                </div>
            </DialogContent>
            <DialogActions className={dialogStyles.dialogActions}>
                <PrimaryButton
                    aria-label={`Cancel evaluation for ${application.company_name}`}
                    disabled={isSaving}
                    onClick={onCancel}
                    type='button'
                    variant='secondary'
                >
                    Cancel
                </PrimaryButton>
                <PrimaryButton
                    aria-label={`Save evaluation for ${application.company_name}`}
                    form={formId}
                    isLoading={isSaving}
                    type='submit'
                >
                    Save evaluation
                </PrimaryButton>
            </DialogActions>
        </Dialog>
    );
};

export default OfferEvaluationDialog;
