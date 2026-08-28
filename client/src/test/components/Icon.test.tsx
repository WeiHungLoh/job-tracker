import { render } from '@testing-library/react';
import Icon from '../../components/icon/Icon';
import type { IconName } from '../../components/icon/models';

const ICON_NAMES: readonly IconName[] = [
    'activeApplications',
    'alert',
    'arrowBack',
    'arrowForward',
    'archive',
    'briefcase',
    'calendar',
    'chevronDown',
    'chevronRight',
    'darkMode',
    'dashboard',
    'delete',
    'dragHandle',
    'email',
    'error',
    'export',
    'externalLink',
    'guide',
    'highlight',
    'info',
    'interview',
    'lightMode',
    'lock',
    'notes',
    'pin',
    'success',
    'undo',
    'visibility',
    'visibilityOff',
    'wifiOff',
];

describe('Icon', () => {
    test.each(ICON_NAMES)('keeps %s in the shared 24px optical grid', (name) => {
        const { container } = render(<Icon name={name} />);

        expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24');
    });
});
