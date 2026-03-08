import { styled } from '@mui/material/styles';
import { Chip } from '@mui/material';

export const StyledChip = styled(Chip)(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: theme.custom.typography.body2.fontWeight,
  height: '24px',
  backgroundColor: theme.custom.colors.primary._050,
  color: theme.custom.colors.text.medium,
  padding: '16px 8px',
  border: '1px solid ' + theme.custom.colors.primary._200,

  // Delete 아이콘 스타일링
  '& .MuiChip-deleteIcon': {
    color: theme.custom.colors.on.inactive,
    fontSize: '16px',
    margin: '0 4px 0 0',

    '&:hover': {
      color: theme.custom.colors.primary._500,
    },
  },
}));

export const ChipContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.custom.spacing.xs,
}));
