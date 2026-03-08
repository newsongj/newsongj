import React from 'react';
import { Button } from '@components/common/Button';
import { CircularProgressIndicator } from '@components/common/CircularProgressIndicator';
import { BaseModal } from '@components/common/BaseModal';
import { BaseDetailModalProps } from './BaseDetailModal.types';

const BaseDetailModal: React.FC<BaseDetailModalProps> = ({
  open,
  title,
  onClose,
  children,
  size = 'xlarge',
  loading = false,

  // 편집 모드 관련
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
  hasChanges = false,

  // 커스텀 액션
  customActions,

  // 텍스트
  editText = '편집',
  saveText = '저장',
  cancelText = '취소',
}) => {
  const handleSave = async () => {
    if (onSave) {
      await onSave();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const renderActions = () => {
    if (customActions) {
      return customActions;
    }

    if (isEditing) {
      return (
        <>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {cancelText}
          </Button>
          <Button
            variant="filled"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            startIcon={isSaving ? <CircularProgressIndicator size={16} /> : undefined}
          >
            {isSaving ? `${saveText} 중...` : saveText}
          </Button>
        </>
      );
    }

    if (onEdit) {
      return (
        <Button
          variant="filled"
          onClick={onEdit}
        >
          {editText}
        </Button>
      );
    }

    return null;
  };

  return (
    <BaseModal
      open={open}
      title={title}
      onClose={onClose}
      loading={loading}
      actions={renderActions()}
      size={size}
    >
      {children}
    </BaseModal>
  );
};

export default BaseDetailModal;
