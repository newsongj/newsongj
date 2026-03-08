import React from 'react';
import { ProgressIndicatorProps } from './ProgressIndicator.types';
import * as S from './ProgressIndicator.styles';

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  value, 
  width = 404 
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const stopPosition = width - 2;

  return (
    <S.StyledProgressContainer $width={width}>
      <S.StyledTrack />
      {clampedValue > 0 && (
        <S.StyledActiveIndicator $progress={clampedValue} $width={width}>
          <S.StyledProgressBar />
        </S.StyledActiveIndicator>
      )}
      <S.StyledStopIndicator $position={stopPosition} />
    </S.StyledProgressContainer>
  );
};

export default ProgressIndicator;
