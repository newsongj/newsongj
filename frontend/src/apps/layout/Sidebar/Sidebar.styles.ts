import { styled } from '@mui/material/styles';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { ArrowForwardIos } from '@mui/icons-material';

export const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== '$collapsed',
})<{ $collapsed?: boolean }>(({ $collapsed }) => {
  const drawerWidth = $collapsed ? 64 : 256; // 한 군데에서 계산

  return {
    width: drawerWidth,
    flexShrink: 0,
    transition: 'width 0.3s ease',
    '& .MuiDrawer-paper': {
      width: drawerWidth, // ✅ 56 → drawerWidth (64랑 통일)
      boxSizing: 'border-box',
      top: '66px',
      height: 'calc(100vh - 66px)',
      backgroundColor: '#FFFFFF',
      borderRight: 'none',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
    },
  };
});

export const MenuToggleSection = styled('div', {
  shouldForwardProp: (prop) => prop !== '$collapsed',
})<{ $collapsed?: boolean }>(({ $collapsed }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: $collapsed ? 'center' : 'flex-start',
  padding: $collapsed ? '12px 8px' : '16px',
  gap: '4px',
  height: '56px',
  boxSizing: 'border-box',
}));

export const MenuList = styled(List, {
  shouldForwardProp: (prop) => prop !== '$collapsed',
})<{ $collapsed?: boolean }>(({ $collapsed }) => ({
  padding: $collapsed ? '0' : '0 16px',
}));

export const MainMenuItem = styled(ListItem)({
  padding: 0,
  display: 'block',
});

export const MenuItemContainer = styled('div')({
  display: 'flex',
  alignItems: 'stretch',
});

export const MainMenuButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => !['$selected', '$collapsed'].includes(prop as string),
})<{ $selected?: boolean; $collapsed?: boolean }>(({ theme, $collapsed }) => ({
  padding: $collapsed ? '16px' : '12px 16px',
  borderRadius: theme.custom.borderRadius,
  margin: '0 0 0 0',
  backgroundColor: 'transparent',
  justifyContent: $collapsed ? 'center' : 'flex-start',
  minHeight: '48px',
  gap: theme.custom?.spacing?.sm || '12px',

  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
}));

export const SubMenuList = styled(List)({
  padding: '0 12px',
  width: '100%',
});

export const SubMenuItem = styled(ListItem)({
  padding: 0,
});

export const SubMenuButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== '$selected',
})<{ $selected?: boolean }>({
  padding: '6px 12px',
  borderRadius: '5px',
  gap: '12px',
  backgroundColor: 'transparent',

  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
});

export const VerticalLine = styled('div')(({ theme }) => ({
  width: '2px',
  backgroundColor: theme.custom?.colors?.primary?._500 || '#187EF4',
  alignSelf: 'stretch',
  marginRight: '0px',
}));

export const StyledListItemIcon = styled(ListItemIcon, {
  shouldForwardProp: (prop) => prop !== '$selected'
})<{ $selected?: boolean }>(({ theme, $selected }) => ({
  minWidth: 24,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',

  '& .MuiSvgIcon-root': {
    fontSize: '24px',
    color: $selected ? theme.custom?.colors?.primary?._500 : 'rgba(0, 0, 0, 0.87)',
  },
}));

export const StyledListItemText = styled(ListItemText, {
  shouldForwardProp: (prop) => prop !== '$selected',
})<{ $selected?: boolean }>(({ theme, $selected }) => ({
  '& .MuiListItemText-primary': {
    fontSize: theme.custom?.typography?.body1?.fontSize || '16px',
    fontWeight: $selected ? 700 : theme.custom?.typography?.body1?.fontWeight || 400,
    color: $selected ? theme.custom?.colors?.primary?._500 : 'rgba(0, 0, 0, 0.87)',
  },
}));

export const SubMenuText = styled(ListItemText, {
  shouldForwardProp: (prop) => prop !== '$selected',
})<{ $selected?: boolean }>(({ theme, $selected }) => ({
  '& .MuiListItemText-primary': {
    fontSize: theme.custom?.typography?.body2?.fontSize || '14px',
    fontWeight: $selected ? 700 : theme.custom?.typography?.body2?.fontWeight || 400,
    color: $selected ? theme.custom?.colors?.primary?._500 || '#187EF4' : 'rgba(0, 0, 0, 0.6)',
  },
}));

export const StyledArrowIcon = styled(ArrowForwardIos, {
  shouldForwardProp: (prop) => prop !== '$selected',
})<{ $selected?: boolean }>(({ theme, $selected }) => ({
  fontSize: '14px',
  color: $selected ? theme.custom?.colors?.primary?._500 || '#187EF4' : 'rgba(0, 0, 0, 0.6)',
}));
