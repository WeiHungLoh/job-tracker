import type { ArchivedJobApplication, JobStatus } from '../../models';
import type { ApplicationBoardTargetRequest } from '../../applicationBoard/models';

export type ArchivedApplicationBoardProps = {
    applications: ArchivedJobApplication[];
    deletingApplicationIds: ReadonlySet<number>;
    onDelete: (archivedJobId: number) => void | Promise<void>;
    onTargetHandled?: (request: ApplicationBoardTargetRequest) => void;
    onUnarchive: (archivedJobId: number) => void | Promise<void>;
    selectedJobStatuses: readonly JobStatus[];
    showNotes: boolean;
    targetRequest?: ApplicationBoardTargetRequest | null;
    unarchivingApplicationIds: ReadonlySet<number>;
};

export type ArchivedApplicationBoardCardProps = {
    application: ArchivedJobApplication;
    isDeleting: boolean;
    isHighlighted?: boolean;
    isUnarchiving: boolean;
    onDelete: (archivedJobId: number) => void | Promise<void>;
    onUnarchive: (archivedJobId: number) => void | Promise<void>;
    showNotes: boolean;
};
