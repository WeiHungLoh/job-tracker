import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import EmptyState from '../../components/emptyState/EmptyState';
import styles from '../../components/emptyState/EmptyState.module.css';
import buttonStyles from '../../components/button/PrimaryButton.module.css';
import userEvent from '@testing-library/user-event';

describe('EmptyState', () => {
    test('renders optional content and route actions accessibly', () => {
        render(
            <MemoryRouter>
                <EmptyState
                    description='A helpful description.'
                    followsControls
                    icon='briefcase'
                    primaryAction={{ label: 'Add application', to: '/application/add' }}
                    secondaryAction={{ label: 'View applications', to: '/application/view' }}
                    title='Nothing here yet'
                />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Nothing here yet' })).toHaveClass(styles.followsControls);
        expect(screen.getByText('A helpful description.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Add application' })).toHaveAttribute('href', '/application/add');
        expect(screen.getByRole('link', { name: 'Add application' })).toHaveClass(
            buttonStyles.button,
            buttonStyles.primary
        );
        expect(screen.getByRole('link', { name: 'View applications' })).toHaveAttribute('href', '/application/view');
        expect(screen.getByRole('link', { name: 'View applications' })).toHaveClass(
            buttonStyles.button,
            buttonStyles.secondary
        );
    });

    test('supports callback actions without submitting a surrounding form', async () => {
        const onClick = vi.fn();
        const onSubmit = vi.fn();

        render(
            <MemoryRouter>
                <form onSubmit={onSubmit}>
                    <EmptyState primaryAction={{ label: 'Clear filters', onClick }} title='No matches' />
                </form>
            </MemoryRouter>
        );

        const action = screen.getByRole('button', { name: 'Clear filters' });
        expect(action).toHaveClass(buttonStyles.button, buttonStyles.primary);

        await userEvent.click(action);

        expect(onClick).toHaveBeenCalledOnce();
        expect(onSubmit).not.toHaveBeenCalled();
    });
});
