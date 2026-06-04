import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Popover } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { Snackbar } from '@components/common/Snackbar';
import Popup from '@components/common/Popup';
import { Column } from '@components/common/DataTable/DataTable.types';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { saveNewcomerAttendanceBatch } from '@/api/attendance';
import { AttendanceStatus, NewcomerAttendanceMemberRow, NewcomerUiStatus } from '@/models/attendance.types';
import {
  addDaysToDateKey,
  buildCalendarGrid,
  formatKstSaturdayLabel,
  getKstDateParts,
  getMostRecentSaturdayKey,
  parseDateKey,
} from '@/utils/kstDate';

interface NewcomerRow {
  memberId: number;
  name: string;
  generation: string;
  gender: string;
  gyogu: number;
  team: number;
  groupNo: number;
  status: NewcomerUiStatus | null;
  memo: string;
}

interface NewcomerChange {
  status: NewcomerUiStatus | null;
  memo: string;
}

interface FilterState {
  gyogu: string;
  team: string;
  groupNo: string;
}

interface Props {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const STATUS_OPTIONS = [
  { value: '',       label: '선택' },
  { value: 'ABSENT', label: <span style={{ color: '#ff4d4f', fontWeight: 600 }}>✕ 결석</span> },
  { value: 'EDU_1',  label: <span style={{ color: '#1677ff', fontWeight: 600 }}>1주차 교육</span> },
  { value: 'EDU_2',  label: <span style={{ color: '#1677ff', fontWeight: 600 }}>2주차 교육</span> },
  { value: 'EDU_3',  label: <span style={{ color: '#1677ff', fontWeight: 600 }}>3주차 교육</span> },
];

const GYOGU_OPTIONS = [
  { value: '', label: '교구 선택' },
  { value: '1', label: '1교구' },
  { value: '2', label: '2교구' },
  { value: '3', label: '3교구' },
];

const TEAM_OPTIONS = [
  { value: '', label: '팀 선택' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}팀` })),
];

const GROUP_OPTIONS = [
  { value: '', label: '그룹 선택' },
  ...Array.from({ length: 5 }, (_, i) => ({ value: String(i), label: `${i}그룹` })),
];

const toUiStatus = (status: AttendanceStatus | null, edu_week: 1 | 2 | 3 | null): NewcomerUiStatus | null => {
  if (!status) return null;
  if (status === 'ABSENT') return 'ABSENT';
  if (edu_week === 1) return 'EDU_1';
  if (edu_week === 2) return 'EDU_2';
  if (edu_week === 3) return 'EDU_3';
  return 'PRESENT';
};

const toDbFields = (uiStatus: NewcomerUiStatus): { status: AttendanceStatus; edu_week: 1 | 2 | 3 | null } => {
  if (uiStatus === 'EDU_1') return { status: 'PRESENT', edu_week: 1 };
  if (uiStatus === 'EDU_2') return { status: 'PRESENT', edu_week: 2 };
  if (uiStatus === 'EDU_3') return { status: 'PRESENT', edu_week: 3 };
  return { status: uiStatus as AttendanceStatus, edu_week: null };
};

const toNewcomerRow = (item: NewcomerAttendanceMemberRow): NewcomerRow => ({
  memberId: item.member_id,
  name: item.name,
  generation: `${item.generation}기`,
  gender: item.gender,
  gyogu: item.gyogu,
  team: item.team,
  groupNo: item.group_no,
  status: toUiStatus(item.status, item.edu_week),
  memo: item.memo ?? '',
});

// ── Mock data (백엔드 연동 전 테스트용) ──────────────────────────────────────

const MOCK_NEWCOMERS: NewcomerAttendanceMemberRow[] = [
  { member_id: 1001, name: '김새가족', generation: 46, gender: '남', gyogu: 1, team: 1, group_no: 1, status: null,      edu_week: null, memo: '' },
  { member_id: 1002, name: '이새가족', generation: 46, gender: '여', gyogu: 1, team: 1, group_no: 2, status: null,      edu_week: null, memo: '' },
  { member_id: 1003, name: '박새가족', generation: 46, gender: '남', gyogu: 1, team: 2, group_no: 1, status: 'PRESENT', edu_week: 1,    memo: '적응 중' },
  { member_id: 1004, name: '최새가족', generation: 46, gender: '여', gyogu: 1, team: 2, group_no: 2, status: 'PRESENT', edu_week: 2,    memo: '' },
  { member_id: 1005, name: '정새가족', generation: 46, gender: '남', gyogu: 2, team: 3, group_no: 1, status: null,      edu_week: null, memo: '' },
  { member_id: 1006, name: '강새가족', generation: 46, gender: '여', gyogu: 2, team: 3, group_no: 2, status: 'ABSENT',  edu_week: null, memo: '연락 안됨' },
  { member_id: 1007, name: '윤새가족', generation: 46, gender: '남', gyogu: 2, team: 4, group_no: 1, status: 'PRESENT', edu_week: 3,    memo: '' },
  { member_id: 1008, name: '장새가족', generation: 46, gender: '여', gyogu: 3, team: 5, group_no: 1, status: null,      edu_week: null, memo: '' },
  { member_id: 1009, name: '임새가족', generation: 46, gender: '남', gyogu: 3, team: 5, group_no: 2, status: null,      edu_week: null, memo: '' },
  { member_id: 1010, name: '오새가족', generation: 46, gender: '여', gyogu: 3, team: 6, group_no: 1, status: 'PRESENT', edu_week: 1,    memo: '열심히 참석' },
];

// ── Styled ────────────────────────────────────────────────────────────────────

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
  gridTemplateColumns: 'repeat(3, minmax(160px, 210px))',
  gap: theme.custom.spacing.sm,
  '@media (max-width: 900px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  '@media (max-width: 600px)': { gridTemplateColumns: '1fr' },
}));

const WeekNavBar = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.custom.spacing.md,
  padding: `${theme.custom.spacing.sm} 0`,
}));

const WeekLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.subtitle.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.primary._500,
  minWidth: 240,
  textAlign: 'center',
  cursor: 'pointer',
  textDecoration: 'underline',
  textDecorationStyle: 'dotted',
  textUnderlineOffset: '4px',
  userSelect: 'none',
  '&:hover': { color: theme.custom.colors.primary._600 },
}));

const NavButton = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: '50%',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  color: theme.custom.colors.text.high,
  transition: 'background-color 0.15s ease',
  '&:hover:not(:disabled)': { backgroundColor: theme.custom.colors.neutral._95 },
  '&:disabled': { opacity: 0.38, cursor: 'not-allowed' },
}));

const SaveFooter = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: theme.custom.spacing.sm,
}));

const CountLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
}));

const EmptyGuide = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 200,
  fontSize: theme.custom.typography.body1.fontSize,
  color: theme.custom.colors.text.medium,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  backgroundColor: theme.custom.colors.neutral._99,
}));

const CalendarContainer = styled('div')(({ theme }) => ({
  padding: theme.custom.spacing.md,
  width: 288,
  userSelect: 'none',
}));

const CalendarHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.custom.spacing.sm,
}));

const MonthLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body1.fontSize,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
}));

const CalendarGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '2px',
});

const DayHeader = styled('div')<{ $isSat: boolean }>(({ theme, $isSat }) => ({
  textAlign: 'center',
  fontSize: theme.custom.typography.caption.fontSize,
  fontWeight: 700,
  color: $isSat ? theme.custom.colors.primary._500 : theme.custom.colors.text.medium,
  padding: '4px 0 6px',
}));

const DayCell = styled('div')<{ $isSat: boolean; $isSelected: boolean; $isDisabled: boolean }>(
  ({ theme, $isSat, $isSelected, $isDisabled }) => ({
    textAlign: 'center',
    padding: '7px 4px',
    borderRadius: theme.custom.borderRadius,
    fontSize: theme.custom.typography.body2.fontSize,
    fontWeight: $isSat ? 600 : 400,
    cursor: $isSat && !$isDisabled ? 'pointer' : 'default',
    color: $isSelected
      ? theme.custom.colors.white
      : $isSat && !$isDisabled
      ? theme.custom.colors.primary._500
      : theme.custom.colors.neutral._80,
    backgroundColor: $isSelected ? theme.custom.colors.primary._500 : 'transparent',
    transition: 'background-color 0.15s ease',
    ...($isSat && !$isDisabled && !$isSelected
      ? { '&:hover': { backgroundColor: theme.custom.colors.primary.container } }
      : {}),
  })
);

const MemoInput = styled('input')(({ theme }) => ({
  width: 180,
  border: 'none',
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
  outline: 'none',
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.high,
  backgroundColor: 'transparent',
  padding: '2px 4px',
  '&::placeholder': { color: theme.custom.colors.text.disabled },
  '&:focus': { borderBottomColor: theme.custom.colors.primary._500 },
}));

// ── Component ─────────────────────────────────────────────────────────────────

const NewcomerAttendanceTab: React.FC<Props> = ({ filters, onFiltersChange }) => {
  const initialKstDate = getKstDateParts();

  const [worshipDate, setWorshipDate] = useState<string>(() => getMostRecentSaturdayKey());
  const [rows, setRows] = useState<NewcomerRow[]>([]);
  const [changesMap, setChangesMap] = useState<Map<number, NewcomerChange>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [calendarAnchor, setCalendarAnchor] = useState<HTMLElement | null>(null);
  const [calendarView, setCalendarView] = useState({ year: initialKstDate.year, month: initialKstDate.month - 1 });
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);

  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();
  const mostRecentSaturday = useMemo(() => getMostRecentSaturdayKey(), []);

  const pendingActionRef = useRef<(() => void) | null>(null);
  const isDirtyRef = useRef(false);
  const changesMapRef = useRef(changesMap);
  const rowsRef = useRef(rows);
  changesMapRef.current = changesMap;
  rowsRef.current = rows;

  const isDirty = changesMap.size > 0;

  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => { setPage(0); }, [filters.gyogu, filters.team, filters.groupNo, worshipDate, rowsPerPage]);

  useEffect(() => {
    if (!filters.gyogu) {
      setRows([]);
      setTotalCount(0);
      return;
    }

    // TODO: 백엔드 연동 시 아래 mock 로직을 실제 API 호출로 교체
    const filtered = MOCK_NEWCOMERS.filter((item) => {
      if (item.gyogu !== Number(filters.gyogu)) return false;
      if (filters.team && item.team !== Number(filters.team)) return false;
      if (filters.groupNo && item.group_no !== Number(filters.groupNo)) return false;
      return true;
    });
    const start = page * rowsPerPage;
    const pageItems = filtered.slice(start, start + rowsPerPage);
    const loaded = pageItems.map((item) => {
      const row = toNewcomerRow(item);
      const change = changesMapRef.current.get(item.member_id);
      return change ? { ...row, status: change.status, memo: change.memo } : row;
    });
    setRows(loaded);
    setTotalCount(filtered.length);
  }, [filters.gyogu, filters.team, filters.groupNo, page, rowsPerPage, worshipDate]);

  const confirmDiscard = useCallback((action: () => void) => {
    if (isDirtyRef.current) {
      pendingActionRef.current = action;
      setShowDiscardPopup(true);
    } else {
      action();
    }
  }, []);

  const updateRow = useCallback((memberId: number, field: 'status' | 'memo', value: string | null) => {
    const current = rowsRef.current.find((r) => r.memberId === memberId);
    if (!current) return;

    const existing = changesMapRef.current.get(memberId) ?? { status: current.status, memo: current.memo };
    const updated: NewcomerChange =
      field === 'status'
        ? { ...existing, status: (value === '' ? null : value) as NewcomerUiStatus | null }
        : { ...existing, memo: value ?? '' };

    setRows((prev) => prev.map((r) => r.memberId === memberId ? { ...r, ...updated } : r));
    setChangesMap((prev) => new Map(prev).set(memberId, updated));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const records = Array.from(changesMap.entries())
        .filter(([, c]) => c.status !== null)
        .map(([memberId, c]) => ({
          member_id: memberId,
          ...toDbFields(c.status as NewcomerUiStatus),
          memo: c.memo,
        }));

      if (records.length > 0) {
        await saveNewcomerAttendanceBatch({ worship_date: worshipDate, records });
      }
      setChangesMap(new Map());
      showSnackbar('새가족 출석 정보가 저장되었습니다.', 'success');
    } catch {
      showSnackbar('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [changesMap, showSnackbar, worshipDate]);

  const handlePrevWeek = useCallback(() => confirmDiscard(() => setWorshipDate((p) => addDaysToDateKey(p, -7))), [confirmDiscard]);
  const handleNextWeek = useCallback(() => confirmDiscard(() => setWorshipDate((p) => addDaysToDateKey(p, 7))), [confirmDiscard]);
  const isNextDisabled = worshipDate >= mostRecentSaturday;

  const handleWeekLabelClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const { year, month } = parseDateKey(worshipDate);
    setCalendarView({ year, month: month - 1 });
    setCalendarAnchor(e.currentTarget);
  }, [worshipDate]);

  const handleDateSelect = useCallback((dateKey: string) => {
    setCalendarAnchor(null);
    confirmDiscard(() => setWorshipDate(dateKey));
  }, [confirmDiscard]);

  const handlePrevMonth = useCallback(() =>
    setCalendarView((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 }), []);
  const handleNextMonth = useCallback(() =>
    setCalendarView((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 }), []);

  const isNextMonthDisabled = useMemo(() => {
    const next = calendarView.month === 11
      ? { year: calendarView.year + 1, month: 0 }
      : { year: calendarView.year, month: calendarView.month + 1 };
    const recent = parseDateKey(mostRecentSaturday);
    return next.year > recent.year || (next.year === recent.year && next.month > recent.month - 1);
  }, [calendarView, mostRecentSaturday]);

  const calendarGrid = useMemo(() => buildCalendarGrid(calendarView.year, calendarView.month), [calendarView]);

  const presentCount = useMemo(() => rows.filter((r) => r.status && r.status !== 'ABSENT').length, [rows]);
  const absentCount  = useMemo(() => rows.filter((r) => r.status === 'ABSENT').length, [rows]);

  const columns: Column<NewcomerRow>[] = useMemo(() => [
    {
      id: 'no',
      label: '번호',
      minWidth: 60,
      align: 'center',
      render: (_v, row) => page * rowsPerPage + rows.findIndex((r) => r.memberId === row.memberId) + 1,
    },
    {
      id: 'gyogu',
      label: '교구',
      minWidth: 80,
      align: 'center',
      render: (_v, row) => `${row.gyogu}교구`,
    },
    { id: 'team',       label: '팀',   minWidth: 70,  align: 'center', render: (_v, row) => `${row.team}팀` },
    { id: 'groupNo',    label: '그룹', minWidth: 80,  align: 'center', render: (_v, row) => `${row.groupNo}그룹` },
    { id: 'generation', label: '기수', minWidth: 80,  align: 'center' },
    { id: 'gender',     label: '성별', minWidth: 70,  align: 'center' },
    { id: 'name',       label: '이름', minWidth: 90,  align: 'center' },
    {
      id: 'status',
      label: '출석여부',
      minWidth: 150,
      align: 'center',
      render: (_v, row) => (
        <Select
          value={row.status ?? ''}
          options={STATUS_OPTIONS}
          onChange={(v) => updateRow(row.memberId, 'status', String(v))}
          width={140}
        />
      ),
    },
    {
      id: 'memo',
      label: '교육 메모',
      minWidth: 200,
      align: 'center',
      render: (_v, row) => (
        <MemoInput
          value={row.memo}
          onChange={(e) => updateRow(row.memberId, 'memo', e.target.value)}
          placeholder="메모 입력"
        />
      ),
    },
  ], [page, rows, rowsPerPage, updateRow]);

  return (
    <>
      <FilterPanel>
        <FilterTitle>조회 조건</FilterTitle>
        <FilterGrid>
          <Select
            value={filters.gyogu}
            options={GYOGU_OPTIONS}
            onChange={(v) => confirmDiscard(() => onFiltersChange({ gyogu: String(v), team: '', groupNo: '' }))}
            fullWidth
          />
          <Select
            value={filters.team}
            options={TEAM_OPTIONS}
            onChange={(v) => confirmDiscard(() => onFiltersChange({ ...filters, team: String(v), groupNo: '' }))}
            disabled={!filters.gyogu}
            fullWidth
          />
          <Select
            value={filters.groupNo}
            options={GROUP_OPTIONS}
            onChange={(v) => confirmDiscard(() => onFiltersChange({ ...filters, groupNo: String(v) }))}
            disabled={!filters.team}
            fullWidth
          />
        </FilterGrid>
      </FilterPanel>

      <WeekNavBar>
        <NavButton onClick={handlePrevWeek} aria-label="이전 주"><ChevronLeftIcon fontSize="small" /></NavButton>
        <WeekLabel onClick={handleWeekLabelClick} title="클릭하여 날짜 선택">
          {formatKstSaturdayLabel(worshipDate)}
        </WeekLabel>
        <NavButton onClick={handleNextWeek} disabled={isNextDisabled} aria-label="다음 주"><ChevronRightIcon fontSize="small" /></NavButton>
      </WeekNavBar>

      <Popover
        open={Boolean(calendarAnchor)}
        anchorEl={calendarAnchor}
        onClose={() => setCalendarAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <CalendarContainer>
          <CalendarHeader>
            <NavButton onClick={handlePrevMonth} aria-label="이전 달"><ChevronLeftIcon fontSize="small" /></NavButton>
            <MonthLabel>{calendarView.year}년 {calendarView.month + 1}월</MonthLabel>
            <NavButton onClick={handleNextMonth} disabled={isNextMonthDisabled} aria-label="다음 달"><ChevronRightIcon fontSize="small" /></NavButton>
          </CalendarHeader>
          <CalendarGrid>
            {WEEK_DAYS.map((d) => <DayHeader key={d} $isSat={d === '토'}>{d}</DayHeader>)}
            {calendarGrid.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const isSat = day.weekday === 6;
              const isSelected = isSat && day.dateKey === worshipDate;
              const isDisabled = !isSat || day.dateKey > mostRecentSaturday;
              return (
                <DayCell
                  key={day.dateKey}
                  $isSat={isSat}
                  $isSelected={isSelected}
                  $isDisabled={isDisabled}
                  onClick={!isDisabled ? () => handleDateSelect(day.dateKey) : undefined}
                >
                  {day.day}
                </DayCell>
              );
            })}
          </CalendarGrid>
        </CalendarContainer>
      </Popover>

      {!filters.gyogu ? (
        <EmptyGuide>교구를 선택하면 새가족 명단이 표시됩니다.</EmptyGuide>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => String(row.memberId)}
            pagination={{
              page,
              rowsPerPage,
              totalCount,
              onPageChange: setPage,
              onRowsPerPageChange: (s) => { setRowsPerPage(s); setPage(0); },
            }}
          />
          <SaveFooter>
            <CountLabel>
              총 {totalCount}명 |{' '}
              <span style={{ color: '#52c41a', fontWeight: 600 }}>출석 {presentCount}명</span> |{' '}
              <span style={{ color: '#ff4d4f', fontWeight: 600 }}>결석 {absentCount}명</span>
            </CountLabel>
            <Button variant="filled" onClick={handleSave} disabled={!isDirty || isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </SaveFooter>
        </>
      )}

      {showDiscardPopup && (
        <Popup
          title="변경사항 삭제"
          description="저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?"
          onCancel={() => setShowDiscardPopup(false)}
          onConfirm={() => {
            setChangesMap(new Map());
            pendingActionRef.current?.();
            pendingActionRef.current = null;
            setShowDiscardPopup(false);
          }}
          cancelButtonText="취소"
          confirmButtonText="이동"
          confirmButtonVariant="error"
        />
      )}

      <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
    </>
  );
};

export default NewcomerAttendanceTab;
