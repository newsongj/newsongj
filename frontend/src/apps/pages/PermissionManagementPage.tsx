import React, { useEffect, useState } from 'react';
import { Add as AddIcon, Visibility as VisibilityIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Badge } from '@components/common/Badge';
import { Snackbar } from '@components/common/Snackbar';
import Popup from '@components/common/Popup';
import RoleCreateModal from '@components/role/RoleCreateModal';
import RoleDetailModal from '@components/role/RoleDetailModal';
import { Column } from '@components/common/DataTable/DataTable.types';
import { SearchOption, ActionButton } from '@components/common/SearchToolbar/SearchToolbar.types';
import { RoleListRow } from '@/models/role.types';
import { usePermissionManagement } from '@/hooks/role/usePermissionManagement';
import { useSnackbar } from '@/hooks/common/useSnackbar';

const PermissionManagementPage: React.FC = () => {
  const {
    roles,
    pagination,
    selectedIds,
    deleteDialog,

    // 액션들
    loadRoles,
    openCreateModal,
    openDetailModal,
    openDeleteDialog,
    closeDeleteDialog,
    deleteRoleById,
    deleteBulkRoles,
    handleSearch,
    handlePageChange,
    handleRowsPerPageChange,
    setSelectedIds,
  } = usePermissionManagement();

  // 공통 Snackbar 훅 사용
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();
  const [isDeleting, setIsDeleting] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    loadRoles(1, 10);
  }, []);

  const columns: Column<RoleListRow>[] = [
    {
      id: 'role_idx',
      label: '번호',
      minWidth: 80,
      render: (_value, row) => {
        const index = roles.findIndex(r => r.role_idx === row.role_idx);
        return (pagination.current_page - 1) * pagination.page_size + index + 1;
      },
      align: 'center'
    },
    {
      id: 'name',
      label: '권한명',
      minWidth: 200,
      render: (value: string, row: RoleListRow) => (
        <span
          style={{ cursor: 'pointer', color: '#187EF4' }}
          onClick={() => openDetailModal(row.role_idx)}
        >
          {value}
        </span>
      ),
    },
    {
      id: 'description',
      label: '설명',
      minWidth: 300,
    },
    {
      id: 'access_menus',
      label: '접근 메뉴',
      minWidth: 250,
      render: (_value, row) => (row.access_menus && Array.isArray(row.access_menus)) ? row.access_menus.join(', ') : '-',
    },
    {
      id: 'created_at',
      label: '생성 일자',
      minWidth: 150,
      render: (_value, row) => new Date(row.created_at).toLocaleDateString(),
      align: 'center'
    },
    {
      id: 'is_activated',
      label: 'STATUS',
      minWidth: 100,
      render: (_value, row) => (
        <Badge variant={row.is_activated ? 'active' : 'inactive'} size="small">
          {row.is_activated ? 'Active' : 'Inactive'}
        </Badge>
      ),
      align: 'center'
    },
  ];

  const searchOptions: SearchOption[] = [
    { value: 'name', label: '권한명' },
    { value: 'access_menus', label: '접근 메뉴' },
    { value: 'is_activated', label: 'STATUS' },
  ];

  const toolbarActions: ActionButton[] = [
    {
      label: '권한 추가',
      startIcon: <AddIcon />,
      onClick: openCreateModal,
      variant: 'filled',
    },
  ];

  const rowActions = (row: RoleListRow) => [
    {
      id: 'view',
      label: '상세보기',
      leadingElement: <VisibilityIcon fontSize="small" />,
      onClick: () => openDetailModal(row.role_idx)
    },
    {
      id: 'delete',
      label: '삭제',
      leadingElement: <DeleteIcon fontSize="small" />,
      onClick: () => openDeleteDialog('single', row.role_idx),
    }
  ];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      let success = false;

      if (deleteDialog.target === 'single' && deleteDialog.roleId) {
        success = await deleteRoleById(deleteDialog.roleId);
      } else if (deleteDialog.target === 'multiple') {
        success = await deleteBulkRoles();
      }

      if (success) {
        const count = deleteDialog.target === 'single' ? 1 : selectedIds.length;
        showSnackbar(`${count}개 권한이 성공적으로 삭제되었습니다.`, 'success');
        setSelectedIds([]);
        closeDeleteDialog();
      } else {
        showSnackbar('권한 삭제에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      showSnackbar('권한 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    openDeleteDialog('multiple');
  };

  // 모달 성공 핸들러들
  const handleCreateSuccess = () => {
    showSnackbar('권한이 성공적으로 생성되었습니다.', 'success');
    loadRoles(1, 10); // 데이터 새로고침
  };

  const handleUpdateSuccess = () => {
    showSnackbar('권한이 성공적으로 수정되었습니다.', 'success');
    loadRoles(pagination.current_page, pagination.page_size); // 데이터 새로고침
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={roles}
        selectable
        onSelectionChange={(ids) => setSelectedIds(ids)}
        getRowId={(row) => String(row.role_idx)}
        useSearchToolbar
        searchPlaceholder="권한명, 설명 등을 검색하세요"
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

      <RoleCreateModal
        onSuccess={handleCreateSuccess}
      />

      <RoleDetailModal
        onSuccess={handleUpdateSuccess}
      />

      {deleteDialog.open && (
        <Popup
          title="권한 삭제"
          description={
            deleteDialog.target === 'single'
              ? '선택한 권한을 정말 삭제하시겠습니까?'
              : `선택한 ${selectedIds.length}개의 권한을 정말 삭제하시겠습니까?`
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
      />
    </>
  );
};

export default PermissionManagementPage;
