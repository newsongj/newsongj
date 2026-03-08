import { ReactNode } from 'react';
import { ButtonVariant } from '@components/common/Button/Button.types';

export interface SearchOption {
  value: string;
  label: string;
}

export interface ActionButton {
  label: string;
  variant?: ButtonVariant;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  disabled?: boolean;
  tooltip?: string;
}

export interface SearchToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: (value: string, attribute?: string) => void;
  searchPlaceholder?: string;
  attributeValue?: string;
  onAttributeChange?: (value: string) => void;
  attributeOptions?: SearchOption[];
  onFilter?: () => void;
  actions?: ActionButton[];
  // Selection state props
  selectedCount?: number;
  onDeleteSelected?: () => void;
  showActionsWhenSelected?: boolean;
}
