import { styled } from '@mui/material/styles';
import { MenuItem as MuiMenuItem, Divider, Box } from '@mui/material';

export const StyledMenuItem = styled(MuiMenuItem)(({ theme }) => ({
  padding: `${theme.custom.spacing.sm} ${theme.custom.spacing.md}`,
  fontSize: theme.custom.typography.body1.fontSize,
  lineHeight: theme.custom.typography.body1.lineHeight,
  color: theme.custom.colors.text.high,
  minHeight: '48px',
  gap: theme.custom.spacing.sm,

  '&:hover': {
    backgroundColor: theme.custom.colors.primary._050,
  },

  '&.Mui-selected': {
    backgroundColor: theme.custom.colors.primary._100,
    color: theme.custom.colors.primary._700,
    fontWeight: 500,

    '&:hover': {
      backgroundColor: theme.custom.colors.primary._100,
    },
  },

  '&.Mui-disabled': {
    color: theme.custom.colors.text.disabled,
    opacity: 0.38,
  },
}));

export const StyledIconContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  color: 'inherit',

  '& svg': {
    width: '20px',
    height: '20px',
  },
});

export const StyledTextContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
});

export const StyledSupportingText = styled(Box)(({ theme }) => ({
  fontSize: theme.custom.typography.caption.fontSize,
  lineHeight: theme.custom.typography.caption.lineHeight,
  color: theme.custom.colors.text.medium,
  marginTop: '2px',
}));

export const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: `${theme.custom.spacing.xs} 0`,
  borderColor: theme.custom.colors.primary.outline,
}));
