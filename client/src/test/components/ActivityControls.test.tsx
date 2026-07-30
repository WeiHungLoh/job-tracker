import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityControls from '../../components/activityControls/ActivityControls';
import CheckboxFilter from '../../components/activityControls/checkboxFilter/CheckboxFilter';
import CollectionViewToggle from '../../components/activityControls/collectionViewToggle/CollectionViewToggle';
import ControlDropdown from '../../components/activityControls/ControlDropdown';
import styles from '../../components/activityControls/ActivityControls.module.css';

const createRect = ({
    height = 40,
    left,
    top = 0,
    width,
}: {
    height?: number;
    left: number;
    top?: number;
    width: number;
}): DOMRect => ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
});

describe('ActivityControls', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test('labels the control region and keeps management actions after primary controls', () => {
        render(
            <ActivityControls actions={<button type='button'>More</button>} ariaLabel='Application controls'>
                <button type='button'>List</button>
                <button type='button'>Filter</button>
            </ActivityControls>
        );

        const region = screen.getByRole('region', { name: 'Application controls' });
        const listButton = screen.getByRole('button', { name: 'List' });
        const filterButton = screen.getByRole('button', { name: 'Filter' });
        const moreButton = screen.getByRole('button', { name: 'More' });

        expect(region).toContainElement(listButton);
        expect(listButton.compareDocumentPosition(filterButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(filterButton.compareDocumentPosition(moreButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('does not render an empty management-action group', () => {
        render(
            <ActivityControls ariaLabel='Interview controls'>
                <button type='button'>List</button>
            </ActivityControls>
        );

        expect(screen.getByRole('region', { name: 'Interview controls' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    });

    test('exposes the interview responsive layout only when requested by its caller', () => {
        render(
            <ActivityControls
                actions={<button type='button'>More</button>}
                ariaLabel='Interview responsive controls'
                mobileLayout='interviewResponsive'
            >
                <button type='button'>List and Board</button>
                <button type='button'>Filter</button>
                <button type='button'>Display</button>
            </ActivityControls>
        );

        expect(screen.getByRole('region', { name: 'Interview responsive controls' })).toHaveClass(
            styles.interviewResponsive,
            styles.hasActions
        );
    });

    test('uses a caller-owned accessible label for the shared collection view toggle', async () => {
        const onViewChange = vi.fn();
        render(<CollectionViewToggle ariaLabel='Application view' currentView='list' onViewChange={onViewChange} />);

        await userEvent.click(screen.getByRole('button', { name: 'Board' }));

        expect(screen.getByRole('group', { name: 'Application view' })).toBeInTheDocument();
        expect(onViewChange).toHaveBeenCalledWith('board');
    });

    test('exposes dropdown state and restores focus when Escape closes the panel', async () => {
        render(
            <ControlDropdown
                dropdownAriaLabel='Filter options'
                dropdownRole='group'
                id='filter'
                label='Filter'
                triggerStyle='activity'
            >
                <button type='button'>Applied</button>
            </ControlDropdown>
        );

        const trigger = screen.getByRole('button', { name: 'Filter' });
        expect(trigger).toHaveAttribute('aria-controls', 'filter-options');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('group', { name: 'Filter options' })).toHaveAttribute('id', 'filter-options');

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('group', { name: 'Filter options' })).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    test('keeps a wide dropdown inside both viewport gutters', async () => {
        vi.stubGlobal('innerWidth', 320);
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
            if (this.id === 'positioned-options') {
                return createRect({ left: 0, width: 220 });
            }

            if (this.querySelector('[aria-controls="positioned-options"]')) {
                return createRect({ left: 120, width: 84 });
            }

            return createRect({ left: 0, width: 0 });
        });

        render(
            <ControlDropdown
                dropdownAriaLabel='Positioned options'
                dropdownRole='group'
                id='positioned'
                label='Display'
                triggerStyle='activity'
            >
                <button type='button'>Show notes</button>
            </ControlDropdown>
        );

        await userEvent.click(screen.getByRole('button', { name: 'Display' }));
        const dropdown = screen.getByRole('group', { name: 'Positioned options' });

        await waitFor(() => expect(dropdown.style.getPropertyValue('--dropdown-offset')).not.toBe('0px'));
        const offset = Number.parseFloat(dropdown.style.getPropertyValue('--dropdown-offset'));
        const dropdownLeft = 120 + offset;

        expect(dropdownLeft).toBeGreaterThanOrEqual(8);
        expect(dropdownLeft + 220).toBeLessThanOrEqual(312);
    });

    test('opens above and limits panel height when the lower viewport space is smaller', async () => {
        vi.stubGlobal('innerHeight', 384);
        vi.stubGlobal('innerWidth', 320);
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
            if (this.id === 'vertical-options') {
                return createRect({ height: 250, left: 0, width: 220 });
            }

            if (this.querySelector('[aria-controls="vertical-options"]')) {
                return createRect({ height: 42, left: 30, top: 220, width: 100 });
            }

            return createRect({ left: 0, width: 0 });
        });

        render(
            <ControlDropdown
                dropdownAriaLabel='Vertical options'
                dropdownRole='group'
                id='vertical'
                label='Filter'
                triggerStyle='activity'
            >
                <button type='button'>Applied</button>
            </ControlDropdown>
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
        const dropdown = screen.getByRole('group', { name: 'Vertical options' });

        await waitFor(() => expect(dropdown).toHaveAttribute('data-placement', 'top'));
        expect(Number.parseFloat(dropdown.style.getPropertyValue('--dropdown-max-height'))).toBeLessThanOrEqual(204);
    });

    test('marks Show All as partially checked when only some filters are selected', async () => {
        render(
            <CheckboxFilter
                buttonLabel='Filter by'
                id='status-filter'
                onSelectionChange={async () => true}
                options={['Applied', 'Offer']}
                selectedOptions={['Applied']}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        expect(screen.getByRole('checkbox', { name: 'Show All' })).toBePartiallyChecked();
    });

    test('reflects externally saved filters while an older selection is still pending', async () => {
        let resolveSelection!: (saved: boolean) => void;
        const onSelectionChange = vi.fn(
            () =>
                new Promise<boolean>((resolve) => {
                    resolveSelection = resolve;
                })
        );
        const { rerender } = render(
            <CheckboxFilter
                buttonLabel='Filter by'
                id='status-filter'
                onSelectionChange={onSelectionChange}
                options={['Applied', 'Offer']}
                selectedOptions={['Applied', 'Offer']}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: 'Filter by' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Show All' }));
        await userEvent.click(screen.getByRole('checkbox', { name: 'Offer' }));

        rerender(
            <CheckboxFilter
                buttonLabel='Filter by'
                id='status-filter'
                onSelectionChange={onSelectionChange}
                options={['Applied', 'Offer']}
                selectedOptions={['Applied', 'Offer']}
            />
        );

        expect(screen.getByRole('checkbox', { name: 'Show All' })).toBeChecked();
        resolveSelection(true);
    });
});
