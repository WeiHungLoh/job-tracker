import { Link } from 'react-router-dom';
import PrimaryButton from '../../components/button/PrimaryButton';
import applicationStyles from '../application/ApplicationCard.module.css';
import type { InterviewCardProps } from './InterviewCard.models';
import CalendarOptions from './calendarOptions/CalendarOptions';
import styles from './InterviewCard.module.css';
import BoardCardActions from '../../components/boardCardActions/BoardCardActions';
import { formatInterviewCountdown, getInterviewTiming } from '../../helper/interviewTiming';
import FollowUpSentBadge from '../../components/followUpSentBadge/FollowUpSentBadge';
import PinControl from '../../components/pinControl/PinControl';
import NoteSaveStatus from '../../components/noteSaveStatus/NoteSaveStatus';
import { FIELD_MAX_LENGTHS } from '../../helper/formValidation';
import Icon from '../../components/icon/Icon';

const EMPTY_NOTES_MESSAGE = 'You do not have any notes here';

const InterviewCard = (props: InterviewCardProps) => {
    const {
        applicationRoute,
        currentTime = new Date(),
        index,
        interview,
        isDeleting,
        layout = 'list',
        onDelete,
        onViewApplicationClick,
        variant,
    } = props;
    const applicationId = variant === 'job' ? interview.job_id : interview.archived_job_id;
    const timing = getInterviewTiming(interview, currentTime);
    const showCalendarOptions = variant === 'job' && timing.isValid && !timing.hasStarted;
    const isOverdue = timing.hasEnded;
    const isBoardLayout = layout === 'board';
    const interviewId = variant === 'job' ? interview.interview_id : interview.archived_interview_id;
    const note = variant === 'job' ? props.note ?? interview.interview_notes : interview.interview_notes;
    const renderActiveNotesEditor = (className: string) =>
        variant === 'job' ? (
            <div className={className}>
                <textarea
                    aria-label={`Notes for ${interview.company_name}`}
                    id={`interview-notes-${interviewId}`}
                    maxLength={FIELD_MAX_LENGTHS.notes}
                    onBlur={() => props.onNotesBlur?.(interview.interview_id)}
                    onChange={(event) => props.onEditNotes?.(interview.interview_id, event.target.value)}
                    placeholder='Add your notes here'
                    value={note}
                />
                <NoteSaveStatus
                    applicationName={interview.company_name}
                    onRetry={() => props.onRetryNotes?.(interview.interview_id)}
                    status={props.noteSaveStatus ?? 'idle'}
                />
            </div>
        ) : null;
    const renderReadOnlyNotes = (className: string) =>
        variant === 'archived' ? (
            <textarea
                aria-label={`Notes for ${interview.company_name}`}
                className={className}
                disabled
                readOnly
                value={interview.interview_notes.trim() === '' ? EMPTY_NOTES_MESSAGE : interview.interview_notes}
            />
        ) : null;
    const timingStatus = !timing.isValid
        ? { className: styles.timeLeft, label: 'Status unavailable' }
        : timing.hasEnded
        ? { className: applicationStyles.accepted, label: 'Completed' }
        : {
              className: timing.isInProgress ? applicationStyles.rejected : applicationStyles.upcomingBadge,
              label: `${timing.isInProgress ? 'Ends' : 'Starts'} in ${formatInterviewCountdown(timing, currentTime)}`,
          };
    const cardClasses = [
        styles.interview,
        variant === 'archived' ? styles.archived : '',
        isBoardLayout ? styles.board : '',
        !isBoardLayout && props.showNotes ? styles.notesVisible : '',
        isOverdue ? styles.overdue : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <article
            aria-label={`${interview.company_name} interview`}
            className={cardClasses}
            id={variant === 'job' ? String(interview.interview_id) : undefined}
        >
            <div className={styles.interviewContent}>
                <div className={`${applicationStyles.headingRow} ${styles.headingRow}`}>
                    <h2>
                        {index + 1}. {interview.company_name}
                    </h2>
                    {variant === 'job' ? (
                        <PinControl
                            itemLabel={interview.company_name}
                            isPending={props.isUpdatingPin}
                            isPinned={interview.is_pinned}
                            onToggle={() => props.onPinToggle(interview)}
                            size={isBoardLayout ? 'board' : 'list'}
                            subject='interview'
                        />
                    ) : (
                        <PinControl
                            itemLabel={interview.company_name}
                            isPinned={interview.is_pinned}
                            size={isBoardLayout ? 'board' : 'list'}
                            subject='interview'
                        />
                    )}
                </div>
                <p className={styles.jobTitle}>{interview.job_title}</p>
                {isBoardLayout ? (
                    <>
                        <p className={styles.date}>{timing.formattedRange}</p>
                        {interview.follow_up_sent_at && (
                            <FollowUpSentBadge
                                compact
                                contextLabel={`${interview.job_title} at ${interview.company_name}`}
                                isUndoing={variant === 'job' ? props.isUndoingFollowUp : undefined}
                                onUndo={
                                    variant === 'job' && props.onUndoFollowUp
                                        ? () => props.onUndoFollowUp?.(interview)
                                        : undefined
                                }
                                sentAt={interview.follow_up_sent_at}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <p className={styles.location}>{interview.interview_location}</p>
                        {interview.interview_type !== '' && <p className={styles.type}>{interview.interview_type}</p>}
                        <p className={styles.date}>Scheduled {timing.formattedRange}</p>
                    </>
                )}
                {!isBoardLayout && (
                    <>
                        <div className={styles.badgeGroup}>
                            <p className={`${timingStatus.className} ${styles.timingBadge}`}>{timingStatus.label}</p>
                            {interview.follow_up_sent_at && (
                                <FollowUpSentBadge
                                    className={styles.stackedBadge}
                                    contextLabel={`${interview.job_title} at ${interview.company_name}`}
                                    isUndoing={variant === 'job' ? props.isUndoingFollowUp : undefined}
                                    onUndo={
                                        variant === 'job' && props.onUndoFollowUp
                                            ? () => props.onUndoFollowUp?.(interview)
                                            : undefined
                                    }
                                    sentAt={interview.follow_up_sent_at}
                                />
                            )}
                        </div>
                        {interview.meeting_url && (
                            <a
                                className={`${styles.navigationLink} ${styles.externalLink}`}
                                href={interview.meeting_url}
                                rel='noreferrer noopener'
                                target='_blank'
                            >
                                <span>Join meeting</span>
                                <Icon className={styles.linkIcon} name='externalLink' size={15} />
                            </a>
                        )}
                        <Link
                            className={styles.navigationLink}
                            to={`${applicationRoute}#${applicationId}`}
                            onClick={onViewApplicationClick}
                        >
                            <span>View application</span>
                            <Icon className={styles.linkIcon} name='chevronRight' size={16} />
                        </Link>
                    </>
                )}
            </div>

            {isBoardLayout ? (
                <>
                    <BoardCardActions
                        compactPanelSpacing
                        compactSizing
                        onOpenChange={
                            variant === 'job'
                                ? (isOpen) => props.onNotesVisibilityChange?.(interview.interview_id, isOpen)
                                : undefined
                        }
                        actions={
                            <>
                                {showCalendarOptions && <CalendarOptions interview={interview} />}
                                <PrimaryButton
                                    className={styles.boardDeleteButton}
                                    isLoading={isDeleting}
                                    variant='destructive'
                                    onClick={onDelete}
                                >
                                    Delete
                                </PrimaryButton>
                            </>
                        }
                        compactActions
                    >
                        {interview.meeting_url && (
                            <a
                                className={`${styles.boardActionLink} ${styles.externalLink}`}
                                href={interview.meeting_url}
                                rel='noreferrer noopener'
                                target='_blank'
                            >
                                <span>Join meeting</span>
                                <Icon className={styles.linkIcon} name='externalLink' size={14} />
                            </a>
                        )}
                        {variant === 'job' && (
                            <Link
                                className={styles.boardActionLink}
                                to={`${applicationRoute}#${applicationId}`}
                                onClick={onViewApplicationClick}
                            >
                                <span>View application</span>
                                <Icon className={styles.linkIcon} name='chevronRight' size={15} />
                            </Link>
                        )}
                        {variant === 'job' ? (
                            <div className={styles.boardNotesField}>
                                <label htmlFor={`interview-notes-${interviewId}`}>Edit notes</label>
                                {renderActiveNotesEditor(styles.notesEditor)}
                            </div>
                        ) : (
                            <label className={`${styles.boardNotesField} ${styles.readOnlyNotes}`}>
                                Notes
                                {renderReadOnlyNotes(styles.readOnlyTextarea)}
                            </label>
                        )}
                    </BoardCardActions>
                </>
            ) : (
                <div className={styles.buttonGroup}>
                    {showCalendarOptions && <CalendarOptions interview={interview} />}
                    <PrimaryButton isLoading={isDeleting} variant='destructive' onClick={onDelete}>
                        Delete
                    </PrimaryButton>
                </div>
            )}

            {!isBoardLayout && props.showNotes && (
                <div className={styles.listNotes}>
                    {variant === 'job'
                        ? renderActiveNotesEditor(styles.notesEditor)
                        : renderReadOnlyNotes(styles.readOnlyTextarea)}
                </div>
            )}
        </article>
    );
};

export default InterviewCard;
