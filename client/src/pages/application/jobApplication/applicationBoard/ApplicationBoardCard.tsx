import { useDraggable } from '@dnd-kit/core';
import BoardCardActions from '../../../../components/boardCardActions/BoardCardActions';
import PrimaryButton from '../../../../components/button/PrimaryButton';
import Icon from '../../../../components/icon/Icon';
import formatDate from '../../../../helper/dateFormatter';
import { FIELD_MAX_LENGTHS } from '../../../../helper/formValidation';
import { JOB_STATUS_SORT_ORDER, type JobStatus } from '../../models';
import { getApplicationBoardStatusClassName } from '../../applicationBoard/statusClassNames';
import type { ApplicationBoardCardProps } from './models';
import NoteSaveStatus from '../../../../components/noteSaveStatus/NoteSaveStatus';
import styles from '../../applicationBoard/ApplicationBoard.module.css';
import { isApplicationStatusDisabled } from '../../applicationStatusRestrictions';
import FollowUpSentBadge from '../../../../components/followUpSentBadge/FollowUpSentBadge';
import PinControl from '../../../../components/pinControl/PinControl';

const ApplicationBoardCard = ({
    application,
    hasInterview,
    hasOfferEvaluation,
    isArchiving,
    isDeleting,
    isHighlighted = false,
    isUpdatingPin,
    isUpdatingStatus,
    isUndoingFollowUp,
    note,
    noteSaveStatus,
    onArchive,
    onDelete,
    onEditNotes,
    onNotesBlur,
    onNotesVisibilityChange,
    onPinToggle,
    onRetryNotes,
    onStatusChange,
    onUndoFollowUp,
    upcomingInterviewCount,
}: ApplicationBoardCardProps) => {
    const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform } = useDraggable({
        data: { jobId: application.job_id },
        disabled: isUpdatingStatus,
        id: String(application.job_id),
    });
    const formattedApplicationDate = formatDate(application.application_date);
    const cardClassName = [
        styles.card,
        isDragging ? styles.cardDragging : '',
        isHighlighted ? styles.cardHighlighted : '',
        isUpdatingStatus ? styles.cardUpdating : '',
    ]
        .filter(Boolean)
        .join(' ');
    const cardTransform = transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)${isDragging ? ' scale(1.01)' : ''}`
        : isDragging
        ? 'scale(1.01)'
        : undefined;
    const cardStyle = cardTransform
        ? {
              transform: cardTransform,
          }
        : undefined;

    return (
        <article
            aria-label={`${application.company_name} ${application.job_title}`}
            className={cardClassName}
            id={String(application.job_id)}
            ref={setNodeRef}
            style={cardStyle}
        >
            <div className={styles.cardHeader}>
                <h3>{application.company_name}</h3>
                <div className={styles.cardHeaderControls}>
                    <PinControl
                        itemLabel={application.company_name}
                        isPending={isUpdatingPin}
                        isPinned={application.is_pinned}
                        onToggle={() => onPinToggle(application)}
                        size='board'
                        subject='application'
                    />
                    <span
                        className={`${styles.statusBadge} ${getApplicationBoardStatusClassName(
                            application.job_status
                        )}`}
                    >
                        {application.job_status}
                    </span>
                    <button
                        aria-label={`Drag ${application.company_name} ${application.job_title} application`}
                        className={styles.dragHandle}
                        disabled={isUpdatingStatus}
                        ref={setActivatorNodeRef}
                        type='button'
                        {...listeners}
                        {...attributes}
                    >
                        <Icon name='dragHandle' />
                    </button>
                </div>
            </div>

            <p className={styles.jobTitle}>{application.job_title}</p>
            <p className={styles.meta}>{formattedApplicationDate.formattedDay}</p>
            {application.application_follow_up_sent_at && application.job_status === 'Applied' && (
                <FollowUpSentBadge
                    className={styles.boardFollowUp}
                    compact
                    contextLabel={`${application.job_title} at ${application.company_name}`}
                    isUndoing={isUndoingFollowUp}
                    onUndo={onUndoFollowUp ? () => onUndoFollowUp(application) : undefined}
                    sentAt={application.application_follow_up_sent_at}
                />
            )}

            {upcomingInterviewCount > 0 && (
                <span className={styles.upcomingBadge}>
                    {upcomingInterviewCount} Upcoming Interview{upcomingInterviewCount > 1 ? 's' : ''}
                </span>
            )}

            <label className={styles.statusSelectLabel}>
                <span>Move to</span>
                <select
                    aria-label={`Move ${application.company_name} to status`}
                    disabled={isUpdatingStatus}
                    onChange={(event) => void onStatusChange(application, event.target.value as JobStatus)}
                    value={application.job_status}
                >
                    {JOB_STATUS_SORT_ORDER.map((status) => (
                        <option
                            disabled={isApplicationStatusDisabled(status, hasInterview, hasOfferEvaluation)}
                            key={status}
                            value={status}
                        >
                            {status}
                        </option>
                    ))}
                </select>
            </label>

            <BoardCardActions
                compactActions
                compactPanelSpacing
                compactSizing
                onOpenChange={(isOpen) => onNotesVisibilityChange(application.job_id, isOpen)}
                actions={
                    <>
                        <PrimaryButton
                            isLoading={isArchiving}
                            onClick={() => onArchive(application.job_id)}
                            type='button'
                            variant='secondary'
                        >
                            Archive
                        </PrimaryButton>
                        <PrimaryButton
                            isLoading={isDeleting}
                            onClick={() => onDelete(application.job_id)}
                            type='button'
                            variant='destructive'
                        >
                            Delete
                        </PrimaryButton>
                    </>
                }
            >
                {application.job_posting_url !== '' && (
                    <a href={application.job_posting_url} rel='noreferrer noopener' target='_blank'>
                        Click here to view job posting
                    </a>
                )}
                <div className={styles.notesField}>
                    <label htmlFor={`application-notes-${application.job_id}`}>Edit notes</label>
                    <div className={styles.notesEditor}>
                        <textarea
                            id={`application-notes-${application.job_id}`}
                            disabled={isArchiving}
                            maxLength={FIELD_MAX_LENGTHS.notes}
                            onChange={(event) => onEditNotes(application.job_id, event.target.value)}
                            onBlur={() => onNotesBlur(application.job_id)}
                            placeholder='Add your notes here'
                            value={note}
                        />
                        <NoteSaveStatus
                            applicationName={application.company_name}
                            onRetry={() => onRetryNotes(application.job_id)}
                            status={noteSaveStatus}
                        />
                    </div>
                </div>
            </BoardCardActions>
        </article>
    );
};

export default ApplicationBoardCard;
