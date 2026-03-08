import { styled } from '@mui/material/styles';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { MODAL_SIZES, ModalSize } from '@/styles/modalSizes';

export const StyledDialog = styled(Dialog, {
  shouldForwardProp: (prop) => prop !== 'size',
})<{ size: ModalSize }>(({ theme, size }) => ({
  '& .MuiDialog-paper': {
    ...MODAL_SIZES[size],
    borderRadius: theme.custom.borderRadius,
    boxShadow: theme.custom.shadows.dp24,
  },
}));

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  fontSize: theme.custom.typography.h3.fontSize,
  fontWeight: theme.custom.typography.h3.fontWeight,
  color: theme.custom.colors.text.high,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
  padding: theme.custom.spacing.lg,
}));

export const StyledDialogContent = styled(DialogContent)({
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
});

export const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.custom.spacing.lg,
  borderTop: `1px solid ${theme.custom.colors.primary.outline}`,
  gap: theme.custom.spacing.sm,
  justifyContent: 'flex-end',
}));

export const StyledLoadingContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});
