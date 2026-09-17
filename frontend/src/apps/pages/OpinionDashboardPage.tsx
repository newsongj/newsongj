import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Skeleton, Tooltip } from '@mui/material';
import { ClipboardList, FileCheck2, FileX2, Search, Users } from 'lucide-react';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { TextField } from '@components/common/TextField';
import { BaseModal } from '@components/common/BaseModal';
import { Snackbar } from '@components/common/Snackbar';
import { DataTable } from '@components/common/DataTable';
import { Column } from '@components/common/DataTable/DataTable.types';
import StatCard from '@components/common/StatCard';
import { FILTER_SIZES, FILTER_STACK_BREAKPOINT } from '@/styles/filterSizes';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import {
  fetchOpinionList,
  fetchOpinionMemberCandidates,
  fetchOpinionSettings,
  updateOpinionReport,
} from '@/api/opinion';
import {
  INPUT_COUNTER_THRESHOLD,
  INPUT_FIELD_LABELS,
  INPUT_FIELD_MAX_LENGTH,
  INPUT_FIELD_MULTILINE,
  INPUT_FIELD_ORDER,
  InputFieldKey,
  MEMBER_FIELD_LABELS,
  MEMBER_FIELD_ORDER,
  MemberFieldKey,
  OpinionConflictError,
  OpinionMemberCandidate,
  OpinionReportRow,
  OpinionReportUpdateBody,
  OpinionSettings,
  OpinionWriteStatus,
  OpinionWriter,
} from '@/models/opinion.types';
import OpinionReportPrint, {
  formatCompanionAffiliation,
  formatMemberField,
  formatWriterAffiliation,
} from './OpinionReportPrint';

/** 명단 「작성자」 컬럼 표기 — 좁은 칸이라 이름만, 3명 이상이면 줄인다 */
const writerSummary = (writers: OpinionWriter[]): string => {
  if (writers.length === 0) return '—';
  if (writers.length <= 2) return writers.map((w) => w.name).join(', ');
  return `${writers[0].name} 외 ${writers.length - 1}명`;
};

/**
 * 입력 길이 카운터 — 컬럼 한계에 가까워질 때만 노출한다.
 * 항상 띄우면 9개 필드 전부에 숫자가 붙어 시끄럽다.
 */
const lengthCounter = (value: string, max: number): React.ReactNode => {
  if (value.length < max * INPUT_COUNTER_THRESHOLD) return undefined;
  const atLimit = value.length >= max;
  return (
    <span style={{ fontSize: 11, color: atLimit ? '#ff4d4f' : '#8c8c8c', whiteSpace: 'nowrap' }}>
      {value.length}/{max}
    </span>
  );
};

/** 툴팁·상세에 쓰는 전체 표기 */
const writerFull = (writers: OpinionWriter[]): string =>
  writers
    .map((w) => `${formatWriterAffiliation(w)} ${w.role} ${w.name} ${w.phone_number ?? '—'}`)
    .join('\n');

// ── 상수 ──────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const YEAR_OPTIONS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]
  .map((y) => ({ value: String(y), label: `${y}년` }));

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'written', label: '작성 완료' },
  { value: 'not_written', label: '미작성' },
];

// ── Styled ────────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.lg,
}));

/**
 * 필터 박스 — 출석 대시보드(`AttendanceDashboard`)의 `FilterPanel` 과 같은 규격이다.
 * 배경·테두리·패딩으로 필터 영역을 한 덩어리로 묶는다.
 */
const FilterPanel = styled('section')(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.custom.spacing.sm, flexWrap: 'wrap',
  // 주변 카드·섹션이 옅은 하늘색(_99)이라 필터까지 같은 색이면 경계가 묻힌다.
  // 필터 영역만 흰 바탕으로 띄운다.
  backgroundColor: theme.custom.colors.white,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  padding: theme.custom.spacing.md,
  [`@media (max-width: ${FILTER_STACK_BREAKPOINT}px)`]: {
    alignItems: 'stretch',
  },
}));

/**
 * 라벨 + 컨트롤 한 쌍.
 *
 * 좁은 화면에서는 `[라벨 고정폭][컨트롤 나머지 전부]` 2단으로 만든다.
 * 그러지 않으면 라벨 길이(「기준 연도」 vs 「팀」)만큼 남는 폭이 달라져
 * 컨트롤 너비가 제각각이 된다.
 *
 * `Select` 의 루트는 `MuiFormControl`, `TextField` 의 루트는 그냥 `div` 라
 * 클래스 선택자로는 둘을 함께 잡을 수 없다. 그래서 자식 위치로 지정한다.
 * 두 컴포넌트 모두 emotion 으로 `width` 를 박으므로 `!important` 가 필요하다.
 *
 * `:first-of-type` 이 아니라 `:first-child` 인 이유 — 라벨은 `span`, 컨트롤은 `div` 로
 * 타입이 달라서 `*:first-of-type` 은 **둘 다** 매칭된다 (각자 자기 타입의 첫 번째).
 */
const FilterGroup = styled('div')({
  display: 'flex', alignItems: 'center', gap: 6,
  [`@media (max-width: ${FILTER_STACK_BREAKPOINT}px)`]: {
    width: '100%',
    '& > *:first-child': { flex: `0 0 ${FILTER_SIZES.labelColumn}px` },
    '& > *:last-child': { flex: '1 1 auto', width: 'auto !important', minWidth: 0 },
  },
});

const FilterLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
}));

const FilterSpacer = styled('div')({
  marginLeft: 'auto',
  [`@media (max-width: ${FILTER_STACK_BREAKPOINT}px)`]: { marginLeft: 0, width: '100%' },
});

/**
 * 선택 해제 + PDF 다운로드 버튼.
 *
 * 좁은 화면에서는 세로로 쌓고 버튼을 한 줄 꽉 채운다 — 위 필터 컨트롤들이
 * 전부 전체 폭이라, 버튼만 제 크기로 남으면 줄이 들쭉날쭉해 보인다.
 * `Button` 에 `fullWidth` prop 이 없어 마지막 자식을 직접 늘린다.
 */
const PrintGroup = styled('div')(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.custom.spacing.sm,
  [`@media (max-width: ${FILTER_STACK_BREAKPOINT}px)`]: {
    width: '100%',
    flexDirection: 'column', alignItems: 'stretch',
    gap: theme.custom.spacing.xs,
    '& > *:last-child': { width: '100%' },
  },
}));

const ClearSelection = styled('button')(({ theme }) => ({
  border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
  textDecoration: 'underline', whiteSpace: 'nowrap',
  '&:hover': { color: theme.custom.colors.text.high },
}));

const StatsGrid = styled('div')({
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
  '@media (max-width: 1024px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
});

const ProgressBlock = styled('div')({ display: 'flex', flexDirection: 'column', gap: 6 });

const ProgressCaption = styled('div')(({ theme }) => ({
  display: 'flex', justifyContent: 'space-between', gap: 12,
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
}));

const ProgressBarWrap = styled('div')({
  width: '100%', height: 6, borderRadius: 3,
  backgroundColor: '#e5e7eb', overflow: 'hidden',
});

const ProgressBarFill = styled('div')<{ $pct: number }>(({ $pct }) => ({
  height: '100%', width: `${$pct}%`, borderRadius: 3,
  backgroundColor: '#187EF4', transition: 'width 0.4s ease',
}));

const WrittenBadge = styled('span')<{ $written: boolean }>(({ $written }) => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 999,
  fontSize: 12, fontWeight: 600,
  color: $written ? '#059669' : '#b45309',
  background: $written ? '#d1fae5' : '#fef3c7',
}));

const DeletedBadge = styled('span')({
  display: 'inline-block', marginLeft: 6, padding: '1px 7px', borderRadius: 999,
  fontSize: 11, fontWeight: 600, color: '#b91c1c', background: '#fee2e2',
  verticalAlign: 'middle',
});

const NameCell = styled('span')({ whiteSpace: 'nowrap' });

// 작성자 블록 (상세 모달)
const WriterBox = styled('div')(({ theme }) => ({
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  overflow: 'hidden',
}));

/** `$muted` — 실제 작성자가 아니라 「작성 예정자」를 보여줄 때 흐리게 */
const WriterRow = styled('div')<{ $muted?: boolean }>(({ theme, $muted }) => ({
  display: 'flex', gap: 12, alignItems: 'baseline',
  padding: '7px 10px',
  fontSize: theme.custom.typography.body2.fontSize,
  color: $muted ? theme.custom.colors.text.disabled : 'inherit',
  '&:not(:last-of-type)': { borderBottom: `1px solid ${theme.custom.colors.primary.outline}` },
  '@media (max-width: 560px)': { flexWrap: 'wrap', gap: 6 },
}));

/** 명단 「작성자」 칸 — 미작성 건의 예정 작성자 */
const ExpectedWriter = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.disabled,
  fontSize: theme.custom.typography.body2.fontSize,
  whiteSpace: 'nowrap',
}));

const WriterAff = styled('span')(({ theme }) => ({
  flex: '0 0 140px', color: theme.custom.colors.text.high, whiteSpace: 'nowrap',
}));

const WriterRole = styled('span')(({ theme }) => ({
  flex: '0 0 52px', color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
}));

const WriterName = styled('span')({ flex: '0 0 72px', fontWeight: 600, whiteSpace: 'nowrap' });

const WriterTel = styled('span')(({ theme }) => ({
  flex: 1, color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
}));

// 상세 모달
const ModalBody = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.lg,
  padding: theme.custom.spacing.lg, width: '100%', minWidth: 0, boxSizing: 'border-box',
}));

const ModalSectionTitle = styled('h4')(({ theme }) => ({
  margin: 0, fontSize: theme.custom.typography.body1.fontSize, fontWeight: 700,
  color: theme.custom.colors.text.high,
  paddingBottom: 6,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const ReadonlyGrid = styled('div')({
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '2px 16px',
});

const ReadonlyItem = styled('div')(({ theme }) => ({
  display: 'flex', gap: 8, padding: '6px 0',
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
  fontSize: theme.custom.typography.body2.fontSize,
}));

const ReadonlyLabel = styled('span')(({ theme }) => ({
  flex: '0 0 84px', color: theme.custom.colors.text.medium,
}));

const ReadonlyValue = styled('span')(({ theme }) => ({
  flex: 1, color: theme.custom.colors.text.high, fontWeight: 500, wordBreak: 'break-word',
}));

const EditGrid = styled('div')(({ theme }) => ({
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.custom.spacing.md,
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
}));

const ModalActions = styled('div')({
  display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
  '@media (max-width: 480px)': { '& > *': { width: '100%' } },
});

const NoticeText = styled('p')(({ theme }) => ({
  margin: 0, fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium, wordBreak: 'keep-all',
}));

// ── Component ─────────────────────────────────────────────────────────────────

const OpinionDashboardPage: React.FC = () => {
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  // 필터
  const [reportYear, setReportYear] = useState(CURRENT_YEAR);
  const [gyogu, setGyogu] = useState('');
  const [team, setTeam] = useState('');
  const [groupNo, setGroupNo] = useState('');
  const [status, setStatus] = useState<OpinionWriteStatus>('all');
  const [search, setSearch] = useState('');

  // 데이터
  const [items, setItems] = useState<OpinionReportRow[]>([]);
  const [enrolled, setEnrolled] = useState(0);
  const [writtenTotal, setWrittenTotal] = useState(0);
  const [target, setTarget] = useState(0);
  const [written, setWritten] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<OpinionSettings | null>(null);
  const [candidates, setCandidates] = useState<OpinionMemberCandidate[]>([]);

  // 페이지네이션
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 상세 모달
  const [detailRow, setDetailRow] = useState<OpinionReportRow | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 인쇄
  const [printRows, setPrintRows] = useState<OpinionReportRow[]>([]);

  // 일괄 PDF 대상 선택 (member_id 문자열)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const handlePrintDone = useCallback(() => setPrintRows([]), []);

  // ── 로드 ────────────────────────────────────────────────────────────────────

  // 설정 + 필터 옵션용 전체 멤버 (필터를 걸어도 옵션 목록이 좁아지지 않도록 별도 조회)
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchOpinionSettings(reportYear), fetchOpinionMemberCandidates()])
      .then(([s, members]) => {
        if (cancelled) return;
        setSettings(s);
        setCandidates(members);
      })
      .catch(() => { if (!cancelled) showSnackbar('소견서 설정을 불러오지 못했습니다.', 'error'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportYear]);

  const loadList = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fetchOpinionList({
      report_year: reportYear,
      gyogu: gyogu ? Number(gyogu) : undefined,
      team: team ? Number(team) : undefined,
      group_no: groupNo ? Number(groupNo) : undefined,
      status,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setEnrolled(res.enrolled);
        setWrittenTotal(res.written_total);
        setTarget(res.target);
        setWritten(res.written);
      })
      .catch(() => { if (!cancelled) showSnackbar('소견서 명단을 불러오지 못했습니다.', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportYear, gyogu, team, groupNo, status]);

  useEffect(() => loadList(), [loadList]);

  useEffect(() => { setPage(0); }, [reportYear, gyogu, team, groupNo, status, search]);

  // 기준 연도가 바뀌면 명단 자체가 다른 회차로 갈리므로 선택을 비운다.
  // 교구·팀·그룹 필터는 selectedRows 가 items 기준으로 되짚어 알아서 떨어진다.
  useEffect(() => { setSelectedIds([]); }, [reportYear]);

  // ── 필터 옵션 ───────────────────────────────────────────────────────────────

  const gyoguOptions = useMemo(() => {
    const values = [...new Set(candidates.map((m) => m.gyogu).filter((v): v is number => v != null))].sort((a, b) => a - b);
    return [{ value: '', label: '전체' }, ...values.map((g) => ({ value: String(g), label: `${g}교구` }))];
  }, [candidates]);

  const teamOptions = useMemo(() => {
    const scoped = gyogu ? candidates.filter((m) => String(m.gyogu) === gyogu) : candidates;
    const values = [...new Set(scoped.map((m) => m.team).filter((v): v is number => v != null))].sort((a, b) => a - b);
    return [{ value: '', label: '전체' }, ...values.map((t) => ({ value: String(t), label: `${t}팀` }))];
  }, [candidates, gyogu]);

  const groupOptions = useMemo(() => {
    let scoped = gyogu ? candidates.filter((m) => String(m.gyogu) === gyogu) : candidates;
    if (team) scoped = scoped.filter((m) => String(m.team) === team);
    const values = [...new Set(scoped.map((m) => m.group_no).filter((v): v is number => v != null))].sort((a, b) => a - b);
    return [{ value: '', label: '전체' }, ...values.map((g) => ({ value: String(g), label: `${g}그룹` }))];
  }, [candidates, gyogu, team]);

  const handleGyoguChange = (v: string | number | (string | number)[]) => {
    setGyogu(String(v));
    setTeam('');
    setGroupNo('');
  };

  const handleTeamChange = (v: string | number | (string | number)[]) => {
    setTeam(String(v));
    setGroupNo('');
  };

  // ── 파생값 ──────────────────────────────────────────────────────────────────

  const overallPct = enrolled > 0 ? Math.round((writtenTotal / enrolled) * 100) : 0;
  const filteredPct = target > 0 ? Math.round((written / target) * 100) : 0;

  const memberFields: MemberFieldKey[] = settings?.member_fields ?? MEMBER_FIELD_ORDER;
  const inputFields: InputFieldKey[] = settings?.input_fields ?? INPUT_FIELD_ORDER;

  // 이름 검색은 조회 보조 수단이므로 KPI(교구·팀·그룹 범위의 서버 집계)에는 반영하지 않는다.
  // 명단·페이지네이션·일괄 PDF만 이 결과를 따른다.
  const visibleItems = useMemo(() => {
    const keyword = search.trim();
    if (!keyword) return items;
    return items.filter((r) => r.name.includes(keyword));
  }, [items, search]);

  const paginated = useMemo(
    () => visibleItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [visibleItems, page, rowsPerPage],
  );

  /**
   * 체크박스로 고른 행.
   *
   * `items` 를 기준으로 되짚어 실제 행을 얻는다 — 필터가 바뀌어 더 이상 명단에 없는
   * 선택은 자연히 떨어져 나가므로, 화면에 없는 사람이 PDF에 섞이지 않는다.
   * 이름 검색은 조회 보조 수단이라 선택을 지우지 않는다 (검색어를 지워도 선택 유지).
   */
  const selectedRows = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const picked = new Set(selectedIds);
    return items.filter((r) => picked.has(String(r.member_id)));
  }, [items, selectedIds]);

  /** 고른 게 있으면 그것만, 없으면 필터에 걸린 전체 */
  const printTargets = selectedRows.length > 0 ? selectedRows : visibleItems;

  const columns = useMemo<Column<OpinionReportRow>[]>(() => [
    { id: 'gyogu',      label: '교구', align: 'center', width: 80, render: (v: number | null) => (v != null ? `${v}교구` : '—') },
    { id: 'team',       label: '팀',   align: 'center', width: 70, render: (v: number | null) => (v != null ? `${v}팀` : '—') },
    { id: 'group_no',   label: '그룹', align: 'center', width: 80, render: (v: number | null) => (v != null ? `${v}그룹` : '—') },
    { id: 'generation', label: '기수', align: 'center', width: 70, render: (v: number | null) => (v != null ? `${v}기` : '—') },
    {
      // 직분에 따라 예정 작성자가 갈리므로(팀장은 0명, 리더는 팀장만) 명단에서 바로 보이게 둔다
      id: 'leader_names', label: '직분', align: 'center', width: 120,
      render: (v: string[]) => (v.length > 0 ? v.join(', ') : '—'),
    },
    {
      id: 'name', label: '이름', align: 'center', width: 130,
      render: (v: string, row: OpinionReportRow) => (
        <NameCell>
          {v}
          {row.is_deleted && <DeletedBadge>삭제</DeletedBadge>}
        </NameCell>
      ),
    },
    {
      // 실제로 쓴 사람을 보여주고, 아직 아무도 안 썼으면 예정 작성자를 회색으로 둔다.
      // 미작성 건의 독촉 대상을 알 수 있어야 하기 때문이다.
      id: 'writers', label: '작성자', align: 'center', width: 130,
      render: (_v: unknown, row: OpinionReportRow) => {
        const actual = row.writers;
        if (actual.length > 0) {
          return (
            <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{writerFull(actual)}</span>} arrow>
              <span>{writerSummary(actual)}</span>
            </Tooltip>
          );
        }
        const expected = row.expected_writers;
        if (expected.length === 0) return '—';
        return (
          <Tooltip
            title={(
              <span style={{ whiteSpace: 'pre-line' }}>
                {`아직 작성 전입니다. 작성 예정자\n${writerFull(expected)}`}
              </span>
            )}
            arrow
          >
            <ExpectedWriter>{writerSummary(expected)} (예정)</ExpectedWriter>
          </Tooltip>
        );
      },
    },
    {
      id: 'is_written', label: '작성 여부', align: 'center', width: 110,
      render: (v: boolean) => <WrittenBadge $written={v}>{v ? '작성 완료' : '미작성'}</WrittenBadge>,
    },
    {
      id: 'updated_at', label: '최종 수정일', align: 'center', width: 120,
      render: (v: string | null) => (v ? v.slice(0, 10) : '—'),
    },
  ], []);

  // ── 상세 모달 ───────────────────────────────────────────────────────────────

  const openDetail = (row: OpinionReportRow) => {
    const values: Record<string, string> = {};
    inputFields.forEach((key) => { values[key] = row[key] ?? ''; });
    setEditValues(values);
    setDetailRow(row);
  };

  const closeDetail = () => {
    setDetailRow(null);
    setEditValues({});
  };

  const updateEdit = (key: InputFieldKey, value: string) =>
    setEditValues((prev) => ({ ...prev, [key]: value }));

  /** 편집 중인 값을 반영한 행 — 저장 전에도 PDF 미리보기가 최신 내용을 쓰도록 */
  const detailRowWithEdits = useMemo(() => {
    if (!detailRow) return null;
    const patch: Record<string, string | null> = {};
    inputFields.forEach((key) => { patch[key] = editValues[key]?.trim() ? editValues[key] : null; });
    return { ...detailRow, ...patch } as OpinionReportRow;
  }, [detailRow, editValues, inputFields]);

  const handleSaveDetail = async () => {
    if (!detailRow) return;
    setIsSaving(true);
    try {
      // 낙관적 잠금 — 모달을 열 때 받은 updated_at을 기준값으로 함께 보낸다.
      // 그 사이 다른 작성자가 저장했다면 서버가 409로 거절한다.
      const body: OpinionReportUpdateBody = { base_updated_at: detailRow.updated_at };
      inputFields.forEach((key) => {
        body[key] = editValues[key]?.trim() ? editValues[key] : null;
      });
      await updateOpinionReport(detailRow.member_id, reportYear, body);
      showSnackbar('소견서가 저장되었습니다.', 'success');
      closeDetail();
      loadList();
    } catch (e: any) {
      if (e instanceof OpinionConflictError) {
        // 편집 내용을 잃지 않도록 모달은 열어두고 최신 내용만 다시 불러온다
        showSnackbar(e.message, 'error');
        loadList();
      } else {
        showSnackbar(e?.message || '저장 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── 인쇄 ────────────────────────────────────────────────────────────────────

  /** 체크박스로 고른 행이 있으면 그것만, 없으면 필터에 걸린 전체를 출력한다 */
  const handlePrintAll = () => {
    if (printTargets.length === 0) {
      showSnackbar('출력할 소견서가 없습니다.', 'warning');
      return;
    }
    setPrintRows(printTargets);
  };

  const handlePrintOne = () => {
    if (detailRowWithEdits) setPrintRows([detailRowWithEdits]);
  };

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  const shortInputs = inputFields.filter((k) => !INPUT_FIELD_MULTILINE.includes(k));
  const longInputs = inputFields.filter((k) => INPUT_FIELD_MULTILINE.includes(k));

  return (
    <PageWrapper>
      {/* 필터 */}
      <FilterPanel>
        <FilterGroup>
          <FilterLabel>기준 연도</FilterLabel>
          <Select value={String(reportYear)} options={YEAR_OPTIONS}
            onChange={(v) => setReportYear(Number(v))} width={FILTER_SIZES.select} />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>교구</FilterLabel>
          <Select value={gyogu} options={gyoguOptions} onChange={handleGyoguChange} width={FILTER_SIZES.select} />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>팀</FilterLabel>
          <Select value={team} options={teamOptions} onChange={handleTeamChange}
            disabled={!gyogu} width={FILTER_SIZES.select} />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>그룹</FilterLabel>
          <Select value={groupNo} options={groupOptions}
            onChange={(v) => setGroupNo(String(v))} disabled={!team} width={FILTER_SIZES.select} />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>작성 여부</FilterLabel>
          <Select value={status} options={STATUS_OPTIONS}
            onChange={(v) => setStatus(String(v) as OpinionWriteStatus)} width={FILTER_SIZES.select} />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>이름</FilterLabel>
          <TextField
            placeholder="이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leadingIcon={<Search size={16} />}
            width={FILTER_SIZES.search}
          />
        </FilterGroup>
        <FilterSpacer>
          <PrintGroup>
            {selectedRows.length > 0 && (
              <ClearSelection type="button" onClick={() => setSelectedIds([])}>
                선택 해제
              </ClearSelection>
            )}
            <Button
              variant="outlined"
              onClick={handlePrintAll}
              disabled={loading || printTargets.length === 0}
            >
              {selectedRows.length > 0
                ? `선택 PDF 다운로드 (${selectedRows.length}건)`
                : `PDF 일괄 다운로드 (${visibleItems.length}건)`}
            </Button>
          </PrintGroup>
        </FilterSpacer>
      </FilterPanel>

      {/* KPI */}
      {loading ? (
        <StatsGrid>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={110} />)}</StatsGrid>
      ) : (
        <StatsGrid>
          <StatCard
            label="대상 인원"
            value={`${target}명`}
            change={gyogu || team || groupNo ? '선택한 범위 기준' : '전체 교적 기준'}
            isPositive
            icon={<Users size={24} />}
            iconBgColor="#e0f2fe"
          />
          <StatCard
            label="작성 완료"
            value={`${written}명`}
            change={`대상 ${target}명 중`}
            isPositive
            icon={<FileCheck2 size={24} />}
            iconBgColor="#dcfce7"
          />
          <StatCard
            label="미작성"
            value={`${target - written}명`}
            change={target - written > 0 ? '작성 독려 필요' : '전원 작성 완료'}
            isPositive={target - written === 0}
            icon={<FileX2 size={24} />}
            iconBgColor="#fee2e2"
          />
          <StatCard
            label="작성률"
            value={`${filteredPct}%`}
            change="선택한 범위 기준"
            isPositive
            icon={<ClipboardList size={24} />}
            iconBgColor="#ede9fe"
          />
        </StatsGrid>
      )}

      {/* 전체 교적 대비 진행율 */}
      <ProgressBlock>
        <ProgressCaption>
          <span>전체 작성률 (전체 교적 대비)</span>
          <span>재적 {enrolled}명 중 {writtenTotal}명 작성 완료 · {overallPct}%</span>
        </ProgressCaption>
        <ProgressBarWrap>
          <ProgressBarFill $pct={overallPct} />
        </ProgressBarWrap>
      </ProgressBlock>

      {/* 소견서 입력 명단 */}
      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(row) => String(row.member_id)}
        onRowClick={openDetail}
        pagination={{
          page,
          rowsPerPage,
          totalCount: visibleItems.length,
          onPageChange: setPage,
          onRowsPerPageChange: (rpp) => { setRowsPerPage(rpp); setPage(0); },
        }}
      />

      {/* 상세 / 편집 */}
      <BaseModal
        open={detailRow !== null}
        title={detailRow
          ? `${detailRow.name}${detailRow.is_deleted ? ' (삭제)' : ''} — ${reportYear}년 소견서`
          : '소견서'}
        onClose={closeDetail}
        size="large"
        actions={
          <ModalActions>
            <Button variant="outlined" onClick={closeDetail}>닫기</Button>
            <Button variant="outlined" onClick={handlePrintOne}>PDF 다운로드</Button>
            <Button variant="filled" onClick={handleSaveDetail} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </ModalActions>
        }
      >
        {detailRow && (
          <ModalBody>
            <div>
              <ModalSectionTitle>교적 정보</ModalSectionTitle>
              <NoticeText style={{ margin: '8px 0' }}>
                교적에서 자동으로 채워지는 항목입니다. 이 화면에서는 수정할 수 없습니다.
              </NoticeText>
              <ReadonlyGrid>
                {memberFields.map((key) => (
                  <ReadonlyItem key={key}>
                    <ReadonlyLabel>{MEMBER_FIELD_LABELS[key]}</ReadonlyLabel>
                    <ReadonlyValue>{formatMemberField(detailRow, key)}</ReadonlyValue>
                  </ReadonlyItem>
                ))}
              </ReadonlyGrid>
            </div>

            <div>
              <ModalSectionTitle>소견 내용</ModalSectionTitle>
              <NoticeText style={{ margin: '8px 0' }}>
                {detailRow.is_written && detailRow.updated_at
                  ? `최종 수정 ${detailRow.updated_at.slice(0, 10)}`
                  : '미작성'}
              </NoticeText>

              <EditGrid style={{ marginTop: 12 }}>
                {shortInputs.map((key) => {
                  const max = INPUT_FIELD_MAX_LENGTH[key];
                  const value = editValues[key] ?? '';
                  return (
                    <TextField
                      key={key}
                      label={INPUT_FIELD_LABELS[key]}
                      value={value}
                      onChange={(e) => updateEdit(key, e.target.value)}
                      maxLength={max}
                      trailingIcon={lengthCounter(value, max)}
                      error={value.length >= max}
                      helperText={value.length >= max ? `최대 ${max}자까지 입력 가능합니다.` : undefined}
                      fullWidth
                    />
                  );
                })}
              </EditGrid>

              {longInputs.map((key) => {
                const max = INPUT_FIELD_MAX_LENGTH[key];
                const value = editValues[key] ?? '';
                return (
                  <div key={key} style={{ marginTop: 16 }}>
                    <TextField
                      label={INPUT_FIELD_LABELS[key]}
                      value={value}
                      onChange={(e) => updateEdit(key, e.target.value)}
                      maxLength={max}
                      helperText={
                        value.length >= max * INPUT_COUNTER_THRESHOLD
                          ? `${value.length}/${max}자`
                          : undefined
                      }
                      error={value.length >= max}
                      multiline
                      rows={4}
                      fullWidth
                    />
                  </div>
                );
              })}
            </div>

            {/*
              실제로 저장한 사람을 보여준다. 아직 아무도 쓰지 않았으면 예정 작성자를
              회색으로 대신 보여줘 독촉 대상을 알 수 있게 한다.
              관리자가 이 모달에서 대리 수정한 것은 작성자로 기록되지 않는다.
            */}
            <div>
              <ModalSectionTitle>
                {detailRow.writers.length > 0 ? '작성자' : '작성 예정자'}
              </ModalSectionTitle>
              {detailRow.writers.length === 0 && detailRow.expected_writers.length === 0 ? (
                <NoticeText style={{ margin: '8px 0' }}>지정된 작성자가 없습니다.</NoticeText>
              ) : (
                <>
                  {detailRow.writers.length === 0 && (
                    <NoticeText style={{ margin: '8px 0' }}>
                      아직 작성 전입니다. 아래는 이 소견서를 쓸 수 있는 사람입니다.
                    </NoticeText>
                  )}
                  <WriterBox style={{ marginTop: 8 }}>
                    {(detailRow.writers.length > 0 ? detailRow.writers : detailRow.expected_writers)
                      .map((w) => (
                        <WriterRow key={w.member_id} $muted={detailRow.writers.length === 0}>
                          <WriterAff>{formatWriterAffiliation(w)}</WriterAff>
                          <WriterRole>{w.role}</WriterRole>
                          <WriterName>{w.name}</WriterName>
                          <WriterTel>{w.phone_number ?? '—'}</WriterTel>
                        </WriterRow>
                      ))}
                  </WriterBox>
                </>
              )}
            </div>

            {/* 동반배치자 — 팀배치에서 같은 팀에 묶인 인원. 작성자 페이지에는 노출하지 않는다 */}
            {detailRow.companions.length > 0 && (
              <div>
                <ModalSectionTitle>동반배치자</ModalSectionTitle>
                <NoticeText style={{ margin: '8px 0' }}>
                  팀배치에서 같은 팀에 배치되도록 묶인 인원입니다. 작성자 페이지에는 표시되지 않습니다.
                </NoticeText>
                <WriterBox>
                  {detailRow.companions.map((c) => (
                    <WriterRow key={c.member_id}>
                      <WriterAff>{formatCompanionAffiliation(c)}</WriterAff>
                      <WriterName>{c.name}</WriterName>
                    </WriterRow>
                  ))}
                </WriterBox>
              </div>
            )}
          </ModalBody>
        )}
      </BaseModal>

      {/* 인쇄(PDF) — 화면에는 보이지 않고 인쇄 시에만 렌더 */}
      <OpinionReportPrint
        rows={printRows}
        memberFields={memberFields}
        inputFields={inputFields}
        theme={settings?.theme}
        onDone={handlePrintDone}
      />

      <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
    </PageWrapper>
  );
};

export default OpinionDashboardPage;
