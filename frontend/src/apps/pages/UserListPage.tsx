import React, { useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import { Snackbar } from '@components/common/Snackbar';
import Popup from '@components/common/Popup';
import { Column } from '@components/common/DataTable/DataTable.types';
import { SearchOption, ActionButton } from '@components/common/SearchToolbar/SearchToolbar.types';
import { UserListCreatePage, UserListManagementPage } from '@components/user';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { UserListFormValue } from '@components/user/userListForm.types';

interface StudentRow {
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

interface FilterState {
  year: string;
  parish: string;
  team: string;
  group: string;
  generation: string;
}

const initialRows: StudentRow[] = [
  {
    id: 1,
    year: '2026년',
    parish: '1교구',
    team: '1팀',
    group: '1그룹',
    name: '김민서',
    gender: '여',
    generation: '37기',
    phone: '010-1234-5678',
    birthDate: '1998-01-01',
    role: '그룹장',
    createdAt: '2026-02-10',
    memberType: '토요예배',
    attendanceGrade: 'A',
    pltCompleted: '수료',
    schoolWork: '연세대학교',
    major: '경영학',
    pid: '10021',
  },
  {
    id: 2,
    year: '2026년',
    parish: '2교구',
    team: '2팀',
    group: '2그룹',
    name: '박지훈',
    gender: '남',
    generation: '46기',
    phone: '010-7777-2222',
    birthDate: '2007-08-11',
    role: '새가족 리더',
    createdAt: '2026-01-29',
    memberType: '주일예배',
    attendanceGrade: 'B',
    pltCompleted: '1학기 수료',
    schoolWork: '삼성전자',
    major: '컴퓨터공학',
    pid: '09873',
  },
];

const searchOptions: SearchOption[] = [
  { value: 'name', label: '이름' },
  { value: 'generation', label: '기수' },
  { value: 'phone', label: '연락처' },
  { value: 'birthDate', label: '생년월일' },
  { value: 'role', label: '직분' },
  { value: 'createdAt', label: '등반일자' },
  { value: 'memberType', label: '교인구분' },
  { value: 'schoolWork', label: '학교 및 직장' },
  { value: 'major', label: '전공' },
  { value: 'pid', label: 'V8 PID' },
];

const columns: Column<StudentRow>[] = [
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

const FilterGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: theme.custom.spacing.sm,
}));

const createRowFromForm = (form: UserListFormValue, id: number): StudentRow => ({
  id,
  year: '2026년',
  parish: form.parish,
  team: form.team,
  group: form.group,
  name: form.name,
  gender: form.gender,
  generation: `${form.generation}기`,
  phone: form.phone || '-',
  birthDate: form.birthDate || '-',
  role: form.roles.join(', ') || '-',
  createdAt: new Date().toISOString().slice(0, 10),
  memberType: form.memberType || form.memberTypeText || '-',
  attendanceGrade: form.attendanceGrade || '-',
  pltCompleted: form.pltCompleted || '-',
  schoolWork: form.schoolWork || '-',
  major: form.major || '-',
  pid: `V8-${10000 + id}`,
});

const toFormFromRow = (row: StudentRow): UserListFormValue => ({
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

const UserListPage: React.FC = () => {
  const [rows, setRows] = useState<StudentRow[]>(initialRows);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState<{ keyword: string; attribute: string }>({ keyword: '', attribute: 'name' });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    year: '',
    parish: '',
    team: '',
    group: '',
    generation: '',
  });

  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  const selectedRow = useMemo(
    () => rows.find((row) => String(row.id) === selectedIds[0]) ?? null,
    [rows, selectedIds]
  );

  const filteredRows = useMemo(() => {
    const keyword = search.keyword.trim().toLowerCase();
    const searched = !keyword
      ? rows
      : rows.filter((row) => {
          const value = String(row[search.attribute as keyof StudentRow] ?? '').toLowerCase();
          return value.includes(keyword);
        });

    return searched.filter((row) => (
      (!filters.year || row.year === filters.year) &&
      (!filters.parish || row.parish === filters.parish) &&
      (!filters.team || row.team === filters.team) &&
      (!filters.group || row.group === filters.group) &&
      (!filters.generation || row.generation === filters.generation)
    ));
  }, [filters, rows, search]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  const toolbarActions: ActionButton[] = [
    {
      label: '교적 추가',
      variant: 'filled',
      startIcon: <AddIcon />,
      onClick: () => setCreateOpen(true),
    },
    {
      label: '교적 수정',
      variant: 'outlined',
      startIcon: <EditIcon />,
      disabled: selectedIds.length !== 1,
      onClick: () => setEditOpen(true),
    },
    {
      label: '교적 삭제',
      variant: 'destructive',
      startIcon: <DeleteIcon />,
      disabled: selectedIds.length === 0,
      onClick: () => setDeleteOpen(true),
    },
  ];

  const handleCreate = async (form: UserListFormValue) => {
    setIsSubmitting(true);
    try {
      const nextId = rows.length > 0 ? Math.max(...rows.map((row) => row.id)) + 1 : 1;
      setRows((prev) => [createRowFromForm(form, nextId), ...prev]);
      setCreateOpen(false);
      setPage(0);
      showSnackbar('교적이 추가되었습니다.', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (form: UserListFormValue) => {
    if (!selectedRow) return;
    setIsSubmitting(true);
    try {
      setRows((prev) => prev.map((row) => (row.id === selectedRow.id ? createRowFromForm(form, row.id) : row)));
      setEditOpen(false);
      showSnackbar('교적이 수정되었습니다.', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (deleteReason?: string) => {
    setIsSubmitting(true);
    try {
      const deletedCount = selectedIds.length;
      setRows((prev) => prev.filter((row) => !selectedIds.includes(String(row.id))));
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
        <FilterTitle>필터링 조건</FilterTitle>
        <FilterGrid>
          <Select
            value={filters.year}
            onChange={(value) => { setFilters((prev) => ({ ...prev, year: String(value) })); setPage(0); }}
            options={[{ value: '', label: '년도' }, { value: '2026년', label: '2026년' }]}
          />
          <Select
            value={filters.parish}
            onChange={(value) => { setFilters((prev) => ({ ...prev, parish: String(value) })); setPage(0); }}
            options={[{ value: '', label: '교구' }, { value: '1교구', label: '1교구' }, { value: '2교구', label: '2교구' }, { value: '3교구', label: '3교구' }]}
          />
          <Select
            value={filters.team}
            onChange={(value) => { setFilters((prev) => ({ ...prev, team: String(value) })); setPage(0); }}
            options={[{ value: '', label: '팀' }, ...Array.from({ length: 12 }, (_, idx) => ({ value: `${idx + 1}팀`, label: `${idx + 1}팀` }))]}
          />
          <Select
            value={filters.group}
            onChange={(value) => { setFilters((prev) => ({ ...prev, group: String(value) })); setPage(0); }}
            options={[{ value: '', label: '그룹' }, ...Array.from({ length: 4 }, (_, idx) => ({ value: `${idx + 1}그룹`, label: `${idx + 1}그룹` }))]}
          />
          <Select
            value={filters.generation}
            onChange={(value) => { setFilters((prev) => ({ ...prev, generation: String(value) })); setPage(0); }}
            options={[{ value: '', label: '기수' }, ...Array.from({ length: 15 }, (_, idx) => ({ value: `${idx + 35}기`, label: `${idx + 35}기` }))]}
          />
        </FilterGrid>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={pagedRows}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(row) => String(row.id)}
        useSearchToolbar
        searchPlaceholder="검색어를 입력하세요"
        searchOptions={searchOptions}
        onSearch={(value, attribute) => {
          setSearch({ keyword: value, attribute: attribute || 'name' });
          setPage(0);
        }}
        toolbarActions={toolbarActions}
        selectedActions={() => setDeleteOpen(true)}
        showToolbarActionsWhenSelected
        pagination={{
          page,
          rowsPerPage,
          totalCount: filteredRows.length,
          onPageChange: setPage,
          onRowsPerPageChange: (newRowsPerPage) => {
            setRowsPerPage(newRowsPerPage);
            setPage(0);
          },
        }}
      />

      <UserListCreatePage
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <UserListManagementPage
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

export default UserListPage;
