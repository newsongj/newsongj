import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Popover } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { Snackbar } from '@components/common/Snackbar';
import { Chip } from '@components/common/Chip';
import { Column } from '@components/common/DataTable/DataTable.types';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { fetchAttendanceRecords, saveAttendanceBatch } from '@/api/attendance';
import { AbsentReason, AttendanceMemberRow } from '@/models/attendance.types';

// ── Types ─────────────────────────────────────────────────────────────────

type AttendanceStatus = 'PRESENT' | 'ABSENT';

interface AttendanceRow {
  memberId: number;
  name: string;
  generation: string;
  leaderNames: string[];
  gyogu: number;
  team: number;
  groupNo: number;
  status: AttendanceStatus;
  absentReason: AbsentReason | null;
}

interface FilterState {
  gyogu: string;
  team: string;
  groupNo: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: '✓ 출석' },
  { value: 'ABSENT',  label: '✕ 결석' },
];

const ABSENT_REASON_OPTIONS = [
  { value: '',       label: '사유 없음' },
  { value: '학교/학원', label: '학교/학원' },
  { value: '회사',     label: '회사' },
  { value: '알바',     label: '알바' },
  { value: '가족모임',  label: '가족모임' },
  { value: '개인일정',  label: '개인일정' },
  { value: '아픔',     label: '아픔' },
  { value: '기타',     label: '기타' },
];

const GYOGU_OPTIONS = [
  { value: '',      label: '교구 선택' },
  { value: '1',     label: '1교구' },
  { value: '2',     label: '2교구' },
  { value: '3',     label: '3교구' },
  { value: '임원단', label: '임원단' },
];

const TEAM_OPTIONS = [
  { value: '', label: '팀 선택' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}팀` })),
];

const GROUP_OPTIONS = [
  { value: '', label: '그룹 선택' },
  ...Array.from({ length: 4 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}그룹` })),
];

// ── Helpers ───────────────────────────────────────────────────────────────

const toAttendanceRow = (item: AttendanceMemberRow, filters: FilterState): AttendanceRow => ({
  memberId: item.member_id,
  name: item.name,
  generation: `${item.generation}기`,
  leaderNames: item.leader_names,
  gyogu: filters.gyogu !== '임원단' ? Number(filters.gyogu) : 0,
  team: filters.team ? Number(filters.team) : 0,
  groupNo: filters.groupNo ? Number(filters.groupNo) : 0,
  status: item.status ?? 'PRESENT',
  absentReason: item.absent_reason,
});

const getMostRecentSaturday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysBack = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
  const sat = new Date(today);
  sat.setDate(today.getDate() - daysBack);
  sat.setHours(0, 0, 0, 0);
  return sat;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatWorshipDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}년 ${m}월 ${d}일 (토)`;
};

const buildCalendarGrid = (year: number, month: number): (Date | null)[] => {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[] = Array(firstDayOfWeek).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(new Date(year, month, d));
  }
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
};

// ── Styled Components ─────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.md,
}));

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
  '&:hover': {
    color: theme.custom.colors.primary._600,
  },
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
  '&:hover:not(:disabled)': {
    backgroundColor: theme.custom.colors.neutral._95,
  },
  '&:disabled': {
    opacity: 0.38,
    cursor: 'not-allowed',
  },
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

// ── Calendar Styled Components ────────────────────────────────────────────

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

const DayCell = styled('div')<{
  $isSat: boolean;
  $isSelected: boolean;
  $isDisabled: boolean;
}>(({ theme, $isSat, $isSelected, $isDisabled }) => ({
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
    ? {
        '&:hover': {
          backgroundColor: theme.custom.colors.primary.container,
        },
      }
    : {}),
}));

// ── Component ─────────────────────────────────────────────────────────────

const AttendancePage: React.FC = () => {
  const [worshipDate, setWorshipDate] = useState<Date>(() => getMostRecentSaturday());
  const [filters, setFilters] = useState<FilterState>({ gyogu: '', team: '', groupNo: '' });
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [savedRows, setSavedRows] = useState<AttendanceRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // 페이징 상태
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // 달력 Popover 상태
  const [calendarAnchor, setCalendarAnchor] = useState<HTMLElement | null>(null);
  const [calendarView, setCalendarView] = useState<{ year: number; month: number }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();
  const mostRecentSaturday = useMemo(() => getMostRecentSaturday(), []);

  // 변경 감지 (useBlocker보다 먼저 선언)
  const isDirty = useMemo(
    () =>
      rows.some((row) => {
        const orig = savedRows.find((r) => r.memberId === row.memberId);
        if (!orig) return true;
        return row.status !== orig.status || row.absentReason !== orig.absentReason;
      }),
    [rows, savedRows]
  );

  // ── 이탈 경고 ──────────────────────────────────────────────────────────

  // 브라우저 탭 닫기 / 새로고침 차단
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 필터 또는 주차 변경 시 페이지 초기화
  useEffect(() => {
    setPage(0);
  }, [filters.gyogu, filters.team, filters.groupNo, worshipDate, rowsPerPage]);

  // 필터·주차·페이지 변경 시 데이터 로드
  useEffect(() => {
    if (!filters.gyogu) {
      setRows([]);
      setSavedRows([]);
      setTotalCount(0);
      return;
    }
    const gyogu_no = filters.gyogu !== '임원단' ? Number(filters.gyogu) : 0;
    const is_imwondan = filters.gyogu === '임원단';
    fetchAttendanceRecords({
      worship_date: worshipDate.toISOString().split('T')[0],
      gyogu_no,
      team_no: filters.team ? Number(filters.team) : undefined,
      group_no: filters.groupNo ? Number(filters.groupNo) : undefined,
      is_imwondan,
      page: page + 1,
      page_size: rowsPerPage,
    })
      .then((res) => {
        const loaded = res.items.map((item) => toAttendanceRow(item, filters));
        setRows(loaded);
        setSavedRows(loaded.map((r) => ({ ...r })));
        setTotalCount(res.meta.total_items);
      })
      .catch(() => {
        setRows([]);
        setSavedRows([]);
        setTotalCount(0);
      });
  }, [filters.gyogu, filters.team, filters.groupNo, worshipDate, page, rowsPerPage]);

  // 서버 사이드 페이징이므로 rows가 이미 현재 페이지 데이터
  const pagedRows = rows;

  const presentCount = useMemo(() => rows.filter((r) => r.status === 'PRESENT').length, [rows]);

  // 행 업데이트
  const updateRow = useCallback(
    (memberId: number, field: 'status' | 'absentReason', value: string | null) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.memberId !== memberId) return row;
          if (field === 'status') {
            return {
              ...row,
              status: value as AttendanceStatus,
              absentReason: value === 'PRESENT' ? null : row.absentReason,
            };
          }
          return { ...row, absentReason: (value === '' ? null : value) as AbsentReason };
        })
      );
    },
    []
  );

  // 주차 이동 (화살표)
  const handlePrevWeek = useCallback(() => {
    setWorshipDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setWorshipDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const isNextDisabled = worshipDate.getTime() >= mostRecentSaturday.getTime();

  // 필터 변경 (cascade)
  const handleGyoguChange = useCallback((value: string | number | (string | number)[]) => {
    setFilters({ gyogu: String(value), team: '', groupNo: '' });
  }, []);
  const handleTeamChange = useCallback((value: string | number | (string | number)[]) => {
    setFilters((prev) => ({ ...prev, team: String(value), groupNo: '' }));
  }, []);
  const handleGroupChange = useCallback((value: string | number | (string | number)[]) => {
    setFilters((prev) => ({ ...prev, groupNo: String(value) }));
  }, []);

  // 저장
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const changedRows = rows.filter((row) => {
        const orig = savedRows.find((r) => r.memberId === row.memberId);
        if (!orig) return true;
        return row.status !== orig.status || row.absentReason !== orig.absentReason;
      });
      const validRecords = changedRows
        .filter((row) => row.status === 'PRESENT' || row.absentReason !== null)
        .map((row) => ({
          member_id: row.memberId,
          status: row.status,
          absent_reason: row.status === 'ABSENT' ? (row.absentReason as AbsentReason) : null,
        }));
      if (validRecords.length > 0) {
        await saveAttendanceBatch({
          worship_date: worshipDate.toISOString().split('T')[0],
          records: validRecords,
        });
      }
      setSavedRows(rows.map((r) => ({ ...r })));
      showSnackbar('출석 정보가 저장되었습니다.', 'success');
    } catch {
      showSnackbar('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [rows, savedRows, worshipDate, showSnackbar]);

  // 달력 열기/닫기
  const handleWeekLabelClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      setCalendarView({ year: worshipDate.getFullYear(), month: worshipDate.getMonth() });
      setCalendarAnchor(e.currentTarget);
    },
    [worshipDate]
  );
  const handleCalendarClose = useCallback(() => setCalendarAnchor(null), []);

  // 달력에서 토요일 선택
  const handleDateSelect = useCallback((date: Date) => {
    setWorshipDate(date);
    setCalendarAnchor(null);
  }, []);

  // 달력 월 이동
  const handlePrevMonth = useCallback(() => {
    setCalendarView((prev) =>
      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 }
    );
  }, []);
  const handleNextMonth = useCallback(() => {
    setCalendarView((prev) =>
      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 }
    );
  }, []);

  const isNextMonthDisabled = useMemo(() => {
    const next =
      calendarView.month === 11
        ? { year: calendarView.year + 1, month: 0 }
        : { year: calendarView.year, month: calendarView.month + 1 };
    return (
      next.year > mostRecentSaturday.getFullYear() ||
      (next.year === mostRecentSaturday.getFullYear() &&
        next.month > mostRecentSaturday.getMonth())
    );
  }, [calendarView, mostRecentSaturday]);

  const calendarGrid = useMemo(
    () => buildCalendarGrid(calendarView.year, calendarView.month),
    [calendarView]
  );

  // 컬럼 정의
  const columns: Column<AttendanceRow>[] = useMemo(
    () => [
      {
        id: 'no',
        label: '번호',
        minWidth: 60,
        align: 'center',
        render: (_v, row) => page * rowsPerPage + pagedRows.findIndex((r) => r.memberId === row.memberId) + 1,
      },
      {
        id: 'gyogu',
        label: '교구',
        minWidth: 80,
        align: 'center',
        render: (_v, row) => row.gyogu === 0 ? '임원단' : `${row.gyogu}교구`,
      },
      {
        id: 'team',
        label: '팀',
        minWidth: 70,
        align: 'center',
        render: (_v, row) => row.team === 0 ? '-' : `${row.team}팀`,
      },
      {
        id: 'groupNo',
        label: '그룹',
        minWidth: 80,
        align: 'center',
        render: (_v, row) => row.groupNo === 0 ? '-' : `${row.groupNo}그룹`,
      },
      {
        id: 'leaderNames',
        label: '직분',
        minWidth: 160,
        align: 'center',
        render: (_v, row) => (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {row.leaderNames.length > 0
              ? row.leaderNames.map((ln) => <Chip key={ln} label={ln} />)
              : '-'}
          </div>
        ),
      },
      { id: 'name', label: '이름', minWidth: 90, align: 'center' },
      { id: 'generation', label: '기수', minWidth: 80, align: 'center' },
      {
        id: 'status',
        label: '출석여부',
        minWidth: 140,
        align: 'center',
        render: (_v, row) => (
          <Select
            value={row.status}
            options={STATUS_OPTIONS}
            onChange={(val) => updateRow(row.memberId, 'status', String(val))}
            width={130}
          />
        ),
      },
      {
        id: 'absentReason',
        label: '결석사유',
        minWidth: 170,
        align: 'center',
        render: (_v, row) => (
          <Select
            value={row.absentReason ?? ''}
            options={ABSENT_REASON_OPTIONS}
            onChange={(val) =>
              updateRow(row.memberId, 'absentReason', val === '' ? null : String(val))
            }
            disabled={row.status === 'PRESENT'}
            width={155}
          />
        ),
      },
    ],
    [rows, pagedRows, page, rowsPerPage, updateRow]
  );

  return (
    <PageWrapper>
      {/* 필터 패널 */}
      <FilterPanel>
        <FilterTitle>조회 조건</FilterTitle>
        <FilterGrid>
          <Select
            value={filters.gyogu}
            options={GYOGU_OPTIONS}
            onChange={handleGyoguChange}
            fullWidth
          />
          <Select
            value={filters.team}
            options={TEAM_OPTIONS}
            onChange={handleTeamChange}
            disabled={!filters.gyogu || filters.gyogu === '임원단'}
            fullWidth
          />
          <Select
            value={filters.groupNo}
            options={GROUP_OPTIONS}
            onChange={handleGroupChange}
            disabled={!filters.team || filters.gyogu === '임원단'}
            fullWidth
          />
        </FilterGrid>
      </FilterPanel>

      {/* 주차 네비게이션 */}
      <WeekNavBar>
        <NavButton onClick={handlePrevWeek} aria-label="이전 주">
          <ChevronLeftIcon fontSize="small" />
        </NavButton>
        <WeekLabel onClick={handleWeekLabelClick} title="클릭하여 날짜 선택">
          {formatWorshipDate(worshipDate)}
        </WeekLabel>
        <NavButton onClick={handleNextWeek} disabled={isNextDisabled} aria-label="다음 주">
          <ChevronRightIcon fontSize="small" />
        </NavButton>
      </WeekNavBar>

      {/* 날짜 선택 달력 Popover */}
      <Popover
        open={Boolean(calendarAnchor)}
        anchorEl={calendarAnchor}
        onClose={handleCalendarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <CalendarContainer>
          <CalendarHeader>
            <NavButton onClick={handlePrevMonth} aria-label="이전 달">
              <ChevronLeftIcon fontSize="small" />
            </NavButton>
            <MonthLabel>
              {calendarView.year}년 {calendarView.month + 1}월
            </MonthLabel>
            <NavButton onClick={handleNextMonth} disabled={isNextMonthDisabled} aria-label="다음 달">
              <ChevronRightIcon fontSize="small" />
            </NavButton>
          </CalendarHeader>

          <CalendarGrid>
            {WEEK_DAYS.map((d) => (
              <DayHeader key={d} $isSat={d === '토'}>
                {d}
              </DayHeader>
            ))}
            {calendarGrid.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const isSat = day.getDay() === 6;
              const isSelected = isSat && isSameDay(day, worshipDate);
              const isFuture = isSat && day > mostRecentSaturday;
              const isDisabled = !isSat || isFuture;
              return (
                <DayCell
                  key={day.toISOString()}
                  $isSat={isSat}
                  $isSelected={isSelected}
                  $isDisabled={isDisabled}
                  onClick={!isDisabled ? () => handleDateSelect(day) : undefined}
                >
                  {day.getDate()}
                </DayCell>
              );
            })}
          </CalendarGrid>
        </CalendarContainer>
      </Popover>

      {/* 교구 미선택 안내 */}
      {!filters.gyogu ? (
        <EmptyGuide>교구를 선택하면 출석 명단이 표시됩니다.</EmptyGuide>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={pagedRows}
            getRowId={(row) => String(row.memberId)}
            pagination={{
              page,
              rowsPerPage,
              totalCount,
              onPageChange: setPage,
              onRowsPerPageChange: (newSize) => { setRowsPerPage(newSize); setPage(0); },
            }}
          />
          <SaveFooter>
            <CountLabel>
              총 {totalCount}명&nbsp;&nbsp;|&nbsp;&nbsp;출석 {presentCount}명&nbsp;&nbsp;|&nbsp;&nbsp;결석 {presentCount > 0 ? rows.length - presentCount : 0}명
            </CountLabel>
            <Button
              variant="filled"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </SaveFooter>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />

    </PageWrapper>
  );
};

export default AttendancePage;
