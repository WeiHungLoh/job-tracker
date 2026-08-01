import { CSVLink } from 'react-csv';
import Icon from '../../icon/Icon';
import PrimaryButton from '../../button/PrimaryButton';
import ControlDropdown from '../ControlDropdown';
import type { MoreOptionsProps } from '../models';
import styles from './MoreOptions.module.css';

const MoreOptions = ({
    csvData,
    csvFilename,
    csvHeaders,
    csvLabel,
    deleteDisabled = false,
    deleteLabel,
    id,
    isDeleting,
    middleAction,
    onDelete,
}: MoreOptionsProps) => (
    <ControlDropdown
        dropdownAriaLabel='More options'
        dropdownRole='group'
        id={id}
        label='More...'
        triggerStyle='activity'
    >
        <div className={styles.options}>
            <CSVLink className={styles.action} data={csvData} filename={csvFilename} headers={csvHeaders}>
                <Icon name='export' size={18} />
                <span>{csvLabel}</span>
            </CSVLink>
            <hr className={styles.divider} />
            {middleAction && (
                <>
                    <PrimaryButton
                        className={styles.action}
                        disabled={middleAction.disabled}
                        isLoading={middleAction.isLoading}
                        onClick={middleAction.onClick}
                        type='button'
                        variant='secondary'
                    >
                        {middleAction.icon && <Icon name={middleAction.icon} size={18} />}
                        <span>{middleAction.label}</span>
                    </PrimaryButton>
                    <hr className={styles.divider} />
                </>
            )}
            <PrimaryButton
                className={`${styles.action} ${styles.deleteAction}`}
                disabled={deleteDisabled}
                isLoading={isDeleting}
                onClick={onDelete}
                type='button'
                variant='secondary'
            >
                <Icon name='delete' size={18} />
                <span>{deleteLabel}</span>
            </PrimaryButton>
        </div>
    </ControlDropdown>
);

export default MoreOptions;
