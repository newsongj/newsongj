import { ReactNode } from 'react';

export interface StatCardProps {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: ReactNode;
  iconBgColor: string;
  changeTooltip?: string;
}
