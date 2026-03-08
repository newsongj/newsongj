import React from 'react';
import { CircularProgressIndicator } from '@components/common/CircularProgressIndicator';
import { LoadingFallbackProps } from './LoadingFallback.types';
import * as S from './LoadingFallback.styles';

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  height = 200,
  size = 48 
}) => {
  return (
    <S.StyledLoadingContainer $height={height}>
      <CircularProgressIndicator size={size} />
    </S.StyledLoadingContainer>
  );
};

export default LoadingFallback;
