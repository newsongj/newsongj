import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const StyledContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'stretch',
  width: '100%',
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  background: theme.custom.colors.white,
  overflow: 'hidden',
  '&:focus-within': {
    borderColor: theme.custom.colors.primary._500,
    borderWidth: '2px',
  },
  '@media (max-width: 600px)': {
    flexWrap: 'wrap',
  },
}));

export const StyledSelectContainer = styled('div')(({ theme }) => ({
  minWidth: 50,
  borderRight: `1px solid ${theme.custom.colors.primary.outline}`,
  display: 'flex',
  alignItems: 'center',
  '@media (max-width: 600px)': {
    width: '100%',
    borderRight: 'none',
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
  },

  '& .MuiFormControl-root': {
    '& .MuiOutlinedInput-root': {
      border: 'none',
      backgroundColor: 'transparent',
      borderRadius: 0,
      '& fieldset': {
        border: 'none',
      },
      '&:hover fieldset': {
        border: 'none',
      },
      '&.Mui-focused fieldset': {
        border: 'none',
      },
    },
    '& .MuiInputLabel-root': {
      fontSize: theme.custom.typography.caption.fontSize,
    },
  },
}));

export const StyledTextFieldContainer = styled(Box)({
  flex: 1,
  '& > div': {
    '& > div': {
      border: 'none',
      backgroundColor: 'transparent',
      borderRadius: 0,
      '& fieldset': {
        border: 'none',
      },
      '&:hover fieldset': {
        border: 'none',
      },
      '&.Mui-focused fieldset': {
        border: 'none',
      },
    },
    '& label': {
      display: 'none',
    },
  },
});

export const StyledSearchButtonContainer = styled(Box)(({ theme }) => ({
  borderLeft: `1px solid ${theme.custom.colors.primary.outline}`,
  '@media (max-width: 600px)': {
    width: '100%',
    borderLeft: 'none',
    borderTop: `1px solid ${theme.custom.colors.primary.outline}`,
    '& button': {
      width: '100%',
    },
  },
  '& button': {
    borderRadius: 0,
    border: 'none',
    height: '100%',
    minHeight: '40px',
  },
}));
