import { styled } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

export const UncheckedIcon = styled('div')(({ theme }) => ({
  width: '18px',
  height: '18px',
  border: `2px solid ${theme.custom?.colors?.primary.outline || '#1D1B20'}`,
  borderRadius: '2px',
  backgroundColor: 'transparent',
}));

export const StyledCheckbox = styled(Checkbox)(({ theme }) => ({
  padding: '11px',

  '& .MuiSvgIcon-root': {
    width: '18px',
    height: '18px',
    borderRadius: '2px',
  },

  // Checked state
  '&.Mui-checked .MuiSvgIcon-root': {
    backgroundColor: theme.custom?.colors?.primary?._500 || '#187EF4',
    border: 'none',
    color: '#FFFFFF',
  },

  // Indeterminate state
  '&.MuiCheckbox-indeterminate .MuiSvgIcon-root': {
    backgroundColor: theme.custom?.colors?.primary?._500 || '#187EF4',
    border: 'none',
    color: '#FFFFFF',
  },

  // Hover states
  '&:hover': {
    backgroundColor: theme.custom.opacity._12,

    '&.Mui-checked, &.MuiCheckbox-indeterminate': {
      backgroundColor: 'rgba(24, 126, 244, 0.08)',
    },
  },

  // Focus states
  '&.Mui-focusVisible': {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',

    '&.Mui-checked, &.MuiCheckbox-indeterminate': {
      backgroundColor: 'rgba(24, 126, 244, 0.12)',
    },
  },

  // Disabled state
  '&.Mui-disabled': {
    opacity: 0.38,

    '&.Mui-checked .MuiSvgIcon-root, &.MuiCheckbox-indeterminate .MuiSvgIcon-root': {
      backgroundColor: theme.custom?.colors?.on.surface || '#1D1B20',
      color: theme.custom?.colors?.surface || '#FEF7FF',
    },
  },
}));

export const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  margin: 0,

  '& .MuiFormControlLabel-label': {
    fontSize: theme.custom?.typography?.body1?.fontSize || '16px',
    lineHeight: theme.custom?.typography?.body1?.lineHeight || '24px',
    color: theme.custom?.colors.on.surface || '#1D1B20',
    marginLeft: theme.custom?.spacing?.sm || '8px',
  },

  '&.Mui-disabled .MuiFormControlLabel-label': {
    color: theme.custom?.colors?.on.surface || '#1D1B20',
    opacity: 0.38,
  },
}));
