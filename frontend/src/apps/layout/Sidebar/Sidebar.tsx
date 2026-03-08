import React, { useState, useEffect, useRef } from 'react';
import { Menu as MenuIcon } from '@mui/icons-material';
import { IconButton, Collapse } from '@mui/material';
import { useRecoilState, useRecoilValue } from 'recoil';
import { orchestratorSidebarCollapsedState } from '@/recoil/atoms';
import { userPermissionsState } from '@/recoil/auth/atoms';
import { Divider } from '@components/common/Divider';
import { MENU_CODES, hasPermission } from '@/constants/permissions';
import { SidebarProps, SubMenuItem } from './Sidebar.types';
import * as S from './Sidebar.styles';

const Sidebar: React.FC<SidebarProps> = ({ menuItems, selectedPath, onMenuClick }) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useRecoilState(orchestratorSidebarCollapsedState);
  const userPermissions = useRecoilValue(userPermissionsState);
  const prevSelectedPathRef = useRef<string | undefined>();

  // 권한 기반 메뉴 필터링
  const filterMenuByPermissions = (items: any[]) => {
    return items.map(item => {
      // subItems가 있는 경우 하위 메뉴 필터링
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter((subItem: any) => {
          switch (subItem.id) {
            case 'user-management':
              return hasPermission(userPermissions, [MENU_CODES.USER_MANAGEMENT]);
            case 'permission-management':
              return hasPermission(userPermissions, [MENU_CODES.PERMISSION_MANAGEMENT]);
            case 'cost-settings':
              return hasPermission(userPermissions, [MENU_CODES.COST_SETTINGS_MANAGEMENT]);
            case 'cost-monitoring':
              return hasPermission(userPermissions, [MENU_CODES.COST_MONITORING_MANAGEMENT]);
            case 'student-userlist':
              return hasPermission(userPermissions, [MENU_CODES.USER_MANAGEMENT]);
            case 'student-deleteduser':
              return hasPermission(userPermissions, [MENU_CODES.USER_MANAGEMENT]);
            default:
              return false; // 정의되지 않은 subItem은 일단 표시
          }
        });

        // 필터링된 subItems가 있으면 메뉴 유지, 없으면 메뉴 숨김
        if (filteredSubItems.length > 0) {
          return { ...item, subItems: filteredSubItems };
        } else {
          return null; // 하위 메뉴가 모두 필터링되면 상위 메뉴도 숨김
        }
      }

      // subItems가 없는 단일 메뉴 처리
      switch (item.id) {
        case 'file':
          return hasPermission(userPermissions, [...MENU_CODES.FILE_MANAGEMENT]) ? item : null;
        case 'dashboard':
          return hasPermission(userPermissions, [MENU_CODES.DASHBOARD]) ? item : null;
        case 'term-dictionary':
          return hasPermission(userPermissions, [MENU_CODES.TERM_DICTIONARY]) ? item : null;
        default:
          return null;
      }
    }).filter(Boolean); // null 제거
  };

  const filteredMenuItems = filterMenuByPermissions(menuItems);

  // 현재 경로에 따라 서브 메뉴 자동 열기
  useEffect(() => {
    // selectedPath가 실제로 변경되었을 때만 실행
    if (selectedPath && selectedPath !== prevSelectedPathRef.current && !isCollapsed) {
      const parentMenu = filteredMenuItems.find(item =>
        item.subItems?.some((subItem: SubMenuItem) => subItem.path === selectedPath)
      );

      // 현재 경로가 메인메뉴 경로인지 확인
      const isMainMenuPath = filteredMenuItems.some(item => item.path === selectedPath);

      // 서브메뉴 경로이고, 메인메뉴 경로가 아닐 때만 부모 메뉴 열기
      if (parentMenu && !expandedMenus.includes(parentMenu.id) && !isMainMenuPath) {
        setExpandedMenus([parentMenu.id]);
      }
    }

    // 이전 selectedPath 업데이트
    prevSelectedPathRef.current = selectedPath;
  }, [selectedPath, filteredMenuItems, isCollapsed]);

  const handleMenuClick = (item: any, subItem?: any) => {
    const path = subItem?.path || item.path;

    // 1) 서브메뉴 클릭 시
    if (subItem) {
      if (path) {
        onMenuClick(path);
        setExpandedMenus([item.id]);
      }
      return;
    }

    // 2) 메인 메뉴 클릭 시 (subItems 있는 경우)
    if (item.subItems && item.subItems.length > 0) {
      if (isCollapsed) {
        // 사이드바가 접혀 있으면 → 펼치고 해당 메뉴 확장
        setIsCollapsed(false);
        setExpandedMenus([item.id]);
      } else {
        // 이미 펼쳐진 상태면 → 기존처럼 토글
        const isCurrentlyExpanded = expandedMenus.includes(item.id);
        setExpandedMenus(isCurrentlyExpanded ? [] : [item.id]);
      }
      return;
    }

    // 3) 메인 메뉴 클릭 시 (subItems 없는 경우 = leaf 메뉴)
    if (path) {
      setExpandedMenus([]); // 서브메뉴 열려 있던 거 닫기
      onMenuClick(path);
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setExpandedMenus([]);
    }
  };

  return (
    <S.StyledDrawer variant="permanent" $collapsed={isCollapsed}>
      <S.MenuToggleSection $collapsed={isCollapsed}>
        <IconButton onClick={handleToggleSidebar}>
          <MenuIcon />
        </IconButton>
      </S.MenuToggleSection>

      <Divider />

      <S.MenuList $collapsed={isCollapsed}>
        {filteredMenuItems.map((item) => (
          <S.MainMenuItem key={item.id}>
            <S.MenuItemContainer>
              {expandedMenus.includes(item.id) && <S.VerticalLine />}
              <div style={{ flex: 1 }}>
                <S.MainMenuButton
                  $selected={selectedPath === item.path}
                  $collapsed={isCollapsed}
                  onClick={() => handleMenuClick(item)}
                >
                  <S.StyledListItemIcon
                    $selected={selectedPath === item.path}
                  >
                    {item.icon}
                  </S.StyledListItemIcon>
                  {!isCollapsed && (
                    <S.StyledListItemText
                      primary={item.label}
                      $selected={selectedPath === item.path}
                    />
                  )}
                </S.MainMenuButton>

                {item.subItems && !isCollapsed && (
                  <Collapse in={expandedMenus.includes(item.id)} timeout="auto" unmountOnExit>
                    <S.SubMenuList>
                      {item.subItems.map((subItem: SubMenuItem) => (
                        <S.SubMenuItem key={subItem.id}>
                          <S.SubMenuButton
                            $selected={selectedPath === subItem.path}
                            onClick={() => handleMenuClick(item, subItem)}
                          >
                            <S.StyledArrowIcon $selected={selectedPath === subItem.path} />
                            <S.SubMenuText
                              primary={subItem.label}
                              $selected={selectedPath === subItem.path}
                            />
                          </S.SubMenuButton>
                        </S.SubMenuItem>
                      ))}
                    </S.SubMenuList>
                  </Collapse>
                )}
              </div>
            </S.MenuItemContainer>
          </S.MainMenuItem>
        ))}
      </S.MenuList>
    </S.StyledDrawer>
  );
};

export default Sidebar;
