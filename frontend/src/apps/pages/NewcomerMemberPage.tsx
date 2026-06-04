import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  HowToReg as HowToRegIcon,
} from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Button } from '@components/common/Button';
import { Select } from '@components/common/Select';
import { Snackbar } from '@components/common/Snackbar';
import Popup from '@components/common/Popup';
import { BaseCreateModal } from '@components/common/BaseCreateModal';
import { BaseDetailModal } from '@components/common/BaseDetailModal';
import { TextField } from '@components/common/TextField';
import { Column } from '@components/common/DataTable/DataTable.types';
import { SearchOption } from '@components/common/SearchToolbar/SearchToolbar.types';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { MemberFormValue, MEMBER_MEMBER_TYPE_OPTIONS } from '@components/user/memberForm.types';
import { useNewcomers } from '@/hooks/member';
import { MemberRow } from '@/models/member.types';
import {
  createNewcomer,
  deleteNewcomers,
  enrollNewcomer,
  enrollNewcomers,
  NewcomerBody,
  updateNewcomer,
} from '@/api/newcomer';

const REQUIRED_KEYS: Array<keyof MemberFormValue> = ['name', 'gender', 'generation', 'parish', 'team'];

const INITIAL_FORM: MemberFormValue = {
  name: '',
  generation: '',
  phone: '',
  birthDate: '',
  parish: '',
  team: '',
  group: '',
  gender: '',
  roles: [],
  memberType: '',
  memberTypeText: '',
  attendanceGrade: '',
  pltCompleted: '',
  schoolWork: '',
  major: '',
  pid: '',
};

interface DisplayRow {
  id: number;
  year: string;
  parish: string;
  team: string;
  group: string;
  name: string;
  gender: string;
  generation: string;
  phone: string;
  birthDate: string;
  role: string;
  createdAt: string;
  memberType: string;
  attendanceGrade: string;
  pltCompleted: string;
  schoolWork: string;
  major: string;
  pid: string;
}

const mapToDisplayRow = (item: MemberRow): DisplayRow => ({
  id: item.member_id,
  year: item.updated_at ? item.updated_at.slice(0, 4) : '-',
  parish: item.gyogu ? `${item.gyogu}교구` : '-',
  team: item.team ? `${item.team}팀` : '-',
  group: item.group_no !== null && item.group_no !== undefined ? `${item.group_no}그룹` : '-',
  name: item.name,
  gender: item.gender,
  generation: `${item.generation}기`,
  phone: item.phone_number || '-',
  birthDate: item.birthdate || '-',
  role: item.leader_names?.join(', ') || '-',
  createdAt: item.enrolled_at ? item.enrolled_at.slice(0, 10) : '-',
  memberType: item.member_type || '-',
  attendanceGrade: item.attendance_grade || '-',
  pltCompleted: item.plt_status || '-',
  schoolWork: item.school_work || '-',
  major: item.major || '-',
  pid: item.v8pid || '-',
});

const searchOptions: SearchOption[] = [
  { value: 'name', label: '이름' },
  { value: 'generation', label: '기수' },
  { value: 'phone_number', label: '연락처' },
  { value: 'birthdate', label: '생년월일' },
  { value: 'leader', label: '직분' },
  { value: 'enrolled_at', label: '등반일자' },
  { value: 'school_work', label: '학교 및 직장' },
  { value: 'major', label: '전공' },
  { value: 'v8pid', label: 'V8 PID' },
];

// ── 교육 이력 모달 ──────────────────────────────────────────────────────────

interface EduRecord {
  worship_date: string;
  status: 'PRESENT' | 'ABSENT';
  edu_week: 1 | 2 | 3 | null;
  memo: string;
}

// TODO: 백엔드 연동 시 API 호출로 교체
const getMockHistory = (memberId: number): EduRecord[] => {
  const variants: EduRecord[][] = [
    [],
    [{ worship_date: '2026-05-31', status: 'PRESENT', edu_week: 1, memo: '1주차 교육은 교회와 공동체에 대해서 진행하였음' }],
    [
      { worship_date: '2026-05-31', status: 'PRESENT', edu_week: 2, memo: '2주차 교육은 신앙 생활에 대해서 진행하였음' },
      { worship_date: '2026-05-24', status: 'PRESENT', edu_week: 1, memo: '밝은 분위기 속에서 잘 적응하는 듯해 보였음, 교육 중에는 신앙적인 고민을 많이 나누었음' },
    ],
    [
      { worship_date: '2026-05-31', status: 'ABSENT',  edu_week: null, memo: '' },
      { worship_date: '2026-05-24', status: 'PRESENT', edu_week: 2,    memo: '' },
      { worship_date: '2026-05-17', status: 'PRESENT', edu_week: 1,    memo: '첫 방문이라 목사님과 인사하고 교제함' },
    ],
    [
      { worship_date: '2026-05-31', status: 'PRESENT', edu_week: 3, memo: '3주차 교육은 예수님에 대해서 교육하였음' },
      { worship_date: '2026-05-24', status: 'PRESENT', edu_week: 2, memo: '2주차 교육 참여하면서 이전에 다녔던 교회에 대해서 나누고 신앙적인 고민도 나누었음' },
      { worship_date: '2026-05-17', status: 'PRESENT', edu_week: 1, memo: '첫 방문이라 목사님과 인사하고 교제함' },
    ],
  ];
  return variants[memberId % 5];
};

const ModalOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1300,
});

const ModalBox = styled('div')(({ theme }) => ({
  backgroundColor: '#fff',
  borderRadius: theme.custom.borderRadius,
  width: '100%',
  maxWidth: 560,
  maxHeight: '80vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  margin: '0 16px',
}));

const ModalHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${theme.custom.spacing.md} ${theme.custom.spacing.lg}`,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const ModalTitle = styled('h3')(({ theme }) => ({
  margin: 0,
  fontSize: theme.custom.typography.subtitle.fontSize,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
}));

const ModalCloseBtn = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 18,
  color: theme.custom.colors.text.medium,
  '&:hover': { backgroundColor: theme.custom.colors.neutral._95 },
}));

const ModalBody = styled('div')(({ theme }) => ({
  padding: theme.custom.spacing.lg,
  overflowY: 'auto',
}));

const HistoryTable = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: theme.custom.typography.body2.fontSize,
  tableLayout: 'fixed',
  '@media (max-width: 560px)': { display: 'none' },
}));

const HistoryTh = styled('th')(({ theme }) => ({
  padding: '8px 12px',
  textAlign: 'center',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  color: theme.custom.colors.text.high,
  backgroundColor: theme.custom.colors.neutral._95,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const HistoryTd = styled('td')(({ theme }) => ({
  padding: '8px 12px',
  textAlign: 'center',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
  color: theme.custom.colors.text.high,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const MemoTd = styled('td')(({ theme }) => ({
  padding: '8px 12px',
  textAlign: 'left',
  verticalAlign: 'top',
  wordBreak: 'break-word',
  color: theme.custom.colors.text.high,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const HistoryCardList = styled('div')(({ theme }) => ({
  display: 'none',
  flexDirection: 'column',
  gap: theme.custom.spacing.sm,
  '@media (max-width: 560px)': { display: 'flex' },
}));

const HistoryCard = styled('div')(({ theme }) => ({
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  padding: theme.custom.spacing.md,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.xs,
}));

const CardRow = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.custom.spacing.sm,
  fontSize: theme.custom.typography.body2.fontSize,
  alignItems: 'flex-start',
}));

const CardLabel = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.medium,
  fontWeight: 600,
  minWidth: 56,
  flexShrink: 0,
}));

const CardValue = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.high,
  wordBreak: 'break-word',
  flex: 1,
}));

const EmptyHistory = styled('div')(({ theme }) => ({
  textAlign: 'center',
  padding: '40px 0',
  color: theme.custom.colors.text.medium,
  fontSize: theme.custom.typography.body2.fontSize,
}));

interface HistoryModalProps {
  memberId: number;
  memberName: string;
  onClose: () => void;
}

const NewcomerHistoryModal: React.FC<HistoryModalProps> = ({ memberId, memberName, onClose }) => {
  const records = getMockHistory(memberId);
  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{memberName} · 교육 이력</ModalTitle>
          <ModalCloseBtn onClick={onClose}>✕</ModalCloseBtn>
        </ModalHeader>
        <ModalBody>
          {records.length === 0 ? (
            <EmptyHistory>교육 이력이 없습니다.</EmptyHistory>
          ) : (
            <>
              {/* 데스크톱: 테이블 */}
              <HistoryTable>
                <colgroup>
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '110px' }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <HistoryTh>날짜</HistoryTh>
                    <HistoryTh>출석여부</HistoryTh>
                    <HistoryTh>교육주차</HistoryTh>
                    <HistoryTh style={{ textAlign: 'left' }}>교육 메모</HistoryTh>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i}>
                      <HistoryTd>{r.worship_date}</HistoryTd>
                      <HistoryTd style={{ color: r.status === 'PRESENT' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                        {r.status === 'PRESENT' ? '출석' : '결석'}
                      </HistoryTd>
                      <HistoryTd>{r.edu_week ? `${r.edu_week}주차 교육` : '-'}</HistoryTd>
                      <MemoTd>{r.memo || '-'}</MemoTd>
                    </tr>
                  ))}
                </tbody>
              </HistoryTable>

              {/* 모바일: 카드 */}
              <HistoryCardList>
                {records.map((r, i) => (
                  <HistoryCard key={i}>
                    <CardRow>
                      <CardLabel>날짜</CardLabel>
                      <CardValue>{r.worship_date}</CardValue>
                    </CardRow>
                    <CardRow>
                      <CardLabel>출석여부</CardLabel>
                      <CardValue style={{ color: r.status === 'PRESENT' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                        {r.status === 'PRESENT' ? '출석' : '결석'}
                      </CardValue>
                    </CardRow>
                    <CardRow>
                      <CardLabel>교육주차</CardLabel>
                      <CardValue>{r.edu_week ? `${r.edu_week}주차 교육` : '-'}</CardValue>
                    </CardRow>
                    <CardRow>
                      <CardLabel>교육 메모</CardLabel>
                      <CardValue>{r.memo || '-'}</CardValue>
                    </CardRow>
                  </HistoryCard>
                ))}
              </HistoryCardList>
            </>
          )}
        </ModalBody>
      </ModalBox>
    </ModalOverlay>
  );
};

const FilterPanel = styled('section')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.sm,
  backgroundColor: theme.custom.colors.neutral._99,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  padding: theme.custom.spacing.md,
}));

const FilterTitle = styled('h3')(({ theme }) => ({
  margin: 0,
  fontSize: theme.custom.typography.body1.fontSize,
  lineHeight: theme.custom.typography.body1.lineHeight,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
}));

const FilterHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.custom.spacing.sm,
  '@media (max-width: 720px)': {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

const FilterActions = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.custom.spacing.sm,
  '@media (max-width: 720px)': {
    '& > *': {
      flex: '1 1 calc(50% - 8px)',
    },
  },
  '@media (max-width: 560px)': {
    '& > *': {
      flex: '1 1 100%',
    },
  },
}));

const FilterGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: theme.custom.spacing.sm,
  '& > *': {
    minWidth: 0,
    width: '100%',
  },
  '@media (max-width: 1100px)': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
  '@media (max-width: 760px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '@media (max-width: 560px)': {
    gridTemplateColumns: '1fr',
  },
}));

const FormGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg,
  '@media (max-width: 720px)': {
    gridTemplateColumns: '1fr',
    padding: theme.custom.spacing.md,
  },
}));

const FieldBlock = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.xs,
}));

const FieldLabel = styled('label')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.high,
}));

const Required = styled('span')(({ theme }) => ({
  color: theme.custom.colors.error,
  marginLeft: theme.custom.spacing.xs,
}));

const ErrorTextFieldWrapper = styled('div')<{ $error?: boolean }>(({ theme, $error }) => ({
  ...($error && {
    '& > div > div:first-of-type': {
      borderColor: `${theme.custom.colors.on.error} !important`,
    },
    '& > div > div:first-of-type:focus-within': {
      borderColor: `${theme.custom.colors.on.error} !important`,
    },
  }),
}));

const ErrorSelectWrapper = styled('div')<{ $error?: boolean }>(({ theme, $error }) => ({
  ...($error && {
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: `${theme.custom.colors.on.error} !important`,
    },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: `${theme.custom.colors.on.error} !important`,
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: `${theme.custom.colors.on.error} !important`,
    },
  }),
}));

const toPhoneNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const getPhoneDigits = (value: string) => value.replace(/\D/g, '');

const isBirthDateFormat = (value: string) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
};

const useFormValidation = (form: MemberFormValue, birthDateTouched: boolean) =>
  useMemo(() => {
    const next: Partial<Record<keyof MemberFormValue, string>> = {};

    REQUIRED_KEYS.forEach((key) => {
      const value = form[key];
      if (typeof value === 'string' && !value.trim()) next[key] = '필수 입력 항목입니다.';
    });

    if (!isBirthDateFormat(form.birthDate)) next.birthDate = '생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.';

    const phoneDigits = getPhoneDigits(form.phone);
    if (phoneDigits.length > 0 && phoneDigits.length !== 11) next.phone = '연락처는 11자리로 입력해 주세요.';

    return next;
  }, [birthDateTouched, form]);

const toFormFromRow = (row: DisplayRow): MemberFormValue => ({
  name: row.name,
  generation: row.generation.replace('기', ''),
  phone: row.phone === '-' ? '' : row.phone,
  birthDate: row.birthDate === '-' ? '' : row.birthDate,
  parish: row.parish === '-' ? '' : row.parish,
  team: row.team === '-' ? '' : row.team,
  group: row.group === '-' ? '' : row.group,
  gender: row.gender,
  roles: row.role === '-' ? [] : row.role.split(',').map((item) => item.trim()),
  memberType: row.memberType === '-' ? '' : row.memberType,
  memberTypeText: '',
  attendanceGrade: row.attendanceGrade === '-' ? '' : row.attendanceGrade,
  pltCompleted: row.pltCompleted === '-' ? '' : row.pltCompleted,
  schoolWork: row.schoolWork === '-' ? '' : row.schoolWork,
  major: row.major === '-' ? '' : row.major,
  pid: row.pid === '-' ? '' : row.pid,
});

const parseIntField = (value: string): number | undefined => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toApiBody = (form: MemberFormValue): NewcomerBody => ({
  name: form.name,
  gender: form.gender,
  generation: parseInt(form.generation, 10),
  phone_number: form.phone || undefined,
  birthdate: form.birthDate || undefined,
  gyogu: parseIntField(form.parish) as number,
  team: parseIntField(form.team) as number,
  group_no: parseIntField(form.group) as number,
  v8pid: form.pid || undefined,
  school_work: form.schoolWork || undefined,
  major: form.major || undefined,
});

const toEnrollPayload = (date: string, memberType: string) => ({
  enrolled_at: `${date}T00:00:00`,
  member_type: memberType,
});

interface NewcomerCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: MemberFormValue) => Promise<void>;
  isSubmitting: boolean;
}

const NewcomerCreateModal: React.FC<NewcomerCreateModalProps> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [form, setForm] = useState<MemberFormValue>(INITIAL_FORM);
  const [birthDateTouched, setBirthDateTouched] = useState(false);

  const errors = useFormValidation(form, birthDateTouched);
  const canSubmit = Object.keys(errors).length === 0;

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setBirthDateTouched(false);
    onClose();
  };

  const handleSubmit = async () => {
    setBirthDateTouched(true);
    if (!canSubmit) return;
    await onSubmit(form);
    setForm(INITIAL_FORM);
    setBirthDateTouched(false);
  };

  return (
    <BaseCreateModal
      open={open}
      title="새가족 추가"
      onClose={handleClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={!canSubmit || isSubmitting}
      submitText="추가"
      cancelText="취소"
      size="xlarge"
    >
      <FormGrid>
        <FieldBlock>
          <FieldLabel>이름<Required>*</Required></FieldLabel>
          <ErrorTextFieldWrapper $error={Boolean(errors.name)}>
            <TextField
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              error={Boolean(errors.name)}
              helperText={errors.name}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>성별<Required>*</Required></FieldLabel>
          <ErrorSelectWrapper $error={Boolean(errors.gender)}>
            <Select
              value={form.gender}
              onChange={(value) => setForm((prev) => ({ ...prev, gender: String(value) }))}
              options={[{ value: '', label: '선택' }, { value: '여', label: '여' }, { value: '남', label: '남' }]}
              error={Boolean(errors.gender)}
              helperText={errors.gender}
              fullWidth
            />
          </ErrorSelectWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>기수<Required>*</Required></FieldLabel>
          <ErrorTextFieldWrapper $error={Boolean(errors.generation)}>
            <TextField
              value={form.generation}
              onChange={(e) => {
                if (!/^\d*$/.test(e.target.value)) return;
                setForm((prev) => ({ ...prev, generation: e.target.value }));
              }}
              inputMode="numeric"
              error={Boolean(errors.generation)}
              helperText={errors.generation || '숫자만 입력 가능합니다.'}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>교구<Required>*</Required></FieldLabel>
          <ErrorSelectWrapper $error={Boolean(errors.parish)}>
            <Select
              value={form.parish}
              onChange={(value) => setForm((prev) => ({ ...prev, parish: String(value) }))}
              options={[
                { value: '', label: '선택' },
                { value: '1교구', label: '1교구' },
                { value: '2교구', label: '2교구' },
                { value: '3교구', label: '3교구' },
              ]}
              error={Boolean(errors.parish)}
              helperText={errors.parish}
              fullWidth
            />
          </ErrorSelectWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>팀<Required>*</Required></FieldLabel>
          <ErrorSelectWrapper $error={Boolean(errors.team)}>
            <Select
              value={form.team}
              onChange={(value) => setForm((prev) => ({ ...prev, team: String(value) }))}
              options={[
                { value: '', label: '선택' },
                ...Array.from({ length: 12 }, (_, i) => ({ value: `${i + 1}팀`, label: `${i + 1}팀` })),
              ]}
              error={Boolean(errors.team)}
              helperText={errors.team}
              fullWidth
            />
          </ErrorSelectWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>그룹</FieldLabel>
          <Select
            value={form.group}
            onChange={(value) => setForm((prev) => ({ ...prev, group: String(value) }))}
            options={[
              { value: '', label: '선택' },
              ...Array.from({ length: 5 }, (_, i) => ({ value: `${i}그룹`, label: `${i}그룹` })),
            ]}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>연락처</FieldLabel>
          <ErrorTextFieldWrapper $error={Boolean(errors.phone)}>
            <TextField
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: toPhoneNumber(e.target.value) }))}
              error={Boolean(errors.phone)}
              helperText={errors.phone || '예: 010-1234-5678'}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>생년월일</FieldLabel>
          <ErrorTextFieldWrapper $error={birthDateTouched && Boolean(errors.birthDate)}>
            <TextField
              value={form.birthDate}
              onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
              onBlur={() => setBirthDateTouched(true)}
              error={birthDateTouched && Boolean(errors.birthDate)}
              helperText={birthDateTouched && errors.birthDate ? errors.birthDate : '예: 2000-01-01'}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>학교 및 직장</FieldLabel>
          <TextField
            value={form.schoolWork}
            onChange={(e) => setForm((prev) => ({ ...prev, schoolWork: e.target.value }))}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>전공</FieldLabel>
          <TextField
            value={form.major}
            onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
            fullWidth
          />
        </FieldBlock>
      </FormGrid>
    </BaseCreateModal>
  );
};

interface NewcomerEditModalProps {
  open: boolean;
  value: MemberFormValue | null;
  onClose: () => void;
  onSubmit: (form: MemberFormValue) => Promise<void>;
  onEnroll: () => void;
  isSubmitting: boolean;
}

const NewcomerEditModal: React.FC<NewcomerEditModalProps> = ({
  open,
  value,
  onClose,
  onSubmit,
  onEnroll,
  isSubmitting,
}) => {
  const [form, setForm] = useState<MemberFormValue>(INITIAL_FORM);
  const [birthDateTouched, setBirthDateTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(value ?? INITIAL_FORM);
      setBirthDateTouched(false);
    }
  }, [open, value]);

  const errors = useFormValidation(form, birthDateTouched);
  const canSubmit = Object.keys(errors).length === 0;

  return (
    <BaseDetailModal
      open={open}
      title="새가족 수정"
      onClose={onClose}
      size="xlarge"
      isEditing
      onSave={async () => {
        setBirthDateTouched(true);
        if (!canSubmit) return;
        await onSubmit(form);
      }}
      onCancel={onClose}
      isSaving={isSubmitting}
      hasChanges={canSubmit}
      saveText="저장"
      cancelText="취소"
      customActions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            variant="outlined"
            startIcon={<HowToRegIcon />}
            onClick={onEnroll}
            disabled={isSubmitting}
            sx={{
              color: '#52c41a',
              borderColor: 'rgba(82, 196, 26, 0.25)',
              '&:hover': {
                borderColor: 'rgba(82, 196, 26, 0.25)',
                backgroundColor: 'rgba(82, 196, 26, 0.08)',
              },
              '&.Mui-disabled': { borderColor: 'rgba(0,0,0,0.12)' },
            }}
          >
            등반 처리
          </Button>
          <Button
            variant="filled"
            onClick={async () => {
              setBirthDateTouched(true);
              if (!canSubmit) return;
              await onSubmit(form);
            }}
            disabled={!canSubmit || isSubmitting}
          >
            저장
          </Button>
        </>
      }
    >
      <FormGrid>
        <FieldBlock>
          <FieldLabel>이름<Required>*</Required></FieldLabel>
          <ErrorTextFieldWrapper $error={Boolean(errors.name)}>
            <TextField
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              error={Boolean(errors.name)}
              helperText={errors.name}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>성별<Required>*</Required></FieldLabel>
          <ErrorSelectWrapper $error={Boolean(errors.gender)}>
            <Select
              value={form.gender}
              onChange={(value) => setForm((prev) => ({ ...prev, gender: String(value) }))}
              options={[{ value: '', label: '선택' }, { value: '여', label: '여' }, { value: '남', label: '남' }]}
              error={Boolean(errors.gender)}
              helperText={errors.gender}
              fullWidth
            />
          </ErrorSelectWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>기수<Required>*</Required></FieldLabel>
          <ErrorTextFieldWrapper $error={Boolean(errors.generation)}>
            <TextField
              value={form.generation}
              onChange={(e) => {
                if (!/^\d*$/.test(e.target.value)) return;
                setForm((prev) => ({ ...prev, generation: e.target.value }));
              }}
              inputMode="numeric"
              error={Boolean(errors.generation)}
              helperText={errors.generation || '숫자만 입력 가능합니다.'}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>교구<Required>*</Required></FieldLabel>
          <ErrorSelectWrapper $error={Boolean(errors.parish)}>
            <Select
              value={form.parish}
              onChange={(value) => setForm((prev) => ({ ...prev, parish: String(value) }))}
              options={[
                { value: '', label: '선택' },
                { value: '1교구', label: '1교구' },
                { value: '2교구', label: '2교구' },
                { value: '3교구', label: '3교구' },
              ]}
              error={Boolean(errors.parish)}
              helperText={errors.parish}
              fullWidth
            />
          </ErrorSelectWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>팀<Required>*</Required></FieldLabel>
          <ErrorSelectWrapper $error={Boolean(errors.team)}>
            <Select
              value={form.team}
              onChange={(value) => setForm((prev) => ({ ...prev, team: String(value) }))}
              options={[
                { value: '', label: '선택' },
                ...Array.from({ length: 12 }, (_, i) => ({ value: `${i + 1}팀`, label: `${i + 1}팀` })),
              ]}
              error={Boolean(errors.team)}
              helperText={errors.team}
              fullWidth
            />
          </ErrorSelectWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>그룹</FieldLabel>
          <Select
            value={form.group}
            onChange={(value) => setForm((prev) => ({ ...prev, group: String(value) }))}
            options={[
              { value: '', label: '선택' },
              ...Array.from({ length: 5 }, (_, i) => ({ value: `${i}그룹`, label: `${i}그룹` })),
            ]}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>연락처</FieldLabel>
          <ErrorTextFieldWrapper $error={Boolean(errors.phone)}>
            <TextField
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: toPhoneNumber(e.target.value) }))}
              error={Boolean(errors.phone)}
              helperText={errors.phone || '예: 010-1234-5678'}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>생년월일</FieldLabel>
          <ErrorTextFieldWrapper $error={birthDateTouched && Boolean(errors.birthDate)}>
            <TextField
              value={form.birthDate}
              onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
              onBlur={() => setBirthDateTouched(true)}
              error={birthDateTouched && Boolean(errors.birthDate)}
              helperText={birthDateTouched && errors.birthDate ? errors.birthDate : '예: 2000-01-01'}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>학교 및 직장</FieldLabel>
          <TextField
            value={form.schoolWork}
            onChange={(e) => setForm((prev) => ({ ...prev, schoolWork: e.target.value }))}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>전공</FieldLabel>
          <TextField
            value={form.major}
            onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
            fullWidth
          />
        </FieldBlock>
      </FormGrid>
    </BaseDetailModal>
  );
};

const NewcomerMemberPage: React.FC = () => {
  const {
    members,
    pagination,
    selectedIds,
    page,
    rowsPerPage,
    filters,
    error,
    loadMembers,
    handlePageChange,
    handleRowsPerPageChange,
    handleFilterChange,
    handleSearch,
    setSelectedIds,
  } = useNewcomers();

  const [historyMember, setHistoryMember] = useState<{ id: number; name: string } | null>(null);

  const columns = useMemo<Column<DisplayRow>[]>(() => [
    { id: 'no', label: '번호', minWidth: 72, align: 'center', render: (_value, row) => row.id },
    { id: 'parish', label: '교구', minWidth: 100, align: 'center' },
    { id: 'team', label: '팀', minWidth: 88, align: 'center' },
    { id: 'group', label: '그룹', minWidth: 88, align: 'center' },
    {
      id: 'name',
      label: '이름',
      minWidth: 96,
      align: 'center',
      render: (_value, row) => (
        <span
          role="button"
          style={{ cursor: 'pointer', color: '#1677ff', textDecoration: 'underline' }}
          onClick={(e) => { e.stopPropagation(); setHistoryMember({ id: row.id, name: row.name }); }}
        >
          {row.name}
        </span>
      ),
    },
    { id: 'gender', label: '성별', minWidth: 76, align: 'center' },
    { id: 'generation', label: '기수', minWidth: 84, align: 'center' },
    { id: 'phone', label: '연락처', minWidth: 140, align: 'center' },
    { id: 'birthDate', label: '생년월일', minWidth: 120, align: 'center' },
    { id: 'role', label: '직분', minWidth: 150, align: 'center' },
    { id: 'createdAt', label: '등반일자', minWidth: 120, align: 'center' },
    { id: 'attendanceGrade', label: '출석등급', minWidth: 98, align: 'center' },
    { id: 'pltCompleted', label: 'PLT 수료여부', minWidth: 126, align: 'center' },
    { id: 'schoolWork', label: '학교 및 직장', minWidth: 170, align: 'center' },
    { id: 'major', label: '전공', minWidth: 120, align: 'center' },
    { id: 'pid', label: 'V8 PID', minWidth: 120, align: 'center' },
  ], []);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false);
  const [singleEnrollOpen, setSingleEnrollOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollMemberType] = useState(MEMBER_MEMBER_TYPE_OPTIONS[0]);

  const todayStr = useMemo(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, []);

  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  useEffect(() => {
    loadMembers(page, rowsPerPage, filters);
  }, []);

  useEffect(() => {
    if (error) showSnackbar(error || '새가족 목록을 불러오지 못했습니다.', 'error');
  }, [error]);

  const rows = useMemo(() => members.map(mapToDisplayRow), [members]);

  const selectedRow = useMemo(
    () => rows.find((row) => String(row.id) === selectedIds[0]) ?? null,
    [rows, selectedIds]
  );

  const handleCreate = async (form: MemberFormValue) => {
    setIsSubmitting(true);
    try {
      await createNewcomer(toApiBody(form));
      showSnackbar('새가족이 추가되었습니다.', 'success');
      setCreateOpen(false);
      await loadMembers(page, rowsPerPage, filters);
    } catch (err: any) {
      showSnackbar(err?.message || '새가족 추가에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (form: MemberFormValue) => {
    if (!selectedRow) return;

    setIsSubmitting(true);
    try {
      await updateNewcomer(selectedRow.id, toApiBody(form));
      showSnackbar('새가족 정보가 수정되었습니다.', 'success');
      setEditOpen(false);
      await loadMembers(page, rowsPerPage, filters);
    } catch (err: any) {
      showSnackbar(err?.message || '새가족 정보 수정에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkEnroll = async () => {
    setIsSubmitting(true);
    try {
      const count = selectedIds.length;
      await enrollNewcomers(
        selectedIds.map((id) => parseInt(id, 10)),
        toEnrollPayload(todayStr, enrollMemberType)
      );
      setSelectedIds([]);
      setBulkEnrollOpen(false);
      showSnackbar(`${count}명의 새가족이 등반 처리되었습니다. (${todayStr})`, 'success');
      await loadMembers(page, rowsPerPage, filters);
    } catch (err: any) {
      showSnackbar(err?.message || '등반 처리에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleEnroll = async () => {
    if (!selectedRow) return;

    setIsSubmitting(true);
    try {
      await enrollNewcomer(selectedRow.id, toEnrollPayload(todayStr, enrollMemberType));
      setSingleEnrollOpen(false);
      setEditOpen(false);
      showSnackbar(`등반 처리되었습니다. (${todayStr})`, 'success');
      await loadMembers(page, rowsPerPage, filters);
    } catch (err: any) {
      showSnackbar(err?.message || '등반 처리에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (deleteReason?: string) => {
    const reason = deleteReason?.trim();
    if (!reason) {
      showSnackbar('삭제 사유를 입력해 주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const deletedCount = selectedIds.length;
      await deleteNewcomers(selectedIds.map((id) => parseInt(id, 10)), reason);
      setSelectedIds([]);
      setDeleteOpen(false);
      showSnackbar(`${deletedCount}건의 새가족이 삭제되었습니다. (사유: ${reason})`, 'success');
      await loadMembers(page, rowsPerPage, filters);
    } catch (err: any) {
      showSnackbar(err?.message || '새가족 삭제에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FilterPanel>
        <FilterHeader>
          <FilterTitle>필터링 조건</FilterTitle>
          <FilterActions>
            <Button variant="filled" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              새가족 추가
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              disabled={selectedIds.length !== 1}
              onClick={() => setEditOpen(true)}
            >
              새가족 수정
            </Button>
            <Button
              variant="outlined"
              startIcon={<HowToRegIcon />}
              disabled={selectedIds.length === 0}
              onClick={() => setBulkEnrollOpen(true)}
              sx={{
                color: '#52c41a',
                borderColor: 'rgba(82, 196, 26, 0.25)',
                '&:hover': {
                  borderColor: 'rgba(82, 196, 26, 0.25)',
                  backgroundColor: 'rgba(82, 196, 26, 0.08)',
                },
                '&.Mui-disabled': { borderColor: 'rgba(0,0,0,0.12)' },
              }}
            >
              등반 처리
            </Button>
            <Button
              variant="destructive"
              startIcon={<DeleteIcon />}
              disabled={selectedIds.length === 0}
              onClick={() => setDeleteOpen(true)}
            >
              새가족 삭제
            </Button>
          </FilterActions>
        </FilterHeader>
        <FilterGrid>
          <Select
            value={filters.year}
            onChange={(value) => handleFilterChange('year', String(value))}
            options={[
              { value: '', label: '연도' },
              { value: '2026년', label: '2026년' },
            ]}
          />
          <Select
            value={filters.gyogu}
            onChange={(value) => handleFilterChange('gyogu', String(value))}
            options={[
              { value: '', label: '교구' },
              { value: '1교구', label: '1교구' },
              { value: '2교구', label: '2교구' },
              { value: '3교구', label: '3교구' },
            ]}
          />
          <Select
            value={filters.team}
            onChange={(value) => handleFilterChange('team', String(value))}
            options={[
              { value: '', label: '팀' },
              ...Array.from({ length: 12 }, (_, idx) => ({ value: `${idx + 1}팀`, label: `${idx + 1}팀` })),
            ]}
          />
          <Select
            value={filters.group_no}
            onChange={(value) => handleFilterChange('group_no', String(value))}
            options={[
              { value: '', label: '그룹' },
              ...Array.from({ length: 5 }, (_, idx) => ({ value: `${idx}그룹`, label: `${idx}그룹` })),
            ]}
          />
          <Select
            value={filters.generation}
            onChange={(value) => handleFilterChange('generation', String(value))}
            options={[
              { value: '', label: '기수' },
              ...Array.from({ length: 15 }, (_, idx) => ({ value: `${idx + 35}기`, label: `${idx + 35}기` })),
            ]}
          />
        </FilterGrid>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={rows}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(row) => String(row.id)}
        useSearchToolbar
        searchPlaceholder="검색어를 입력해 주세요"
        searchOptions={searchOptions}
        onSearch={(keyword, field) => handleSearch(field || 'name', keyword)}
        selectedActions={() => setDeleteOpen(true)}
        pagination={{
          page,
          rowsPerPage,
          totalCount: pagination.total_items,
          onPageChange: handlePageChange,
          onRowsPerPageChange: handleRowsPerPageChange,
        }}
      />

      <NewcomerCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <NewcomerEditModal
        open={editOpen}
        value={selectedRow ? toFormFromRow(selectedRow) : null}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        onEnroll={() => setSingleEnrollOpen(true)}
        isSubmitting={isSubmitting}
      />

      {bulkEnrollOpen && (
        <Popup
          title="등반 처리"
          description={
            <>
              선택한 <strong style={{ color: '#52c41a' }}>{selectedIds.length}명</strong>을{' '}
              <strong style={{ color: '#52c41a' }}>등반 처리</strong>하시겠습니까?
              <br />
              <strong style={{ color: '#52c41a' }}>사용자 명단</strong>으로 이동되어 출석 관리 대상에 포함됩니다.
            </>
          }
          onCancel={() => setBulkEnrollOpen(false)}
          onConfirm={handleBulkEnroll}
          cancelButtonText="취소"
          confirmButtonText={isSubmitting ? '처리 중...' : '등반'}
          disabled={isSubmitting}
        />
      )}

      {singleEnrollOpen && (
        <Popup
          title="등반 처리"
          description={
            <>
              <strong style={{ color: '#52c41a' }}>{selectedRow?.name}</strong>을{' '}
              <strong style={{ color: '#52c41a' }}>등반 처리</strong>하시겠습니까?
              <br />
              <strong style={{ color: '#52c41a' }}>사용자 명단</strong>으로 이동되어 출석 관리 대상에 포함됩니다.
            </>
          }
          onCancel={() => setSingleEnrollOpen(false)}
          onConfirm={handleSingleEnroll}
          cancelButtonText="취소"
          confirmButtonText={isSubmitting ? '처리 중...' : '등반'}
          disabled={isSubmitting}
        />
      )}

      {deleteOpen && (
        <Popup
          title="새가족 삭제"
          description={`선택한 ${selectedIds.length}명의 새가족을 삭제하시겠습니까?`}
          showInput
          caption="삭제 사유를 입력해 주세요."
          maxLength={50}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          cancelButtonText="취소"
          confirmButtonText={isSubmitting ? '삭제 중...' : '삭제'}
          confirmButtonVariant="error"
          disabled={isSubmitting}
        />
      )}

      {historyMember && (
        <NewcomerHistoryModal
          memberId={historyMember.id}
          memberName={historyMember.name}
          onClose={() => setHistoryMember(null)}
        />
      )}

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </>
  );
};

export default NewcomerMemberPage;
