import Icon from '../icon/Icon';
import PrimaryButton from '../button/PrimaryButton';
import { createPortal } from 'react-dom';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { ControlDropdownProps } from './models';
import styles from './ControlDropdown.module.css';
import useControlDropdown from './useControlDropdown';

const ControlDropdown = ({
    children,
    closeOnSelect = false,
    containerClassName = '',
    disabled = false,
    dropdownAriaLabel,
    dropdownClassName = '',
    dropdownRole,
    id,
    label,
    renderDropdownInPortal = false,
    triggerAriaLabel,
    triggerClassName = '',
    triggerStyle,
    triggerVariant = 'navigation',
}: ControlDropdownProps) => {
    const {
        closeDropdown,
        containerRef,
        dropdownMaxHeight,
        dropdownOffset,
        dropdownPosition,
        dropdownRef,
        isOpen,
        openAbove,
        toggleDropdown,
        triggerRef,
    } = useControlDropdown(renderDropdownInPortal);
    const hasActivityStyle = triggerStyle === 'activity';
    const dropdownId = `${id}-options`;
    const containerClasses = [
        styles.container,
        hasActivityStyle ? styles.activityContainer : '',
        isOpen ? styles.open : '',
        openAbove ? styles.openAbove : '',
        containerClassName,
    ]
        .filter(Boolean)
        .join(' ');
    const triggerClasses = [hasActivityStyle ? styles.activityTrigger : '', triggerClassName].filter(Boolean).join(' ');
    const dropdownClasses = [styles.dropdown, hasActivityStyle ? styles.activityDropdown : '', dropdownClassName]
        .filter(Boolean)
        .join(' ');
    const dropdownStyle = {
        '--dropdown-max-height': dropdownMaxHeight === null ? undefined : `${dropdownMaxHeight}px`,
        '--dropdown-offset': `${dropdownOffset}px`,
        ...(renderDropdownInPortal
            ? {
                  bottom: 'auto',
                  left: `${dropdownPosition?.left ?? 0}px`,
                  position: 'fixed',
                  top: `${dropdownPosition?.top ?? 0}px`,
                  visibility: dropdownPosition ? 'visible' : 'hidden',
              }
            : {}),
    } as CSSProperties;
    const handleSelect = (event: ReactMouseEvent<HTMLDivElement>) => {
        const target = event.target;
        if (target instanceof Element && target.closest('label') && target.tagName !== 'INPUT') {
            return;
        }

        closeDropdown();
        triggerRef.current?.focus();
    };
    const dropdown = (
        <div
            aria-label={dropdownAriaLabel}
            className={dropdownClasses}
            data-placement={openAbove ? 'top' : 'bottom'}
            id={dropdownId}
            onClick={closeOnSelect ? handleSelect : undefined}
            ref={dropdownRef}
            role={dropdownRole}
            style={dropdownStyle}
        >
            {children}
        </div>
    );

    return (
        <div className={containerClasses} ref={containerRef}>
            <PrimaryButton
                aria-controls={dropdownId}
                aria-expanded={isOpen}
                aria-haspopup={dropdownRole === 'menu' ? 'menu' : undefined}
                aria-label={triggerAriaLabel}
                className={triggerClasses}
                disabled={disabled}
                onClick={toggleDropdown}
                ref={triggerRef}
                type='button'
                variant={triggerVariant}
            >
                <span className={styles.label}>{label}</span>
                <Icon
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                    name='chevronDown'
                    size={18}
                />
            </PrimaryButton>

            {isOpen && (renderDropdownInPortal ? createPortal(dropdown, document.body) : dropdown)}
        </div>
    );
};

export default ControlDropdown;
