import type { JobApplication, JobStatus } from '../../models';
import type { EditableNotesProps } from '../../../../components/noteSaveStatus/models';
import type { NoteSaveStatus } from '../../../../hooks/useAutosaveNotes';

export type BoardStatusChangeHandler = (application: JobApplication, jobStatus: JobStatus) => void | Promise<void>;

export type ApplicationBoardProps = {
    applications: JobApplication[];
    deletingApplicationIds: ReadonlySet<number>;
    editedNotes: Record<number, string>;
    hasInterview: (jobId: number) => boolean;
    hasOfferEvaluation: (jobId: number) => boolean;
    isArchivingApplication: (jobId: number) => boolean;
    isUpdatingApplicationStatus: (jobId: number) => boolean;
    isUndoingApplicationFollowUp?: (jobId: number) => boolean;
    noteSaveStatuses: Record<number, NoteSaveStatus>;
    onArchive: (jobId: number) => void | Promise<void>;
    onDelete: (jobId: number) => void | Promise<void>;
    onEditNotes: (jobId: number, notes: string) => void;
    onNotesBlur: (jobId: number) => void;
    onNotesVisibilityChange: (jobId: number, isVisible: boolean) => void;
    onRetryNotes: (jobId: number) => void;
    onStatusChange: BoardStatusChangeHandler;
    onUndoFollowUp?: (application: JobApplication) => void | Promise<void>;
    selectedJobStatuses: readonly JobStatus[];
    upcomingInterviewCountByJob: Record<number, number>;
};

export type ApplicationBoardCardProps = EditableNotesProps & {
    application: JobApplication;
    isArchiving: boolean;
    isDeleting: boolean;
    isUpdatingStatus: boolean;
    isUndoingFollowUp?: boolean;
    hasInterview: boolean;
    hasOfferEvaluation: boolean;
    onArchive: (jobId: number) => void | Promise<void>;
    onDelete: (jobId: number) => void | Promise<void>;
    onNotesVisibilityChange: (jobId: number, isVisible: boolean) => void;
    onStatusChange: BoardStatusChangeHandler;
    onUndoFollowUp?: (application: JobApplication) => void | Promise<void>;
    upcomingInterviewCount: number;
};
