import PrimaryButton from '../../../../components/button/PrimaryButton';
import formatDate from '../../../../helper/dateFormatter';
import { getApplicationBoardStatusClassName } from '../../applicationBoard/statusClassNames';
import type { ArchivedApplicationBoardCardProps } from './models';
import styles from '../../applicationBoard/ApplicationBoard.module.css';
import BoardCardActions from '../../../../components/boardCardActions/BoardCardActions';
import FollowUpSentBadge from '../../../../components/followUpSentBadge/FollowUpSentBadge';
import PinControl from '../../../../components/pinControl/PinControl';
import Icon from '../../../../components/icon/Icon';

const EMPTY_NOTES_MESSAGE = 'You do not have any notes here';

const ArchivedApplicationBoardCard = ({
    application,
    isDeleting,
    isHighlighted = false,
    isUnarchiving,
    onDelete,
    onUnarchive,
    showNotes,
}: ArchivedApplicationBoardCardProps) => {
    const formattedApplicationDate = formatDate(application.application_date);
    const applicationContext = `${application.job_title} at ${application.company_name}`;
    const notesValue = application.notes.trim() === '' ? EMPTY_NOTES_MESSAGE : application.notes;
    const hasActions = application.job_posting_url !== '' || showNotes;

    return (
        <article
            aria-label={`${application.company_name} ${application.job_title}`}
            className={`${styles.card} ${styles.readOnlyCard} ${isHighlighted ? styles.cardHighlighted : ''}`}
            id={String(application.archived_job_id)}
        >
            <div className={styles.cardHeader}>
                <h3>{application.company_name}</h3>
                <div className={styles.cardHeaderControls}>
                    <PinControl
                        itemLabel={application.company_name}
                        isPinned={application.is_pinned}
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
                </div>
            </div>

            <p className={styles.jobTitle}>{application.job_title}</p>
            <p className={styles.meta}>{formattedApplicationDate.formattedDay}</p>
            {application.application_follow_up_sent_at && (
                <FollowUpSentBadge
                    compact
                    contextLabel={`${application.job_title} at ${application.company_name}`}
                    sentAt={application.application_follow_up_sent_at}
                />
            )}

            <BoardCardActions
                compactActions
                compactPanelSpacing
                summaryAriaLabel={`Actions for ${applicationContext}`}
                actions={
                    <>
                        <PrimaryButton
                            aria-label={`Unarchive application for ${applicationContext}`}
                            isLoading={isUnarchiving}
                            onClick={() => onUnarchive(application.archived_job_id)}
                            type='button'
                            variant='secondary'
                        >
                            Unarchive
                        </PrimaryButton>
                        <PrimaryButton
                            aria-label={`Delete application for ${applicationContext}`}
                            isLoading={isDeleting}
                            onClick={() => onDelete(application.archived_job_id)}
                            type='button'
                            variant='destructive'
                        >
                            Delete
                        </PrimaryButton>
                    </>
                }
            >
                {application.application_follow_up_sent_at && (
                    <FollowUpSentBadge
                        contextLabel={`${application.job_title} at ${application.company_name}`}
                        sentAt={application.application_follow_up_sent_at}
                    />
                )}
                {hasActions && (
                    <>
                        {application.job_posting_url !== '' && (
                            <a
                                aria-label={`View job posting for ${applicationContext}`}
                                className={`${styles.navigationLink} ${styles.externalLink}`}
                                href={application.job_posting_url}
                                rel='noreferrer noopener'
                                target='_blank'
                            >
                                <span>View job posting</span>
                                <Icon className={styles.linkIcon} name='externalLink' size={14} />
                            </a>
                        )}
                        {showNotes && (
                            <label className={`${styles.notesField} ${styles.readOnlyNotes}`}>
                                <span>Notes</span>
                                <textarea readOnly value={notesValue} />
                            </label>
                        )}
                    </>
                )}
            </BoardCardActions>
        </article>
    );
};

export default ArchivedApplicationBoardCard;
