import React from 'react';
import { Check, Remove } from '@mui/icons-material';
import { CheckboxProps } from './Checkbox.types';
import * as S from './Checkbox.styles';

const Checkbox: React.FC<CheckboxProps> = ({ 
  label, 
  indeterminate = false,
  ...props 
}) => {
  const checkbox = (
    <S.StyledCheckbox
      indeterminate={indeterminate}
      icon={<S.UncheckedIcon />}
      checkedIcon={<Check />}
      indeterminateIcon={<Remove />}
      {...props}
    />
  );

  if (label) {
    return (
      <S.StyledFormControlLabel
        control={checkbox}
        label={label}
        disabled={props.disabled}
      />
    );
  }

  return checkbox;
};

export default Checkbox;
