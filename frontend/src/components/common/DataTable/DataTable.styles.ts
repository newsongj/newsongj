import { styled } from '@mui/material/styles';
import {
  TableContainer,
  TableCell,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableFooter,
  TablePagination,
  Typography,
  IconButton
} from '@mui/material';

export const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: theme.custom.borderRadius,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  backgroundColor: theme.custom.colors.white,
}));

export const StyledTable = styled(Table)(({ theme }) => ({
  borderTop: `1px solid ${theme.custom.colors.primary.outline}`,

  '& .MuiTableCell-stickyHeader': {
    backgroundColor: theme.custom.colors.neutral._99,
  },
}));

export const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.custom.colors.neutral._99,
}));

export const StyledTableBody = styled(TableBody)(({ theme }) => ({
  '& .MuiTableRow-root:hover': {
    backgroundColor: theme.custom.overlay.primary.hover,
  },
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&.Mui-selected': {
    backgroundColor: theme.custom.overlay.primary.pressed,
    '&:hover': {
      backgroundColor: theme.custom.overlay.primary.pressed,
    },
  },
}));

export const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.custom.colors.neutral._99,
  fontWeight: theme.custom.typography.body1.fontWeight,
  fontSize: theme.custom.typography.body1.fontSize,
  color: theme.custom.colors.text.medium,
  padding: theme.custom.spacing.xs,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: theme.custom.typography.body2.fontWeight,
  color: theme.custom.colors.text.high,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
  padding: theme.custom.spacing.xs,
}));

export const StyledTableHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.custom.spacing.md,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
  backgroundColor: theme.custom.colors.white,
}));


export const StyledSearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.sm,
}));

export const StyledSelectedActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.sm,
  padding: theme.custom.spacing.sm,
  backgroundColor: theme.custom.colors.neutral._99,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

export const StyledPagination = styled(TablePagination)(({ theme }) => ({
  '& .MuiTablePagination-toolbar': {
    padding: 0,
  },
  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    fontSize: theme.custom.typography.body2.fontSize,
    color: theme.custom.colors.text.medium,
  },
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.custom.colors.text.medium,
  '&:hover': {
    backgroundColor: theme.custom.colors.neutral._95,
  },
}));

export const StyledTypography = styled(Typography)(({ theme }) => ({
  color: theme.custom.colors.text.medium,
}));

export const StyledTableFooter = styled(TableFooter)({
  '& .MuiTableCell-root': {
    borderBottom: 'none',
  },
});

export const StyledFooterRow = styled(TableRow)(({ theme }) => ({
  '& .MuiTableCell-root': {
    borderBottom: 'none',
    padding: `${theme.custom.spacing.sm} ${theme.custom.spacing.md}`,
  },
}));

export const StyledBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.sm,
}));
