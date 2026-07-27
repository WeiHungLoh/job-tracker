import { useId, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useToast } from '../../../components/toast/ToastProvider';
import type { FollowUpDraft } from './followUpDrafts';
import PrimaryButton from '../../../components/button/PrimaryButton';
import { getErrorToastMessage } from '../../../helper/getErrorToastMessage';
import styles from './FollowUpDraftDialog.module.css';

type FollowUpDraftDialogProps = {
    draft: FollowUpDraft | null;
    markAsSentLabel?: string;
    onClose: () => void;
    onMarkAsSent?: () => void | Promise<void>;
};

const FollowUpDraftDialog = ({ draft, markAsSentLabel, onClose, onMarkAsSent }: FollowUpDraftDialogProps) => {
    const subjectLabelId = useId();
    const messageLabelId = useId();
    const { showErrorToast, showSuccessToast } = useToast();
    const [isMarkingFollowUpSent, setIsMarkingFollowUpSent] = useState(false);

    const handleCopyMessage = async () => {
        if (!draft) {
            return;
        }

        try {
            await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.message}`);
            showSuccessToast('Follow-up message copied to clipboard.');
        } catch {
            showErrorToast('Unable to copy the follow-up message. Please select and copy it manually.');
        }
    };

    const handleMarkAsSent = async () => {
        if (!onMarkAsSent || isMarkingFollowUpSent) {
            return;
        }

        setIsMarkingFollowUpSent(true);
        try {
            await onMarkAsSent();
            onClose();
            showSuccessToast('Follow-up marked as sent.');
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to mark the follow-up as sent. Please try again.'));
        } finally {
            setIsMarkingFollowUpSent(false);
        }
    };

    return (
        <Dialog fullWidth maxWidth='sm' open={draft !== null} onClose={onClose}>
            {draft && (
                <>
                    <DialogTitle>{draft.title}</DialogTitle>
                    <DialogContent className={styles.content}>
                        <section className={styles.section}>
                            <h3 className={styles.label} id={subjectLabelId}>
                                Subject
                            </h3>
                            <p aria-labelledby={subjectLabelId} className={styles.text}>
                                {draft.subject}
                            </p>
                        </section>
                        <section className={styles.section}>
                            <h3 className={styles.label} id={messageLabelId}>
                                Message
                            </h3>
                            <p aria-labelledby={messageLabelId} className={`${styles.text} ${styles.message}`}>
                                {draft.message}
                            </p>
                        </section>
                        <p className={styles.note}>Job Tracker creates the draft but does not send the email itself.</p>
                    </DialogContent>
                    <DialogActions className={styles.actions}>
                        {onMarkAsSent && markAsSentLabel && (
                            <PrimaryButton
                                aria-label={markAsSentLabel}
                                className={styles.actionButton}
                                isLoading={isMarkingFollowUpSent}
                                onClick={() => void handleMarkAsSent()}
                                type='button'
                                variant='destructive'
                            >
                                Mark as sent
                            </PrimaryButton>
                        )}
                        <span className={styles.actionSpacer} />
                        <PrimaryButton
                            className={styles.actionButton}
                            disabled={isMarkingFollowUpSent}
                            onClick={onClose}
                            type='button'
                            variant='secondary'
                        >
                            Cancel
                        </PrimaryButton>
                        <PrimaryButton
                            className={styles.actionButton}
                            disabled={isMarkingFollowUpSent}
                            onClick={() => void handleCopyMessage()}
                            type='button'
                            variant='default'
                        >
                            Copy message
                        </PrimaryButton>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
};

export default FollowUpDraftDialog;
