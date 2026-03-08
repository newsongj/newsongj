import { UserListFormValue } from '../userListForm.types';

export interface UserListCreatePageProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: UserListFormValue) => void | Promise<void>;
  isSubmitting?: boolean;
}

