import { ReactNode } from 'react';

export interface ChartWithSelectProps {
  title: string;
  description?: string;
  children: ReactNode;
  selectValue: string;
  selectOptions: Array<{ value: string; label: string }>;
  onSelectChange: (value: string) => void;
}
