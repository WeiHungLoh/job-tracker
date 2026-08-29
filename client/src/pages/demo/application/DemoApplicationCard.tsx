import { Link } from 'react-router-dom';
import PrimaryButton from '../../../components/button/PrimaryButton';
import formatDate from '../../../helper/dateFormatter';
import { FIELD_MAX_LENGTHS } from '../../../helper/formValidation';
import { routes } from '../../../routes';
import type { DemoApplicationCardProps } from './DemoApplicationCard.models';
import { JOB_STATUSES, type JobStatus } from '../../application/models';
import ApplicationStatusBadge from '../../application/ApplicationStatusBadge';
import NoteSaveStatus from '../../../components/noteSaveStatus/NoteSaveStatus';
import styles from './DemoApplicationCard.module.css';
import { isApplicationStatusDisabled } from '../../application/applicationStatusRestrictions';
import FollowUpSentBadge from '../../../components/followUpSentBadge/FollowUpSentBadge';
import PinControl from '../../../components/pinControl/PinControl';
import type { AddInterviewNavigationState } from '../../interview/addInterviewNavigation';
import Icon from '../../../components/icon/Icon';

const JOB_STATUS_CARD_CLASS_MAP: Record<JobStatus, string> = {
    Accepted: styles.statusAccepted,
    Applied: styles.statusApplied,
    Declined: styles.statusDeclined,
    Ghosted: styles.statusGhosted,
    Interview: styles.statusInterview,
    Offer: styles.statusOffer,
    Rejected: styles.statusRejected,
    Withdrawn: styles.statusWithdrawn,
};

const DemoApplicationCard = (props: DemoApplicationCardProps) => {
    const { application, index, isDeleting, variant } = props;
    const applicationId = variant === 'job' ? application.job_id : application.archived_job_id;
    const formattedApplicationDate = formatDate(application.application_date);

    return (
        <article
            aria-label={`${application.company_name} application`}
            className={`${styles.application} ${JOB_STATUS_CARD_CLASS_MAP[application.job_status]}`}
            id={String(applicationId)}
        >
            <div className={styles.applicationContent}>
                <div className={styles.headingRow}>
                    <h2>
                        {index + 1}. {application.company_name}
                    </h2>
                    {variant === 'job' ? (
                        <PinControl
                            itemLabel={application.company_name}
                            isPending={props.isUpdatingPin}
                            isPinned={application.is_pinned}
                            onToggle={() => props.onPinToggle(application)}
                            size='list'
                            subject='application'
                        />
                    ) : (
                        <PinControl
                            itemLabel={application.company_name}
                            isPinned={application.is_pinned}
                            size='list'
                            subject='application'
                        />
                    )}
                </div>
                <p className={styles.jobTitle}>{application.job_title}</p>
                {application.job_location !== '' && <p className={styles.location}>{application.job_location}</p>}
                <p className={styles.date}>Applied {formattedApplicationDate.formattedDate}</p>
                <p>{formattedApplicationDate.timeSinceApplication} since application</p>
                <div className={styles.badgeGroup}>
                    <div className={styles.statusEditRow}>
                        <ApplicationStatusBadge jobStatus={application.job_status} showLabel />
                        {variant === 'job' && props.isEditingStatus && (
                            <select
                                aria-label={`Application status for ${application.job_title} at ${application.company_name}`}
                                value={props.editedJobStatus}
                                onChange={(event) => props.onJobStatusChange(event.target.value as JobStatus)}
                            >
                                {JOB_STATUSES.map((status) => (
                                    <option
                                        disabled={isApplicationStatusDisabled(
                                            status,
                                            props.hasInterview,
                                            props.hasOfferEvaluation
                                        )}
                                        key={status}
                                        value={status}
                                    >
                                        {status}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    {variant === 'job' && props.upcomingInterviewCount > 0 && (
                        <span className={styles.upcomingBadge}>
                            {props.upcomingInterviewCount} Upcoming Interview
                            {props.upcomingInterviewCount > 1 ? 's' : ''}
                        </span>
                    )}
                    {application.application_follow_up_sent_at &&
                        (variant === 'archived' || application.job_status === 'Applied') && (
                            <FollowUpSentBadge
                                className={styles.stackedBadge}
                                contextLabel={`${application.job_title} at ${application.company_name}`}
                                isUndoing={variant === 'job' ? props.isUndoingFollowUp : undefined}
                                onUndo={
                                    variant === 'job' && props.onUndoFollowUp
                                        ? () => props.onUndoFollowUp?.(application)
                                        : undefined
                                }
                                sentAt={application.application_follow_up_sent_at}
                            />
                        )}
                </div>

                {variant === 'job' && application.job_status === 'Interview' && (
                    <Link
                        className={styles.navigationLink}
                        to={routes.demoAddInterview}
                        state={
                            {
                                app: application,
                                origin: { kind: 'application-collection' },
                            } satisfies AddInterviewNavigationState
                        }
                    >
                        <span>Add interview</span>
                        <Icon className={styles.linkIcon} name='chevronRight' size={16} />
                    </Link>
                )}

                {application.job_posting_url !== '' && (
                    <a
                        className={`${styles.navigationLink} ${styles.externalLink}`}
                        href={application.job_posting_url}
                        rel='noreferrer noopener'
                        target='_blank'
                    >
                        <span>View job posting</span>
                        <Icon className={styles.linkIcon} name='externalLink' size={15} />
                    </a>
                )}
            </div>

            <div className={styles.buttonGroup}>
                {variant === 'job' ? (
                    <>
                        <PrimaryButton variant='secondary' onClick={() => props.onToggleStatusEditor(application)}>
                            {props.isEditingStatus ? 'Save changes' : 'Edit status'}
                        </PrimaryButton>
                        <PrimaryButton
                            isLoading={isDeleting}
                            variant='destructive'
                            onClick={() => props.onDelete(application.job_id)}
                        >
                            Delete
                        </PrimaryButton>
                        <PrimaryButton
                            className={`${styles.archiveButton} ${!props.showArchive ? styles.archiveHidden : ''}`}
                            isLoading={props.isArchiving}
                            onClick={() => props.onArchive(application.job_id)}
                            variant='secondary'
                        >
                            Archive
                        </PrimaryButton>
                    </>
                ) : (
                    <>
                        <PrimaryButton
                            isLoading={props.isRestoring}
                            variant='secondary'
                            onClick={() => props.onRestore(application.archived_job_id)}
                        >
                            Unarchive
                        </PrimaryButton>
                        <PrimaryButton
                            isLoading={isDeleting}
                            variant='destructive'
                            onClick={() => props.onDelete(application.archived_job_id)}
                        >
                            Delete
                        </PrimaryButton>
                    </>
                )}
            </div>

            {props.showNotes && (
                <div className={styles.notes}>
                    {variant === 'job' ? (
                        <div className={styles.notesEditor}>
                            <textarea
                                aria-label={`Notes for ${application.company_name}`}
                                disabled={props.isArchiving}
                                maxLength={FIELD_MAX_LENGTHS.notes}
                                onChange={(event) => props.onEditNotes(application.job_id, event.target.value)}
                                onBlur={() => props.onNotesBlur(application.job_id)}
                                placeholder='Add your notes here'
                                value={props.note}
                            />
                            <NoteSaveStatus
                                applicationName={application.company_name}
                                onRetry={() => props.onRetryNotes(application.job_id)}
                                status={props.noteSaveStatus}
                            />
                        </div>
                    ) : (
                        <textarea
                            aria-label={`Notes for ${application.company_name}`}
                            disabled
                            readOnly
                            value={
                                !application.notes || application.notes.trim() === ''
                                    ? 'You do not have any notes here'
                                    : application.notes
                            }
                        />
                    )}
                </div>
            )}
        </article>
    );
};

export default DemoApplicationCard;
