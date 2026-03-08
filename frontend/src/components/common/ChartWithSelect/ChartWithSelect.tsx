import React from 'react';
import { Select } from '@/components/common/Select';
import { ChartWithSelectProps } from './ChartWithSelect.types';
import * as S from './ChartWithSelect.styles';

const ChartWithSelect: React.FC<ChartWithSelectProps> = ({
  title,
  description,
  children,
  selectValue,
  selectOptions,
  onSelectChange,
}) => {
  return (
    <S.ChartCard>
      <S.ChartHeader>
        <S.ChartTitleSection>
          <S.ChartTitle>{title}</S.ChartTitle>
        </S.ChartTitleSection>
        <S.SelectWrapper>
          <Select
            value={selectValue}
            options={selectOptions}
            onChange={(value) => onSelectChange(value as string)}
            size="small"
            variant="outlined"
          />
        </S.SelectWrapper>
      </S.ChartHeader>
      {description && <S.ChartDesc>{description}</S.ChartDesc>}
      {children}
    </S.ChartCard>
  );
};

export default ChartWithSelect;
