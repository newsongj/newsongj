import { atom } from 'recoil';
import { UserResponse, UserCreateRequest } from '@/models/user.types';
import { PageMeta } from '@/models/common.types';

// 사용자 명단 상태
export const usersState = atom({
  key: 'usersState',
  default: {
    users: [] as UserResponse[],
    loading: false,
    pagination: {
      current_page: 1,
      page_size: 10,
      total_items: 0,
    } as PageMeta,
  }
});

// 사용자 상세 데이터 상태
export const userDetailState = atom({
  key: 'userDetailState',
  default: {
    userDetail: null as UserResponse | null,
    loading: false,
  }
});

// 사용자 생성 모달 상태
export const userCreateModalState = atom({
  key: 'userCreateModalState',
  default: {
    open: false,
  }
});

// 사용자 상세 모달 상태
export const userDetailModalState = atom({
  key: 'userDetailModalState',
  default: {
    open: false,
    userData: null as UserResponse | null,
  }
});

// 사용자 삭제 다이얼로그 상태
export const userDeleteDialogState = atom({
  key: 'userDeleteDialogState',
  default: {
    open: false,
    target: 'single' as 'single' | 'multiple',
    userId: undefined as number | undefined,
  }
});

// 테이블 상태 (검색, 페이지네이션)
export const userTableState = atom({
  key: 'userTableState',
  default: {
    searchKeyword: '',
    searchField: 'name',
    page: 1,
    rowsPerPage: 10,
    hasSearch: false,
  }
});

// 선택된 사용자 IDs
export const selectedUserIdsState = atom({
  key: 'selectedUserIdsState',
  default: [] as string[],
});

// 메뉴 상태
export const userMenuState = atom({
  key: 'userMenuState',
  default: {
    anchorEl: null as HTMLElement | null,
    targetId: null as number | null,
  }
});

// 스낵바 상태
export const userSnackbarState = atom({
  key: 'userSnackbarState',
  default: {
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  }
});

export const userFormDataState = atom<UserCreateRequest>({
  key: 'userFormDataState',
  default: {
    name: '',
    email: '',
    password: '',
    role_names: [],
    dept_name: '',
  },
});