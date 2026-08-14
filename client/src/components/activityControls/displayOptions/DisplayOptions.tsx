import type { DisplayOptionsProps } from '../models';
import ControlDropdown from '../ControlDropdown';
import styles from './DisplayOptions.module.css';

const DisplayOptions = ({ children, id }: DisplayOptionsProps) => (
    <ControlDropdown
        dropdownAriaLabel='Display options'
        dropdownRole='group'
        id={id}
        label={
            <>
                <span className={styles.fullLabel}>Display options</span>
            </>
        }
        renderDropdownInPortal
        triggerAriaLabel='Display options'
        triggerStyle='activity'
    >
        <div className={styles.options}>{children}</div>
    </ControlDropdown>
);

export default DisplayOptions;
