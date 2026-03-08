import { styled } from '@mui/material/styles';
import { Snackbar, Alert } from '@mui/material';

export const StyledSnackbar = styled(Snackbar)(({ theme }) => ({
  '& .MuiSnackbarContent-root': {
    backgroundColor: theme.custom.colors.neutral._10,
    color: theme.custom.colors.neutral._100,
  },
}));

export const StyledAlert = styled(Alert)(({ theme }) => ({
  '&.MuiAlert-standardSuccess': {
    backgroundColor: theme.custom.colors.on.success,
    color: theme.custom.colors.success,
  },
  '&.MuiAlert-standardError': {
    backgroundColor: theme.custom.colors.on.error,
    color: theme.custom.colors.error,
  },
  '&.MuiAlert-standardWarning': {
    backgroundColor: theme.custom.colors.on.warning,
    color: theme.custom.colors.warning,
  },
  '&.MuiAlert-standardInfo': {
    backgroundColor: theme.custom.colors.on.info,
    color: theme.custom.colors.info,
  },
}));
