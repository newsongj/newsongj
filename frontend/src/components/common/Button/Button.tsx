import React from 'react';
import { ButtonProps } from './Button.types';
import * as S from './Button.styles';

const Button: React.FC<ButtonProps> = ({
  variant = 'elevated',
  size = 'medium',
  showIcon = false,
  icon,
  children,
  ...props
}) => {
  return (
    <S.StyledButton
      $variant={variant}
      $size={size}
      $showIcon={showIcon}
      startIcon={showIcon ? icon : undefined}
      {...props}
    >
      {children}
    </S.StyledButton>
  );
};

export default Button;
