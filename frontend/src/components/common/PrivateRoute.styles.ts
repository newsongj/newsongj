import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const StyledLoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: theme.custom.colors.neutral._99,
}));
