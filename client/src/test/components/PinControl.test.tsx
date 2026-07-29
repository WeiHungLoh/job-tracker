import { render, screen } from '@testing-library/react';
import PinControl from '../../components/pinControl/PinControl';

describe('PinControl', () => {
    test('shows the shared loading spinner while a pin update is pending', () => {
        render(
            <PinControl
                isPending
                isPinned={false}
                itemLabel='Acme'
                onToggle={vi.fn()}
                size='list'
                subject='application'
            />
        );

        expect(screen.getByRole('button', { name: 'Pin Acme application' })).toBeDisabled();
        expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
    });
});
