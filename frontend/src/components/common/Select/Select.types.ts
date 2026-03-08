import { ReactNode } from 'react';
import { SelectProps as MuiSelectProps } from '@mui/material/Select';

export type SelectSize = 'small' | 'medium' | 'large';
export type SelectVariant = 'outlined' | 'filled';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps extends Omit<MuiSelectProps, 'size' | 'variant' | 'onChange'> {
  size?: SelectSize;
  variant?: SelectVariant;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  fullWidth?: boolean;
  width?: string | number;
  options: SelectOption[];
  clearable?: boolean;
  onChange?: (value: string | number | (string | number)[]) => void;
}
