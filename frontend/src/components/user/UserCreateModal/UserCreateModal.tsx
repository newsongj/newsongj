import React, { useState, useEffect } from 'react';
import { TextField } from '@components/common/TextField';
import { SearchableSelect } from '@components/common/SearchableSelect';
import { DataTable } from '@components/common/DataTable';
import { Snackbar } from '@components/common/Snackbar';
import { BaseCreateModal } from '@components/common/BaseCreateModal';
import { Column } from '@components/common/DataTable/DataTable.types';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { useUserManagement } from '@/hooks/user/useUserManagement';
import { usePermissionManagement } from '@/hooks/role/usePermissionManagement';
import { useDepartments } from '@/hooks/department/useDepartments';
import { UserCreateRequest } from '@/models/user.types';
import { UserCreateModalProps } from './UserCreateModal.types';
import * as S from './UserCreateModal.styles';

const UserCreateModal: React.FC<UserCreateModalProps> = ({ onSuccess }) => {
  const {
    createModal,
    closeCreateModal,
    createNewUser
  } = useUserManagement();

  const { roles, loadRoles } = usePermissionManagement();
  const { departments } = useDepartments({ tree: false });
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<UserCreateRequest>({
    name: '',
    email: '',
    password: '',
    role_names: [],
    dept_name: '',
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // 권한 목록 로드
  useEffect(() => {
    if (createModal.open) {
      loadRoles();
    }
  }, [createModal.open, loadRoles]);

  // 선택된 권한 ID를 role_names로 변환
  useEffect(() => {
    const selectedRoleNames = roles
      ?.filter(role => selectedRoleIds.includes(String(role.role_idx)))
      .map(role => role.name) || [];

    setFormData(prev => ({
      ...prev,
      role_names: selectedRoleNames
    }));
  }, [selectedRoleIds, roles]);

  const handleSubmit = async () => {
    setCreating(true);
    try {
      const success = await createNewUser(formData);
      if (success) {
        showSnackbar('사용자가 성공적으로 생성되었습니다.', 'success');

        // 폼 초기화
        setFormData({
          name: '',
          email: '',
          password: '',
          role_names: [],
          dept_name: '',
        });
        setSelectedRoleIds([]);

        closeCreateModal();
        onSuccess?.();
      } else {
        showSnackbar('사용자 생성에 실패했습니다.', 'error');
      }
    } catch (error) {
      showSnackbar('사용자 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role_names: [],
      dept_name: '',
    });
    setSelectedRoleIds([]);
    closeCreateModal();
  };

  const isSubmitDisabled = !formData.name || !formData.email || !formData.password || !formData.dept_name;

  const columns: Column<any>[] = [
    {
      id: 'role_idx',
      label: '번호',
      minWidth: 80,
      render: (_value, row) => {
        const index = roles?.findIndex(r => r.role_idx === row.role_idx) || 0;
        return index + 1;
      },
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
  ];

  const departmentOptions = departments?.map(dept => ({
    id: dept.dept_name,
    value: dept.dept_name,
    label: dept.dept_name
  })) || [];

  return (
    <>
      <BaseCreateModal
        open={createModal.open}
        title="사용자 추가"
        onClose={handleCancel}
        onSubmit={handleSubmit}
        isSubmitting={creating}
        submitDisabled={isSubmitDisabled}
        submitText="생성"
      >
        <S.StyledContent>
          <S.StyledLeftColumn>
            <S.StyledFormSection>
              <S.StyledSectionTitle>기본 정보</S.StyledSectionTitle>

              <S.StyledSectionSubTitle>사용자명</S.StyledSectionSubTitle>
              <TextField
                label="사용자명"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="사용자명을 입력하세요"
                fullWidth
                required
              />

              <S.StyledSectionSubTitle>이메일</S.StyledSectionSubTitle>
              <TextField
                label="이메일"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="이메일을 입력하세요"
                fullWidth
                required
              />

              <S.StyledSectionSubTitle>비밀번호</S.StyledSectionSubTitle>
              <TextField
                label="비밀번호"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="비밀번호를 입력하세요"
                fullWidth
                required
              />

              <S.StyledSectionSubTitle>부서</S.StyledSectionSubTitle>
              <SearchableSelect
                label="부서"
                value={formData.dept_name}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  dept_name: typeof value === 'string' ? value : ''
                }))}
                options={departmentOptions}
                placeholder="부서를 선택하세요"
                required
              />
            </S.StyledFormSection>
          </S.StyledLeftColumn>

          <S.StyledRightColumn>
            <S.StyledFormSection>
              <S.StyledSectionTitle>권한 설정</S.StyledSectionTitle>

              <DataTable
                columns={columns}
                data={roles || []}
                selectable
                selectedIds={selectedRoleIds}
                onSelectionChange={setSelectedRoleIds}
                getRowId={(row) => String(row.role_idx)}
              />
            </S.StyledFormSection>
          </S.StyledRightColumn>
        </S.StyledContent>
      </BaseCreateModal>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </>
  );
};

export default UserCreateModal;
