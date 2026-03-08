import React from 'react';
import { CircularProgressIndicatorProps } from './CircularProgressIndicator.types';
import * as S from './CircularProgressIndicator.styles';

const CircularProgressIndicator: React.FC<CircularProgressIndicatorProps> = ({ 
  size = 48 
}) => {
  const radius = (size - 8) / 2; // strokeWidth 4 * 2 = 8
  const circumference = 2 * Math.PI * radius;

  return (
    <S.StyledCircularProgress $size={size}>
      <S.StyledSvg $size={size} viewBox={`0 0 ${size} ${size}`}>
        <S.StyledCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          $circumference={circumference}
        />
      </S.StyledSvg>
    </S.StyledCircularProgress>
  );
};

export default CircularProgressIndicator;
