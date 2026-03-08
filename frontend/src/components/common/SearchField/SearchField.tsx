import React from 'react';
import { Search as SearchIcon } from '@mui/icons-material';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { SearchFieldProps } from './SearchField.types';
import * as S from './SearchField.styles';

export const SearchField: React.FC<SearchFieldProps> = ({
  searchValue = '',
  onSearchChange,
  onSearch,
  searchPlaceholder = 'Name, email, etc...',
  attributeValue = '',
  onAttributeChange,
  attributeOptions = [],
  width = '440px',
  showSearchButton = true,
  searchButtonText = '검색',
  size = 'medium'
}) => {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onSearchChange?.(event.target.value);
  };

  const handleAttributeChange = (value: string | number | (string | number)[]) => {
    onAttributeChange?.(value as string);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onSearch?.(searchValue, attributeValue);
    }
  };

  const handleSearchClick = () => {
    onSearch?.(searchValue, attributeValue);
  };

  return (
    <S.StyledContainer style={{ width }}>
      {attributeOptions.length > 0 && (
        <S.StyledSelectContainer>
          <Select
            options={attributeOptions}
            value={attributeValue}
            onChange={handleAttributeChange}
            size={size}
          />
        </S.StyledSelectContainer>
      )}

      <S.StyledTextFieldContainer>
        <TextField
          variant="outlined"
          size={size}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          fullWidth={true}
        />
      </S.StyledTextFieldContainer>

      {showSearchButton && (
        <S.StyledSearchButtonContainer>
          <Button
            variant="outlined"
            size="small"
            onClick={handleSearchClick}
            startIcon={<SearchIcon />}
          >
            {searchButtonText}
          </Button>
        </S.StyledSearchButtonContainer>
      )}
    </S.StyledContainer>
  );
};
