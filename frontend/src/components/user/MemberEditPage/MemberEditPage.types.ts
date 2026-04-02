import { MemberFormValue } from '../memberForm.types';

export interface MemberEditPageProps {
  open: boolean;
  value: MemberFormValue | null;
  onClose: () => void;
  onSubmit: (value: MemberFormValue) => void | Promise<void>;
  isSubmitting?: boolean;
}
