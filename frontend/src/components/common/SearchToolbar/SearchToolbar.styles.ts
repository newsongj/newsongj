import { styled } from '@mui/material/styles';
import { IconButton, MenuItem, Select, FormControl, InputLabel, Typography } from '@mui/material';

export const StyledContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.lg,
  padding: theme.custom.spacing.md,
  backgroundColor: theme.custom.colors.neutral._99,
  borderRadius: theme.custom.borderRadius,
  height: '90px',
}));

export const StyledQueriesSection = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.md,
  flex: 1,
}));

export const StyledActionsSection = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.lg,
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.custom.colors.neutral._50,
  '&:hover': {
    backgroundColor: theme.custom.colors.neutral._95,
  },
}));

export const StyledFormControl = styled(FormControl)(({ theme }) => ({
  width: '180px',
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.custom.colors.white,
  },
}));

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.custom.colors.neutral._50,
}));

export const StyledSelect = styled(Select)(({ theme }) => ({
  '& .MuiSelect-select': {
    padding: theme.custom.spacing.sm,
  },
}));

export const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  '&:hover': {
    backgroundColor: theme.custom.colors.primary._050,
  },
}));

export const StyledTypography = styled(Typography)(({ theme }) => ({
  color: theme.custom.colors.text.high,
  fontWeight: theme.custom.typography.body1.fontWeight,
}));
