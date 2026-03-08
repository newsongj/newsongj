import { ChipProps as MuiChipProps } from '@mui/material';

export interface ChipProps extends Omit<MuiChipProps, 'size'> {
  label: string;
  onDelete?: () => void;
}
