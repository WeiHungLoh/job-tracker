import { JobTrackerAPIError } from '../../api/models';
import { getErrorToastMessage } from '../../helper/getErrorToastMessage';

describe('getErrorToastMessage', () => {
    test('returns the backend message for an API error', () => {
        const error = new JobTrackerAPIError('Job application not found.', 404);

        expect(getErrorToastMessage(error, 'Unable to load the job application.')).toBe('Job application not found.');
    });

    test('returns the frontend fallback for a non-API error', () => {
        expect(getErrorToastMessage(new TypeError('Failed to fetch'), 'Unable to reach the server.')).toBe(
            'Unable to reach the server.'
        );
    });

    test('identifies a client request timeout with actionable copy', () => {
        const timeoutError = new DOMException('The request timed out.', 'TimeoutError');

        expect(getErrorToastMessage(timeoutError, 'Unable to reach the server.')).toBe(
            'The request took too long. Please try again.'
        );
    });

    test('supports contextual timeout copy without changing other frontend failures', () => {
        const timeoutError = new DOMException('The request timed out.', 'TimeoutError');

        expect(
            getErrorToastMessage(
                timeoutError,
                'Unable to sign in. Please try again.',
                'Sign in took too long. Please try again.'
            )
        ).toBe('Sign in took too long. Please try again.');
        expect(
            getErrorToastMessage(
                new TypeError('Failed to fetch'),
                'Unable to sign in. Please try again.',
                'Sign in took too long. Please try again.'
            )
        ).toBe('Unable to sign in. Please try again.');
    });
});
