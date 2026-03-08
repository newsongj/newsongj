import React from 'react';
import { ChartContainerProps } from './ChartContainer.types';
import * as S from './ChartContainer.styles';

const ChartContainer: React.FC<ChartContainerProps> = ({ title, description, children }) => {
  return (
    <S.ChartCard>
      <S.ChartTitle>{title}</S.ChartTitle>
      {description && <S.ChartDesc>{description}</S.ChartDesc>}
      {children}
    </S.ChartCard>
  );
};

export default ChartContainer;
