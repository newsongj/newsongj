import { ReactNode } from 'react';
import { MenuItemProps as MuiMenuItemProps } from '@mui/material/MenuItem';

export interface MenuItemProps extends MuiMenuItemProps {
  icon?: ReactNode;
  supportingText?: string;
  showDivider?: boolean;
}
