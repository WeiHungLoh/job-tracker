import { useEffect, useRef, useState } from 'react';
import ControlDropdown from '../ControlDropdown';
import type { SortOptionsProps } from './models';
import styles from './SortOptions.module.css';

const SortOptions = <SortOrder extends string>({
    disabled = false,
    id,
    onSelectionChange,
    options,
    selectedOption: savedOption,
}: SortOptionsProps<SortOrder>) => {
    const [selectedOption, setSelectedOption] = useState(savedOption);
    const [isPending, setIsPending] = useState(false);
    const savedOptionRef = useRef(savedOption);

    useEffect(() => {
        const nextSelectedOption = options.some((option) => option.value === savedOption)
            ? savedOption
            : options[0]?.value ?? savedOption;

        savedOptionRef.current = nextSelectedOption;
        setSelectedOption(nextSelectedOption);
    }, [options, savedOption]);

    const applySelection = async (nextOption: SortOrder) => {
        if (isPending || nextOption === savedOptionRef.current) {
            return;
        }

        setSelectedOption(nextOption);
        setIsPending(true);

        try {
            const selectionSaved = await onSelectionChange(nextOption);
            if (selectionSaved) {
                savedOptionRef.current = nextOption;
            } else {
                setSelectedOption(savedOptionRef.current);
            }
        } catch {
            setSelectedOption(savedOptionRef.current);
        } finally {
            setIsPending(false);
        }
    };

    const controlsAreDisabled = disabled || isPending;

    return (
        <ControlDropdown
            closeOnSelect
            containerClassName={styles.sortOptions}
            disabled={controlsAreDisabled}
            dropdownAriaLabel='Sort options'
            dropdownClassName={styles.dropdown}
            dropdownRole='radiogroup'
            id={id}
            label='Sort by'
            renderDropdownInPortal
            triggerStyle='activity'
        >
            {options.map((option) => {
                const optionId = `${id}-${option.value}`;

                return (
                    <label className={styles.option} htmlFor={optionId} key={option.value}>
                        <input
                            checked={selectedOption === option.value}
                            disabled={controlsAreDisabled}
                            id={optionId}
                            name={`${id}-sort-order`}
                            onChange={() => void applySelection(option.value)}
                            type='radio'
                            value={option.value}
                        />
                        <span aria-hidden='true' className={styles.radio} />
                        <span>{option.label}</span>
                    </label>
                );
            })}
        </ControlDropdown>
    );
};

export default SortOptions;
