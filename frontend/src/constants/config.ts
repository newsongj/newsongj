export const APP_CONFIG = {
    name: 'NewsongJ',
    version: '1.0.0',
    backend: {
        enabled: import.meta.env.VITE_ENABLE_BACKEND !== 'false',
        bypassAuth: import.meta.env.VITE_BYPASS_AUTH === 'true',
    },
    api: {
        url: import.meta.env.VITE_API_URL || '',  // 프록시 사용시 빈 값 허용
        prefix: '/api/v1', // API 공통 접두사
        timeout: 5000, // API 요청 타임아웃 설정 (5초)
    },
    app: {
        // VITE_APP_URL이 있으면 사용하고, 없으면 현재 브라우저의 origin을 동적으로 사용합니다.
        // 이렇게 하면 개발/운영 환경에 따라 동적으로 앱 URL이 설정됩니다.
        url: import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
    },
    layout: {
        headerHeight: '60px',
        sidebarWidth: {
            expanded: '250px',
            collapsed: '60px',
        },
    },
} as const; 

// VITE_API_URL 미설정 시 Nginx 프록시 모드(상대경로)로 동작 — 에러 불필요
