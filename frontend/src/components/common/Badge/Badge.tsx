import React from 'react';
import { BadgeProps } from './Badge.types';
import * as S from './Badge.styles';

export const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  size = 'medium',
}) => {
  return (
    <S.StyledBadge $variant={variant} $size={size}>
      {children}
    </S.StyledBadge>
  );
};
