import { useMemo } from 'react';
import DashboardCard from '../../shared/dashboardCard/DashboardCard';
import LoadingSpinner from '../../../../components/loadingSpinner/LoadingSpinner';
import formatDate from '../../../../helper/dateFormatter';
import type { UpcomingInterviewsProps } from '../../dashboardTypes';
import type { JobInterview } from '../../../interview/models';
import { getUpcomingInterviews } from '../../dashboardSelectors';
import styles from './UpcomingInterviews.module.css';
import { getInterviewTiming } from '../../../../helper/interviewTiming';
import PrimaryButton from '../../../../components/button/PrimaryButton';

const MAX_UPCOMING_INTERVIEWS = 3;

const InterviewPreview = ({
    currentTime,
    interview,
    index,
}: {
    currentTime: Date;
    interview: JobInterview;
    index: number;
}) => {
    const timing = getInterviewTiming(interview, currentTime);

    return (
        <>
            <span className={styles.index} aria-hidden='true'>
                {index + 1}
            </span>
            <div className={styles.interviewDetails}>
                <h3>{interview.company_name}</h3>
                <p className={styles.jobTitle}>{interview.job_title}</p>
                <time dateTime={interview.interview_date}>
                    {timing.isValid ? timing.formattedRange : formatDate(interview.interview_date).formattedDate}
                </time>
                {(interview.interview_type || interview.interview_location) && (
                    <p className={styles.details}>
                        {[interview.interview_type, interview.interview_location].filter(Boolean).join(' · ')}
                    </p>
                )}
            </div>
        </>
    );
};

const UpcomingInterviews = ({
    currentTime = new Date(),
    interviews,
    hasError = false,
    isLoading,
    onRetry,
    onInterviewSelect,
}: UpcomingInterviewsProps) => {
    const upcomingInterviews = useMemo(
        () => getUpcomingInterviews(interviews, currentTime).slice(0, MAX_UPCOMING_INTERVIEWS),
        [currentTime, interviews]
    );

    return (
        <DashboardCard
            className={styles.upcomingCard}
            title='Upcoming Interviews'
            description='Your next scheduled conversations.'
        >
            {hasError ? (
                <div className={styles.centered}>
                    <div>
                        <p>Unable to load upcoming interviews.</p>
                        {onRetry && (
                            <PrimaryButton onClick={onRetry} type='button' variant='secondary'>
                                Try again
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            ) : isLoading ? (
                <div className={styles.centered}>
                    <LoadingSpinner size='sm' />
                </div>
            ) : upcomingInterviews.length === 0 ? (
                <div className={styles.centered}>
                    <div>
                        <h3>No upcoming interviews</h3>
                        <p>Interviews you add will appear here.</p>
                    </div>
                </div>
            ) : (
                <ol className={styles.interviewList} aria-label='Upcoming interviews list'>
                    {upcomingInterviews.map((interview, index) => (
                        <li key={interview.interview_id}>
                            {onInterviewSelect ? (
                                <button
                                    aria-label={`View ${interview.company_name} interview`}
                                    className={styles.interviewButton}
                                    onClick={() => onInterviewSelect(interview.interview_id)}
                                    type='button'
                                >
                                    <InterviewPreview currentTime={currentTime} index={index} interview={interview} />
                                </button>
                            ) : (
                                <InterviewPreview currentTime={currentTime} index={index} interview={interview} />
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </DashboardCard>
    );
};

export default UpcomingInterviews;
