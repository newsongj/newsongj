import React from 'react';
import { Button } from '@components/common/Button';
import { CircularProgressIndicator } from '@components/common/CircularProgressIndicator';
import { BaseModal } from '@components/common/BaseModal';
import { BaseCreateModalProps } from './BaseCreateModal.types';

const BaseCreateModal: React.FC<BaseCreateModalProps> = ({
  open,
  title,
  onClose,
  onSubmit,
  children,
  isSubmitting = false,
  submitDisabled = false,
  submitText = '생성',
  cancelText = '취소',
  size = 'xlarge',
}) => {
  const handleSubmit = async () => {
    await onSubmit();
  };

  const actions = (
    <>
      <Button
        variant="outlined"
        onClick={onClose}
        disabled={isSubmitting}
      >
        {cancelText}
      </Button>
      <Button
        variant="filled"
        onClick={handleSubmit}
        disabled={submitDisabled || isSubmitting}
        startIcon={isSubmitting ? <CircularProgressIndicator size={14} /> : undefined}
      >
        {isSubmitting ? `${submitText} 중...` : submitText}
      </Button>
    </>
  );

  return (
    <BaseModal
      open={open}
      title={title}
      onClose={onClose}
      actions={actions}
      size={size}
    >
      {children}
    </BaseModal>
  );
};

export default BaseCreateModal;
