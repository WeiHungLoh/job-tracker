import type { ArchivedJobApplication, JobApplication, JobStatus } from '../../application/models';
import type { EditableNotesProps } from '../../../components/noteSaveStatus/models';

type DemoApplicationCardBaseProps = {
    index: number;
    isDeleting: boolean;
};

export type DemoJobApplicationCardProps = DemoApplicationCardBaseProps &
    EditableNotesProps & {
        application: JobApplication;
        editedJobStatus: JobStatus;
        hasInterview: boolean;
        hasOfferEvaluation: boolean;
        isArchiving: boolean;
        isEditingStatus: boolean;
        isUpdatingPin: boolean;
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

export type DemoArchivedApplicationCardProps = DemoApplicationCardBaseProps & {
    application: ArchivedJobApplication;
    isRestoring: boolean;
    onDelete: (archivedJobId: number) => void | Promise<void>;
    onRestore: (archivedJobId: number) => void | Promise<void>;
    showNotes: boolean;
    variant: 'archived';
};

export type DemoApplicationCardProps = DemoJobApplicationCardProps | DemoArchivedApplicationCardProps;
