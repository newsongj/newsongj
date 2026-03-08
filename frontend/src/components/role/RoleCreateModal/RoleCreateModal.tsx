import React, { useState, useEffect } from 'react';
import { DataTable } from '@components/common/DataTable';
import { TextField } from '@components/common/TextField';
import { Snackbar } from '@components/common/Snackbar';
import { BaseCreateModal } from '@components/common/BaseCreateModal';
import { Column } from '@components/common/DataTable/DataTable.types';
import { Badge } from '@components/common/Badge';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { RoleMenuResponse } from '@/models/role.types';
import { usePermissionManagement } from '@/hooks/role/usePermissionManagement';
import { RoleCreateModalProps } from './RoleCreateModal.types';
import * as S from './RoleCreateModal.styles';

const MAX_NAME_LENGTH = 30;
const MAX_DESCRIPTION_LENGTH = 50;

const RoleCreateModal: React.FC<RoleCreateModalProps> = ({ onSuccess }) => {
  const {
    createModal,
    closeCreateModal,
    roleMenus,
    loadRoleMenus,
    createNewRole
  } = usePermissionManagement();

  const initialFormData = {
    name: '',
    description: '',
    selectedMenuIds: [] as number[],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [isUploading, setUploading] = useState(false);
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  useEffect(() => {
    if (createModal.open) {
      loadRoleMenus();
    }
  }, [createModal.open, loadRoleMenus]);

  const handleSubmit = async () => {
    setUploading(true);
    try {
      const roleData = {
        name: formData.name,
        description: formData.description,
        menu_ids: formData.selectedMenuIds,
      };

      const success = await createNewRole(roleData);
      if (success) {
        showSnackbar('권한이 성공적으로 생성되었습니다.', 'success');

        // 폼 초기화
        setFormData({
          name: '',
          description: '',
          selectedMenuIds: [],
        });

        closeCreateModal();
        onSuccess?.();
      } else {
        showSnackbar('권한 생성에 실패했습니다.', 'error');
      }
    } catch (error) {
      showSnackbar('권한 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData); // 초기화
    closeCreateModal();
  };

  const isSubmitDisabled = !formData.name || !formData.description || formData.selectedMenuIds.length === 0;

  const columns: Column<RoleMenuResponse>[] = [
    {
      id: 'menu_idx',
      label: '번호',
      minWidth: 80,
      render: (_value, row) => {
        const index = roleMenus.findIndex(m => m.menu_idx === row.menu_idx);
        return index + 1;
      },
      align: 'center',
    },
    {
      id: 'name',
      label: '메뉴명',
      minWidth: 150,
    },
    {
      id: 'description',
      label: '설명',
      minWidth: 250,
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
      align: 'center',
    },
  ];

  return (
    <>
      <BaseCreateModal
        open={createModal.open}
        title="권한 추가"
        onClose={handleCancel}
        onSubmit={handleSubmit}
        isSubmitting={isUploading}
        submitDisabled={isSubmitDisabled}
        submitText="생성"
      >
        <S.StyledContent>
          <S.StyledLeftColumn>
            <S.StyledFormSection>
              <S.StyledSectionTitle>기본 정보</S.StyledSectionTitle>

              <S.StyledSectionSubTitle>권한명</S.StyledSectionSubTitle>
              <TextField
                label="권한명"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_NAME_LENGTH) {
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                }}
                placeholder="권한명을 입력하세요"
                helperText={`${formData.name.length}/${MAX_NAME_LENGTH}자`}
                fullWidth
                required
              />

              <S.StyledSectionSubTitle>권한 설명</S.StyledSectionSubTitle>
              <TextField
                label="설명"
                value={formData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_DESCRIPTION_LENGTH) {
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                }}
                placeholder="권한 설명을 입력하세요"
                helperText={`${formData.description.length}/${MAX_DESCRIPTION_LENGTH}자`}
                multiline
                rows={5}
                fullWidth
                required
                disabled={isUploading}
              />
            </S.StyledFormSection>
          </S.StyledLeftColumn>

          <S.StyledRightColumn>
            <S.StyledFormSection>
              <S.StyledSectionTitle>메뉴 권한 설정</S.StyledSectionTitle>

              <DataTable
                columns={columns}
                data={roleMenus}
                selectable
                selectedIds={formData.selectedMenuIds.map(String)}
                onSelectionChange={(ids) => setFormData(prev => ({
                  ...prev,
                  selectedMenuIds: ids.map(Number)
                }))}
                getRowId={(row) => String(row.menu_idx)}
              />
            </S.StyledFormSection>
          </S.StyledRightColumn>
        </S.StyledContent>
      </BaseCreateModal >

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </>
  );
};

export default RoleCreateModal;
