// 타입 정의
export type PermissionCode = 'FMR' | 'FMW' | 'UM' | 'AM' | 'FMR_D' | 'FMW_D' | 'UM_D' | 'AM_D';
export type FeatureType = 'file' | 'user' | 'permission';
export type PermissionLevel = 'global' | 'department' | 'none';

// 메뉴 코드 매핑 상수
export const MENU_CODES = {
  // 사이드바 메뉴
  USER_MANAGEMENT: 'UM' as const,
  PERMISSION_MANAGEMENT: 'AM' as const,
  FILE_MANAGEMENT: ['FMR', 'FMW', 'FMR_D', 'FMW_D'] as const,
  DASHBOARD: 'DASH' as const,
  COST_MONITORING_MANAGEMENT: 'CDASH' as const,
  COST_SETTINGS_MANAGEMENT: 'CS' as const,
  TERM_DICTIONARY: 'TD' as const,

  // 기능별 권한
  FILE_UPLOAD: ['FMW', 'FMW_D'] as const,
  FILE_READ_ONLY: ['FMR', 'FMR_D'] as const,

  // 임시 차단용
  BLOCK: 'BLOCKED_ACCESS' as const,
} as const;

// 권한 매핑 (기능별 global/department 권한)
const PERMISSION_MAPPING = {
  file: {
    global: ['FMR', 'FMW'] as PermissionCode[],
    department: ['FMR_D', 'FMW_D'] as PermissionCode[]
  },
  user: {
    global: ['UM'] as PermissionCode[],
    department: ['UM_D'] as PermissionCode[]
  },
  permission: {
    global: ['AM'] as PermissionCode[],
    department: ['AM_D'] as PermissionCode[]
  }
} as const;

// Department 권한 상수
export const DEPARTMENT_PERMISSIONS = {
  FILE_READ_DEPT: 'FMR_D' as const,
  FILE_WRITE_DEPT: 'FMW_D' as const,
  USER_MANAGEMENT_DEPT: 'UM_D' as const,
  PERMISSION_MANAGEMENT_DEPT: 'AM_D' as const,
} as const;

// 기본 권한 체크 함수 (기존 호환성 유지)
export const hasPermission = (userMenuCodes: string[], requiredCodes: string | string[]): boolean => {
  const required = Array.isArray(requiredCodes) ? requiredCodes : [requiredCodes];
  return required.some(code => userMenuCodes.includes(code));
};

// _D suffix 권한 체크 함수들
export const isDepartmentPermission = (permissionCode: string): boolean => {
  return permissionCode.endsWith('_D');
};

export const hasDepartmentPermissions = (userMenuCodes: string[]): boolean => {
  return userMenuCodes.some(code => isDepartmentPermission(code));
};

export const getDepartmentPermissions = (userMenuCodes: string[]): string[] => {
  return userMenuCodes.filter(code => isDepartmentPermission(code));
};

export const hasGlobalPermissions = (userMenuCodes: string[]): boolean => {
  return userMenuCodes.some(code => !isDepartmentPermission(code));
};

// 파일 업로드 권한 체크 (기존 함수 유지)
export const canUploadFile = (userMenuCodes: string[]): boolean => {
  const hasWrite = MENU_CODES.FILE_UPLOAD.some(code => userMenuCodes.includes(code));
  return hasWrite;
};

// Department API 사용 여부 체크
export const shouldUseDepartmentAPI = (userMenuCodes: string[], feature: FeatureType): boolean => {
  const mapping = PERMISSION_MAPPING[feature];
  if (!mapping) {
    return false;
  }
  return mapping.department.some(code => userMenuCodes.includes(code));
};

// 권한 레벨 체크
export const getPermissionLevel = (userMenuCodes: string[], basePermission: string): PermissionLevel => {
  const hasGlobal = userMenuCodes.includes(basePermission);
  const hasDept = userMenuCodes.includes(`${basePermission}_D`);

  if (hasGlobal) return 'global';
  if (hasDept) return 'department';
  return 'none';
};

// API 엔드포인트 결정
export const getAPIEndpoint = (userMenuCodes: string[], baseEndpoint: string, feature: FeatureType): string => {
  if (shouldUseDepartmentAPI(userMenuCodes, feature)) {
    return `${baseEndpoint}/department`;
  }
  return baseEndpoint;
};

// 특정 기능에 대한 권한 체크 (새로운 함수)
export const hasFeaturePermission = (userMenuCodes: string[], feature: FeatureType): boolean => {
  const mapping = PERMISSION_MAPPING[feature];
  if (!mapping) return false;

  const allPermissions = [...mapping.global, ...mapping.department];
  return allPermissions.some(code => userMenuCodes.includes(code));
};
