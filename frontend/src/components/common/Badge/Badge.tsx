import React from 'react';
import { BadgeProps } from './Badge.types';
import * as S from './Badge.styles';

export const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  size = 'medium',
  style,
  onClick,
}) => {
  return (
    <S.StyledBadge $variant={variant} $size={size} $clickable={!!onClick} style={style} onClick={onClick}>
      {children}
    </S.StyledBadge>
  );
};
