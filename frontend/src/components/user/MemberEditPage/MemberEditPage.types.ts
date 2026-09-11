import { MemberFormValue } from '../memberForm.types';

export interface MemberEditPageProps {
  open: boolean;
  value: MemberFormValue | null;
  onClose: () => void;
  onSubmit: (value: MemberFormValue) => void | Promise<void>;
  isSubmitting?: boolean;
  /** 새가족 교육 이력 조회용 — 이력이 있는 멤버에만 버튼을 노출한다 */
  memberId?: number;
  hasEducationRecord?: boolean;
}
