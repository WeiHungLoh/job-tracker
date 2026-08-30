import { focusFirstInvalidField } from '../../components/formPage/focusFirstInvalidField';

describe('focusFirstInvalidField', () => {
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: originalMatchMedia,
        });
    });

    test('focuses the first invalid field without animated scrolling when reduced motion is preferred', () => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockReturnValue({ matches: true }),
        });
        const field = document.createElement('input');
        const scrollIntoView = vi.fn();
        field.id = 'company-name';
        field.scrollIntoView = scrollIntoView;
        document.body.append(field);

        focusFirstInvalidField({ companyName: 'Required' }, [['companyName', { current: field }]]);
        vi.runAllTimers();

        expect(field).toHaveFocus();
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
    });
});
