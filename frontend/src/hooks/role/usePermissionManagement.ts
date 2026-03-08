import { useCallback, useState } from 'react';
import { useRecoilState } from 'recoil';
import {
  rolesState,
  roleDetailState,
  roleMenusState,
  roleCreateModalState,
  roleDetailModalState,
  roleDeleteDialogState,
  selectedRoleIdsState,
} from '@/recoil/permission/atoms';
import {
  fetchRoles,
  searchRoles,
  fetchRoleDetail,
  fetchRoleMenus,
  deleteRole,
  createRole,
  updateRolePermissions,
} from '@/api/role';

/**
 * 권한 관리 페이지의 모든 상태와 로직을 통합 관리하는 훅
 * - File 패턴 기준으로 구조 통일
 */
export const usePermissionManagement = () => {
  // Recoil 전역 상태 (File 패턴과 동일)
  const [rolesData, setRolesData] = useRecoilState(rolesState);
  const [roleDetailData, setRoleDetailData] = useRecoilState(roleDetailState);
  const [roleMenusData, setRoleMenusData] = useRecoilState(roleMenusState);
  const [createModal, setCreateModal] = useRecoilState(roleCreateModalState);
  const [detailModal, setDetailModal] = useRecoilState(roleDetailModalState);
  const [deleteDialog, setDeleteDialog] = useRecoilState(roleDeleteDialogState);
  const [selectedIds, setSelectedIds] = useRecoilState(selectedRoleIdsState);

  // 로컬 상태 (File 패턴과 동일)
  const [searchState, setSearchState] = useState({
    keyword: '',
    field: 'name',
    hasSearch: false,
    page: 1,
    rowsPerPage: 10
  });

  // 권한 목록 로드 (File 패턴과 동일한 구조)
  const loadRoles = useCallback(async (page: number = 1, pageSize: number = 50) => {
    setRolesData(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetchRoles(page, pageSize);
      setRolesData({
        roles: response.items,
        loading: false,
        pagination: response.meta,
      });
    } catch (error) {
      setRolesData(prev => ({ ...prev, loading: false }));
    }
  }, [setRolesData]);

  // 권한 검색 (File 패턴과 동일한 구조)
  const searchRoleList = useCallback(async (
    attribute: string,
    keyword: string,
    page: number = 1,
    pageSize: number = 10
  ) => {
    setRolesData(prev => ({ ...prev, loading: true }));

    try {
      const response = await searchRoles(attribute, keyword, page, pageSize);
      setRolesData({
        roles: response.items,
        loading: false,
        pagination: response.meta,
      });

      setSearchState({
        keyword,
        field: attribute,
        hasSearch: true,
        page,
        rowsPerPage: pageSize
      });
    } catch (error) {
      setRolesData(prev => ({ ...prev, loading: false }));
    }
  }, [setRolesData]);

  // 페이지 변경 핸들러 (File 패턴과 동일)
  const handlePageChange = useCallback(async (newPage: number) => {
    const { hasSearch, keyword, field, rowsPerPage } = searchState;

    if (hasSearch) {
      await searchRoleList(field, keyword, newPage, rowsPerPage);
    } else {
      await loadRoles(newPage, rowsPerPage);
    }

    setSearchState(prev => ({ ...prev, page: newPage }));
  }, [searchState, searchRoleList, loadRoles]);

  // 페이지 크기 변경 핸들러 (File 패턴과 동일)
  const handleRowsPerPageChange = useCallback(async (newPageSize: number) => {
    const { hasSearch, keyword, field } = searchState;

    if (hasSearch) {
      await searchRoleList(field, keyword, 1, newPageSize);
    } else {
      await loadRoles(1, newPageSize);
    }

    setSearchState(prev => ({
      ...prev,
      page: 1,
      rowsPerPage: newPageSize
    }));
  }, [searchState, searchRoleList, loadRoles]);

  // 검색 핸들러 (DataTable onSearch 시그니처에 맞춤)
  const handleSearch = useCallback(async (searchValue: string, attribute?: string) => {
    if (!searchValue || !attribute) {
      // 검색 초기화
      setSearchState({
        keyword: '',
        field: 'name',
        hasSearch: false,
        page: 1,
        rowsPerPage: searchState.rowsPerPage
      });
      await loadRoles(1, searchState.rowsPerPage);
    } else {
      await searchRoleList(attribute, searchValue, 1, searchState.rowsPerPage);
    }
  }, [searchState.rowsPerPage, searchRoleList, loadRoles]);

  // 모달 관리 (File 패턴과 동일)
  const openCreateModal = useCallback(() => {
    setCreateModal({ open: true });
  }, [setCreateModal]);

  const closeCreateModal = useCallback(() => {
    setCreateModal({ open: false });
  }, [setCreateModal]);

  const openDetailModal = useCallback((roleId: number) => {
    // roleId를 저장하여 Modal에서 사용할 수 있도록 함
    setDetailModal({ open: true, roleData: { role_idx: roleId } as any });
  }, [setDetailModal]);

  const closeDetailModal = useCallback(() => {
    setDetailModal({ open: false, roleData: null });
  }, [setDetailModal]);

  // 삭제 다이얼로그 관리 (File 패턴과 동일)
  const openDeleteDialog = useCallback((target: 'single' | 'multiple', roleId?: number) => {
    setDeleteDialog({ open: true, target, roleId });
  }, [setDeleteDialog]);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ open: false, target: 'single', roleId: undefined });
  }, [setDeleteDialog]);

  // 삭제 액션 (File 패턴과 동일한 구조)
  const deleteRoleById = useCallback(async (roleId: number): Promise<boolean> => {
    try {
      await deleteRole({ role_idx: roleId });
      await loadRoles(searchState.page, searchState.rowsPerPage);
      return true;
    } catch (error) {
      return false;
    }
  }, [loadRoles, searchState]);

  const deleteBulkRoles = useCallback(async (): Promise<boolean> => {
    try {
      const deletePromises = selectedIds.map(id => deleteRole({ role_idx: Number(id) }));
      await Promise.all(deletePromises);
      await loadRoles(searchState.page, searchState.rowsPerPage);
      return true;
    } catch (error) {
      return false;
    }
  }, [selectedIds, loadRoles, searchState]);

  // 벌크 삭제 핸들러 (File 패턴과 동일)
  const handleBulkDelete = useCallback(() => {
    openDeleteDialog('multiple');
  }, [openDeleteDialog]);

  // 권한 생성 (File 패턴과 유사한 구조)
  const createNewRole = useCallback(async (roleData: any): Promise<boolean> => {
    try {
      await createRole(roleData);
      await loadRoles(1, searchState.rowsPerPage);
      return true;
    } catch (error) {
      return false;
    }
  }, [loadRoles, searchState.rowsPerPage]);

  // 권한 상세 정보 로드 (File 패턴과 유사한 구조)
  const loadRoleDetail = useCallback(async (roleId: number) => {
    setRoleDetailData(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetchRoleDetail(roleId);
      setRoleDetailData({
        roleDetail: response,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load role detail:', error);
      setRoleDetailData(prev => ({ ...prev, loading: false }));
    }
  }, [setRoleDetailData]);

  // 권한 메뉴 로드 (Role 도메인 특화)
  const loadRoleMenus = useCallback(async () => {
    setRoleMenusData(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetchRoleMenus();
      setRoleMenusData({
        menus: response,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load role menus:', error);
      setRoleMenusData(prev => ({ ...prev, loading: false }));
    }
  }, [setRoleMenusData]);

  // 권한 업데이트 (File 패턴과 유사한 구조)
  const updateRoleData = useCallback(async (roleId: number, roleData: any): Promise<boolean> => {
    try {
      await updateRolePermissions(roleId, roleData);
      await loadRoleDetail(roleId);
      await loadRoles(searchState.page, searchState.rowsPerPage);
      return true;
    } catch (error) {
      return false;
    }
  }, [loadRoleDetail, loadRoles, searchState]);

  // 반환값 (File 패턴과 동일한 구조)
  return {
    // 데이터
    roles: rolesData.roles,
    loading: rolesData.loading,
    pagination: rolesData.pagination,
    roleDetail: roleDetailData.roleDetail,
    roleMenus: roleMenusData.menus,
    selectedIds,

    // 모달 상태
    createModal,
    detailModal,
    deleteDialog,

    // 액션들
    loadRoles,
    openCreateModal,
    closeCreateModal,
    openDetailModal,
    closeDetailModal,
    openDeleteDialog,
    closeDeleteDialog,
    deleteRoleById,
    deleteBulkRoles,
    handleSearch,
    handlePageChange,
    handleRowsPerPageChange,
    handleBulkDelete,
    setSelectedIds,
    createNewRole,
    loadRoleDetail,
    loadRoleMenus,
    updateRoleData,
  };
};
