import { styled } from '@mui/material/styles';
import Menu from '@mui/material/Menu';
import { MenuDensity } from './Menu.types';

interface StyledMenuProps {
  $density: MenuDensity;
}

export const StyledMenu = styled(Menu, {
  shouldForwardProp: (prop) => prop !== '$density',
})<StyledMenuProps>(({ theme }) => ({
  '& .MuiPaper-root': {
    backgroundColor: theme.custom?.colors?.surface || '#FBFDFF',
    borderRadius: theme.custom?.borderRadius || '4px',
    boxShadow: theme.custom?.shadows?.dp02 || '0px 1px 5px 0px rgba(0, 0, 0, 0.2), 0px 3px 1px 0px rgba(0, 0, 0, 0.12), 0px 2px 2px 0px rgba(0, 0, 0, 0.14)',
  },
}));


export const SupportingText = styled('div')(({ theme }) => ({
  fontSize: theme.custom?.typography?.body2?.fontSize || '14px',
  lineHeight: theme.custom?.typography?.body2?.lineHeight || '20px',
  color: theme.custom?.colors?.text?.medium || '#5D6064',
}));
