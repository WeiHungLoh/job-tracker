import { useId } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useToast } from '../../../components/toast/ToastProvider';
import type { FollowUpDraft } from './followUpDrafts';
import styles from './FollowUpDraftDialog.module.css';

type FollowUpDraftDialogProps = {
    draft: FollowUpDraft | null;
    onClose: () => void;
};

const FollowUpDraftDialog = ({ draft, onClose }: FollowUpDraftDialogProps) => {
    const subjectLabelId = useId();
    const messageLabelId = useId();
    const { showErrorToast, showSuccessToast } = useToast();

    const handleCopyMessage = async () => {
        if (!draft) {
            return;
        }

        try {
            await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.message}`);
            onClose();
            showSuccessToast('Follow-up message copied to clipboard.');
        } catch {
            showErrorToast('Unable to copy the follow-up message. Please select and copy it manually.');
        }
    };

    return (
        <Dialog fullWidth maxWidth='sm' open={draft !== null} onClose={onClose}>
            {draft && (
                <>
                    <DialogTitle>{draft.title}</DialogTitle>
                    <DialogContent className={styles.content} dividers>
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
                        <p className={styles.note}>
                            Replace any bracketed placeholders before sending. Job Tracker will not send or save this
                            message.
                        </p>
                    </DialogContent>
                    <DialogActions className={styles.actions}>
                        <Button variant='outlined' onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant='contained' onClick={() => void handleCopyMessage()}>
                            Copy message
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
};

export default FollowUpDraftDialog;
