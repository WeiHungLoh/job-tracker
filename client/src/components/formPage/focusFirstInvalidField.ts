import type { FormErrors } from './models';
import { getScrollBehavior } from '../../helper/scrollBehavior';

type FocusableRef = {
    readonly current: {
        focus: (options?: FocusOptions) => void;
        scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
    } | null;
};

export const focusFirstInvalidField = <TField extends string>(
    errors: FormErrors<TField>,
    fields: ReadonlyArray<readonly [TField, FocusableRef]>
) => {
    for (const [field, ref] of fields) {
        if (errors[field]) {
            ref.current?.scrollIntoView?.({ behavior: getScrollBehavior(), block: 'center' });
            ref.current?.focus({ preventScroll: true });
            return;
        }
    }
};
