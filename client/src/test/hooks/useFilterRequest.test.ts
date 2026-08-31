import { act, renderHook } from '@testing-library/react';
import useFilterRequest from '../../hooks/useFilterRequest';

describe('useFilterRequest', () => {
    test('requires a fresh request after a mutation commits', () => {
        const { result } = renderHook(() => useFilterRequest<string[]>());
        const request = result.current.startRequest();

        act(() => result.current.markMutationCommitted());

        expect(result.current.shouldRefresh(request)).toBe(true);
        expect(result.current.saveResult(request, ['stale result'])).toBeUndefined();
    });

    test('does not restore a saved result created before the latest mutation', () => {
        const { result } = renderHook(() => useFilterRequest<string[]>());
        const firstRequest = result.current.startRequest();
        expect(result.current.saveResult(firstRequest, ['saved result'])).toEqual(['saved result']);

        act(() => result.current.markMutationCommitted());
        const failingRequest = result.current.startRequest();

        expect(result.current.failRequest(failingRequest)).toBeUndefined();
    });

    test('preserves the newest persisted filter result when a later request fails without a mutation', () => {
        const { result } = renderHook(() => useFilterRequest<string[]>());
        const olderRequest = result.current.startRequest();
        const newerRequest = result.current.startRequest();

        expect(result.current.failRequest(newerRequest)).toBeUndefined();
        expect(result.current.saveResult(olderRequest, ['persisted result'])).toEqual(['persisted result']);
    });

    test('does not refresh an older request while a newer request remains active', () => {
        const { result } = renderHook(() => useFilterRequest<string[]>());
        const olderRequest = result.current.startRequest();

        act(() => result.current.markMutationCommitted());
        result.current.startRequest();

        expect(result.current.shouldRefresh(olderRequest)).toBe(false);
    });
});
