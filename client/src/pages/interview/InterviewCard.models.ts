import type { MouseEvent } from 'react';
import type { ArchivedJobInterview, JobInterview } from './models';
import type { CollectionViewMode } from '../../components/activityControls/collectionViewToggle/models';

type InterviewCardBaseProps = {
    applicationRoute: string;
    currentTime?: Date;
    index: number;
    isDeleting: boolean;
    layout?: CollectionViewMode;
    onDelete: () => void | Promise<void>;
    onViewApplicationClick: (event: MouseEvent<HTMLAnchorElement>) => void | Promise<void>;
};

export type JobInterviewCardProps = InterviewCardBaseProps & {
    interview: JobInterview;
    isUndoingFollowUp?: boolean;
    onUndoFollowUp?: (interview: JobInterview) => void | Promise<void>;
    variant: 'job';
};

export type ArchivedInterviewCardProps = InterviewCardBaseProps & {
    interview: ArchivedJobInterview;
    variant: 'archived';
};

export type InterviewCardProps = JobInterviewCardProps | ArchivedInterviewCardProps;
