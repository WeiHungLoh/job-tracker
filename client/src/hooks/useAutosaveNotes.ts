import { useCallback, useEffect, useRef, useState } from 'react';

export type NoteSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type UseAutosaveNotesOptions = {
    onSaveError?: (jobId: number, error: unknown) => void;
    saveNotes: (jobId: number, notes: string) => Promise<void>;
};

type AutosaveEntry = {
    activeSavePromise?: Promise<boolean>;
    autosaveTimer?: ReturnType<typeof setTimeout>;
    draftRevision: number;
    hasQueuedSave: boolean;
    isNotesHidden: boolean;
    latestDraft: string;
    savedStatusTimer?: ReturnType<typeof setTimeout>;
    status: NoteSaveStatus;
};

const AUTOSAVE_DELAY_MS = 1_000;
const SAVED_STATUS_DURATION_MS = 3_000;

const createAutosaveEntry = (notes: string): AutosaveEntry => ({
    draftRevision: 0,
    hasQueuedSave: false,
    isNotesHidden: false,
    latestDraft: notes,
    status: 'idle',
});

const clearAutosaveTimer = (entry: AutosaveEntry): void => {
    if (entry.autosaveTimer === undefined) {
        return;
    }

    clearTimeout(entry.autosaveTimer);
    entry.autosaveTimer = undefined;
};

const clearSavedStatusTimer = (entry: AutosaveEntry): void => {
    if (entry.savedStatusTimer === undefined) {
        return;
    }

    clearTimeout(entry.savedStatusTimer);
    entry.savedStatusTimer = undefined;
};

const removeJobValue = <Value>(values: Record<number, Value>, jobId: number): Record<number, Value> => {
    if (!(jobId in values)) {
        return values;
    }

    const nextValues = { ...values };
    delete nextValues[jobId];
    return nextValues;
};

const useAutosaveNotes = ({ onSaveError, saveNotes }: UseAutosaveNotesOptions) => {
    const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
    const [noteSaveStatuses, setNoteSaveStatuses] = useState<Record<number, NoteSaveStatus>>({});
    const entriesRef = useRef<Record<number, AutosaveEntry>>({});
    const isMounted = useRef(true);
    const onSaveErrorRef = useRef(onSaveError);
    const saveNotesRef = useRef(saveNotes);

    // Keep async work on the latest callbacks without restarting lifecycle cleanup.
    onSaveErrorRef.current = onSaveError;
    saveNotesRef.current = saveNotes;

    const setNoteSaveStatus = useCallback((jobId: number, entry: AutosaveEntry, status: NoteSaveStatus) => {
        entry.status = status;
        if (!isMounted.current || entriesRef.current[jobId] !== entry) {
            return;
        }

        setNoteSaveStatuses((currentStatuses) => {
            if (currentStatuses[jobId] === status) {
                return currentStatuses;
            }

            return { ...currentStatuses, [jobId]: status };
        });
    }, []);

    const showSavedStatus = useCallback(
        (jobId: number, entry: AutosaveEntry, savedRevision: number) => {
            clearSavedStatusTimer(entry);

            if (!isMounted.current) {
                setNoteSaveStatus(jobId, entry, 'saved');
                return;
            }

            if (entry.isNotesHidden) {
                setNoteSaveStatus(jobId, entry, 'idle');
                return;
            }

            setNoteSaveStatus(jobId, entry, 'saved');
            entry.savedStatusTimer = setTimeout(() => {
                entry.savedStatusTimer = undefined;
                if (entriesRef.current[jobId] === entry && entry.draftRevision === savedRevision) {
                    setNoteSaveStatus(jobId, entry, 'idle');
                }
            }, SAVED_STATUS_DURATION_MS);
        },
        [setNoteSaveStatus]
    );

    const processSaveQueue = useCallback(
        async (jobId: number, entry: AutosaveEntry): Promise<boolean> => {
            let finalSaveSucceeded = true;

            // Coalesce edits made during an active request into one follow-up save.
            while (entriesRef.current[jobId] === entry && entry.hasQueuedSave) {
                entry.hasQueuedSave = false;
                const draftToSave = entry.latestDraft;
                const revisionToSave = entry.draftRevision;

                try {
                    await saveNotesRef.current(jobId, draftToSave);
                    finalSaveSucceeded = true;

                    if (entriesRef.current[jobId] === entry && entry.draftRevision === revisionToSave) {
                        showSavedStatus(jobId, entry, revisionToSave);
                    }
                } catch (error) {
                    finalSaveSucceeded = false;

                    if (entriesRef.current[jobId] === entry && entry.draftRevision === revisionToSave) {
                        clearSavedStatusTimer(entry);
                        setNoteSaveStatus(jobId, entry, 'error');
                        if (isMounted.current) {
                            onSaveErrorRef.current?.(jobId, error);
                        }
                    }
                }
            }

            return finalSaveSucceeded;
        },
        [setNoteSaveStatus, showSavedStatus]
    );

    const queueSave = useCallback(
        (jobId: number): Promise<boolean> => {
            const entry = entriesRef.current[jobId];
            if (!entry) {
                return Promise.resolve(true);
            }

            entry.hasQueuedSave = true;
            if (entry.activeSavePromise) {
                return entry.activeSavePromise;
            }

            const activeSavePromise = processSaveQueue(jobId, entry).finally(() => {
                if (entriesRef.current[jobId] === entry && entry.activeSavePromise === activeSavePromise) {
                    entry.activeSavePromise = undefined;
                }
            });
            entry.activeSavePromise = activeSavePromise;
            return activeSavePromise;
        },
        [processSaveQueue]
    );

    const flushNote = useCallback(
        (jobId: number): Promise<boolean> => {
            const entry = entriesRef.current[jobId];
            if (!entry) {
                return Promise.resolve(true);
            }

            if (entry.autosaveTimer !== undefined) {
                clearAutosaveTimer(entry);
                return queueSave(jobId);
            }

            return entry.activeSavePromise ?? Promise.resolve(entry.status !== 'error');
        },
        [queueSave]
    );

    const editNotes = useCallback(
        (jobId: number, notes: string) => {
            const entry = entriesRef.current[jobId] ?? createAutosaveEntry(notes);
            entriesRef.current[jobId] = entry;

            entry.latestDraft = notes;
            entry.draftRevision += 1;
            clearAutosaveTimer(entry);
            clearSavedStatusTimer(entry);
            setDraftNotes((currentNotes) => ({ ...currentNotes, [jobId]: notes }));
            setNoteSaveStatus(jobId, entry, 'saving');

            entry.autosaveTimer = setTimeout(() => {
                entry.autosaveTimer = undefined;
                if (entriesRef.current[jobId] === entry) {
                    void queueSave(jobId);
                }
            }, AUTOSAVE_DELAY_MS);
        },
        [queueSave, setNoteSaveStatus]
    );

    const retryNotes = useCallback(
        (jobId: number) => {
            const entry = entriesRef.current[jobId];
            if (!entry) {
                return;
            }

            clearAutosaveTimer(entry);
            clearSavedStatusTimer(entry);
            setNoteSaveStatus(jobId, entry, 'saving');
            void queueSave(jobId);
        },
        [queueSave, setNoteSaveStatus]
    );

    const setNoteVisibility = useCallback(
        (jobId: number, isVisible: boolean) => {
            const entry = entriesRef.current[jobId];
            if (!entry) {
                return;
            }

            entry.isNotesHidden = !isVisible;
            if (isVisible) {
                return;
            }

            clearSavedStatusTimer(entry);
            if (entry.status === 'saved') {
                setNoteSaveStatus(jobId, entry, 'idle');
            }
            void flushNote(jobId);
        },
        [flushNote, setNoteSaveStatus]
    );

    const setAllNotesVisibility = useCallback(
        (isVisible: boolean) => {
            Object.keys(entriesRef.current).forEach((jobId) => setNoteVisibility(Number(jobId), isVisible));
        },
        [setNoteVisibility]
    );

    const flushAllNotes = useCallback(async (): Promise<boolean> => {
        const saveResults = await Promise.all(Object.keys(entriesRef.current).map((jobId) => flushNote(Number(jobId))));
        return saveResults.every(Boolean);
    }, [flushNote]);

    const clearNoteState = useCallback((jobId: number) => {
        const entry = entriesRef.current[jobId];
        if (!entry) {
            return;
        }

        clearAutosaveTimer(entry);
        clearSavedStatusTimer(entry);
        entry.hasQueuedSave = false;
        delete entriesRef.current[jobId];

        if (isMounted.current) {
            setDraftNotes((currentNotes) => removeJobValue(currentNotes, jobId));
            setNoteSaveStatuses((currentStatuses) => removeJobValue(currentStatuses, jobId));
        }
    }, []);

    const clearAllNoteStates = useCallback(() => {
        Object.values(entriesRef.current).forEach((entry) => {
            clearAutosaveTimer(entry);
            clearSavedStatusTimer(entry);
            entry.hasQueuedSave = false;
        });
        entriesRef.current = {};

        if (isMounted.current) {
            setDraftNotes({});
            setNoteSaveStatuses({});
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        const handlePageHide = () => {
            void flushAllNotes();
        };
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            isMounted.current = false;
            void flushAllNotes();
            Object.values(entriesRef.current).forEach(clearSavedStatusTimer);
        };
    }, [flushAllNotes]);

    return {
        clearAllNoteStates,
        clearNoteState,
        draftNotes,
        editNotes,
        flushAllNotes,
        flushNote,
        noteSaveStatuses,
        retryNotes,
        setAllNotesVisibility,
        setNoteVisibility,
    };
};

export default useAutosaveNotes;
