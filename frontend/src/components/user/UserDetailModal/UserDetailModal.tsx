import React, { useState, useEffect } from 'react';
import { TextField } from '@components/common/TextField';
import { SearchableSelect } from '@components/common/SearchableSelect';
import { DataTable } from '@components/common/DataTable';
import { Snackbar } from '@components/common/Snackbar';
import { BaseDetailModal } from '@components/common/BaseDetailModal';
import { Badge } from '@components/common/Badge';
import { Column } from '@components/common/DataTable/DataTable.types';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { useUserManagement } from '@/hooks/user/useUserManagement';
import { useDepartments } from '@/hooks/department/useDepartments';
import { usePermissionManagement } from '@/hooks/role/usePermissionManagement';
import { RoleListRow } from '@/models/role.types';
import { UserUpdateRequest } from '@/models/user.types';
import { UserDetailModalProps } from './UserDetailModal.types';
import * as S from './UserDetailModal.styles';

const UserDetailModal: React.FC<UserDetailModalProps> = ({ onSuccess }) => {
  const {
    detailModal,
    closeDetailModal,
    userDetail,
    loading,
    loadUserDetail,
    updateUserData
  } = useUserManagement();

  const { departments } = useDepartments({ tree: false });
  const { roles, loadRoles } = usePermissionManagement();
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  const [isEditing, setIsEditing] = useState(false);
  const [originalSelectedRoleIds, setOriginalSelectedRoleIds] = useState<number[]>([]);
  const [formData, setFormData] = useState<UserUpdateRequest & { role_ids: number[] }>({
    password: '',
    role_names: [],
    dept_name: '',
    role_ids: [],
  });
  const [updating, setUpdating] = useState(false);

  // 사용자 상세 정보 로드
  useEffect(() => {
    if (detailModal.open && detailModal.userData) {
      loadUserDetail(detailModal.userData.user_idx);
      loadRoles();
    }
  }, [detailModal.open, detailModal.userData, loadUserDetail, loadRoles]);

  useEffect(() => {
    if (userDetail) {
      const currentRoleIds = roles
        ?.filter(role => userDetail.roles?.includes(role.name))
        .map(role => role.role_idx) || [];

      setFormData({
        password: '',
        role_names: userDetail.roles || [],
        dept_name: userDetail.dept_name || '',
        role_ids: currentRoleIds,
      });

      setOriginalSelectedRoleIds(currentRoleIds);
    }
  }, [userDetail, roles]);

  // 선택된 권한 ID를 role_names로 변환
  useEffect(() => {
    const selectedRoleNames = roles
      ?.filter(role => formData.role_ids.includes(role.role_idx))
      .map(role => role.name) || [];

    setFormData(prev => ({
      ...prev,
      role_names: selectedRoleNames
    }));
  }, [formData.role_ids, roles]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!userDetail) return;

    setUpdating(true);
    try {
      const updateData = {
        ...formData,
        password: userDetail.auth_mode === 'SSO' ? null : formData.password || null
      };

      const success = await updateUserData(userDetail.user_idx, updateData);
      if (success) {
        showSnackbar('사용자가 성공적으로 수정되었습니다.', 'success');
        setIsEditing(false);
        setOriginalSelectedRoleIds(formData.role_ids);
        onSuccess?.();
      } else {
        showSnackbar('사용자 수정에 실패했습니다.', 'error');
      }
    } catch (error) {
      showSnackbar('사용자 수정 중 오류가 발생했습니다.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (userDetail) {
      const currentRoleIds = roles
        ?.filter(role => userDetail.roles?.includes(role.name))
        .map(role => role.role_idx) || [];

      setFormData({
        password: '',
        role_names: userDetail.roles || [],
        dept_name: userDetail.dept_name || '',
        role_ids: currentRoleIds,
      });
    }
  };

  const hasChanges =
    formData.password !== '' ||
    formData.dept_name !== (userDetail?.dept_name || '') ||
    JSON.stringify([...formData.role_ids].sort()) !== JSON.stringify([...originalSelectedRoleIds].sort());

  const columns: Column<RoleListRow>[] = [
    {
      id: 'role_idx',
      label: '번호',
      minWidth: 80,
      render: (_value, row) => {
        const dataToUse = isEditing ? (roles || []) : filteredRoles;
        const index = dataToUse.findIndex(r => r.role_idx === row.role_idx);
        return index + 1;
      },
      align: 'center' as const,
    },
    {
      id: 'name',
      label: '권한명',
      minWidth: 150,
    },
    {
      id: 'description',
      label: '설명',
      minWidth: 200,
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
      align: 'center' as const,
    },
  ];

  const departmentOptions = departments?.map(dept => ({
    id: dept.dept_name,
    value: dept.dept_name,
    label: dept.dept_name
  })) || [];

  const filteredRoles = roles?.filter(role => userDetail?.roles?.includes(role.name)) || [];

  return (
    <>
      <BaseDetailModal
        open={detailModal.open}
        title="사용자 상세"
        onClose={closeDetailModal}
        loading={loading}
        isEditing={isEditing}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={updating}
        hasChanges={hasChanges}
      >
        <S.StyledContent>
          <S.StyledLeftColumn>
            <S.StyledFormSection>
              <S.StyledSectionTitle>기본 정보</S.StyledSectionTitle>

              <S.StyledInfoRow>
                <S.StyledLabel>사용자명:</S.StyledLabel>
                <S.StyledValue>{userDetail?.name || '-'}</S.StyledValue>
              </S.StyledInfoRow>

              <S.StyledInfoRow>
                <S.StyledLabel>이메일:</S.StyledLabel>
                <S.StyledValue>{userDetail?.email || '-'}</S.StyledValue>
              </S.StyledInfoRow>

              {isEditing && userDetail?.auth_mode !== 'SSO' && (
                <TextField
                  label="새 비밀번호"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="새 비밀번호를 입력하세요 (변경시에만)"
                  fullWidth
                />
              )}

              <S.StyledInfoRow>
                <S.StyledLabel>부서:</S.StyledLabel>
                {isEditing ? (
                  null
                ) : (
                  <S.StyledValue>{userDetail?.dept_name || '-'}</S.StyledValue>
                )}
              </S.StyledInfoRow>

              {isEditing && <SearchableSelect
                value={formData.dept_name || ''}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  dept_name: typeof value === 'string' ? value : ''
                }))}
                options={departmentOptions}
                placeholder="부서를 선택하세요"
              />}

              <S.StyledInfoRow>
                <S.StyledLabel>로그인 방식:</S.StyledLabel>
                <S.StyledValue>
                  <Badge variant="info" size="small">
                    {userDetail?.auth_mode || '-'}
                  </Badge>
                </S.StyledValue>
              </S.StyledInfoRow>
            </S.StyledFormSection>
          </S.StyledLeftColumn>

          <S.StyledRightColumn>
            <S.StyledFormSection>
              <S.StyledSectionTitle>권한 설정</S.StyledSectionTitle>

              <DataTable
                columns={columns}
                data={isEditing ? (roles || []) : filteredRoles}
                selectable={isEditing}
                selectedIds={isEditing ? formData.role_ids.map(String) : undefined}
                onSelectionChange={(ids) => setFormData(prev => ({
                  ...prev,
                  role_ids: ids.map(Number)
                }))}
                getRowId={(row) => String(row.role_idx)}
              />
            </S.StyledFormSection>
          </S.StyledRightColumn>
        </S.StyledContent>
      </BaseDetailModal>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </>
  );
};

export default UserDetailModal;
