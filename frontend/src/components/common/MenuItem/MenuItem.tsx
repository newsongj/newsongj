import React from 'react';
import { MenuItemProps } from './MenuItem.types';
import * as S from './MenuItem.styles';

export const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  supportingText,
  showDivider = false,
  children,
  ...muiMenuItemProps
}) => {
  return (
    <>
      <S.StyledMenuItem {...muiMenuItemProps}>
        {icon && (
          <S.StyledIconContainer>
            {icon}
          </S.StyledIconContainer>
        )}

        <S.StyledTextContainer>
          {children}
          {supportingText && (
            <S.StyledSupportingText>
              {supportingText}
            </S.StyledSupportingText>
          )}
        </S.StyledTextContainer>
      </S.StyledMenuItem>

      {showDivider && <S.StyledDivider />}
    </>
  );
};
