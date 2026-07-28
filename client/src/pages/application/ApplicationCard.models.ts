import type { ArchivedJobApplication, JobApplication, JobStatus } from './models';
import type { EditableNotesProps } from '../../components/noteSaveStatus/models';

type ApplicationCardBaseProps = {
    index: number;
    isDeleting: boolean;
};

export type JobApplicationCardProps = ApplicationCardBaseProps &
    EditableNotesProps & {
        application: JobApplication;
        editedJobStatus: JobStatus;
        hasInterview: boolean;
        hasOfferEvaluation: boolean;
        isArchiving: boolean;
        isEditingStatus: boolean;
        isUpdatingPin: boolean;
        isUpdatingStatus: boolean;
        isUndoingFollowUp?: boolean;
        onArchive: (jobId: number) => void | Promise<void>;
        onDelete: (jobId: number) => void | Promise<void>;
        onJobStatusChange: (jobStatus: JobStatus) => void;
        onPinToggle: (application: JobApplication) => void | Promise<void>;
        onToggleStatusEditor: (application: JobApplication) => void | Promise<void>;
        onUndoFollowUp?: (application: JobApplication) => void | Promise<void>;
        showArchive: boolean;
        showNotes: boolean;
        upcomingInterviewCount: number;
        variant: 'job';
    };

export type ArchivedApplicationCardProps = ApplicationCardBaseProps & {
    application: ArchivedJobApplication;
    isUnarchiving: boolean;
    onDelete: (archivedJobId: number) => void | Promise<void>;
    onUnarchive: (archivedJobId: number) => void | Promise<void>;
    showNotes: boolean;
    variant: 'archived';
};

export type ApplicationCardProps = JobApplicationCardProps | ArchivedApplicationCardProps;
