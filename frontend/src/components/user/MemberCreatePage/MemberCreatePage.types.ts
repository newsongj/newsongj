import { MemberFormValue } from '../memberForm.types';

export interface MemberCreatePageProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: MemberFormValue) => void | Promise<void>;
  isSubmitting?: boolean;
}
