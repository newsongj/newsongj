import React, { useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Divider } from '@mui/material';
import { Avatar } from '@components/common/Avatar';
import { Menu } from '@components/common/Menu';
import { useAuth } from '@/hooks/auth';
import { authState } from '@/recoil/auth/atoms';
import { orchestratorSidebarCollapsedState } from '@/recoil/atoms';
import { HeaderProps } from './Header.types';
import * as S from './Header.styles';
import { MenuItemData } from '@components/common/Menu/Menu.types';
import { Logout, Menu as MenuIcon } from '@mui/icons-material';

const DATA_SCOPE_LABEL: Record<string, string> = {
  all:    '전체',
  team:   '팀',
  group:  '그룹',
  member: '멤버',
};

const Header: React.FC<HeaderProps> = ({
  title = '관리자 페이지',
  userName,
  userImage
}) => {
  const auth = useRecoilValue(authState);
  const [isCollapsed, setIsCollapsed] = useRecoilState(orchestratorSidebarCollapsedState);
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

  const handleSidebarToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const menuItems: MenuItemData[] = [
    {
      id: 'logout',
      label: '로그아웃',
      leadingElement: <Logout fontSize="small" />,
      onClick: handleLogout,
    },
  ];

  const profileHeader = (
    <div style={{ padding: '12px 16px 8px' }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 4 }}>
        {displayName}
      </div>
      {auth.user?.data_scope && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
          데이터 접근 범위: <strong>{DATA_SCOPE_LABEL[auth.user.data_scope] ?? auth.user.data_scope}</strong>
        </div>
      )}
      {auth.user?.policy_name && (
        <div style={{ fontSize: 12, color: '#666' }}>
          정책: <strong>{auth.user.policy_name}</strong>
        </div>
      )}
      <Divider sx={{ mt: 1 }} />
    </div>
  );

  return (
    <S.StyledAppBar>
      <S.StyledToolbar>
        <S.LeftPanel>
          <S.MobileMenuButton onClick={handleSidebarToggle} aria-label="Open sidebar">
            <MenuIcon />
          </S.MobileMenuButton>
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
            header={profileHeader}
          />
        </S.RightPanel>
      </S.StyledToolbar>
    </S.StyledAppBar>
  );
};

export default Header;
