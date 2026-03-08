import { UserListFormValue } from '../userListForm.types';

export interface UserListManagementPageProps {
  open: boolean;
  value: UserListFormValue | null;
  onClose: () => void;
  onSubmit: (value: UserListFormValue) => void | Promise<void>;
  isSubmitting?: boolean;
}

