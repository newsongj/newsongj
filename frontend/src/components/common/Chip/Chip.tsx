import React from 'react';
import { ChipProps } from './Chip.types';
import * as S from './Chip.styles';

const Chip: React.FC<ChipProps> = ({ label, onDelete, ...props }) => {
  return (
    <S.StyledChip
      label={label}
      onDelete={onDelete}
      {...props}
    />
  );
};

export default Chip;
