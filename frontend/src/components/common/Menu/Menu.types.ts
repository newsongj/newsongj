import { MenuProps as MuiMenuProps } from '@mui/material/Menu';

export type MenuDensity = 0 | -2 | -4;

export interface MenuItemData {
  id: string;
  label: string;
  supportingText?: string;
  leadingElement?: React.ReactNode;
  trailingElement?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  showDivider?: boolean;
  onClick?: () => void;
}

export interface MenuProps extends Omit<MuiMenuProps, 'children'> {
  density?: MenuDensity;
  items: MenuItemData[];
}
