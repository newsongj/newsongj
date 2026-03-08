import { styled } from '@mui/material/styles';
import Divider from '@mui/material/Divider';

export const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.custom?.colors?.primary.outline || 'rgba(93, 96, 100, 0.12)',
  margin: 0,

  '&.MuiDivider-withChildren': {
    '&::before, &::after': {
      borderColor: theme.custom?.colors?.primary.outline || 'rgba(93, 96, 100, 0.12)',
    },
  },

  '& .MuiDivider-wrapper': {
    color: theme.custom?.colors?.text?.medium || 'rgba(93, 96, 100, 1)',
    fontSize: theme.custom?.typography?.caption?.fontSize || '12px',
    fontWeight: theme.custom?.typography?.caption?.fontWeight || 400,
    padding: `0 ${theme.custom?.spacing?.sm || '12px'}`,
  },
}));
