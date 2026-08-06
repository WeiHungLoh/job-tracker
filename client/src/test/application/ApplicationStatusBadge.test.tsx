import { screen } from '@testing-library/react';
import ApplicationStatusBadge from '../../pages/application/ApplicationStatusBadge';
import applicationStyles from '../../pages/application/ApplicationCard.module.css';
import boardStyles from '../../pages/application/applicationBoard/ApplicationBoard.module.css';
import { getApplicationBoardStatusClassName } from '../../pages/application/applicationBoard/statusClassNames';
import { render } from '../renderWithProviders';

describe('ApplicationStatusBadge', () => {
    test('uses the View Application status style with an optional label', () => {
        render(<ApplicationStatusBadge jobStatus='Interview' showLabel />);

        expect(screen.getByText('Job Status: Interview')).toHaveClass(
            applicationStyles.statusBadge,
            applicationStyles.interview
        );
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
