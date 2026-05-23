import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Popover } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { Snackbar } from '@components/common/Snackbar';
import Popup from '@components/common/Popup';
import { Chip } from '@components/common/Chip';
import { Column } from '@components/common/DataTable/DataTable.types';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { fetchAttendanceRecords, saveAttendanceBatch } from '@/api/attendance';
import { AbsentReason, AttendanceMemberRow } from '@/models/attendance.types';
import {
  addDaysToDateKey,
  buildCalendarGrid,
  formatKstSaturdayLabel,
  getKstDateParts,
  getMostRecentSaturdayKey,
  parseDateKey,
} from '@/utils/kstDate';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | null;

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

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const STATUS_OPTIONS = [
  { value: '', label: '선택' },
  { value: 'PRESENT', label: <span style={{ color: '#52c41a', fontWeight: 600 }}>✓ 출석</span> },
  { value: 'ABSENT',  label: <span style={{ color: '#ff4d4f', fontWeight: 600 }}>✕ 결석</span> },
];

const ABSENT_REASON_OPTIONS = [
  { value: '', label: '사유 선택' },
  { value: '학교/학원', label: '학교/학원' },
  { value: '회사', label: '회사' },
  { value: '알바', label: '알바' },
  { value: '가족모임', label: '가족모임' },
  { value: '개인일정', label: '개인일정' },
  { value: '아픔', label: '아픔' },
  { value: '사유 모름', label: '사유 모름' },
  { value: '기타', label: '기타' },
];

const GYOGU_OPTIONS = [
  { value: '', label: '교구 선택' },
  { value: '1', label: '1교구' },
  { value: '2', label: '2교구' },
  { value: '3', label: '3교구' },
  { value: '임원단', label: '임원단' },
];

const TEAM_OPTIONS = [
  { value: '', label: '팀 선택' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}팀` })),
];

const GROUP_OPTIONS = [
  { value: '', label: '그룹 선택' },
  ...Array.from({ length: 5 }, (_, i) => ({ value: String(i), label: `${i}그룹` })),
];

const toAttendanceRow = (item: AttendanceMemberRow): AttendanceRow => ({
  memberId: item.member_id,
  name: item.name,
  generation: `${item.generation}기`,
  leaderNames: item.leader_names,
  gyogu: item.gyogu,
  team: item.team,
  groupNo: item.group_no,
  status: item.status,
  absentReason: item.absent_reason,
});

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
  '@media (max-width: 900px)': {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr',
  },
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

const AttendancePage: React.FC = () => {
  const initialKstDate = getKstDateParts();

  const [worshipDate, setWorshipDate] = useState<string>(() => getMostRecentSaturdayKey());
  const [filters, setFilters] = useState<FilterState>({ gyogu: '', team: '', groupNo: '' });
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [changesMap, setChangesMap] = useState<Map<number, { status: AttendanceStatus; absentReason: AbsentReason | null }>>(new Map());
  const [showAbsentReasonPopup, setShowAbsentReasonPopup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [calendarAnchor, setCalendarAnchor] = useState<HTMLElement | null>(null);
  const [calendarView, setCalendarView] = useState<{ year: number; month: number }>({
    year: initialKstDate.year,
    month: initialKstDate.month - 1,
  });

  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();
  const mostRecentSaturday = useMemo(() => getMostRecentSaturdayKey(), []);

  const pendingActionRef = useRef<(() => void) | null>(null);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const isDirtyRef = useRef(false);
  const changesMapRef = useRef(changesMap);
  const rowsRef = useRef(rows);
  changesMapRef.current = changesMap;
  rowsRef.current = rows;

  const confirmDiscard = useCallback((action: () => void) => {
    if (isDirtyRef.current) {
      pendingActionRef.current = action;
      setShowDiscardPopup(true);
    } else {
      action();
    }
  }, []);

  const isDirty = changesMap.size > 0;

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    setPage(0);
  }, [filters.gyogu, filters.team, filters.groupNo, worshipDate, rowsPerPage]);

  useEffect(() => {
    if (!filters.gyogu) {
      setRows([]);
      setTotalCount(0);
      return;
    }

    const gyogu_no = filters.gyogu !== '임원단' ? Number(filters.gyogu) : 0;
    fetchAttendanceRecords({
      worship_date: worshipDate,
      gyogu_no,
      team_no: filters.team ? Number(filters.team) : undefined,
      group_no: filters.groupNo ? Number(filters.groupNo) : undefined,
      page: page + 1,
      page_size: rowsPerPage,
    })
      .then((response) => {
        const loaded = response.items.map((item) => {
          const row = toAttendanceRow(item);
          const change = changesMapRef.current.get(item.member_id);
          return change ? { ...row, status: change.status, absentReason: change.absentReason } : row;
        });
        setRows(loaded);
        setTotalCount(response.meta.total_items);
      })
      .catch(() => {
        setRows([]);
        setTotalCount(0);
      });
  }, [filters.gyogu, filters.team, filters.groupNo, page, rowsPerPage, worshipDate]);

  const pagedRows = rows;
  const presentCount = useMemo(() => rows.filter((row) => row.status === 'PRESENT').length, [rows]);
  const absentCount = useMemo(() => rows.filter((row) => row.status === 'ABSENT').length, [rows]);

  const updateRow = useCallback((memberId: number, field: 'status' | 'absentReason', value: string | null) => {
    const current = rowsRef.current.find((r) => r.memberId === memberId);
    if (!current) return;

    const updated: AttendanceRow =
      field === 'status'
        ? { ...current, status: (value === '' ? null : value) as AttendanceStatus, absentReason: value === 'PRESENT' ? null : current.absentReason }
        : { ...current, absentReason: (value === '' ? null : value) as AbsentReason };

    setRows((prev) => prev.map((r) => (r.memberId === memberId ? updated : r)));
    setChangesMap((prev) => new Map(prev).set(memberId, { status: updated.status, absentReason: updated.absentReason }));
  }, []);

  const handlePrevWeek = useCallback(() => {
    confirmDiscard(() => setWorshipDate((prev) => addDaysToDateKey(prev, -7)));
  }, [confirmDiscard]);

  const handleNextWeek = useCallback(() => {
    confirmDiscard(() => setWorshipDate((prev) => addDaysToDateKey(prev, 7)));
  }, [confirmDiscard]);

  const isNextDisabled = worshipDate >= mostRecentSaturday;

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newSize: number) => {
    setRowsPerPage(newSize);
    setPage(0);
  }, []);

  const handleGyoguChange = useCallback((value: string | number | (string | number)[]) => {
    confirmDiscard(() => setFilters({ gyogu: String(value), team: '', groupNo: '' }));
  }, [confirmDiscard]);

  const handleTeamChange = useCallback((value: string | number | (string | number)[]) => {
    confirmDiscard(() => setFilters((prev) => ({ ...prev, team: String(value), groupNo: '' })));
  }, [confirmDiscard]);

  const handleGroupChange = useCallback((value: string | number | (string | number)[]) => {
    confirmDiscard(() => setFilters((prev) => ({ ...prev, groupNo: String(value) })));
  }, [confirmDiscard]);

  const handleSave = useCallback(async () => {
    const hasAbsentWithoutReason = Array.from(changesMap.values()).some(
      (c) => c.status === 'ABSENT' && !c.absentReason
    );
    if (hasAbsentWithoutReason) {
      setShowAbsentReasonPopup(true);
      return;
    }

    setIsSaving(true);

    try {
      const records = Array.from(changesMap.entries())
        .filter(([, c]) => c.status !== null)
        .map(([memberId, c]) => ({
          member_id: memberId,
          status: c.status as 'PRESENT' | 'ABSENT',
          absent_reason: c.status === 'ABSENT' ? (c.absentReason as AbsentReason) : null,
        }));

      if (records.length > 0) {
        await saveAttendanceBatch({ worship_date: worshipDate, records });
      }

      setChangesMap(new Map());
      showSnackbar('출석 정보가 저장되었습니다.', 'success');
    } catch {
      showSnackbar('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [changesMap, showSnackbar, worshipDate]);

  const handleWeekLabelClick = useCallback((event: React.MouseEvent<HTMLSpanElement>) => {
    const { year, month } = parseDateKey(worshipDate);
    setCalendarView({ year, month: month - 1 });
    setCalendarAnchor(event.currentTarget);
  }, [worshipDate]);

  const handleCalendarClose = useCallback(() => setCalendarAnchor(null), []);

  const handleDateSelect = useCallback((dateKey: string) => {
    setCalendarAnchor(null);
    confirmDiscard(() => setWorshipDate(dateKey));
  }, [confirmDiscard]);

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
    const recent = parseDateKey(mostRecentSaturday);

    return next.year > recent.year || (next.year === recent.year && next.month > recent.month - 1);
  }, [calendarView, mostRecentSaturday]);

  const calendarGrid = useMemo(() => buildCalendarGrid(calendarView.year, calendarView.month), [calendarView]);

  const columns: Column<AttendanceRow>[] = useMemo(
    () => [
      {
        id: 'no',
        label: '번호',
        minWidth: 60,
        align: 'center',
        render: (_value, row) => page * rowsPerPage + pagedRows.findIndex((item) => item.memberId === row.memberId) + 1,
      },
      {
        id: 'gyogu',
        label: '교구',
        minWidth: 80,
        align: 'center',
        render: (_value, row) => (row.gyogu === 0 ? '임원단' : `${row.gyogu}교구`),
      },
      {
        id: 'team',
        label: '팀',
        minWidth: 70,
        align: 'center',
        render: (_value, row) => (row.team === 0 ? '-' : `${row.team}팀`),
      },
      {
        id: 'groupNo',
        label: '그룹',
        minWidth: 80,
        align: 'center',
        render: (_value, row) => `${row.groupNo}그룹`,
      },
      {
        id: 'leaderNames',
        label: '직분',
        minWidth: 160,
        align: 'center',
        render: (_value, row) => (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {row.leaderNames.length > 0 ? row.leaderNames.map((name) => <Chip key={name} label={name} />) : '-'}
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
        render: (_value, row) => (
          <Select
            value={row.status ?? ''}
            options={STATUS_OPTIONS}
            onChange={(value) => updateRow(row.memberId, 'status', String(value))}
            width={130}
          />
        ),
      },
      {
        id: 'absentReason',
        label: '결석사유',
        minWidth: 170,
        align: 'center',
        render: (_value, row) => (
          <Select
            value={row.absentReason ?? ''}
            options={ABSENT_REASON_OPTIONS}
            onChange={(value) => updateRow(row.memberId, 'absentReason', value === '' ? null : String(value))}
            disabled={row.status !== 'ABSENT'}
            width={155}
          />
        ),
      },
    ],
    [page, pagedRows, rowsPerPage, updateRow]
  );

  return (
    <PageWrapper>
      <FilterPanel>
        <FilterTitle>조회 조건</FilterTitle>
        <FilterGrid>
          <Select value={filters.gyogu} options={GYOGU_OPTIONS} onChange={handleGyoguChange} fullWidth />
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

      <WeekNavBar>
        <NavButton onClick={handlePrevWeek} aria-label="이전 주">
          <ChevronLeftIcon fontSize="small" />
        </NavButton>
        <WeekLabel onClick={handleWeekLabelClick} title="클릭하여 날짜 선택">
          {formatKstSaturdayLabel(worshipDate)}
        </WeekLabel>
        <NavButton onClick={handleNextWeek} disabled={isNextDisabled} aria-label="다음 주">
          <ChevronRightIcon fontSize="small" />
        </NavButton>
      </WeekNavBar>

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
            {WEEK_DAYS.map((day) => (
              <DayHeader key={day} $isSat={day === '토'}>
                {day}
              </DayHeader>
            ))}
            {calendarGrid.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />;

              const isSat = day.weekday === 6;
              const isSelected = isSat && day.dateKey === worshipDate;
              const isFuture = isSat && day.dateKey > mostRecentSaturday;
              const isDisabled = !isSat || isFuture;

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
              onPageChange: handlePageChange,
              onRowsPerPageChange: handleRowsPerPageChange,
            }}
          />
          <SaveFooter>
            <CountLabel>
              총 {totalCount}명 | <span style={{ color: '#52c41a', fontWeight: 600 }}>출석 {presentCount}명</span> | <span style={{ color: '#ff4d4f', fontWeight: 600 }}>결석 {absentCount}명</span>
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


      {showAbsentReasonPopup && (
        <Popup
          title="결석사유 미입력"
          description="결석으로 표시된 인원의 결석사유를 선택해주세요."
          onCancel={() => setShowAbsentReasonPopup(false)}
          onConfirm={() => setShowAbsentReasonPopup(false)}
          cancelButtonText="닫기"
          confirmButtonText="확인"
        />
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
