export const APP_CONFIG = {
    name: 'AKeeON',
    version: '1.0.0',
    backend: {
        enabled: import.meta.env.VITE_ENABLE_BACKEND === 'true',
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
    sso: {
        url: import.meta.env.VITE_SSO_URL || 'https://dwp.aekyung.kr/user/login/login.do',
    },
    layout: {
        headerHeight: '60px',
        sidebarWidth: {
            expanded: '250px',
            collapsed: '60px',
        },
    },
} as const; 

// 운영 환경 배포 전 필수 환경변수가 설정되었는지 확인
if (import.meta.env.PROD && APP_CONFIG.backend.enabled && !APP_CONFIG.api.url) {
  throw new Error('VITE_API_URL environment variable is not set. Please check your .env file.');
}
