import { ReactNode } from 'react';
import { ModalSize } from '@/styles/modalSizes';

export interface BaseModalState {
  open: boolean;
  data?: any;
}

export interface BaseModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSuccess?: () => void;
  children: ReactNode;
  size?: ModalSize;
  loading?: boolean;
  actions?: ReactNode;
}

export interface BaseFormModalProps extends Omit<BaseModalProps, 'children'> {
  isSubmitting?: boolean;
  hasChanges?: boolean;
  onSubmit?: () => void | Promise<void>;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  children: ReactNode;
}
