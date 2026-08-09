import { screen } from '@testing-library/react';
import ApplicationStatusBadge from '../../pages/application/ApplicationStatusBadge';
import applicationStyles from '../../pages/application/ApplicationCard.module.css';
import boardStyles from '../../pages/application/applicationBoard/ApplicationBoard.module.css';
import { getApplicationBoardStatusClassName } from '../../pages/application/applicationBoard/statusClassNames';
import { render } from '../renderWithProviders';

describe('ApplicationStatusBadge', () => {
    test('shows only the status while keeping the optional label available to screen readers', () => {
        render(<ApplicationStatusBadge jobStatus='Interview' showLabel />);

        const accessibleLabel = screen.getByText('Job Status: Interview');
        const visibleStatus = screen.getByText('Interview');

        expect(accessibleLabel).toHaveClass(applicationStyles.visuallyHidden);
        expect(visibleStatus).toHaveAttribute('aria-hidden', 'true');
        expect(accessibleLabel.parentElement).toHaveClass(applicationStyles.statusBadge, applicationStyles.interview);
    });

    test('can reuse the compact Board status style without adding a dot', () => {
        render(<ApplicationStatusBadge compact jobStatus='Offer' />);

        expect(screen.getByText('Offer')).toHaveClass(
            boardStyles.statusBadge,
            getApplicationBoardStatusClassName('Offer')
        );
        expect(screen.queryByText('•')).not.toBeInTheDocument();
    });
});
