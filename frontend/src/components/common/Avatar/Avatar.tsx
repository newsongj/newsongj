import React from 'react';
import { AvatarProps } from './Avatar.types';
import * as S from './Avatar.styles';

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  name = 'A', 
  size = 40 
}) => {
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <S.StyledAvatar 
      src={src} 
      alt={alt}
      $size={size}
    >
      {!src && getInitial(name)}
    </S.StyledAvatar>
  );
};

export default Avatar;
