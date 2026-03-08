import { atom } from 'recoil';

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
    roleId: null as number | null,
  }
});

// 권한 삭제 다이얼로그 상태
export const roleDeleteDialogState = atom({
  key: 'roleDeleteDialogState',
  default: {
    open: false,
    target: 'single' as 'single' | 'multiple',
    roleId: null as number | null,
  }
});
