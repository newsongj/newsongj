import { styled } from '@mui/material/styles';
import { Typography, Box, Switch, FormControlLabel, TextField } from '@mui/material';

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

export const StyledInfoSection = styled(Box)(({ theme }) => ({
  paddingTop: theme.custom.spacing.md,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.md,
}));

export const StyledFormSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.lg,
}));

export const StyledSectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom.typography.subtitle.fontSize,
  fontWeight: theme.custom.typography.subtitle.fontWeight,
  color: theme.custom.colors.text.high,
}));

export const StyledInfoRow = styled(Box)(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: theme.custom.typography.body2.fontWeight,
  color: theme.custom.colors.text.medium,
  minWidth: '80px',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  height: '100%',
}));

export const StyledLabel = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: theme.custom.typography.body2.fontWeight,
  color: theme.custom.colors.text.medium,
  minWidth: '80px',
}));

export const StyledValue = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom.typography.body1.fontSize,
  color: theme.custom.colors.text.high,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.sm,
}));

export const StyledSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: theme.custom.colors.primary._500,
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: theme.custom.colors.primary._500,
  },
}));

export const StyledTableContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  overflow: 'hidden',
  maxHeight: '360px',

  '& .MuiTableContainer-root': {
    maxHeight: '360px',
  },
}));

export const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  margin: 0,
  '& .MuiFormControlLabel-label': {
    fontSize: theme.custom.typography.body1.fontSize,
    color: theme.custom.colors.text.high,
  },
}));

export const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    fontSize: theme.custom.typography.body1.fontSize,
  },
}));
