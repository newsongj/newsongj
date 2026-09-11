import React, { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PeopleOutlined,
  ContactsOutlined,
  DirectionsRunOutlined,
  DescriptionOutlined,
} from '@mui/icons-material';
import { useRecoilState, useRecoilValue } from 'recoil';
import { orchestratorSidebarCollapsedState } from '@/recoil/atoms';
import { userPermissionsState } from '@/recoil/auth/atoms';
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
  '@media (max-width: 900px)': {
    display: 'none',
  },
}));

interface ContainerProps {
  children: ReactNode;
}

const getPageInfo = (path: string) => {
  const menuMap: Record<string, { title: string; breadcrumb: string }> = {
    '/dashboard': { title: '대시보드', breadcrumb: '대시보드' },
    '/members': { title: '교적 명단', breadcrumb: '교적관리 > 교적 명단' },
    '/deleted-members': { title: '삭제 명단', breadcrumb: '교적관리 > 삭제 명단' },
    '/permission/accounts': { title: '계정 관리', breadcrumb: '권한관리 > 계정 관리' },
    '/permission/policies': { title: '정책 관리', breadcrumb: '권한관리 > 정책 관리' },
    '/attendance': { title: '출석 관리', breadcrumb: '교적관리 > 출석 관리' },
    '/attendance-dashboard': { title: '출석 대시보드', breadcrumb: '교적관리 > 출석 대시보드' },
    '/members/newcomer': { title: '미등반 새가족 명단', breadcrumb: '교적관리 > 미등반 새가족 명단' },
    '/retreat/dashboard': { title: '수련회 대시보드', breadcrumb: '수련회 > 수련회 대시보드' },
    '/retreat/research': { title: '인원조사 명단', breadcrumb: '수련회 > 인원조사 명단' },
    '/retreat/vehicle':  { title: '차량조사 명단', breadcrumb: '수련회 > 차량조사 명단' },
    '/retreat/create': { title: '수련회 생성', breadcrumb: '수련회 > 수련회 생성' },
    '/retreat/edit': { title: '수련회 설정 수정', breadcrumb: '수련회 > 수련회 설정 수정' },
    '/retreat/suspended-meal': { title: '서스펜디드밀 명단', breadcrumb: '수련회 > 서스펜디드밀 명단' },
    '/retreat/patient-room':   { title: '환자방 명단',       breadcrumb: '수련회 > 환자방 명단' },
    '/opinion/dashboard': { title: '소견서 현황 대시보드', breadcrumb: '소견서 > 소견서 현황 대시보드' },
    '/opinion/settings':  { title: '소견서 설정',          breadcrumb: '소견서 > 소견서 설정' },
    '/opinion/team-assignment': { title: '팀배치 작업', breadcrumb: '소견서 > 팀배치 작업' },
  };
  return menuMap[path] || { title: '대시보드', breadcrumb: '대시보드' };
};

export const buildMenuItems = (permissions: string[]): MenuItem[] => {
  const has = (key: string) => permissions.includes(key);
  return [
    {
      id: 'permission',
      label: '권한관리',
      icon: <PeopleOutlined />,
      subItems: [
        ...(has('admin.authority.accounts') ? [{ id: 'permission-accounts', label: '계정 관리', path: '/permission/accounts' }] : []),
        ...(has('admin.authority.policies') ? [{ id: 'permission-policies', label: '정책 관리', path: '/permission/policies' }] : []),
      ],
    },
    {
      id: 'student-management',
      label: '교적관리',
      icon: <ContactsOutlined />,
      subItems: [
        ...(has('admin.gyojeok.attendance_dashboard') ? [{ id: 'student-attendance-dashboard', label: '출석 대시보드', path: '/attendance-dashboard' }] : []),
        ...(has('admin.gyojeok.attendance') ? [{ id: 'student-attendance', label: '출석 관리', path: '/attendance' }] : []),
        ...(has('admin.gyojeok.members') ? [{ id: 'student-members', label: '교적 명단', path: '/members' }] : []),
        ...(has('admin.gyojeok.newcomers') ? [{ id: 'student-new-family-members', label: '미등반 새가족 명단', path: '/members/newcomer' }] : []),
        ...(has('admin.gyojeok.deleted_members') ? [{ id: 'student-deleted-members', label: '삭제 명단', path: '/deleted-members' }] : []),
      ],
    },
    {
      id: 'retreat',
      label: '수련회',
      icon: <DirectionsRunOutlined />,
      subItems: [
        ...(has('admin.retreat.create') ? [{ id: 'retreat-create', label: '수련회 생성', path: '/retreat/create' }] : []),
        ...(has('admin.retreat.edit') ? [{ id: 'retreat-edit', label: '수련회 설정 수정', path: '/retreat/edit' }] : []),
        ...(has('admin.retreat.dashboard') ? [{ id: 'retreat-dashboard', label: '수련회 대시보드', path: '/retreat/dashboard' }] : []),
        ...(has('admin.retreat.research_list') ? [{ id: 'retreat-research', label: '인원조사 명단', path: '/retreat/research' }] : []),
        ...(has('admin.retreat.vehicle_list') ? [{ id: 'retreat-vehicle', label: '차량조사 명단', path: '/retreat/vehicle' }] : []),
        ...(has('admin.retreat.suspended_meal') ? [{ id: 'retreat-suspended-meal', label: '서스펜디드밀 명단', path: '/retreat/suspended-meal' }] : []),
        ...(has('admin.retreat.patient_room')   ? [{ id: 'retreat-patient-room',   label: '환자방 명단',       path: '/retreat/patient-room' }]   : []),
      ],
    },
    {
      id: 'opinion',
      label: '소견서',
      icon: <DescriptionOutlined />,
      subItems: [
        ...(has('admin.opinion.settings')  ? [{ id: 'opinion-settings',  label: '소견서 설정',          path: '/opinion/settings' }]  : []),
        ...(has('admin.opinion.dashboard') ? [{ id: 'opinion-dashboard', label: '소견서 현황 대시보드', path: '/opinion/dashboard' }] : []),
        ...(has('admin.opinion.team_assignment') ? [{ id: 'opinion-team-assignment', label: '팀배치 작업', path: '/opinion/team-assignment' }] : []),
      ],
    },
  ];
};

export const Container: React.FC<ContainerProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useRecoilState(orchestratorSidebarCollapsedState);
  const permissions = useRecoilValue(userPermissionsState);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');

    const syncSidebarMode = (event?: MediaQueryListEvent) => {
      setIsCollapsed(event ? event.matches : mediaQuery.matches);
    };

    syncSidebarMode();
    mediaQuery.addEventListener('change', syncSidebarMode);

    return () => mediaQuery.removeEventListener('change', syncSidebarMode);
  }, [setIsCollapsed]);

  const allMenuItems = buildMenuItems(permissions);
  const menuItems = allMenuItems.filter(item => !item.subItems || item.subItems.length > 0);

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (window.innerWidth <= 900) {
      setIsCollapsed(true);
    }
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
