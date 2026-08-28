import type { CheckboxFilterProps } from './models';
import styles from './CheckboxFilter.module.css';
import { useEffect, useRef, useState } from 'react';
import ControlDropdown from '../ControlDropdown';

const haveSameOptions = <Option extends string>(
    firstOptions: readonly Option[],
    secondOptions: readonly Option[]
): boolean => {
    return (
        firstOptions.length === secondOptions.length && firstOptions.every((option) => secondOptions.includes(option))
    );
};

const CheckboxFilter = <Option extends string>({
    buttonLabel,
    disabled = false,
    id,
    options,
    selectedOptions: savedOptions,
    onSelectionChange,
}: CheckboxFilterProps<Option>) => {
    const [selectedOptions, setSelectedOptions] = useState<Option[]>([...savedOptions]);
    const savedOptionsRef = useRef(savedOptions);
    savedOptionsRef.current = savedOptions;

    useEffect(() => {
        setSelectedOptions([...savedOptions]);
    }, [savedOptions]);

    const allSelected = options.length > 0 && options.every((option) => selectedOptions.includes(option));
    const someSelected = selectedOptions.length > 0 && !allSelected;

    const applySelection = async (nextOptions: Option[]) => {
        setSelectedOptions(nextOptions);

        if (haveSameOptions(nextOptions, savedOptionsRef.current)) {
            return;
        }

        try {
            const selectionSaved = await onSelectionChange(nextOptions);
            if (!selectionSaved) {
                setSelectedOptions([...savedOptionsRef.current]);
            }
        } catch {
            setSelectedOptions([...savedOptionsRef.current]);
        }
    };

    const handleShowAllToggle = () => {
        if (allSelected) {
            setSelectedOptions([]);
            return;
        }

        void applySelection([...options]);
    };

    const handleOptionToggle = (option: Option) => {
        const nextOptions = selectedOptions.includes(option)
            ? selectedOptions.filter((selectedOption) => selectedOption !== option)
            : [...selectedOptions, option];

        void applySelection(nextOptions.length === 0 ? [...options] : nextOptions);
    };

    return (
        <ControlDropdown
            containerClassName={styles.checkboxFilter}
            disabled={disabled}
            dropdownClassName={styles.dropdown}
            dropdownAriaLabel={`${buttonLabel} options`}
            dropdownRole='group'
            id={id}
            label={buttonLabel}
            triggerStyle='activity'
        >
            <label className={styles.option}>
                <input
                    checked={allSelected}
                    onChange={handleShowAllToggle}
                    ref={(input) => {
                        if (input) {
                            input.indeterminate = someSelected;
                        }
                    }}
                    type='checkbox'
                />
                <span aria-hidden='true' className={styles.checkbox} />
                <span>Show all</span>
            </label>

            {options.map((option) => (
                <label className={styles.option} key={option}>
                    <input
                        checked={selectedOptions.includes(option)}
                        onChange={() => handleOptionToggle(option)}
                        type='checkbox'
                    />
                    <span aria-hidden='true' className={styles.checkbox} />
                    <span>{option}</span>
                </label>
            ))}
        </ControlDropdown>
    );
};

export default CheckboxFilter;
