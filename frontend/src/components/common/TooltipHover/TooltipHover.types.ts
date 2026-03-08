import React from 'react';

export interface TooltipHoverProps {
  children: React.ReactNode;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}
