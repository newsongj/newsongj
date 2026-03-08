import { atom } from 'recoil';
import { RoleListRow, RoleSelectedMenusResponse, RoleMenuResponse } from '@/models/role.types';
import { PageMeta } from '@/models/common.types';

// 권한 목록 상태
export const rolesState = atom({
  key: 'rolesState',
  default: {
    roles: [] as RoleListRow[],
    loading: false,
    pagination: {
      current_page: 1,
      page_size: 10,
      total_items: 0,
    } as PageMeta,
  }
});

// 권한 상세 데이터 상태
export const roleDetailState = atom({
  key: 'roleDetailState',
  default: {
    roleDetail: null as RoleSelectedMenusResponse | null,
    loading: false,
  }
});

// 권한 메뉴 목록 상태 (추가)
export const roleMenusState = atom({
  key: 'roleMenusState',
  default: {
    menus: [] as RoleMenuResponse[],
    loading: false,
  }
});

// 권한 생성 모달 상태
export const roleCreateModalState = atom({
  key: 'roleCreateModalState',
  default: {
    open: false,
  }
});

// 권한 상세 모달 상태
export const roleDetailModalState = atom({
  key: 'roleDetailModalState',
  default: {
    open: false,
    roleData: null as RoleListRow | null,
  }
});

// 권한 삭제 다이얼로그 상태
export const roleDeleteDialogState = atom({
  key: 'roleDeleteDialogState',
  default: {
    open: false,
    target: 'single' as 'single' | 'multiple',
    roleId: undefined as number | undefined,
  }
});

// 테이블 상태 (검색, 페이지네이션)
export const roleTableState = atom({
  key: 'roleTableState',
  default: {
    searchKeyword: '',
    searchField: 'name',
    page: 1,
    rowsPerPage: 10,
    hasSearch: false,
  }
});

// 선택된 권한 IDs
export const selectedRoleIdsState = atom({
  key: 'selectedRoleIdsState',
  default: [] as string[],
});

// 메뉴 상태
export const roleMenuState = atom({
  key: 'roleMenuState',
  default: {
    anchorEl: null as HTMLElement | null,
    targetId: null as number | null,
  }
});

// 스낵바 상태
export const roleSnackbarState = atom({
  key: 'roleSnackbarState',
  default: {
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  }
});
