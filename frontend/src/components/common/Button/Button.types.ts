import { ButtonProps as MuiButtonProps } from '@mui/material/Button';

export type ButtonVariant = 'filled' | 'outlined' | 'text' | 'elevated' | 'destructive';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  showIcon?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}
