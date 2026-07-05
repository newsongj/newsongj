import React from 'react';
import { MenuProps } from './Menu.types';
import { MenuItem } from '../MenuItem';
import * as S from './Menu.styles';

const Menu: React.FC<MenuProps> = ({
  density = 0,
  items,
  header,
  ...props
}) => {
  return (
    <S.StyledMenu $density={density} {...props}>
      {header}
      {items.map((item) => (
        <MenuItem
          key={item.id}
          icon={item.leadingElement}
          supportingText={item.supportingText}
          showDivider={item.showDivider}
          disabled={item.disabled}
          selected={item.selected}
          onClick={item.onClick}
        >
          {item.label}
        </MenuItem>
      ))}
    </S.StyledMenu>
  );
};

export default Menu;
