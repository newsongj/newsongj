import { styled } from '@mui/material/styles';
import { TextField } from '@mui/material';
import { TextFieldVariant, TextFieldSize, BorderConfig, BorderRadiusConfig } from './TextField.types';

interface StyledTextFieldProps {
  $variant: TextFieldVariant;
  $size: TextFieldSize;
  $error: boolean;
  $disabled: boolean;
  $focused: boolean;
  $hasLeadingIcon: boolean;
  $hasTrailingIcon: boolean;
  $hasValue: boolean;
  $fullWidth: boolean;
  $width?: string | number;
  $disableAnimation?: boolean;
  $border?: BorderConfig;
  $borderRadius?: BorderRadiusConfig;
}

const getSizeStyles = (size: TextFieldSize, theme: any) => {
  switch (size) {
    case 'small':
      return {
        minHeight: '32px',
        padding: `${theme.custom.spacing.xs} ${theme.custom.spacing.sm}`,
        fontSize: theme.custom.typography.caption.fontSize,
      };
    case 'large':
      return {
        minHeight: '64px',
        padding: `${theme.custom.spacing.md} ${theme.custom.spacing.lg}`,
        fontSize: theme.custom.typography.body1.fontSize,
      };
    default: // medium
      return {
        minHeight: '56px',
        padding: `${theme.custom.spacing.sm} ${theme.custom.spacing.md}`,
        fontSize: theme.custom.typography.body2.fontSize,
      };
  }
};

const getBorderStyles = (border?: BorderConfig) => {
  if (!border) return {};

  const borderSides = [];
  if (border.top !== false) borderSides.push('border-top');
  if (border.right !== false) borderSides.push('border-right');
  if (border.bottom !== false) borderSides.push('border-bottom');
  if (border.left !== false) borderSides.push('border-left');

  return borderSides.length === 4 ? {} : {
    border: 'none',
    ...Object.fromEntries(
      Object.entries(border).map(([side, enabled]) =>
        enabled !== false ? [`border-${side}`, '1px solid'] : []
      ).filter(arr => arr.length > 0)
    )
  };
};

const getBorderRadiusStyles = (borderRadius?: BorderRadiusConfig, theme?: any) => {
  if (!borderRadius) return { borderRadius: theme?.custom?.borderRadius || '8px' };

  return {
    borderTopLeftRadius: borderRadius.topLeft !== false ? (theme?.custom?.borderRadius || '8px') : '0',
    borderTopRightRadius: borderRadius.topRight !== false ? (theme?.custom?.borderRadius || '8px') : '0',
    borderBottomLeftRadius: borderRadius.bottomLeft !== false ? (theme?.custom?.borderRadius || '8px') : '0',
    borderBottomRightRadius: borderRadius.bottomRight !== false ? (theme?.custom?.borderRadius || '8px') : '0',
  };
};

export const StyledContainer = styled('div', {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<{ $fullWidth: boolean; $width?: string | number }>(({ $fullWidth, $width }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: $width ? (typeof $width === 'number' ? `${$width}px` : $width) : ($fullWidth ? '100%' : 'auto'),
  minWidth: 0,
  position: 'relative',
}));

export const StyledTextField = styled('div', {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<StyledTextFieldProps>(({
  theme,
  $variant,
  $error,
  $disabled,
  $focused,
  $disableAnimation,
  $border,
  $borderRadius
}) => ({
  position: 'relative',
  ...getBorderRadiusStyles($borderRadius, theme),
  transition: $disableAnimation ? 'none' : theme.custom.transitions.normal,

  ...($variant === 'outlined' && {
    border: `1px solid ${$error
      ? theme.custom.colors.error
      : $focused
        ? theme.custom.colors.primary._500
        : theme.custom.colors.primary.outline
      }`,
    borderWidth: $focused ? '3px' : '1px',
    backgroundColor: 'transparent',
    ...getBorderStyles($border),

    ...$disabled && {
      borderColor: theme.custom.colors.primary.outline,
      opacity: theme.custom.opacity._38,
    },

    '&:hover:not(:focus-within)': {
      ...(!$disabled && !$error && !$focused && {
        borderColor: theme.custom.colors.neutral._40,
      }),
    },
  }),

  ...($variant === 'filled' && {
    backgroundColor: theme.custom.colors.neutral._95,
    borderBottom: `1px solid ${$error
      ? theme.custom.colors.on.error
      : $focused
        ? theme.custom.colors.primary._500
        : theme.custom.colors.neutral._40
      }`,
    borderBottomWidth: $focused ? '3px' : '1px',
    borderRadius: `${theme.custom.borderRadius} ${theme.custom.borderRadius} 0 0`,

    ...$disabled && {
      backgroundColor: theme.custom.colors.neutral._95,
      opacity: theme.custom.opacity._38,
    },

    '&:hover:not(:focus-within)': {
      ...(!$disabled && !$error && !$focused && {
        backgroundColor: theme.custom.colors.neutral._90,
      }),
    },
  }),
}));

export const StyledInputContainer = styled('div', {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<Pick<StyledTextFieldProps, '$hasLeadingIcon' | '$hasTrailingIcon' | '$size'>>(({
  theme,
  $hasLeadingIcon,
  $hasTrailingIcon,
  $size
}) => {
  const sizeStyles = getSizeStyles($size, theme);

  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.custom.spacing.sm,
    ...sizeStyles,

    ...$hasLeadingIcon && {
      paddingLeft: theme.custom.spacing.md,
    },

    ...$hasTrailingIcon && {
      paddingRight: theme.custom.spacing.md,
    },
  };
});

export const StyledInput = styled('input', {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$') && prop !== 'multiline',
})<Pick<StyledTextFieldProps, '$variant' | '$error' | '$disabled' | '$size'>>(({ theme, $size }) => {
  const sizeStyles = getSizeStyles($size, theme);

  return {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    flex: 1,
    fontSize: sizeStyles.fontSize,
    lineHeight: theme.custom.typography.body1.lineHeight,
    fontWeight: theme.custom.typography.body1.fontWeight,
    color: theme.custom.colors.text.high,
    padding: theme.custom.spacing.xs,
    '&::placeholder': {
      color: theme.custom.colors.text.medium,
      opacity: 1,
    },

    '&:disabled': {
      color: theme.custom.colors.text.disabled,
      cursor: 'not-allowed',
    },
  };
});

export const StyledTextArea = styled(TextField, {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<Pick<StyledTextFieldProps, '$variant' | '$error' | '$disabled' | '$size'>>(({ theme, $size }) => {
  const sizeStyles = getSizeStyles($size, theme);

  return {
    width: '100%',
    '& .MuiInputBase-root': {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: sizeStyles.fontSize,
      lineHeight: theme.custom.typography.body1.lineHeight,
      fontWeight: theme.custom.typography.body1.fontWeight,
      color: theme.custom.colors.text.high,
      padding: theme.custom.spacing.xs,
      alignItems: 'flex-start',
      width: '100%',
    },
    '& .MuiInputBase-input': {
      padding: 0,
      width: '100%',
      '&::placeholder': {
        color: theme.custom.colors.text.medium,
        opacity: 1,
      },
      '&:disabled': {
        color: theme.custom.colors.text.disabled,
        cursor: 'not-allowed',
      },
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none',
    },
    '& .MuiInputBase-inputMultiline': {
      padding: 0,
      resize: 'vertical',
      width: '100%',
    },
  };
});


export const StyledLabel = styled('label', {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<Pick<StyledTextFieldProps, '$variant' | '$error' | '$disabled' | '$focused' | '$hasValue' | '$disableAnimation'>>(({
  theme,
  $variant,
  $error,
  $disabled,
  $focused,
  $hasValue,
  $disableAnimation
}) => ({
  position: 'absolute',
  left: theme.custom.spacing.lg,
  color: $error
    ? theme.custom.colors.error
    : $focused
      ? theme.custom.colors.primary._500
      : theme.custom.colors.text.medium,
  transition: $disableAnimation ? 'none' : theme.custom.transitions.normal,
  pointerEvents: 'none',
  transformOrigin: 'left top',

  ...($focused || $hasValue ? {
    // 활성 상태
    top: '-8px',
    fontSize: theme.custom.typography.caption.fontSize,
    lineHeight: theme.custom.typography.caption.lineHeight,
    fontWeight: theme.custom.typography.caption.fontWeight,
    backgroundColor: $variant === 'outlined' ? theme.custom.colors.white : 'transparent',
    padding: $variant === 'outlined' ? `0 ${theme.custom.spacing.xs}` : '0',
  } : {
    // 기본 상태
    top: theme.custom.spacing.md,
    transform: 'none',
    fontSize: theme.custom.typography.body2.fontSize,
    lineHeight: theme.custom.typography.body2.lineHeight,
    fontWeight: theme.custom.typography.body2.fontWeight,
  }),

  ...$disabled && {
    opacity: theme.custom.opacity._38,
  },
}));

export const StyledIconContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  color: theme.custom.colors.text.medium,

  '& svg': {
    width: '100%',
    height: '100%',
  },
}));

export const StyledHelperText = styled('div', {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<Pick<StyledTextFieldProps, '$error' | '$disabled'>>(({ theme, $error, $disabled }) => ({
  marginTop: theme.custom.spacing.xs,
  fontSize: theme.custom.typography.caption.fontSize,
  lineHeight: theme.custom.typography.caption.lineHeight,
  fontWeight: 600,
  color: $error
    ? theme.custom.colors.on.error
    : theme.custom.colors.text.high,
  opacity: 1,

  ...$disabled && {
    opacity: theme.custom.opacity._38,
  },
}));
