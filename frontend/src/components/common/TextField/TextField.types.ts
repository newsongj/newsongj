import { InputHTMLAttributes, ReactNode } from 'react';

export type TextFieldVariant = 'outlined' | 'filled';
export type TextFieldSize = 'small' | 'medium' | 'large';

export interface BorderConfig {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
}

export interface BorderRadiusConfig {
  topLeft?: boolean;
  topRight?: boolean;
  bottomLeft?: boolean;
  bottomRight?: boolean;
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange' | 'onFocus' | 'onBlur' | 'onKeyPress'> {
  variant?: TextFieldVariant;
  size?: TextFieldSize;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  width?: string | number;
  multiline?: boolean;
  rows?: number;
  value?: string;
  disableAnimation?: boolean;
  border?: BorderConfig;
  borderRadius?: BorderRadiusConfig;
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}
