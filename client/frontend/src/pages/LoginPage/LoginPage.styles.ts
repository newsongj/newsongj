import { styled } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';

export const StyledContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: theme.custom.spacing.xxl,
  minHeight: '100vh',
  backgroundColor: theme.custom.colors.neutral._99,
  padding: theme.custom.spacing.lg,
  '@media (max-width: 480px)': {
    gap: theme.custom.spacing.lg,
    padding: theme.custom.spacing.md,
  },
}));

export const StyledLoginCard = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '400px',
  padding: theme.custom.spacing.xxl,
  backgroundColor: theme.custom.colors.neutral._100,
  borderRadius: theme.custom.borderRadius,
  boxShadow: theme.custom.shadows.dp04,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.xl,
  '@media (max-width: 480px)': {
    padding: theme.custom.spacing.lg,
  },
}));

export const StyledLogo = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom.typography.hero.fontSize,
  fontWeight: theme.custom.typography.hero.fontWeight,
  lineHeight: theme.custom.typography.hero.lineHeight,
  color: theme.custom.colors.primary._500,
  textAlign: 'center',
  marginBottom: theme.custom.spacing.lg,
  whiteSpace: 'nowrap',
  '@media (max-width: 480px)': {
    fontSize: '28px',
    lineHeight: '38px',
    whiteSpace: 'normal',
    wordBreak: 'keep-all',
  },
}));

export const StyledForm = styled('form')({
  display: 'flex',
  flexDirection: 'column',
});

export const StyledInputGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.xs,
}));

export const StyledButtonGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.md,
  marginTop: theme.custom.spacing.sm,
}));
