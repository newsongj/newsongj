import React from 'react';
import { Search as SearchIcon } from '@mui/icons-material';
import { TextField as MuiTextField, InputAdornment } from '@mui/material';
import { MenuItem } from '@components/common/MenuItem';
import { SearchableSelectProps, SearchableSelectOption } from './SearchableSelect.types';
import * as S from './SearchableSelect.styles';

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = '검색하여 선택...',
  error = false,
  helperText,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  required = false,
  noOptionsText = '검색 결과가 없습니다',
  multiple = false,
}) => {
  const selectedOption = multiple 
    ? options.filter(option => (value as string[])?.includes(option.value))
    : options.find(option => option.value === value) || null;

  // 검색 필터링 함수
  const filterOptions = (options: unknown[], { inputValue }: { inputValue: string }) => {
    const typedOptions = options as SearchableSelectOption[];
    if (!inputValue) return typedOptions;

    const searchTerm = inputValue.toLowerCase();

    return typedOptions.filter(option => {
      // 라벨에서 검색
      if (option.label.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // 키워드에서 검색
      if (option.keywords) {
        return option.keywords.some(keyword =>
          keyword.toLowerCase().includes(searchTerm)
        );
      }

      return false;
    });
  };

  return (
    <S.StyledAutocomplete
      $size={size}
      multiple={multiple}
      options={options}
      value={selectedOption}
      onChange={(_, newValue) => {
        if (multiple) {
          const values = (newValue as SearchableSelectOption[])?.map(option => option.value) || [];
          onChange(values);
        } else {
          onChange((newValue as SearchableSelectOption)?.value || null);
        }
      }}
      getOptionLabel={(option) => (option as SearchableSelectOption).label}
      isOptionEqualToValue={(option, value) => (option as SearchableSelectOption).value === (value as SearchableSelectOption).value}
      filterOptions={filterOptions}
      disabled={disabled}
      fullWidth={fullWidth}
      noOptionsText={noOptionsText}
      PaperComponent={S.StyledPaper}
      renderInput={(params) => (
        <MuiTextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          required={required}
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      )}
      renderOption={(props, option, { selected }) => (
        <MenuItem
          {...props}
          key={(option as SearchableSelectOption).id}
          selected={selected}
        >
          {(option as SearchableSelectOption).label}
        </MenuItem>
      )}
    />
  );
};

export default SearchableSelect;
