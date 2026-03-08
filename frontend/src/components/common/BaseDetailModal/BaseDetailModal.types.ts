import { ReactNode } from 'react';
import { ModalSize } from '@/styles/modalSizes';

export interface BaseDetailModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSuccess?: () => void;
  children: ReactNode;
  size?: ModalSize;
  loading?: boolean;

  // 편집 모드 관련
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;

  // 커스텀 액션
  customActions?: ReactNode;

  // 편집 모드 텍스트
  editText?: string;
  saveText?: string;
  cancelText?: string;
}
