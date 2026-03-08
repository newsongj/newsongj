import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import { userPermissionsState } from '@/recoil/auth/atoms';
import { fetchDepartments, fetchDepartmentsByDept } from '@/api/department';
import { shouldUseDepartmentAPI } from '@/constants/permissions';
import { DepartmentTreeNode } from '@/models/department.types';

interface UseDepartmentsOptions {
  tree?: boolean; // 트리 구조 여부 (기본값: true)
}

export const useDepartments = (options: UseDepartmentsOptions = {}) => {
  const { tree = true } = options;
  const userPermissions = useRecoilValue(userPermissionsState);

  // 권한 기반 정보 - 메모이제이션으로 불필요한 재계산 방지
  const shouldUseDeptAPI = useMemo(() => 
    shouldUseDepartmentAPI(userPermissions, 'file'), 
    [userPermissions]
  );

  // 전체 부서 목록 쿼리 (관리자용)
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    error: departmentsError,
    refetch: refetchDepartments,
  } = useQuery<DepartmentTreeNode[]>({
    queryKey: ['departments', 'admin', tree],
    queryFn: () => fetchDepartments(tree),
    enabled: userPermissions.length > 0 && !shouldUseDeptAPI,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분 (구 cacheTime)
  });

  // 부서별 부서 목록 쿼리 (일반 사용자용)
  const {
    data: departmentsByDept = [],
    isLoading: departmentsByDeptLoading,
    error: departmentsByDeptError,
    refetch: refetchDepartmentsByDept,
  } = useQuery<DepartmentTreeNode[]>({
    queryKey: ['departments', 'byDept', tree],
    queryFn: () => fetchDepartmentsByDept(tree),
    enabled: userPermissions.length > 0 && shouldUseDeptAPI,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분 (구 cacheTime)
  });

  // 로딩 상태 통합
  const loading = shouldUseDeptAPI ? departmentsByDeptLoading : departmentsLoading;
  
  // 에러 상태 통합
  const error = shouldUseDeptAPI 
    ? departmentsByDeptError?.message || null
    : departmentsError?.message || null;

  // refetch 함수 통합
  const refetch = shouldUseDeptAPI ? refetchDepartmentsByDept : refetchDepartments;

  return {
    departments,
    departmentsByDept,
    loading,
    error,
    shouldUseDeptAPI,
    refetch,
    // 기존 호환성을 위한 개별 함수들 (deprecated)
    loadDepartments: refetchDepartments,
    loadDepartmentsByDept: refetchDepartmentsByDept,
  };
};
