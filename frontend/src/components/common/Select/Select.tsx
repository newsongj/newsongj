import React from 'react';
import { SelectChangeEvent } from '@mui/material/Select';
import { SelectProps } from './Select.types';
import { MenuItem } from '@components/common/MenuItem';
import * as S from './Select.styles';

export const Select: React.FC<SelectProps> = ({
  size = 'medium',
  variant = 'outlined',
  helperText,
  error = false,
  fullWidth = false,
  width,
  options,
  clearable = false,
  placeholder,
  onChange,
  ...muiSelectProps
}) => {
  const handleChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value;
    onChange?.(value as string | number | (string | number)[]);
  };

  return (
    <S.StyledFormControl
      $fullWidth={fullWidth}
      $width={width}
      variant={variant}
      error={error}
      disabled={muiSelectProps.disabled}
    >

      <S.StyledSelect
        $size={size}
        $variant={variant}
        $error={error}
        $fullWidth={fullWidth}
        $width={width}
        displayEmpty
        onChange={handleChange}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 200,
            },
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        }}
        {...muiSelectProps}
      >
        {placeholder && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}

        {clearable && (
          <MenuItem value="">
            선택 해제
          </MenuItem>
        )}

        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            icon={option.icon as React.ReactNode}
          >
            {option.label}
          </MenuItem>
        ))}
      </S.StyledSelect>

      {helperText && (
        <S.StyledFormHelperText error={error}>
          {helperText}
        </S.StyledFormHelperText>
      )}
    </S.StyledFormControl>
  );
};
