import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import { ButtonVariant, ButtonSize } from './Button.types';

interface StyledButtonProps {
  $variant: ButtonVariant;
  $size?: ButtonSize;
  $showIcon?: boolean;
}

export const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => !['$variant', '$size', '$showIcon'].includes(prop as string),
})<StyledButtonProps>(({ theme, $variant, $size = 'medium', $showIcon = false }) => ({
  textTransform: 'uppercase',
  fontSize: theme.custom.typography.button.fontSize,
  lineHeight: `${theme.custom.typography.button.lineHeight}px`,
  fontWeight: theme.custom.typography.button.fontWeight,
  letterSpacing: '0.089em',
  borderRadius: '100px',
  transition: theme.custom.transitions.normal,
  boxShadow: 'none',
  position: 'relative',
  overflow: 'hidden',

  // Size variants
  ...($size === 'small' && {
    height: '32px',
    padding: $showIcon
      ? `${theme.custom.spacing.xs} ${theme.custom.spacing.md} ${theme.custom.spacing.xs} ${theme.custom.spacing.sm}`
      : `${theme.custom.spacing.xs} ${theme.custom.spacing.md}`,
  }),
  ...($size === 'large' && {
    height: '48px',
    padding: $showIcon
      ? `${theme.custom.spacing.sm} ${theme.custom.spacing.xl} ${theme.custom.spacing.sm} ${theme.custom.spacing.lg}`
      : `${theme.custom.spacing.sm} ${theme.custom.spacing.xl}`,
  }),
  ...($size === 'medium' && {
    height: '40px',
    padding: $showIcon
      ? `${theme.custom.spacing.xs} ${theme.custom.spacing.lg} ${theme.custom.spacing.xs} ${theme.custom.spacing.md}`
      : `${theme.custom.spacing.xs} ${theme.custom.spacing.lg}`,
  }),

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    transition: 'background-color 0.2s ease-in-out',
  },

  '&.Mui-disabled': {
    opacity: 0.5,
    boxShadow: 'none'
  },

  '&:focus-visible': {
    outline: `2px solid ${theme.custom.colors.primary._300}`,
    outlineOffset: 2,
  },

  '.MuiButton-startIcon': {
    marginRight: theme.custom.spacing.sm,
    marginLeft: 0,

    '& svg': {
      width: '18px',
      height: '18px',
    },
  },

  ...($variant === 'filled' && {
    backgroundColor: theme.custom.colors.primary._500,
    color: theme.custom.colors.on.primary,
    '&:hover': {
      backgroundColor: theme.custom.colors.primary._500,
      boxShadow: theme.custom.shadows.dp01,
      '&::before': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
      },
    },
    '&:focus': {
      backgroundColor: theme.custom.colors.primary._500,
      '&::before': {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
      },
    },
    '&:active': {
      backgroundColor: theme.custom.colors.primary._500,
      '&::before': {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
      },
    },
    '&.Mui-disabled': {
      backgroundColor: 'rgba(0, 0, 0, 0.12)',
      color: theme.custom.colors.text.disabled,
    },
  }),

  ...($variant === 'elevated' && {
    backgroundColor: theme.custom.colors.primary.container,
    color: theme.custom.colors.primary._500,
    boxShadow: theme.custom.shadows.dp01,
    '&:hover': {
      backgroundColor: theme.custom.colors.primary.container,
      boxShadow: theme.custom.shadows.dp02,
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.08)',
      },
    },
    '&:focus': {
      backgroundColor: theme.custom.colors.primary.container,
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.12)',
      },
    },
    '&:active': {
      backgroundColor: theme.custom.colors.primary.container,
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.12)',
      },
    },
    '&.Mui-disabled': {
      backgroundColor: 'rgba(0, 0, 0, 0.12)',
      color: theme.custom.colors.text.disabled,
      boxShadow: 'none',
    },
  }),

  ...($variant === 'outlined' && {
    color: theme.custom.colors.primary._500,
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    backgroundColor: 'transparent',
    '&:hover': {
      borderColor: theme.custom.colors.primary.outline,
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.08)',
      },
    },
    '&:focus': {
      borderColor: theme.custom.colors.primary._500,
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.12)',
      },
    },
    '&:active': {
      borderColor: theme.custom.colors.primary.outline,
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.12)',
      },
    },
    '&.Mui-disabled': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
      color: theme.custom.colors.text.disabled,
    },
  }),

  ...($variant === 'text' && {
    color: theme.custom.colors.primary._500,
    backgroundColor: 'transparent',
    border: 'none',
    '&:hover': {
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.08)',
      },
    },
    '&:focus': {
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.12)',
      },
    },
    '&:active': {
      '&::before': {
        backgroundColor: 'rgba(24, 126, 244, 0.12)',
      },
    },
    '&.Mui-disabled': {
      color: theme.custom.colors.text.disabled,
    },
  }),

  ...($variant === 'destructive' && {
    backgroundColor: theme.custom.colors.error,
    color: theme.custom.colors.on.error,
    '&:hover': {
      backgroundColor: theme.custom.colors.error,
      boxShadow: theme.custom.shadows.dp01,
      '&::before': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
      },
    },
    '&:focus': {
      backgroundColor: theme.custom.colors.error,
      '&::before': {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
      },
    },
    '&:active': {
      backgroundColor: theme.custom.colors.error,
      '&::before': {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
      },
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.custom.colors.error}`,
      outlineOffset: 2,
    },
    '&.Mui-disabled': {
      borderColor: 'rgba(0, 0, 0, 0.12)',
      color: theme.custom.colors.text.disabled,
    },
  }),
}));
