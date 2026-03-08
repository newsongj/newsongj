import { atom } from 'recoil'

// Orchestrator : 사이드바 접기/펼치기
export const orchestratorSidebarCollapsedState = atom<boolean>({
    key: 'orchestratorSidebarCollapsedState',
    default: false,
})
// 공통 스낵바 상태
export const snackbarState = atom({
    key: 'snackbarState',
    default: {
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'warning' | 'info',
    }
});

// 공통 메뉴 상태
export const menuState = atom({
    key: 'menuState',
    default: {
        anchorEl: null as HTMLElement | null,
        targetId: null as number | null,
    }
});