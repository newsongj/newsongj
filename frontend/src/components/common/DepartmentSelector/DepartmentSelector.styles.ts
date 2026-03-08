import { styled } from '@mui/material/styles';
import { Box, Typography, Collapse, IconButton } from '@mui/material';

export const StyledContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  padding: theme.custom.spacing.xs,
  borderRadius: theme.custom.borderRadius,
  minHeight: '240px',
  maxHeight: '240px',
  overflow: 'auto',
}));

export const StyledDepartmentLevel = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  paddingTop: `${theme.custom.spacing.xs}px`,
  paddingBottom: `${theme.custom.spacing.xs}px`,
  borderRadius: theme.custom.borderRadius,
  '&[data-hoverable="true"]:hover': {
    backgroundColor: theme.custom.opacity._08,
  },
}));

export const StyledNestedLevel = styled(Box)(({ theme }) => ({
  marginLeft: theme.custom.spacing.md,
}));

export const StyledChipsArea = styled(Box)(({ theme }) => ({
  minHeight: '80px',
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  padding: theme.custom.spacing.xs,
  borderRadius: theme.custom.borderRadius,
}));

export const StyledTypography = styled(Typography)(({ theme }) => ({
  color: theme.custom.colors.text.high,
}));

export const StyledCollapse = styled(Collapse)();

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.custom.colors.text.medium,
  '&:hover': {
    backgroundColor: theme.custom.opacity._12,
  },
}));

export const StyledIconContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
});

export const StyledNestedBox = styled(Box)();
