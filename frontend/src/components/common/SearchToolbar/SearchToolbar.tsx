import React from 'react';
import { FilterAlt as FilterIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { SearchField } from '@components/common/SearchField';
import { Button } from '@components/common/Button';
import TooltipHover from '@components/common/TooltipHover';
import { SearchToolbarProps } from './SearchToolbar.types';
import { ActionButton } from './SearchToolbar.types';
import * as S from './SearchToolbar.styles';

export const SearchToolbar: React.FC<SearchToolbarProps> = ({
  searchValue = '',
  onSearchChange,
  onSearch,
  searchPlaceholder = 'Name, email, etc...',
  attributeValue = '',
  onAttributeChange,
  attributeOptions = [],
  onFilter,
  actions = [],
  selectedCount = 0,
  onDeleteSelected,
  showActionsWhenSelected = false,
}) => {
  const renderActionButton = (action: ActionButton, index: number) => {
    const button = (
      <Button
        key={index}
        variant={action?.variant || 'outlined'}
        onClick={action?.onClick}
        startIcon={action?.startIcon}
        endIcon={action?.endIcon}
        disabled={action?.disabled}
      >
        {action?.label}
      </Button>
    );

    if (action?.tooltip && action?.disabled) {
      return (
        <TooltipHover key={index} content={action.tooltip} placement="top">
          {button}
        </TooltipHover>
      );
    }

    return button;
  };

  if (selectedCount > 0) {
    return (
      <S.StyledContainer>
        <S.StyledQueriesSection>
          <S.StyledTypography variant="body1">
            {selectedCount}개 항목 선택됨
          </S.StyledTypography>
        </S.StyledQueriesSection>

        <S.StyledActionsSection>
          {showActionsWhenSelected && actions.map((action, index) => renderActionButton(action, index))}
          {!showActionsWhenSelected && onDeleteSelected && (
            <Button variant="destructive" onClick={onDeleteSelected} startIcon={<DeleteIcon />}>
              삭제
            </Button>
          )}
        </S.StyledActionsSection>
      </S.StyledContainer>
    );
  }

  return (
    <S.StyledContainer>
      <S.StyledQueriesSection>
        {onFilter && (
          <S.StyledIconButton onClick={onFilter} size="medium">
            <FilterIcon />
          </S.StyledIconButton>
        )}
        <SearchField
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onSearch={onSearch}
          searchPlaceholder={searchPlaceholder}
          attributeValue={attributeValue}
          onAttributeChange={onAttributeChange}
          attributeOptions={attributeOptions}
          width="600px"
        />
      </S.StyledQueriesSection>

      <S.StyledActionsSection>
        {actions.map((action, index) => renderActionButton(action, index))}
      </S.StyledActionsSection>
    </S.StyledContainer>
  );
};
