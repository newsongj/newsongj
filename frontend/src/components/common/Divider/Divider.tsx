import React from 'react';
import { DividerProps } from './Divider.types';
import * as S from './Divider.styles';

const Divider: React.FC<DividerProps> = ({ 
  variant = 'fullWidth', 
  orientation = 'horizontal', 
  children,
  ...props 
}) => {
  return (
    <S.StyledDivider 
      variant={variant} 
      orientation={orientation} 
      {...props}
    >
      {children}
    </S.StyledDivider>
  );
};

export default Divider;
