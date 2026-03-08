import { CheckboxProps as MuiCheckboxProps } from '@mui/material/Checkbox';

export interface CheckboxProps extends Omit<MuiCheckboxProps, 'indeterminate'> {
  label?: string;
  indeterminate?: boolean;
}
