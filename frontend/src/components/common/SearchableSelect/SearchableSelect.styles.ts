import { styled } from '@mui/material/styles';
import { Autocomplete, Paper } from '@mui/material';
import { SearchableSelectSize } from './SearchableSelect.types';

const getSizeStyles = (size: SearchableSelectSize, theme: any) => {
  switch (size) {
    case 'small':
      return {
        minHeight: '32px',
        fontSize: theme.custom.typography.caption.fontSize,
        '& .MuiAutocomplete-input': {
          padding: `${theme.custom.spacing.xs} 0 !important`,
        },
      };
    case 'large':
      return {
        minHeight: '64px',
        fontSize: theme.custom.typography.subtitle.fontSize,
        '& .MuiAutocomplete-input': {
          padding: `${theme.custom.spacing.lg} 0 !important`,
        },
      };
    default: // medium
      return {
        minHeight: '56px',
        fontSize: theme.custom.typography.body1.fontSize,
        '& .MuiAutocomplete-input': {
          padding: `${theme.custom.spacing.md} 0 !important`,
        },
      };
  }
};

export const StyledAutocomplete = styled(Autocomplete, {
  shouldForwardProp: (prop) => !prop.toString().startsWith('$'),
})<{ $size: SearchableSelectSize }>(({ theme, $size }) => {
  const sizeStyles = getSizeStyles($size, theme);

  return {
    '& .MuiOutlinedInput-root': {
      ...sizeStyles,
      borderRadius: theme.custom.borderRadius,

      '& fieldset': {
        borderColor: theme.custom.colors.primary.outline,
        transition: theme.custom.transitions.normal,
      },

      '&:hover fieldset': {
        borderColor: theme.custom.colors.neutral._40,
      },

      '&.Mui-focused fieldset': {
        borderColor: theme.custom.colors.primary._500,
        borderWidth: '3px',
      },

      '&.Mui-error fieldset': {
        borderColor: theme.custom.colors.error,
      },

      '&.Mui-disabled': {
        '& fieldset': {
          borderColor: theme.custom.colors.primary.outline,
        },
        '& .MuiAutocomplete-input': {
          color: theme.custom.colors.text.disabled,
        },
      },
    },

    '& .MuiInputLabel-root': {
      color: theme.custom.colors.text.medium,
      fontSize: theme.custom.typography.body1.fontSize,

      '&.Mui-focused': {
        color: theme.custom.colors.primary._500,
      },

      '&.Mui-error': {
        color: theme.custom.colors.error,
      },

      '&.Mui-disabled': {
        color: theme.custom.colors.text.disabled,
      },
    },

    '& .MuiAutocomplete-input': {
      color: theme.custom.colors.text.high,
      fontSize: sizeStyles.fontSize,

      '&::placeholder': {
        color: theme.custom.colors.text.medium,
        opacity: 1,
      },
    },

    '& .MuiFormHelperText-root': {
      color: theme.custom.colors.text.medium,
      fontSize: theme.custom.typography.caption.fontSize,
      marginTop: theme.custom.spacing.xs,

      '&.Mui-error': {
        color: theme.custom.colors.error,
      },

      '&.Mui-disabled': {
        color: theme.custom.colors.text.disabled,
      },
    },

    '& .MuiAutocomplete-endAdornment': {
      '& .MuiSvgIcon-root': {
        color: theme.custom.colors.text.medium,
      },
    },

    // MenuItem 스타일 통일
    '& .MuiAutocomplete-option': {
      padding: `${theme.custom.spacing.sm} ${theme.custom.spacing.md} !important`,
      minHeight: '48px !important',
    },
  };
});

export const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.custom.colors.neutral._99,
  borderRadius: theme.custom.borderRadius,
  boxShadow: theme.custom.shadows.dp02,
  marginTop: theme.custom.spacing.xs,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
}));
