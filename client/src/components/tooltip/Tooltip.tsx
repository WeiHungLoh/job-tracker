import MuiTooltip, { type TooltipProps as MuiTooltipProps } from '@mui/material/Tooltip';
import styles from './Tooltip.module.css';

type TooltipProps = Pick<MuiTooltipProps, 'children' | 'placement' | 'title'> & {
    mobileOnly?: boolean;
};

const Tooltip = ({ children, mobileOnly = false, placement = 'top', title }: TooltipProps) => (
    <MuiTooltip
        arrow
        disableInteractive
        enterDelay={250}
        enterTouchDelay={0}
        leaveTouchDelay={2500}
        placement={placement}
        slotProps={{
            arrow: {
                className: styles.arrow,
            },
            popper: {
                className: `${styles.popper} ${mobileOnly ? styles.mobileOnly : ''}`,
                modifiers: [
                    {
                        enabled: true,
                        name: 'flip',
                    },
                    {
                        enabled: true,
                        name: 'preventOverflow',
                        options: {
                            padding: 8,
                        },
                    },
                ],
            },
            tooltip: {
                className: styles.tooltip,
            },
        }}
        title={title}
    >
        {children}
    </MuiTooltip>
);

export default Tooltip;
