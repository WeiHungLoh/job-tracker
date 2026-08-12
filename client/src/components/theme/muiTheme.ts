import { createTheme } from '@mui/material/styles';
import type { Theme } from './models';

export const createMuiTheme = (theme: Theme) => {
    return createTheme({
        palette: {
            mode: theme,
            primary: {
                main: theme === 'dark' ? '#ff779b' : '#a81f4c',
            },
        },
        typography: {
            fontFamily: 'var(--fontFamilyBase)',
        },
        components: {
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 'var(--radiusCard)',
                        backgroundColor: 'var(--colorCardBg)',
                        backgroundImage: 'none',
                    },
                },
            },
            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        color: 'var(--colorText)',
                        fontSize: 'var(--fontSizePageTitle)',
                        fontWeight: 'var(--fontWeightHeading)',
                        lineHeight: 'var(--lineHeightHeading)',
                        letterSpacing: 'var(--letterSpacingHeading)',
                    },
                },
            },
            MuiDialogContentText: {
                styleOverrides: {
                    root: {
                        color: 'var(--colorTextSecondary)',
                        fontSize: 'var(--fontSizeBody)',
                        lineHeight: 'var(--lineHeightBody)',
                    },
                },
            },
            MuiDialogActions: {
                styleOverrides: {
                    root: {
                        backgroundColor: 'var(--colorCardBg)',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        padding: 'var(--spaceControl) var(--spaceCompact)',
                        borderRadius: 'var(--radiusControl)',
                        boxShadow: 'none',
                        fontWeight: 'var(--fontWeightEmphasis)',
                        textTransform: 'none',
                        transition:
                            'transform var(--motionDurationFast) var(--motionEasingStandard), background-color var(--motionDurationFast) var(--motionEasingStandard), border-color var(--motionDurationFast) var(--motionEasingStandard), color var(--motionDurationFast) var(--motionEasingStandard)',
                        '&:not(:disabled):active': {
                            transform: 'scale(0.98)',
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                            transition: 'none',
                            '&:active': {
                                transform: 'none',
                            },
                        },
                    },
                    containedPrimary: {
                        backgroundColor: 'var(--colorPrimary)',
                        color: 'var(--colorBtnPrimaryText)',
                        '&:hover': {
                            backgroundColor: 'var(--colorPrimaryHover)',
                            boxShadow: 'none',
                        },
                    },
                    outlinedPrimary: {
                        border: '1.5px solid var(--colorPrimary)',
                        backgroundColor: 'transparent',
                        color: 'var(--colorPrimary)',
                        '&:hover': {
                            border: '1.5px solid var(--colorPrimary)',
                            backgroundColor: 'var(--colorBtnSecondaryHoverBg)',
                        },
                    },
                },
            },
        },
    });
};
