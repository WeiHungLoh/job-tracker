import { render, screen, within } from '@testing-library/react';
import SkeletonOfferComparisonTable from '../../components/skeletonLoader/skeletonOfferComparisonTable/SkeletonOfferComparisonTable';

describe('SkeletonOfferComparisonTable', () => {
    test('renders horizontal table geometry under one accessible loading announcement', () => {
        render(<SkeletonOfferComparisonTable orientation='horizontal' />);

        const skeleton = screen.getByRole('status', { name: 'Loading offer comparison table' });
        const grid = screen.getByTestId('skeleton-offer-comparison-table-grid');

        expect(skeleton).toHaveAttribute('aria-busy', 'true');
        expect(skeleton).toHaveAttribute('data-orientation', 'horizontal');
        expect(grid).toHaveAttribute('aria-hidden', 'true');
        expect(within(grid).getAllByTestId('skeleton-table-column-header')).toHaveLength(16);
        expect(within(grid).getAllByTestId('skeleton-table-record-row')).toHaveLength(4);
        expect(screen.getAllByRole('status')).toHaveLength(1);
    });

    test('renders vertical field geometry for vertical orientation', () => {
        render(<SkeletonOfferComparisonTable orientation='vertical' />);

        const skeleton = screen.getByRole('status', { name: 'Loading offer comparison table' });
        const grid = screen.getByTestId('skeleton-offer-comparison-table-grid');

        expect(skeleton).toHaveAttribute('data-orientation', 'vertical');
        expect(within(grid).getAllByTestId('skeleton-table-field-row')).toHaveLength(9);
        expect(within(grid).getAllByTestId('skeleton-table-record-cell')).toHaveLength(27);
    });
});
