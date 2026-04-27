import { useCallback, useState } from 'react';
import { useRecoilState } from 'recoil';
import {
  usersState,
  userDetailState,
  userCreateModalState,
  userDetailModalState,
  userDeleteDialogState,
  selectedUserIdsState,
} from '@/recoil/user/atoms';
import { UserCreateRequest } from '@/models/user.types';
import {
  fetchUsers,
  searchUsers,
  deleteUser as deleteUserAPI,
  createUser,
  updateUser,
  fetchUser
} from '@/api/user';

/**
 * 사용자 관리 페이지의 모든 상태와 로직을 통합 관리하는 훅
 * - File 패턴 기준으로 구조 통일
 */
export const useUserManagement = () => {
  // Recoil 전역 상태 (File 패턴과 동일)
  const [usersData, setUsersData] = useRecoilState(usersState);
  const [userDetailData, setUserDetailData] = useRecoilState(userDetailState);
  const [createModal, setCreateModal] = useRecoilState(userCreateModalState);
  const [detailModal, setDetailModal] = useRecoilState(userDetailModalState);
  const [deleteDialog, setDeleteDialog] = useRecoilState(userDeleteDialogState);
  const [selectedIds, setSelectedIds] = useRecoilState(selectedUserIdsState);

  // 로컬 상태 (File 패턴과 동일)
  const [searchState, setSearchState] = useState({
    keyword: '',
    field: 'name',
    hasSearch: false,
    page: 1,
    rowsPerPage: 10
  });

  // 사용자 명단 로드
  const loadUsers = useCallback(async (page: number = 1, pageSize: number = 10) => {
    setUsersData(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetchUsers(page, pageSize);
      setUsersData({
        users: response.items,
        loading: false,
        pagination: response.meta,
      });
    } catch (error) {
      setUsersData(prev => ({ ...prev, loading: false }));
    }
  }, [setUsersData]);

  // 사용자 검색
  const searchUserList = useCallback(async (
    attribute: string,
    keyword: string,
    page: number = 1,
    pageSize: number = 10
  ) => {
    setUsersData(prev => ({ ...prev, loading: true }));

    try {
      const response = await searchUsers(attribute, keyword, page, pageSize);
      setUsersData({
        users: response.items,
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
      setUsersData(prev => ({ ...prev, loading: false }));
    }
  }, [setUsersData]);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback(async (newPage: number) => {
    const { hasSearch, keyword, field, rowsPerPage } = searchState;
    
    if (hasSearch) {
      await searchUserList(field, keyword, newPage, rowsPerPage);
    } else {
      await loadUsers(newPage, rowsPerPage);
    }
    
    setSearchState(prev => ({ ...prev, page: newPage }));
  }, [searchState, searchUserList, loadUsers]);

  // 페이지 크기 변경 핸들러 (File 패턴과 동일)
  const handleRowsPerPageChange = useCallback(async (newPageSize: number) => {
    const { hasSearch, keyword, field } = searchState;
    
    if (hasSearch) {
      await searchUserList(field, keyword, 1, newPageSize);
    } else {
      await loadUsers(1, newPageSize);
    }
    
    setSearchState(prev => ({ 
      ...prev, 
      page: 1, 
      rowsPerPage: newPageSize 
    }));
  }, [searchState, searchUserList, loadUsers]);

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
      await loadUsers(1, searchState.rowsPerPage);
    } else {
      await searchUserList(attribute, searchValue, 1, searchState.rowsPerPage);
    }
  }, [searchState.rowsPerPage, searchUserList, loadUsers]);

  // 모달 관리
  const openCreateModal = useCallback(() => {
    setCreateModal({ open: true });
  }, [setCreateModal]);

  const closeCreateModal = useCallback(() => {
    setCreateModal({ open: false });
  }, [setCreateModal]);

  const openDetailModal = useCallback((userId: number) => {
    // userId를 저장하여 Modal에서 사용할 수 있도록 함
    setDetailModal({ open: true, userData: { user_idx: userId } as any });
  }, [setDetailModal]);

  const closeDetailModal = useCallback(() => {
    setDetailModal({ open: false, userData: null });
  }, [setDetailModal]);

  // 삭제 다이얼로그 관리
  const openDeleteDialog = useCallback((target: 'single' | 'multiple', userId?: number) => {
    setDeleteDialog({ open: true, target, userId });
  }, [setDeleteDialog]);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ open: false, target: 'single', userId: undefined });
  }, [setDeleteDialog]);

  // 삭제 액션
  const deleteUser = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await deleteUserAPI(userId);
      await loadUsers(searchState.page, searchState.rowsPerPage);
      return true;
    } catch (error) {
      return false;
    }
  }, [loadUsers, searchState]);

  const deleteBulkUsers = useCallback(async (): Promise<boolean> => {
    try {
      const deletePromises = selectedIds.map(id => deleteUserAPI(Number(id)));
      await Promise.all(deletePromises);
      await loadUsers(searchState.page, searchState.rowsPerPage);
      return true;
    } catch (error) {
      return false;
    }
  }, [selectedIds, loadUsers, searchState]);

  // 벌크 삭제 핸들러
  const handleBulkDelete = useCallback(() => {
    openDeleteDialog('multiple');
  }, [openDeleteDialog]);

  // 사용자 생성
  const createNewUser = useCallback(async (userData: UserCreateRequest): Promise<boolean> => {
    try {
      await createUser(userData);
      await loadUsers(1, searchState.rowsPerPage);
      return true;
    } catch (error) {
      return false;
    }
  }, [loadUsers, searchState.rowsPerPage]);

  // 사용자 상세 정보 로드
  const loadUserDetail = useCallback(async (userId: number) => {
    setUserDetailData(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetchUser(userId);
      setUserDetailData({
        userDetail: response,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load user detail:', error);
      setUserDetailData(prev => ({ ...prev, loading: false }));
    }
  }, [setUserDetailData]);

  // 사용자 업데이트
  const updateUserData = useCallback(async (userId: number, userData: any): Promise<boolean> => {
    try {
      await updateUser(userId, userData);
      await loadUserDetail(userId);
      await loadUsers(searchState.page, searchState.rowsPerPage);
      return true;
    } catch (error) {
      return false;
    }
  }, [loadUserDetail, loadUsers, searchState]);

  // 반환값
  return {
    // 데이터
    users: usersData.users,
    loading: usersData.loading,
    pagination: usersData.pagination,
    userDetail: userDetailData.userDetail,
    selectedIds,

    // 모달 상태
    createModal,
    detailModal,
    deleteDialog,

    // 액션들
    loadUsers,
    openCreateModal,
    closeCreateModal,
    openDetailModal,
    closeDetailModal,
    openDeleteDialog,
    closeDeleteDialog,
    deleteUser,
    deleteBulkUsers,
    handleSearch,
    handlePageChange,
    handleRowsPerPageChange,
    handleBulkDelete,
    setSelectedIds,
    createNewUser,
    loadUserDetail,
    updateUserData,
  };
};
