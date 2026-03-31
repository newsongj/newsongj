import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Button } from '@components/common/Button';
import { Select } from '@components/common/Select';
import { Snackbar } from '@components/common/Snackbar';
import Popup from '@components/common/Popup';
import { Column } from '@components/common/DataTable/DataTable.types';
import { SearchOption } from '@components/common/SearchToolbar/SearchToolbar.types';
import { MemberCreatePage, MemberEditPage } from '@components/user';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { MemberFormValue } from '@components/user/memberForm.types';
import { useMembers } from '@/hooks/member';
import { MemberRow } from '@/models/member.types';

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

const toFormFromRow = (row: DisplayRow): MemberFormValue => ({
  name: row.name,
  generation: row.generation.replace('기', ''),
  phone: row.phone === '-' ? '' : row.phone,
  birthDate: row.birthDate === '-' ? '' : row.birthDate,
  parish: row.parish,
  team: row.team,
  group: row.group,
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

const MemberListPage: React.FC = () => {
  const {
    members,
    pagination,
    selectedIds,
    page,
    rowsPerPage,
    filters,
    loadMembers,
    handlePageChange,
    handleRowsPerPageChange,
    handleFilterChange,
    handleSearch,
    setSelectedIds,
  } = useMembers();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  useEffect(() => {
    loadMembers(page, rowsPerPage, filters);
  }, []);

  const rows = useMemo(() => members.map(mapToDisplayRow), [members]);

  const selectedRow = useMemo(
    () => rows.find((row) => String(row.id) === selectedIds[0]) ?? null,
    [rows, selectedIds]
  );

  const handleCreate = async (_form: MemberFormValue) => {
    setIsSubmitting(true);
    try {
      // TODO: 백엔드 POST API 연결 후 교체
      showSnackbar('교적이 추가되었습니다.', 'success');
      setCreateOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (_form: MemberFormValue) => {
    if (!selectedRow) return;
    setIsSubmitting(true);
    try {
      // TODO: 백엔드 PUT API 연결 후 교체
      showSnackbar('교적이 수정되었습니다.', 'success');
      setEditOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (deleteReason?: string) => {
    setIsSubmitting(true);
    try {
      const deletedCount = selectedIds.length;
      // TODO: 백엔드 DELETE API 연결 후 교체
      setSelectedIds([]);
      setDeleteOpen(false);
      showSnackbar(
        deleteReason?.trim()
          ? `${deletedCount}건의 교적이 삭제되었습니다. (사유: ${deleteReason.trim()})`
          : `${deletedCount}건의 교적이 삭제되었습니다.`,
        'success'
      );
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
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              교적 추가
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              disabled={selectedIds.length !== 1}
              onClick={() => setEditOpen(true)}
            >
              교적 수정
            </Button>
            <Button
              variant="destructive"
              startIcon={<DeleteIcon />}
              disabled={selectedIds.length === 0}
              onClick={() => setDeleteOpen(true)}
            >
              교적 삭제
            </Button>
          </FilterActions>
        </FilterHeader>
        <FilterGrid>
          <Select
            value={filters.year}
            onChange={(value) => handleFilterChange('year', String(value))}
            options={[{ value: '', label: '년도' }, { value: '2026년', label: '2026년' }]}
          />
          <Select
            value={filters.gyogu}
            onChange={(value) => handleFilterChange('gyogu', String(value))}
            options={[{ value: '', label: '교구' }, { value: '1교구', label: '1교구' }, { value: '2교구', label: '2교구' }, { value: '3교구', label: '3교구' }]}
          />
          <Select
            value={filters.team}
            onChange={(value) => handleFilterChange('team', String(value))}
            options={[{ value: '', label: '팀' }, ...Array.from({ length: 12 }, (_, idx) => ({ value: `${idx + 1}팀`, label: `${idx + 1}팀` }))]}
          />
          <Select
            value={filters.group_no}
            onChange={(value) => handleFilterChange('group_no', String(value))}
            options={[{ value: '', label: '그룹' }, ...Array.from({ length: 4 }, (_, idx) => ({ value: `${idx + 1}그룹`, label: `${idx + 1}그룹` }))]}
          />
          <Select
            value={filters.generation}
            onChange={(value) => handleFilterChange('generation', String(value))}
            options={[{ value: '', label: '기수' }, ...Array.from({ length: 15 }, (_, idx) => ({ value: `${idx + 35}기`, label: `${idx + 35}기` }))]}
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
        selectedActions={() => setDeleteOpen(true)}
        pagination={{
          page,
          rowsPerPage,
          totalCount: pagination.total_items,
          onPageChange: handlePageChange,
          onRowsPerPageChange: handleRowsPerPageChange,
        }}
      />

      <MemberCreatePage
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <MemberEditPage
        open={editOpen}
        value={selectedRow ? toFormFromRow(selectedRow) : null}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        isSubmitting={isSubmitting}
      />

      {deleteOpen && (
        <Popup
          title="교적 삭제"
          description={`선택한 ${selectedIds.length}명의 교적을 삭제하시겠습니까?`}
          showInput
          caption="삭제 전 사유를 입력해 주세요."
          maxLength={50}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          cancelButtonText="취소"
          confirmButtonText={isSubmitting ? '삭제 중...' : '삭제'}
          confirmButtonVariant="error"
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

export default MemberListPage;
