import { act, renderHook } from '@testing-library/react';
import useAutosaveNotes from '../../hooks/useAutosaveNotes';

type DeferredPromise = {
    promise: Promise<void>;
    reject: (error: unknown) => void;
    resolve: () => void;
};

const createDeferredPromise = (): DeferredPromise => {
    let reject!: (error: unknown) => void;
    let resolve!: () => void;
    const promise = new Promise<void>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });

    return { promise, reject, resolve };
};

describe('useAutosaveNotes', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('shows Saving immediately, saves after 1000ms, then clears Saved after 3000ms', async () => {
        const saveNotes = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useAutosaveNotes({ saveNotes }));

        act(() => result.current.editNotes(1, 'Updated notes'));

        expect(result.current.draftNotes[1]).toBe('Updated notes');
        expect(result.current.noteSaveStatuses[1]).toBe('saving');

        await act(async () => vi.advanceTimersByTimeAsync(999));
        expect(saveNotes).not.toHaveBeenCalled();

        await act(async () => vi.advanceTimersByTimeAsync(1));
        expect(saveNotes).toHaveBeenCalledTimes(1);
        expect(saveNotes).toHaveBeenCalledWith(1, 'Updated notes');
        expect(result.current.noteSaveStatuses[1]).toBe('saved');

        await act(async () => vi.advanceTimersByTimeAsync(2_999));
        expect(result.current.noteSaveStatuses[1]).toBe('saved');

        await act(async () => vi.advanceTimersByTimeAsync(1));
        expect(result.current.noteSaveStatuses[1]).toBe('idle');
    });

    test('keeps the final error visible and retries the latest draft immediately', async () => {
        const error = new Error('Unable to save');
        const saveNotes = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
        const onSaveError = vi.fn();
        const { result } = renderHook(() => useAutosaveNotes({ onSaveError, saveNotes }));

        act(() => result.current.editNotes(1, 'Retry these notes'));
        await act(async () => vi.advanceTimersByTimeAsync(1_000));

        expect(result.current.noteSaveStatuses[1]).toBe('error');
        expect(onSaveError).toHaveBeenCalledWith(1, error);

        act(() => result.current.setNoteVisibility(1, false));
        act(() => result.current.setNoteVisibility(1, true));
        expect(result.current.noteSaveStatuses[1]).toBe('error');

        await act(async () => {
            result.current.retryNotes(1);
            await Promise.resolve();
        });

        expect(saveNotes).toHaveBeenCalledTimes(2);
        expect(saveNotes).toHaveBeenLastCalledWith(1, 'Retry these notes');
        expect(result.current.noteSaveStatuses[1]).toBe('saved');
    });

    test('serializes saves and only reports the newest draft completion', async () => {
        const firstSave = createDeferredPromise();
        const secondSave = createDeferredPromise();
        const saveNotes = vi.fn().mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(secondSave.promise);
        const { result } = renderHook(() => useAutosaveNotes({ saveNotes }));

        act(() => result.current.editNotes(1, 'First draft'));
        await act(async () => vi.advanceTimersByTimeAsync(1_000));
        expect(saveNotes).toHaveBeenCalledTimes(1);

        act(() => result.current.editNotes(1, 'Newest draft'));
        await act(async () => vi.advanceTimersByTimeAsync(1_000));
        expect(saveNotes).toHaveBeenCalledTimes(1);
        expect(result.current.noteSaveStatuses[1]).toBe('saving');

        await act(async () => firstSave.resolve());
        expect(saveNotes).toHaveBeenCalledTimes(2);
        expect(saveNotes).toHaveBeenLastCalledWith(1, 'Newest draft');
        expect(result.current.noteSaveStatuses[1]).toBe('saving');

        await act(async () => secondSave.resolve());
        expect(result.current.noteSaveStatuses[1]).toBe('saved');
    });

    test('flushes a pending debounce once and hides a successful result while notes are closed', async () => {
        const save = createDeferredPromise();
        const saveNotes = vi.fn().mockReturnValue(save.promise);
        const { result } = renderHook(() => useAutosaveNotes({ saveNotes }));

        act(() => result.current.editNotes(1, 'Flush this draft'));
        act(() => result.current.setNoteVisibility(1, false));
        act(() => {
            void result.current.flushNote(1);
        });

        expect(saveNotes).toHaveBeenCalledTimes(1);
        expect(result.current.noteSaveStatuses[1]).toBe('saving');

        await act(async () => save.resolve());
        expect(result.current.noteSaveStatuses[1]).toBe('idle');

        await act(async () => vi.advanceTimersByTimeAsync(1_000));
        expect(saveNotes).toHaveBeenCalledTimes(1);
    });

    test('reports whether a flushed draft was saved so preserving actions can stop on failure', async () => {
        const saveNotes = vi.fn().mockRejectedValue(new Error('Unable to save'));
        const { result } = renderHook(() => useAutosaveNotes({ saveNotes }));

        act(() => result.current.editNotes(1, 'Preserve this draft'));

        let notesSaved = true;
        await act(async () => {
            notesSaved = await result.current.flushNote(1);
        });

        expect(notesSaved).toBe(false);
        expect(result.current.noteSaveStatuses[1]).toBe('error');
        expect(saveNotes).toHaveBeenCalledTimes(1);
    });

    test('clears a removed note without sending its pending draft', async () => {
        const saveNotes = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useAutosaveNotes({ saveNotes }));

        act(() => result.current.editNotes(1, 'Delete this application'));
        act(() => result.current.clearNoteState(1));
        await act(async () => vi.advanceTimersByTimeAsync(1_000));

        expect(saveNotes).not.toHaveBeenCalled();
        expect(result.current.draftNotes[1]).toBeUndefined();
        expect(result.current.noteSaveStatuses[1]).toBeUndefined();
        await expect(result.current.flushAllNotes()).resolves.toBe(true);
    });

    test('ignores an in-flight result after its note state is cleared', async () => {
        const save = createDeferredPromise();
        const saveNotes = vi.fn().mockReturnValue(save.promise);
        const onSaveError = vi.fn();
        const { result } = renderHook(() => useAutosaveNotes({ onSaveError, saveNotes }));

        act(() => result.current.editNotes(1, 'Delete while saving'));
        await act(async () => vi.advanceTimersByTimeAsync(1_000));
        act(() => result.current.clearNoteState(1));
        await act(async () => save.reject(new Error('Application no longer exists')));

        expect(result.current.noteSaveStatuses[1]).toBeUndefined();
        expect(onSaveError).not.toHaveBeenCalled();
        expect(saveNotes).toHaveBeenCalledTimes(1);
    });

    test('does not start a status timer after an unmount flush finishes', async () => {
        const save = createDeferredPromise();
        const saveNotes = vi.fn().mockReturnValue(save.promise);
        const { result, unmount } = renderHook(() => useAutosaveNotes({ saveNotes }));

        act(() => result.current.editNotes(1, 'Save on navigation'));
        unmount();
        await act(async () => save.resolve());

        expect(saveNotes).toHaveBeenCalledWith(1, 'Save on navigation');
        expect(vi.getTimerCount()).toBe(0);
    });

    test('flushes a pending draft when the page is hidden', async () => {
        const saveNotes = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useAutosaveNotes({ saveNotes }));

        act(() => result.current.editNotes(1, 'Save before leaving'));
        await act(async () => window.dispatchEvent(new Event('pagehide')));

        expect(saveNotes).toHaveBeenCalledOnce();
        expect(saveNotes).toHaveBeenCalledWith(1, 'Save before leaving');
        await act(async () => vi.advanceTimersByTimeAsync(1_000));
        expect(saveNotes).toHaveBeenCalledOnce();
    });

    test('does not report a failed unmount flush after the page is gone', async () => {
        const save = createDeferredPromise();
        const saveNotes = vi.fn().mockReturnValue(save.promise);
        const onSaveError = vi.fn();
        const { result, unmount } = renderHook(() => useAutosaveNotes({ onSaveError, saveNotes }));

        act(() => result.current.editNotes(1, 'Save on unmount'));
        unmount();
        await act(async () => save.reject(new Error('Page already left')));

        expect(saveNotes).toHaveBeenCalledWith(1, 'Save on unmount');
        expect(onSaveError).not.toHaveBeenCalled();
    });
});
