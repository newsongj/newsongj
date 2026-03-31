import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { SettingsBackupRestore as RestoreIcon } from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import { Snackbar } from '@components/common/Snackbar';
import { BaseDetailModal } from '@components/common/BaseDetailModal';
import { TextField } from '@components/common/TextField';
import { Button } from '@components/common/Button';
import Popup from '@components/common/Popup';
import { Column } from '@components/common/DataTable/DataTable.types';
import { SearchOption } from '@components/common/SearchToolbar/SearchToolbar.types';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { useDeletedMembers } from '@/hooks/member';
import { DeletedMemberRow } from '@/models/member.types';

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
  deletedAt: string;
  deletedReason: string;
}

const mapToDisplayRow = (item: DeletedMemberRow): DisplayRow => ({
  id: item.member_id,
  year: item.year ? `${item.year.slice(0, 4)}년` : '-',
  parish: item.gyogu ? `${item.gyogu}교구` : '-',
  team: item.team ? `${item.team}팀` : '-',
  group: item.group_no ? `${item.group_no}그룹` : '-',
  name: item.name,
  gender: item.gender,
  generation: `${item.generation}기`,
  phone: item.phone_number || '-',
  birthDate: item.birthdate || '-',
  role: item.leader_ids || '-',
  createdAt: item.enrolled_at ? item.enrolled_at.slice(0, 10) : '-',
  memberType: item.member_type || '-',
  attendanceGrade: item.attendance_grade || '-',
  pltCompleted: item.plt_status || '-',
  schoolWork: item.school_work || '-',
  major: item.major || '-',
  pid: item.v8pid || '-',
  deletedAt: item.deleted_at ? item.deleted_at.replace('T', ' ').slice(0, 16) : '-',
  deletedReason: item.deleted_reason || '-',
});

const searchOptions: SearchOption[] = [
  { value: 'name', label: '이름' },
  { value: 'generation', label: '기수' },
  { value: 'phone_number', label: '연락처' },
  { value: 'birthdate', label: '생년월일' },
  { value: 'leader', label: '직분' },
  { value: 'enrolled_at', label: '등반일자' },
  { value: 'member_type', label: '교인구분' },
  { value: 'school_work', label: '학교 및 직장' },
  { value: 'major', label: '전공' },
  { value: 'v8pid', label: 'V8 PID' },
];

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

const FilterHeader = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const FilterActions = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.custom.spacing.sm,
}));

const FilterGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: theme.custom.spacing.sm,
}));

const DetailGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg,
}));

const HighlightText = styled('span')(({ theme }) => ({
  display: 'inline-block',
  padding: `2px ${theme.custom.spacing.xs}`,
  borderRadius: theme.custom.borderRadius,
  backgroundColor: theme.custom.colors.warning,
  color: theme.custom.colors.on.background,
  fontWeight: 700,
}));

const HighlightField = styled('div')(({ theme }) => ({
  '& label': {
    color: `${theme.custom.colors.primary._500} !important`,
    fontWeight: 700,
  },
  '& > div > div:first-of-type': {
    borderColor: `${theme.custom.colors.primary._500} !important`,
    borderWidth: '2px',
  },
}));


const DeletedMemberPage: React.FC = () => {
  const {
    items,
    pagination,
    selectedIds,
    page,
    rowsPerPage,
    filters,
    loadDeletedMembers,
    handlePageChange,
    handleRowsPerPageChange,
    handleFilterChange,
    handleSearch,
    handleRestore,
    setSelectedIds,
  } = useDeletedMembers();

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<DisplayRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  useEffect(() => {
    loadDeletedMembers(page, rowsPerPage, filters);
  }, []);

  const rows = useMemo(() => items.map(mapToDisplayRow), [items]);

  const columns: Column<DisplayRow>[] = [
    { id: 'no', label: '번호', minWidth: 72, align: 'center', render: (_value, row) => row.id },
    { id: 'parish', label: '교구', minWidth: 100, align: 'center' },
    { id: 'team', label: '팀', minWidth: 88, align: 'center' },
    { id: 'group', label: '그룹', minWidth: 88, align: 'center' },
    { id: 'name', label: '이름', minWidth: 96, align: 'center' },
    { id: 'gender', label: '성별', minWidth: 76, align: 'center' },
    { id: 'generation', label: '기수', minWidth: 84, align: 'center' },
    { id: 'phone', label: '연락처', minWidth: 140, align: 'center' },
    { id: 'birthDate', label: '생년월일', minWidth: 120, align: 'center' },
    { id: 'role', label: '직분', minWidth: 150, align: 'center' },
    { id: 'createdAt', label: '등반일자', minWidth: 120, align: 'center' },
    { id: 'memberType', label: '교인구분', minWidth: 110, align: 'center' },
    { id: 'attendanceGrade', label: '출석등급', minWidth: 98, align: 'center' },
    { id: 'pltCompleted', label: 'PLT 수료여부', minWidth: 126, align: 'center' },
    { id: 'schoolWork', label: '학교 및 직장', minWidth: 170, align: 'center' },
    { id: 'major', label: '전공', minWidth: 120, align: 'center' },
    { id: 'pid', label: 'V8 PID', minWidth: 120, align: 'center' },
    {
      id: 'deletedAt',
      label: '삭제일시',
      minWidth: 160,
      align: 'center',
      render: (value: string) => <HighlightText>{value}</HighlightText>,
    },
    {
      id: 'deletedReason',
      label: '삭제사유',
      minWidth: 180,
      align: 'center',
      render: (value: string) => <HighlightText>{value}</HighlightText>,
    },
  ];

  const handleRestoreSelected = async () => {
    setIsSubmitting(true);
    try {
      const count = selectedIds.length;
      await handleRestore(selectedIds.map(Number));
      setRestoreOpen(false);
      showSnackbar(`${count}명의 멤버를 복원했습니다.`, 'success');
    } catch (err: any) {
      showSnackbar(err?.message || '복원에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailRestore = async () => {
    if (!detailTarget) return;
    setIsSubmitting(true);
    try {
      await handleRestore([detailTarget.id]);
      setDetailOpen(false);
      setDetailTarget(null);
      showSnackbar('멤버를 복원했습니다.', 'success');
    } catch (err: any) {
      showSnackbar(err?.message || '복원에 실패했습니다.', 'error');
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
            <Button
              variant="filled"
              startIcon={<RestoreIcon />}
              disabled={selectedIds.length === 0}
              onClick={() => setRestoreOpen(true)}
            >
              교적 복원
            </Button>
          </FilterActions>
        </FilterHeader>
        <FilterGrid>
          <Select
            value={filters.year}
            onChange={(value) => handleFilterChange('year', String(value))}
            options={[{ value: '', label: '년도' }, { value: '2026', label: '2026년' }]}
          />
          <Select
            value={filters.gyogu}
            onChange={(value) => handleFilterChange('gyogu', String(value))}
            options={[{ value: '', label: '교구' }, { value: '1', label: '1교구' }, { value: '2', label: '2교구' }, { value: '3', label: '3교구' }]}
          />
          <Select
            value={filters.team}
            onChange={(value) => handleFilterChange('team', String(value))}
            options={[{ value: '', label: '팀' }, ...Array.from({ length: 12 }, (_, idx) => ({ value: `${idx + 1}`, label: `${idx + 1}팀` }))]}
          />
          <Select
            value={filters.group_no}
            onChange={(value) => handleFilterChange('group_no', String(value))}
            options={[{ value: '', label: '그룹' }, ...Array.from({ length: 4 }, (_, idx) => ({ value: `${idx + 1}`, label: `${idx + 1}그룹` }))]}
          />
          <Select
            value={filters.generation}
            onChange={(value) => handleFilterChange('generation', String(value))}
            options={[{ value: '', label: '기수' }, ...Array.from({ length: 15 }, (_, idx) => ({ value: `${idx + 35}`, label: `${idx + 35}기` }))]}
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
        searchPlaceholder="검색어를 입력하세요"
        searchOptions={searchOptions}
        onSearch={(keyword, field) => handleSearch(field || 'name', keyword)}
        onRowClick={(row) => {
          setDetailTarget(row);
          setDetailOpen(true);
        }}
        pagination={{
          page,
          rowsPerPage,
          totalCount: pagination.total_items,
          onPageChange: handlePageChange,
          onRowsPerPageChange: handleRowsPerPageChange,
        }}
      />

      <BaseDetailModal
        open={detailOpen}
        title="삭제 멤버 상세"
        onClose={() => {
          setDetailOpen(false);
          setDetailTarget(null);
        }}
        size="xlarge"
        customActions={(
          <>
            <Button
              variant="outlined"
              onClick={() => {
                setDetailOpen(false);
                setDetailTarget(null);
              }}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              variant="filled"
              onClick={handleDetailRestore}
              disabled={isSubmitting || !detailTarget}
              startIcon={<RestoreIcon />}
            >
              {isSubmitting ? '복원 중...' : '복원'}
            </Button>
          </>
        )}
      >
        {detailTarget && (
          <DetailGrid>
            <TextField label="번호" value={String(detailTarget.id)} readOnly fullWidth />
            <TextField label="년도" value={detailTarget.year} readOnly fullWidth />
            <TextField label="교구" value={detailTarget.parish} readOnly fullWidth />
            <TextField label="팀" value={detailTarget.team} readOnly fullWidth />
            <TextField label="그룹" value={detailTarget.group} readOnly fullWidth />
            <TextField label="이름" value={detailTarget.name} readOnly fullWidth />
            <TextField label="성별" value={detailTarget.gender} readOnly fullWidth />
            <TextField label="기수" value={detailTarget.generation} readOnly fullWidth />
            <TextField label="연락처" value={detailTarget.phone} readOnly fullWidth />
            <TextField label="생년월일" value={detailTarget.birthDate} readOnly fullWidth />
            <TextField label="직분" value={detailTarget.role} readOnly fullWidth />
            <TextField label="등반일자" value={detailTarget.createdAt} readOnly fullWidth />
            <TextField label="교인구분" value={detailTarget.memberType} readOnly fullWidth />
            <TextField label="출석등급" value={detailTarget.attendanceGrade} readOnly fullWidth />
            <TextField label="PLT 수료여부" value={detailTarget.pltCompleted} readOnly fullWidth />
            <TextField label="전공" value={detailTarget.major} readOnly fullWidth />
            <TextField label="V8 PID" value={detailTarget.pid} readOnly fullWidth />
            <TextField label="학교 및 직장" value={detailTarget.schoolWork} readOnly fullWidth />
            <HighlightField>
              <TextField label="삭제일시" value={detailTarget.deletedAt} readOnly fullWidth />
            </HighlightField>
            <HighlightField>
              <TextField label="삭제사유" value={detailTarget.deletedReason} readOnly fullWidth />
            </HighlightField>
          </DetailGrid>
        )}
      </BaseDetailModal>

      {restoreOpen && (
        <Popup
          title="교적 복원"
          description={`선택한 ${selectedIds.length}명의 멤버를 정말 복원하시겠습니까?`}
          onCancel={() => setRestoreOpen(false)}
          onConfirm={handleRestoreSelected}
          cancelButtonText="취소"
          confirmButtonText={isSubmitting ? '복원 중...' : '복원'}
          disabled={isSubmitting}
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

export default DeletedMemberPage;
