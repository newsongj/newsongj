import { ReactNode } from 'react';
import { ModalSize } from '@/styles/modalSizes';

export interface BaseCreateModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSuccess?: () => void;
  onSubmit: () => void | Promise<void>;
  children: ReactNode;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitText?: string;
  cancelText?: string;
  size?: ModalSize;
}
