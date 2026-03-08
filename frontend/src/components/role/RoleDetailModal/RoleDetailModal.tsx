import React, { useState, useEffect } from 'react';
import { DataTable } from '@components/common/DataTable';
import { Snackbar } from '@components/common/Snackbar';
import { BaseDetailModal } from '@components/common/BaseDetailModal';
import { Column } from '@components/common/DataTable/DataTable.types';
import { Badge } from '@components/common/Badge';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { RoleMenuResponse } from '@/models/role.types';
import { usePermissionManagement } from '@/hooks/role/usePermissionManagement';
import { RoleDetailModalProps } from './RoleDetailModal.types';
import * as S from './RoleDetailModal.styles';

const RoleDetailModal: React.FC<RoleDetailModalProps> = ({ onSuccess }) => {
  const {
    detailModal,
    closeDetailModal,
    roleDetail,
    roleMenus,
    loadRoleMenus,
    loadRoleDetail,
    updateRoleData
  } = usePermissionManagement();

  const [isEditing, setIsEditing] = useState(false);
  const [originalSelectedMenuIds, setOriginalSelectedMenuIds] = useState<number[]>([]);
  const [updating, setUpdating] = useState(false);
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();
  const [editData, setEditData] = useState({
    menu_ids: [] as number[],
    is_activated: false as boolean,
  });

  const filteredRoleMenus = roleMenus.filter(menu => roleDetail?.selected_menu_ids.includes(menu.menu_idx));

  // 권한 상세 정보 로드
  useEffect(() => {
    if (detailModal.open && detailModal.roleData) {
      loadRoleDetail(detailModal.roleData.role_idx);
      loadRoleMenus();
    }
  }, [detailModal.open, detailModal.roleData, loadRoleDetail, loadRoleMenus]);

  useEffect(() => {
    if (roleDetail) {
      setEditData({
        menu_ids: roleDetail.selected_menu_ids || [],
        is_activated: roleDetail.is_activated
      });
      setOriginalSelectedMenuIds(roleDetail.selected_menu_ids || []);

    }
  }, [roleDetail]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!roleDetail) return;

    setUpdating(true);
    try {
      const success = await updateRoleData(roleDetail.role_idx, editData);
      if (success) {
        showSnackbar('권한이 성공적으로 수정되었습니다.', 'success');
        setIsEditing(false);
        setOriginalSelectedMenuIds(editData.menu_ids);
        onSuccess?.();
      } else {
        showSnackbar('권한 수정에 실패했습니다.', 'error');
      }
    } catch (error) {
      showSnackbar('권한 수정 중 오류가 발생했습니다.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (roleDetail) {
      setEditData({
        menu_ids: roleDetail.selected_menu_ids || [],
        is_activated: roleDetail.is_activated
      });
    }
  };

  const hasChanges =
    editData.is_activated !== (roleDetail?.is_activated || false) ||
    JSON.stringify([...editData.menu_ids].sort()) !== JSON.stringify([...originalSelectedMenuIds].sort());

  const columns: Column<RoleMenuResponse>[] = [
    {
      id: 'menu_idx',
      label: '번호',
      minWidth: 80,
      render: (_value, row) => {
        const dataToUse = isEditing ? roleMenus : filteredRoleMenus;
        const index = dataToUse.findIndex(m => m.menu_idx === row.menu_idx);
        return index + 1;
      },
      align: 'center' as const,
    },
    {
      id: 'name',
      label: '메뉴명',
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

  return (
    <>
      <BaseDetailModal
        open={detailModal.open}
        title="권한 상세"
        onClose={closeDetailModal}
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
                <S.StyledLabel>권한명:</S.StyledLabel>
                <S.StyledValue>
                  <Badge variant={'info'} size="small">
                    {roleDetail?.name || '-'}
                  </Badge>
                </S.StyledValue>
              </S.StyledInfoRow>

              <S.StyledInfoRow>
                <S.StyledLabel>설명:</S.StyledLabel>
                <S.StyledValue>{roleDetail?.description || '-'}</S.StyledValue>
              </S.StyledInfoRow>

              <S.StyledInfoRow>
                <S.StyledLabel>활성화:</S.StyledLabel>
                {isEditing ? (
                  <S.StyledFormControlLabel
                    control={
                      <S.StyledSwitch
                        checked={editData.is_activated}
                        onChange={(e) => setEditData(prev => ({
                          ...prev,
                          is_activated: e.target.checked
                        })
                        )}
                      />
                    }
                    label
                  />
                ) : (
                  <S.StyledSwitch
                    checked={editData.is_activated}
                    disabled={true}
                  />

                )}
              </S.StyledInfoRow>
            </S.StyledFormSection>
          </S.StyledLeftColumn>

          <S.StyledRightColumn>
            <S.StyledFormSection>
              <S.StyledSectionTitle>메뉴 권한 설정</S.StyledSectionTitle>
              <DataTable
                columns={columns}
                data={isEditing ? roleMenus : filteredRoleMenus}
                selectable={isEditing}
                selectedIds={isEditing ? editData.menu_ids.map(String) : undefined}
                onSelectionChange={(ids) =>
                  setEditData(prev => ({
                    ...prev,
                    menu_ids: ids.map(Number)
                  })
                  )}
                getRowId={(row) => String(row.menu_idx)}
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

export default RoleDetailModal;
