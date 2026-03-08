import React, { useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Avatar } from '@components/common/Avatar';
import { Menu } from '@components/common/Menu';
import { useAuth } from '@/hooks/auth';
import { authState } from '@/recoil/auth/atoms';
import { HeaderProps } from './Header.types';
import * as S from './Header.styles';
import { MenuItemData } from '@components/common/Menu/Menu.types';
import { Logout } from '@mui/icons-material';

const Header: React.FC<HeaderProps> = ({
  title = 'Admin Page',
  userName,
  userImage
}) => {
  const auth = useRecoilValue(authState);
  const { logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // 로그인된 사용자 정보 우선 사용
  const displayName = auth.user?.name || userName || 'Admin';

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const menuItems: MenuItemData[] = [
    {
      id: 'logout',
      label: '로그아웃',
      leadingElement: <Logout fontSize="small" />,
      onClick: handleLogout,
    },
  ];
  return (
    <S.StyledAppBar>
      <S.StyledToolbar>
        <S.LeftPanel>
          <S.Logo />
          <S.Title>{title}</S.Title>
        </S.LeftPanel>

        <S.RightPanel>
          <S.AvatarButton onClick={handleClick}>
            <Avatar
              src={userImage}
              name={displayName}
              size={40}
            />
          </S.AvatarButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            items={menuItems}
          >
          </Menu>
        </S.RightPanel>
      </S.StyledToolbar>
    </S.StyledAppBar>
  );
};

export default Header;
