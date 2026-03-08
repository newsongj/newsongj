import React, { useEffect, useState } from 'react';
import { Add as AddIcon, Visibility as VisibilityIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Badge } from '@components/common/Badge';
import { Snackbar } from '@components/common/Snackbar';
import Popup from '@components/common/Popup';
import { UserCreateModal, UserDetailModal } from '@components/user';
import { Column } from '@components/common/DataTable/DataTable.types';
import { SearchOption, ActionButton } from '@components/common/SearchToolbar/SearchToolbar.types';
import { UserResponse } from '@/models/user.types';
import { useUserManagement } from '@/hooks/user/useUserManagement';
import { useSnackbar } from '@/hooks/common/useSnackbar';

const UserManagementPage: React.FC = () => {
  const {
    users,
    pagination,
    selectedIds,
    deleteDialog,

    // 액션들
    loadUsers,
    openCreateModal,
    openDetailModal,
    openDeleteDialog,
    closeDeleteDialog,
    deleteUser,
    deleteBulkUsers,
    handleSearch,
    handlePageChange,
    handleRowsPerPageChange,
    setSelectedIds,
  } = useUserManagement();

  // 공통 Snackbar 훅 사용
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();
  const [isDeleting, setIsDeleting] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    loadUsers(1, 10);
  }, []);

  const columns: Column<UserResponse>[] = [
    {
      id: 'user_idx',
      label: '번호',
      minWidth: 80,
      sortable: true,
      render: (_value, row) => {
        const index = users.findIndex(u => u.user_idx === row.user_idx);
        return (pagination.current_page - 1) * pagination.page_size + index + 1;
      },
      align: 'center'
    },
    {
      id: 'email',
      label: '이메일',
      minWidth: 200,
      sortable: true,
      render: (value: string, row: UserResponse) => (
        <span
          style={{ cursor: 'pointer', color: '#187EF4' }}
          onClick={() => openDetailModal(row.user_idx)}
        >
          {value}
        </span>
      ),
    },
    {
      id: 'name',
      label: '사용자명',
      minWidth: 150,
      sortable: true,
      align: 'center'
    },
    {
      id: 'dept_name',
      label: '부서',
      minWidth: 150,
      sortable: true,
      align: 'center'
    },
    {
      id: 'auth_mode',
      label: '로그인 방식',
      minWidth: 120,
      sortable: true,
      render: (_value, row) => (
        <Badge variant={row.auth_mode === 'SSO' ? 'active' : 'success'} size="small">
          {row.auth_mode}
        </Badge>
      ),
      align: 'center'
    },
    {
      id: 'roles',
      label: '접근 메뉴',
      minWidth: 200,
      render: (_value, row) => row.roles && row.roles.length > 0 ? row.roles.join(', ') : '-',
      align: 'center'
    },
  ];

  const searchOptions: SearchOption[] = [
    { value: 'name', label: '사용자명' },
    { value: 'email', label: '이메일' },
    { value: 'status', label: '상태' },
    { value: 'rank', label: '직급' },
    { value: 'dept_name', label: '부서명' },
    { value: 'role_name', label: '권한명' },
  ];

  const toolbarActions: ActionButton[] = [
    {
      label: '사용자 추가',
      startIcon: <AddIcon />,
      onClick: openCreateModal,
      variant: 'filled',
    },
  ];

  const rowActions = (row: UserResponse) => [
    {
      id: 'view',
      label: '사용자 상세',
      leadingElement: <VisibilityIcon fontSize="small" />,
      onClick: () => openDetailModal(row.user_idx)
    },
    {
      id: 'delete',
      label: '사용자 삭제',
      leadingElement: <DeleteIcon fontSize="small" />,
      onClick: () => openDeleteDialog('single', row.user_idx),
    }
  ];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      let success = false;

      if (deleteDialog.target === 'single' && deleteDialog.userId) {
        success = await deleteUser(deleteDialog.userId);
      } else if (deleteDialog.target === 'multiple') {
        success = await deleteBulkUsers();
      }

      if (success) {
        const count = deleteDialog.target === 'single' ? 1 : selectedIds.length;
        showSnackbar(`${count}명의 사용자가 성공적으로 삭제되었습니다.`, 'success');
        setSelectedIds([]);
        closeDeleteDialog();
      } else {
        showSnackbar('사용자 삭제에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      showSnackbar('사용자 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    openDeleteDialog('multiple');
  };

  // 모달 성공 핸들러들
  const handleCreateSuccess = () => {
    showSnackbar('사용자가 성공적으로 생성되었습니다.', 'success');
    loadUsers(1, 10); // 데이터 새로고침
  };

  const handleUpdateSuccess = () => {
    showSnackbar('사용자가 성공적으로 수정되었습니다.', 'success');
    loadUsers(pagination.current_page, pagination.page_size); // 데이터 새로고침
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        selectable
        onSelectionChange={setSelectedIds}
        getRowId={(row) => String(row.user_idx)}
        useSearchToolbar
        searchPlaceholder="사용자명, 이메일 등을 검색하세요"
        searchOptions={searchOptions}
        onSearch={handleSearch}
        toolbarActions={toolbarActions}
        selectedIds={selectedIds}
        selectedActions={handleBulkDelete}
        rowActions={rowActions}
        pagination={{
          page: pagination.current_page - 1,
          rowsPerPage: pagination.page_size,
          totalCount: pagination.total_items,
          onPageChange: (page) => handlePageChange(page + 1),
          onRowsPerPageChange: handleRowsPerPageChange,
        }}
      />

      <UserCreateModal
        onSuccess={handleCreateSuccess}
      />

      <UserDetailModal
        onSuccess={handleUpdateSuccess}
      />

      {deleteDialog.open && (
        <Popup
          title="사용자 삭제"
          description={
            deleteDialog.target === 'single'
              ? '선택한 사용자를 정말 삭제하시겠습니까?'
              : `선택한 ${selectedIds.length}명의 사용자를 정말 삭제하시겠습니까?`
          }
          onCancel={closeDeleteDialog}
          onConfirm={handleDelete}
          cancelButtonText="취소"
          confirmButtonText={isDeleting ? "삭제 중..." : "삭제"}
          confirmButtonVariant="error"
          disabled={isDeleting}
        />
      )}

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
        autoHideDuration={6000}
      />
    </>
  );
};

export default UserManagementPage;
