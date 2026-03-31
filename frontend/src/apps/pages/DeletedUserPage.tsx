import React, { useMemo, useState } from 'react';
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
  deletedAt: string;
  deletedReason: string;
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
    id: 101,
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
    deletedAt: '2026-03-01 10:12:33',
    deletedReason: '본인 요청',
  },
  {
    id: 102,
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
    deletedAt: '2026-03-02 16:45:10',
    deletedReason: '타교회로 인한 삭제',
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
  { value: 'deletedAt', label: '삭제일시' },
  { value: 'deletedReason', label: '삭제사유' },
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


const DeletedUserPage: React.FC = () => {
  const [rows, setRows] = useState<StudentRow[]>(initialRows);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState<{ keyword: string; attribute: string }>({ keyword: '', attribute: 'name' });
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<StudentRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    year: '',
    parish: '',
    team: '',
    group: '',
    generation: '',
  });

  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

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

  const restoreByIds = (targetIds: string[]) => {
    const restoreCount = targetIds.length;
    setRows((prev) => prev.filter((row) => !targetIds.includes(String(row.id))));
    setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)));
    showSnackbar(`${restoreCount}명의 사용자를 복원했습니다.`, 'success');
  };

  const handleRestore = async () => {
    setIsSubmitting(true);
    try {
      restoreByIds(selectedIds);
      setRestoreOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailRestore = async () => {
    if (!detailTarget) return;
    setIsSubmitting(true);
    try {
      restoreByIds([String(detailTarget.id)]);
      setDetailOpen(false);
      setDetailTarget(null);
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
        onRowClick={(row) => {
          setDetailTarget(row);
          setDetailOpen(true);
        }}
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

      <BaseDetailModal
        open={detailOpen}
        title="삭제 사용자 상세"
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
          description={`선택한 ${selectedIds.length}명의 사용자를 정말 복원하시겠습니까?`}
          onCancel={() => setRestoreOpen(false)}
          onConfirm={handleRestore}
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

export default DeletedUserPage;
