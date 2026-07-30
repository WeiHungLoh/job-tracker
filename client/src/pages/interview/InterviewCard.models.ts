import type { MouseEvent } from 'react';
import type { ArchivedJobInterview, JobInterview } from './models';
import type { CollectionViewMode } from '../../components/activityControls/collectionViewToggle/models';
import type { NoteSaveStatus } from '../../hooks/useAutosaveNotes';

type InterviewCardBaseProps = {
    applicationRoute: string;
    currentTime?: Date;
    index: number;
    isDeleting: boolean;
    layout?: CollectionViewMode;
    onDelete: () => void | Promise<void>;
    onViewApplicationClick: (event: MouseEvent<HTMLAnchorElement>) => void | Promise<void>;
    showNotes?: boolean;
};

export type JobInterviewCardProps = InterviewCardBaseProps & {
    interview: JobInterview;
    isUpdatingPin: boolean;
    isUndoingFollowUp?: boolean;
    note?: string;
    noteSaveStatus?: NoteSaveStatus;
    onEditNotes?: (interviewId: number, notes: string) => void;
    onNotesBlur?: (interviewId: number) => void | Promise<boolean>;
    onNotesVisibilityChange?: (interviewId: number, isVisible: boolean) => void;
    onPinToggle: (interview: JobInterview) => void | Promise<void>;
    onRetryNotes?: (interviewId: number) => void;
    onUndoFollowUp?: (interview: JobInterview) => void | Promise<void>;
    variant: 'job';
};

export type ArchivedInterviewCardProps = InterviewCardBaseProps & {
    interview: ArchivedJobInterview;
    variant: 'archived';
};

export type InterviewCardProps = JobInterviewCardProps | ArchivedInterviewCardProps;
