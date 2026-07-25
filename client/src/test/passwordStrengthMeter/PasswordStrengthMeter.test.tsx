import { act, render, screen } from '@testing-library/react';
import PasswordStrengthMeter from '../../components/passwordStrengthMeter/PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('debounces strength calculation, reacts to password and email changes, and clears when empty', async () => {
        vi.useFakeTimers();
        const { rerender } = render(<PasswordStrengthMeter email='person@example.com' password='person@example.com' />);

        expect(screen.getByText('Checking password strength…')).toBeInTheDocument();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(149);
        });
        expect(screen.getByText('Checking password strength…')).toBeInTheDocument();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });
        const emailMatchedStrength = screen.getByText(/Password strength:/).textContent;

        rerender(<PasswordStrengthMeter email='different@example.com' password='person@example.com' />);
        expect(screen.getByText('Checking password strength…')).toBeInTheDocument();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });
        expect(screen.getByText(/Password strength:/).textContent).not.toBe(emailMatchedStrength);

        rerender(<PasswordStrengthMeter email='different@example.com' password='correct horse battery staple' />);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });
        expect(screen.getByText(/Password strength:/)).toBeInTheDocument();

        rerender(<PasswordStrengthMeter email='different@example.com' password='' />);
        expect(screen.queryByText(/Password strength:/)).not.toBeInTheDocument();
        expect(screen.queryByText('Checking password strength…')).not.toBeInTheDocument();
    });
});
