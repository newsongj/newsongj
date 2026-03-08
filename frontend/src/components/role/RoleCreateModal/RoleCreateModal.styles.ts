import { styled } from '@mui/material/styles';
import { Typography, Box } from '@mui/material';

export const StyledContent = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  width: '100%',
});

export const StyledLeftColumn = styled(Box)(({ theme }) => ({
  flex: '1 1 50%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg,
  borderRight: `1px solid ${theme.custom.colors.primary.outline}`,
  minWidth: '300px',
  maxWidth: '300px',
}));

export const StyledRightColumn = styled(Box)(({ theme }) => ({
  flex: '1 1 50%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: theme.custom.spacing.lg,
  padding: theme.custom.spacing.lg,
  minWidth: 0,
  minHeight: '550px',
}));


export const StyledFormSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.md,
}));

export const StyledSectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom.typography.subtitle.fontSize,
  fontWeight: theme.custom.typography.subtitle.fontWeight,
  color: theme.custom.colors.text.high,
}));

export const StyledSectionSubTitle = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: theme.custom.typography.body2.fontWeight,
  lineHeight: theme.custom.typography.body2.lineHeight,
  color: theme.custom.colors.text.medium,
}))

export const StyledTableContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  overflow: 'hidden',
  maxHeight: '360px',

  '& .MuiTableContainer-root': {
    maxHeight: '360px',
  },
}));