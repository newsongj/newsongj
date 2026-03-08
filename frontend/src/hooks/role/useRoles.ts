import { useQuery } from '@tanstack/react-query';
import { fetchRoles } from '@/api/role';

/**
 * 권한 목록 조회를 위한 React Query 훅
 */
export const useRoles = () => {
  const {
    data: rolesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchRoles(1, 20), // 모든 권한 조회 (페이지네이션 없이)
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });

  return {
    roles: rolesData?.items || [],
    roleLoading: isLoading,
    error: error?.message || null,
    refetch,
  };
};
