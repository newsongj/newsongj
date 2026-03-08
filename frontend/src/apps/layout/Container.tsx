import React, { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  PeopleOutlined,
  DescriptionOutlined
} from '@mui/icons-material';
import { useRecoilValue } from 'recoil';
import { orchestratorSidebarCollapsedState } from '@/recoil/atoms';
import { Header } from './Header';
import { Sidebar, MenuItem } from './Sidebar';
import { MainContent } from './MainContent';
import { Divider } from '@components/common/Divider';
import { styled } from '@mui/material/styles';

const VerticalDividerContainer = styled('div')<{ $collapsed?: boolean }>(({ $collapsed }) => ({
  position: 'fixed',
  left: $collapsed ? '56px' : '256px',
  top: '66px',
  height: 'calc(100vh - 66px)',
  zIndex: 1200,
  transition: 'left 0.3s ease',
}));

interface ContainerProps {
  children: ReactNode;
}

const getPageInfo = (path: string) => {
  const menuMap: Record<string, { title: string; breadcrumb: string }> = {
    '/dashboard': { title: '대시보드', breadcrumb: '대시보드' },
    '/userlist': { title: '사용자 목록', breadcrumb: '교적관리 > 사용자 목록' },
    '/deleteduser': { title: '삭제 명단', breadcrumb: '교적관리 > 삭제 명단' },
    '/permission/management': { title: '권한 관리', breadcrumb: '권한관리 > 권한 관리' },
    '/permission/users': { title: '사용자 관리', breadcrumb: '권한관리 > 사용자 관리' },
  };
  return menuMap[path] || { title: '대시보드', breadcrumb: '대시보드' };
};

export const Container: React.FC<ContainerProps> = ({ children }) => {
  const isCollapsed = useRecoilValue(orchestratorSidebarCollapsedState);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: <DashboardOutlined />,
      path: '/dashboard',
    },
    {
      id: 'permission',
      label: '권한관리',
      icon: <PeopleOutlined />,
      subItems: [
        { id: 'user-management', label: '사용자 관리', path: '/permission/users' },
        { id: 'permission-management', label: '권한 관리', path: '/permission/management' },
      ],
    },
    {
      id: 'student-management',
      label: '교적관리',
      icon: <DescriptionOutlined />,
      subItems: [
        { id: 'student-userlist', label: '사용자 목록', path: '/userlist' },
        { id: 'student-deleteduser', label: '삭제 명단', path: '/deleteduser' },
      ],
    }
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const pageInfo = getPageInfo(location.pathname);

  return (
    <>
      <Header />
      <Sidebar menuItems={menuItems} selectedPath={location.pathname} onMenuClick={handleMenuClick} />
      <VerticalDividerContainer $collapsed={isCollapsed}>
        <Divider orientation="vertical" />
      </VerticalDividerContainer>
      <MainContent title={pageInfo.title} breadcrumb={pageInfo.breadcrumb}>
        {children}
      </MainContent>
    </>
  );
};
