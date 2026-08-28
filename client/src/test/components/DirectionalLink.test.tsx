import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import DirectionalLink from '../../components/directionalLink/DirectionalLink';

describe('DirectionalLink', () => {
    test('places a back arrow before the label', () => {
        render(
            <MemoryRouter>
                <DirectionalLink direction='back' to='/'>
                    Back to Job Tracker
                </DirectionalLink>
            </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: 'Back to Job Tracker' });
        const icon = link.querySelector('svg');
        const label = screen.getByText('Back to Job Tracker');

        expect(link).toHaveAttribute('href', '/');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
        expect(icon?.compareDocumentPosition(label)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    test('places a forward arrow after the label and forwards link attributes', () => {
        render(
            <MemoryRouter>
                <DirectionalLink direction='forward' rel='noreferrer' target='_blank' to='/user-guide'>
                    See how it works
                </DirectionalLink>
            </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: 'See how it works' });
        const icon = link.querySelector('svg');
        const label = screen.getByText('See how it works');

        expect(link).toHaveAttribute('href', '/user-guide');
        expect(link).toHaveAttribute('rel', 'noreferrer');
        expect(link).toHaveAttribute('target', '_blank');
        expect(label.compareDocumentPosition(icon)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
});
