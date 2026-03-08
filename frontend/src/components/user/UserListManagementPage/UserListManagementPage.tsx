import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { BaseDetailModal } from '@components/common/BaseDetailModal';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { SearchableSelect } from '@components/common/SearchableSelect';
import {
  UserListFormValue,
  USER_LIST_ATTENDANCE_OPTIONS,
  USER_LIST_MEMBER_TYPE_OPTIONS,
  USER_LIST_PLT_OPTIONS,
  USER_LIST_ROLE_OPTIONS,
} from '../userListForm.types';
import { UserListManagementPageProps } from './UserListManagementPage.types';

const REQUIRED_KEYS: Array<keyof UserListFormValue> = ['name', 'gender', 'generation', 'parish', 'team', 'group'];

const EMPTY_FORM: UserListFormValue = {
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

const FormGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg,
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

const FullWidthBlock = styled(FieldBlock)({
  gridColumn: '1 / -1',
});

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
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const UserListManagementPage: React.FC<UserListManagementPageProps> = ({ open, value, onClose, onSubmit, isSubmitting = false }) => {
  const [form, setForm] = useState<UserListFormValue>(EMPTY_FORM);
  const [birthDateTouched, setBirthDateTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(value ?? EMPTY_FORM);
      setBirthDateTouched(false);
    }
  }, [open, value]);

  const errors = useMemo(() => {
    const next: Partial<Record<keyof UserListFormValue, string>> = {};
    REQUIRED_KEYS.forEach((key) => {
      const value = form[key];
      if (typeof value === 'string' && !value.trim()) next[key] = '필수 입력 항목입니다.';
    });
    if (!isBirthDateFormat(form.birthDate)) next.birthDate = '생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.';
    const phoneDigits = getPhoneDigits(form.phone);
    if (phoneDigits.length > 0 && phoneDigits.length !== 11) next.phone = '연락처는 11자로 입력해 주세요.';
    return next;
  }, [form]);

  const canSubmit = Object.keys(errors).length === 0;
  const roleOptions = USER_LIST_ROLE_OPTIONS.map((role) => ({ id: role, label: role, value: role }));

  return (
    <BaseDetailModal
      open={open}
      title="교적 수정"
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
    >
      <FormGrid>
        <FieldBlock>
          <FieldLabel>이름<Required>*</Required></FieldLabel>
          <ErrorTextFieldWrapper $error={Boolean(errors.name)}>
            <TextField
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
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
              options={[
                { value: '', label: '선택' },
                { value: '여', label: '여' },
                { value: '남', label: '남' },
              ]}
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
              onChange={(event) => {
                const nextValue = event.target.value;
                if (!/^\d*$/.test(nextValue)) return;
                setForm((prev) => ({ ...prev, generation: nextValue }));
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
                ...Array.from({ length: 12 }, (_, index) => ({ value: `${index + 1}팀`, label: `${index + 1}팀` })),
              ]}
              error={Boolean(errors.team)}
              helperText={errors.team}
              fullWidth
            />
          </ErrorSelectWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>그룹<Required>*</Required></FieldLabel>
          <ErrorSelectWrapper $error={Boolean(errors.group)}>
            <Select
              value={form.group}
              onChange={(value) => setForm((prev) => ({ ...prev, group: String(value) }))}
              options={[
                { value: '', label: '선택' },
                ...Array.from({ length: 4 }, (_, index) => ({ value: `${index + 1}그룹`, label: `${index + 1}그룹` })),
              ]}
              error={Boolean(errors.group)}
              helperText={errors.group}
              fullWidth
            />
          </ErrorSelectWrapper>
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>연락처</FieldLabel>
          <ErrorTextFieldWrapper $error={Boolean(errors.phone)}>
            <TextField
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: toPhoneNumber(event.target.value) }))}
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
              onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
              onBlur={() => setBirthDateTouched(true)}
              error={birthDateTouched && Boolean(errors.birthDate)}
              helperText={birthDateTouched && errors.birthDate ? errors.birthDate : '예: 2000-01-01'}
              fullWidth
            />
          </ErrorTextFieldWrapper>
        </FieldBlock>

        <FullWidthBlock>
          <FieldLabel>직분(다중 선택)</FieldLabel>
          <SearchableSelect
            multiple
            value={form.roles}
            onChange={(value) => setForm((prev) => ({ ...prev, roles: Array.isArray(value) ? value : [] }))}
            options={roleOptions}
            placeholder="직분을 선택하세요"
            fullWidth
          />
        </FullWidthBlock>

        <FieldBlock>
          <FieldLabel>교인구분</FieldLabel>
          <Select
            value={form.memberType}
            onChange={(value) => setForm((prev) => ({ ...prev, memberType: String(value) }))}
            options={[{ value: '', label: '선택' }, ...USER_LIST_MEMBER_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))]}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>출석등급</FieldLabel>
          <Select
            value={form.attendanceGrade}
            onChange={(value) => setForm((prev) => ({ ...prev, attendanceGrade: String(value) }))}
            options={[{ value: '', label: '선택' }, ...USER_LIST_ATTENDANCE_OPTIONS.map((option) => ({ value: option, label: option }))]}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>PLT 수료여부</FieldLabel>
          <Select
            value={form.pltCompleted}
            onChange={(value) => setForm((prev) => ({ ...prev, pltCompleted: String(value) }))}
            options={[{ value: '', label: '선택' }, ...USER_LIST_PLT_OPTIONS.map((option) => ({ value: option, label: option }))]}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>학교 및 직장</FieldLabel>
          <TextField
            value={form.schoolWork}
            onChange={(event) => setForm((prev) => ({ ...prev, schoolWork: event.target.value }))}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>전공</FieldLabel>
          <TextField
            value={form.major}
            onChange={(event) => setForm((prev) => ({ ...prev, major: event.target.value }))}
            fullWidth
          />
        </FieldBlock>

        <FieldBlock>
          <FieldLabel>V8 PID</FieldLabel>
          <TextField
            value={form.pid}
            onChange={(event) => setForm((prev) => ({ ...prev, pid: event.target.value }))}
            fullWidth
          />
        </FieldBlock>
        
      </FormGrid>
    </BaseDetailModal>
  );
};

export default UserListManagementPage;

