import { render, screen } from '@testing-library/react';
import FallbackScreen from '../../components/fallbackScreen/FallbackScreen';

describe('FallbackScreen', () => {
    test('shows a generic busy state while a lazy page loads', () => {
        render(<FallbackScreen variant='pageLoading' />);

        expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Loading page' })).toBeInTheDocument();
        expect(screen.getByText('Please wait while we get this page ready.')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
