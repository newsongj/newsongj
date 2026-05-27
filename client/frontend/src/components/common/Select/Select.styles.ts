import { styled } from '@mui/material/styles';
import { FormControl, Select, FormHelperText } from '@mui/material';
import { SelectSize, SelectVariant } from './Select.types';

interface StyledSelectProps {
  $size: SelectSize;
  $variant: SelectVariant;
  $error: boolean;
  $fullWidth: boolean;
  $width?: string | number;
}

const getSizeStyles = (size: SelectSize, theme: any) => {
  switch (size) {
    case 'small':
      return {
        minHeight: '32px',
        fontSize: theme.custom.typography.body2.fontSize,
        '& .MuiSelect-select': {
          padding: `${theme.custom.spacing.xs} ${theme.custom.spacing.sm}`,
          fontSize: theme.custom.typography.body2.fontSize,
        },
      };
    case 'large':
      return {
        minHeight: '64px',
        fontSize: theme.custom.typography.body1.fontSize,
        '& .MuiSelect-select': {
          padding: `${theme.custom.spacing.md} ${theme.custom.spacing.lg}`,
        },
      };
    default:
      return {
        minHeight: '56px',
        fontSize: theme.custom.typography.body2.fontSize,
        '& .MuiSelect-select': {
          padding: `${theme.custom.spacing.sm} ${theme.custom.spacing.md}`,
        },
      };
  }
};

export const StyledFormControl = styled(FormControl, {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<Pick<StyledSelectProps, '$fullWidth' | '$width'>>(({ $fullWidth, $width }) => ({
  width: $width ? (typeof $width === 'number' ? `${$width}px` : $width) : ($fullWidth ? '100%' : '210px'),
}));

export const StyledSelect = styled(Select, {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<StyledSelectProps>(({ theme, $size, $variant, $error }) => {
  const sizeStyles = getSizeStyles($size, theme);

  return {
    ...sizeStyles,
    borderRadius: theme.custom.borderRadius,

    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: $error ? theme.custom.colors.error : theme.custom.colors.primary.outline,
      transition: theme.custom.transitions.normal,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: $error ? theme.custom.colors.error : theme.custom.colors.neutral._40,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: $error ? theme.custom.colors.error : theme.custom.colors.primary._500,
      borderWidth: '3px',
    },
    '& .MuiSelect-select': {
      color: theme.custom.colors.text.high,
      fontSize: sizeStyles.fontSize,
      '&:focus': { backgroundColor: 'transparent' },
    },
    '& .MuiSelect-icon': { color: theme.custom.colors.text.medium },
    '&.Mui-disabled': {
      '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.custom.colors.primary.outline },
      '& .MuiSelect-select': { color: theme.custom.colors.text.disabled },
      '& .MuiSelect-icon': { color: theme.custom.colors.text.disabled },
    },

    ...($variant === 'filled' && {
      backgroundColor: theme.custom.colors.neutral._95,
      '&:hover': { backgroundColor: theme.custom.colors.neutral._90 },
      '&.Mui-focused': { backgroundColor: theme.custom.colors.neutral._95 },
    }),
  };
});

export const StyledFormHelperText = styled(FormHelperText)(({ theme }) => ({
  color: theme.custom.colors.text.high,
  fontSize: theme.custom.typography.caption.fontSize,
  fontWeight: 600,
  marginTop: theme.custom.spacing.xs,
  '&.Mui-error': { color: theme.custom.colors.on.error },
  '&.Mui-disabled': { color: theme.custom.colors.text.disabled },
}));
