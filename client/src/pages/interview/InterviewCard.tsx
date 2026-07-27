import { Link } from 'react-router-dom';
import PrimaryButton from '../../components/button/PrimaryButton';
import applicationStyles from '../application/ApplicationCard.module.css';
import type { InterviewCardProps } from './InterviewCard.models';
import CalendarOptions from './calendarOptions/CalendarOptions';
import styles from './InterviewCard.module.css';
import BoardCardActions from '../../components/boardCardActions/BoardCardActions';
import { formatInterviewCountdown, getInterviewTiming } from '../../helper/interviewTiming';
import FollowUpSentBadge from '../../components/followUpSentBadge/FollowUpSentBadge';

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
    const timingStatus = !timing.isValid
        ? { className: styles.timeLeft, label: 'Status unavailable' }
        : timing.hasEnded
        ? { className: applicationStyles.accepted, label: 'Completed' }
        : {
              className: timing.isInProgress ? applicationStyles.rejected : applicationStyles.upcomingBadge,
              label: `Time left: ${formatInterviewCountdown(timing, currentTime)}`,
          };
    const cardClasses = [
        styles.interview,
        variant === 'archived' ? styles.archived : '',
        isBoardLayout ? styles.board : '',
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
                <h2>
                    {index + 1}. {interview.company_name}
                </h2>
                <p className={styles.jobTitle}>
                    {isBoardLayout ? interview.job_title : `Job Title: ${interview.job_title}`}
                </p>
                {isBoardLayout ? (
                    <>
                        <p className={styles.date}>{timing.formattedRange}</p>
                        {interview.follow_up_sent_at && (
                            <FollowUpSentBadge
                                compact
                                contextLabel={`${interview.job_title} at ${interview.company_name}`}
                                sentAt={interview.follow_up_sent_at}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <p className={styles.location}>Location: {interview.interview_location}</p>
                        {interview.interview_type !== '' && (
                            <p className={styles.type}>Interview Type: {interview.interview_type}</p>
                        )}
                        <p className={styles.date}>Interview Date: {timing.formattedRange}</p>
                    </>
                )}
                {!isBoardLayout && (
                    <>
                        {interview.interview_notes !== '' && (
                            <p className={styles.notes}>Notes: {interview.interview_notes}</p>
                        )}
                        <p className={`${timingStatus.className} ${styles.timingBadge}`}>{timingStatus.label}</p>
                        {interview.follow_up_sent_at && (
                            <FollowUpSentBadge
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
                        <Link to={`${applicationRoute}#${applicationId}`} onClick={onViewApplicationClick}>
                            Click here to review corresponding job application
                        </Link>
                    </>
                )}
            </div>

            {isBoardLayout ? (
                <BoardCardActions
                    actions={
                        <>
                            {showCalendarOptions && <CalendarOptions interview={interview} />}
                            <PrimaryButton isLoading={isDeleting} variant='destructive' onClick={onDelete}>
                                Delete
                            </PrimaryButton>
                        </>
                    }
                    compactActions
                >
                    {interview.follow_up_sent_at && (
                        <FollowUpSentBadge
                            contextLabel={`${interview.job_title} at ${interview.company_name}`}
                            isUndoing={variant === 'job' ? props.isUndoingFollowUp : undefined}
                            onUndo={
                                variant === 'job' && props.onUndoFollowUp
                                    ? () => props.onUndoFollowUp?.(interview)
                                    : undefined
                            }
                            sentAt={interview.follow_up_sent_at}
                            undoText='Undo follow-up'
                        />
                    )}
                </BoardCardActions>
            ) : (
                <div className={styles.buttonGroup}>
                    {showCalendarOptions && <CalendarOptions interview={interview} />}
                    <PrimaryButton isLoading={isDeleting} variant='destructive' onClick={onDelete}>
                        Delete
                    </PrimaryButton>
                </div>
            )}
        </article>
    );
};

export default InterviewCard;
