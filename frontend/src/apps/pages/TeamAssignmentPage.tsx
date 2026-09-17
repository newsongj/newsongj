// 팀배치 작업 — 기본 정보 → 배치 실행 → 결과 확인·조정 → 소견서 완료·교적 이관
//
// 제외 명단과 동반배치 묶음은 배치 **전에** 산정되는 입력값이라
// 별도 화면(「팀배치 사전 설정」, PreAssignmentPage)에서 관리한다.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Skeleton, Tooltip } from '@mui/material';
import { AlertTriangle, Download, Link2, Search, Shuffle, UserCheck, UserMinus, Users } from 'lucide-react';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { Snackbar } from '@components/common/Snackbar';
import { BaseModal } from '@components/common/BaseModal';
import { DataTable } from '@components/common/DataTable';
import { Column } from '@components/common/DataTable/DataTable.types';
import StatCard from '@components/common/StatCard';
import { FILTER_SIZES, FILTER_STACK_BREAKPOINT } from '@/styles/filterSizes';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import {
  commitTeamAssignment,
  fetchTeamAssignmentResult,
  fetchTeamAssignmentRun,
  moveTeamAssignmentMember,
  runTeamAssignment,
  saveTeamAssignmentBasics,
} from '@/api/teamAssignment';
import {
  TEAM_ASSIGNMENT_STATUS_LABEL,
  TeamAssignmentCounts,
  TeamAssignmentRow,
  TeamAssignmentRun,
  TeamAssignmentStatus,
  TeamAssignmentSummaryCell,
} from '@/models/teamAssignment.types';

// ── 상수 ──────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

/** 배치 대상 연도 — 소견서 회차 다음 해가 기본 */
const YEAR_OPTIONS = [CURRENT_YEAR + 2, CURRENT_YEAR + 1, CURRENT_YEAR]
  .map((y) => ({ value: String(y), label: `${y}년` }));

const ALL = 'all';

const STATUS_STYLE: Record<TeamAssignmentStatus, { color: string; bg: string; border: string }> = {
  draft:     { color: '#595959', bg: '#f5f5f5', border: '#d9d9d9' },
  assigned:  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  committed: { color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
};

/**
 * CSV 내려받기 — 인원조사·차량조사 명단과 같은 방식.
 * 선두 BOM을 붙여야 엑셀이 UTF-8로 열어 한글이 깨지지 않는다.
 */
const downloadCsv = (filename: string, rows: string[][]) => {
  const bom = '﻿';
  const csv = bom + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const STATUS_HINT: Record<TeamAssignmentStatus, string> = {
  draft:     '기본 정보를 정하고, 「팀배치 사전 설정」에서 제외 명단·동반배치를 등록한 뒤 배치를 실행하세요.',
  assigned:  '배치 결과를 확인하고 팀을 조정하세요. 확정하면 다음 연도 교적으로 이관됩니다.',
  committed: '교적 이관이 끝난 회차입니다. 조회만 가능합니다.',
};

// ── Styled ────────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.lg,
}));

const StatusBar = styled('div')(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.custom.spacing.sm, flexWrap: 'wrap',
}));

const StatusBadge = styled('span')<{ $status: TeamAssignmentStatus }>(({ $status }) => ({
  display: 'inline-block', padding: '3px 12px', borderRadius: 999,
  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  color: STATUS_STYLE[$status].color,
  background: STATUS_STYLE[$status].bg,
  border: `1px solid ${STATUS_STYLE[$status].border}`,
}));

const StatusHint = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium, wordBreak: 'keep-all',
}));

const FormSection = styled('section')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg,
  backgroundColor: theme.custom.colors.neutral._99,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
  '@media (max-width: 600px)': { padding: theme.custom.spacing.md },
}));

const SectionTitle = styled('h3')(({ theme }) => ({
  margin: 0,
  fontSize: theme.custom.typography.subtitle.fontSize,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
}));

const SectionHint = styled('p')(({ theme }) => ({
  margin: 0,
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
  wordBreak: 'keep-all', lineHeight: 1.6,
}));

const InputsCard = styled('div')(({ theme }) => ({
  padding: theme.custom.spacing.md,
  backgroundColor: theme.custom.colors.white,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
}));

/**
 * `repeat(3, …)` 고정은 최소 540px + gap 을 요구한다. 사이드바가 아직 살아 있는
 * 901~1000px 구간에서는 본문이 그보다 좁아 가로로 넘치는데, 900px 미디어쿼리는
 * 그 아래에서만 걸려 이 구간을 못 잡는다. `auto-fit` 은 알아서 접히므로 구간이 비지 않는다.
 */
const FormGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: theme.custom.spacing.md,
  alignItems: 'start',
  '@media (max-width: 600px)': { gridTemplateColumns: '1fr' },
}));

/**
 * 라벨 + 입력 한 묶음.
 * `TextField`는 플로팅 라벨, `Select`는 라벨 prop이 없어 블록 라벨이 필요하다.
 * 같은 행에 섞으면 시작 위치가 어긋나므로 전부 외부 라벨로 통일한다.
 */
const FieldBlock = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.xs,
}));

const FieldLabel = styled('label')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.high,
}));

const DerivedNote = styled('div')(({ theme }) => ({
  gridColumn: '1 / -1',
  fontSize: 12, color: theme.custom.colors.text.medium,
}));

const StatsGrid = styled('div')({
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
  '@media (max-width: 1100px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '@media (max-width: 600px)': { gridTemplateColumns: '1fr' },
});

// 배치 요약 그리드 — 화면 폭을 꽉 채운다 (팀 수가 많아도 한눈에 비교되도록)
const SummaryScroll = styled('div')({ overflowX: 'auto', WebkitOverflowScrolling: 'touch' });

const SummaryTable = styled('table')(({ theme }) => ({
  width: '100%', minWidth: 720, tableLayout: 'fixed',
  borderCollapse: 'collapse',
  fontSize: theme.custom.typography.body2.fontSize,
  background: theme.custom.colors.white,
  '& th, & td': {
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    padding: '12px 6px', textAlign: 'center', whiteSpace: 'nowrap',
  },
  '& th': {
    background: theme.custom.colors.neutral._95,
    color: theme.custom.colors.text.medium,
    fontWeight: 600,
  },
  // 첫 열(교구 라벨)과 마지막 열(합계)은 고정 폭, 팀 칸이 나머지를 균등 분배
  '& th:first-of-type, & tbody th:first-of-type': { width: 92 },
  '& thead th:last-of-type, & tbody th:last-of-type': { width: 84 },
}));

const CountCell = styled('td')<{ $off: boolean }>(({ $off }) => ({
  fontWeight: $off ? 700 : 400,
  color: $off ? '#b45309' : 'inherit',
  background: $off ? '#fef3c7' : 'transparent',
}));

// 명단 필터 — 소견서 현황 대시보드(OpinionDashboardPage)와 같은 규격을 쓴다.
// 라벨을 왼쪽 인라인으로 두고 TextField는 라벨 없이 leadingIcon + placeholder 로 쓴다.
// 라벨을 입력 위에 올리면 Select 와 TextField 의 높이가 어긋난다.
const FilterRow = styled('div')(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.custom.spacing.sm, flexWrap: 'wrap',
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

const ResultCount = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
}));

/**
 * 건수 표시 + 엑셀 다운로드 버튼.
 *
 * 좁은 화면에서는 세로로 쌓고 버튼을 한 줄 꽉 채운다 — 위 필터 컨트롤들이
 * 전부 전체 폭이라, 버튼만 제 크기로 남으면 줄이 들쭉날쭉해 보인다.
 * `Button` 에 `fullWidth` prop 이 없어 마지막 자식을 직접 늘린다.
 */
const ExportGroup = styled('div')(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.custom.spacing.sm,
  [`@media (max-width: ${FILTER_STACK_BREAKPOINT}px)`]: {
    width: '100%',
    flexDirection: 'column', alignItems: 'stretch',
    gap: theme.custom.spacing.xs,
    '& > *:last-child': { width: '100%' },
  },
}));

const Badge = styled('span')<{ $tone: 'moved' | 'pre' }>(({ $tone }) => ({
  display: 'inline-block', padding: '1px 7px', borderRadius: 999,
  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
  color: $tone === 'moved' ? '#b45309' : '#2563eb',
  background: $tone === 'moved' ? '#fef3c7' : '#eff6ff',
}));

const BadgeRow = styled('div')({
  display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap',
});

const Ellipsis = styled('span')({
  display: 'inline-block', maxWidth: 160,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  verticalAlign: 'middle',
});

const ModalGrid = styled('div')({
  display: 'flex', flexDirection: 'column', gap: 14,
  padding: '20px 24px',
  '@media (max-width: 600px)': { padding: '12px', gap: 10 },
});

const ModalActions = styled('div')({
  display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
  '@media (max-width: 480px)': { '& > *': { width: '100%' } },
});

// 되돌릴 수 없는 작업이라 경고를 본문 맨 위에 세운다
const DangerBox = styled('div')({
  display: 'flex', flexDirection: 'column', gap: 6,
  padding: '14px 16px', borderRadius: 8,
  background: '#fef2f2', border: '1px solid #fecaca',
});

const DangerTitle = styled('div')({
  display: 'flex', alignItems: 'center', gap: 8,
  fontSize: 15, fontWeight: 700, color: '#dc2626',
});

const DangerText = styled('p')({
  margin: 0, fontSize: 13, lineHeight: 1.7, color: '#b91c1c',
});

const FooterActions = styled('div')(({ theme }) => ({
  display: 'flex', justifyContent: 'flex-end', gap: theme.custom.spacing.sm, flexWrap: 'wrap',
  '@media (max-width: 480px)': { flexDirection: 'column', '& > *': { width: '100%' } },
}));

// ── Component ─────────────────────────────────────────────────────────────────

const TeamAssignmentPage: React.FC = () => {
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  const [targetYear, setTargetYear] = useState(CURRENT_YEAR + 1);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [run, setRun] = useState<TeamAssignmentRun | null>(null);
  const [teamCount, setTeamCount] = useState('36');
  const [gyoguCount, setGyoguCount] = useState('3');

  const [rows, setRows] = useState<TeamAssignmentRow[]>([]);
  const [counts, setCounts] = useState<TeamAssignmentCounts | null>(null);

  // 명단 필터
  const [filterGyogu, setFilterGyogu] = useState(ALL);
  const [filterTeam, setFilterTeam] = useState(ALL);
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 완료 확인 모달
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status: TeamAssignmentStatus = run?.status ?? 'draft';
  const locked = status === 'committed';

  // ── 로드 ────────────────────────────────────────────────────────────────────

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchTeamAssignmentRun(targetYear),
      fetchTeamAssignmentResult(targetYear),
    ])
      .then(([r, result]) => {
        if (cancelled) return;
        setRun(r);
        setTeamCount(String(r.total_team_count));
        setGyoguCount(String(r.gyogu_count));
        setRows(result.rows);
        setCounts(result.counts);
      })
      .catch(() => { if (!cancelled) showSnackbar('팀배치 정보를 불러오지 못했습니다.', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetYear]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    setPage(0);
    setFilterGyogu(ALL);
    setFilterTeam(ALL);
    setSearch('');
  }, [targetYear]);

  // ── 파생값 ──────────────────────────────────────────────────────────────────

  const teamPerGyogu = useMemo(() => {
    const t = Number(teamCount) || 0;
    const g = Number(gyoguCount) || 1;
    return Math.floor(t / g);
  }, [teamCount, gyoguCount]);

  /** 교구·팀별 인원 — 배치 균형 확인용 (필터와 무관하게 전체 기준) */
  const summary = useMemo<TeamAssignmentSummaryCell[]>(() => {
    const map = new Map<string, TeamAssignmentSummaryCell>();
    rows.forEach((r) => {
      const key = `${r.gyogu}-${r.team}`;
      const cell = map.get(key) ?? { gyogu: r.gyogu, team: r.team, total: 0, male: 0, female: 0 };
      cell.total += 1;
      if (r.gender === '남') cell.male += 1;
      if (r.gender === '여') cell.female += 1;
      map.set(key, cell);
    });
    return [...map.values()].sort((a, b) => (a.gyogu - b.gyogu) || (a.team - b.team));
  }, [rows]);

  const avgPerTeam = useMemo(
    () => (summary.length > 0 ? rows.length / summary.length : 0),
    [rows.length, summary.length],
  );

  const manualCount = useMemo(() => rows.filter((r) => r.is_manual).length, [rows]);

  const gyoguOptions = useMemo(
    () => Array.from({ length: Number(gyoguCount) || 1 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}교구` })),
    [gyoguCount],
  );

  const teamOptions = useMemo(
    () => Array.from({ length: teamPerGyogu || 1 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}팀` })),
    [teamPerGyogu],
  );

  const filterGyoguOptions = useMemo(
    () => [{ value: ALL, label: '전체 교구' }, ...gyoguOptions],
    [gyoguOptions],
  );

  const filterTeamOptions = useMemo(
    () => [{ value: ALL, label: '전체 팀' }, ...teamOptions],
    [teamOptions],
  );

  /** 배치된 교구·팀 + 이름으로 좁힌 명단 */
  const filtered = useMemo(() => {
    const q = search.trim();
    return rows.filter((r) => {
      if (filterGyogu !== ALL && r.gyogu !== Number(filterGyogu)) return false;
      if (filterTeam !== ALL && r.team !== Number(filterTeam)) return false;
      if (q && !r.name.includes(q)) return false;
      return true;
    });
  }, [rows, filterGyogu, filterTeam, search]);

  useEffect(() => { setPage(0); }, [filterGyogu, filterTeam, search]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage],
  );

  // ── 기본 정보 저장 ──────────────────────────────────────────────────────────

  const handleSaveBasics = async () => {
    const t = Number(teamCount);
    const g = Number(gyoguCount);
    if (!t || !g) { showSnackbar('총 팀 수와 교구 수를 입력해주세요.', 'error'); return; }
    if (t % g !== 0) {
      showSnackbar(`총 팀 수(${t})가 교구 수(${g})로 나누어지지 않습니다.`, 'error');
      return;
    }
    setIsSaving(true);
    try {
      await saveTeamAssignmentBasics({ target_year: targetYear, total_team_count: t, gyogu_count: g });
      showSnackbar('기본 정보가 저장되었습니다.', 'success');
      load();
    } catch (e: any) {
      showSnackbar(e?.message || '저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── 배치 실행 / 조정 / 완료 ─────────────────────────────────────────────────

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await runTeamAssignment(targetYear);
      setRun(res.run);
      setRows(res.rows);
      setCounts(res.counts);
      setPage(0);
      showSnackbar(
        `${res.counts.total}명을 ${res.run.total_team_count}개 팀에 배치했습니다.`
        + (res.counts.excluded > 0 ? ` (사전 배치 ${res.counts.excluded}명 포함)` : ''),
        'success',
      );
    } catch (e: any) {
      showSnackbar(e?.message || '배치 실행 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  /** 사전 배치(제외 명단) 인원도 여기서 다시 옮길 수 있다 */
  const handleMove = async (memberId: number, gyogu: number, team: number) => {
    // 낙관적 업데이트 — 드롭다운 반응이 끊기지 않게
    setRows((prev) => prev.map((r) =>
      (r.member_id === memberId ? { ...r, gyogu, team, is_manual: true } : r)));
    try {
      await moveTeamAssignmentMember(targetYear, memberId, gyogu, team);
    } catch (e: any) {
      showSnackbar(e?.message || '팀 이동에 실패했습니다.', 'error');
      load();
    }
  };

  const handleCommit = async () => {
    setIsSaving(true);
    try {
      await commitTeamAssignment(targetYear);
      setConfirmOpen(false);
      showSnackbar(`${targetYear}년 교적으로 이관되었습니다.`, 'success');
      load();
    } catch (e: any) {
      showSnackbar(e?.message || '완료 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── 명단 컬럼 ───────────────────────────────────────────────────────────────
  //
  // 교적 명단(MemberListPage)과 같은 순서로 두되, 맨 앞 교구·팀만 배치 결과
  // 드롭다운으로 바꾼다. 뒤쪽에 기존 소속·동반·상태를 덧붙인다.

  const dash = (v: string | number | null | undefined) => (v == null || v === '' ? '—' : String(v));

  const columns = useMemo<Column<TeamAssignmentRow>[]>(() => [
    {
      id: 'is_manual', label: '상태', align: 'center', width: 118,
      render: (_v: unknown, row: TeamAssignmentRow) => {
        if (!row.is_excluded && !row.is_manual) return '—';
        return (
          <BadgeRow>
            {row.is_excluded && (
              <Tooltip title="제외 명단으로 교구·팀을 사전 지정한 인원" arrow>
                <Badge $tone="pre">사전배치</Badge>
              </Tooltip>
            )}
            {row.is_manual && <Badge $tone="moved">이동</Badge>}
          </BadgeRow>
        );
      },
    },
    {
      id: 'member_id', label: '번호', align: 'center', width: 72,
      render: (_v: unknown, row: TeamAssignmentRow) => row.member_id,
    },
    {
      id: 'gyogu', label: '교구', align: 'center', width: 110,
      render: (_v: unknown, row: TeamAssignmentRow) => (
        <Select
          value={String(row.gyogu)}
          options={gyoguOptions}
          onChange={(v) => handleMove(row.member_id, Number(v), row.team)}
          disabled={locked}
          width={92}
        />
      ),
    },
    {
      id: 'team', label: '팀', align: 'center', width: 102,
      render: (_v: unknown, row: TeamAssignmentRow) => (
        <Select
          value={String(row.team)}
          options={teamOptions}
          onChange={(v) => handleMove(row.member_id, row.gyogu, Number(v))}
          disabled={locked}
          width={84}
        />
      ),
    },
    {
      id: 'group_no', label: '그룹', align: 'center', width: 76,
      // 팀배치는 교구·팀까지만 정한다 — 그룹은 내년 팀장 몫
      render: () => <Tooltip title="그룹은 내년 팀장이 배치합니다" arrow><span>—</span></Tooltip>,
    },
    { id: 'name', label: '이름', align: 'center', width: 96 },
    {
      id: 'gender', label: '성별', align: 'center', width: 70,
      render: (v: string | null) => dash(v),
    },
    {
      id: 'generation', label: '기수', align: 'center', width: 80,
      render: (v: number | null) => (v != null ? `${v}기` : '—'),
    },
    {
      id: 'phone_number', label: '연락처', align: 'center', width: 140,
      render: (v: string | null) => dash(v),
    },
    {
      id: 'birthdate', label: '생년월일', align: 'center', width: 116,
      render: (v: string | null) => dash(v),
    },
    {
      id: 'leader_names', label: '직분', align: 'center', width: 140,
      render: (v: string[]) => (v.length > 0 ? v.join(', ') : '—'),
    },
    {
      id: 'enrolled_at', label: '등반일자', align: 'center', width: 116,
      render: (v: string | null) => dash(v),
    },
    {
      id: 'member_type', label: '교인구분', align: 'center', width: 104,
      render: (v: string | null) => dash(v),
    },
    {
      id: 'attendance_grade', label: '출석등급', align: 'center', width: 92,
      render: (v: string | null) => dash(v),
    },
    {
      id: 'plt_status', label: 'PLT 수료여부', align: 'center', width: 120,
      render: (v: string | null) => dash(v),
    },
    {
      id: 'school_work', label: '학교 및 직장', align: 'center', width: 170,
      render: (v: string | null) => (v ? <Tooltip title={v} arrow><Ellipsis>{v}</Ellipsis></Tooltip> : '—'),
    },
    {
      id: 'major', label: '전공', align: 'center', width: 120,
      render: (v: string | null) => (v ? <Tooltip title={v} arrow><Ellipsis>{v}</Ellipsis></Tooltip> : '—'),
    },
    {
      id: 'v8pid', label: 'V8 PID', align: 'center', width: 116,
      render: (v: string | null) => dash(v),
    },
    {
      id: 'prev_team', label: '기존 소속', align: 'center', width: 120,
      render: (_v: unknown, row: TeamAssignmentRow) => {
        const parts = [
          row.prev_gyogu != null ? `${row.prev_gyogu}교구` : null,
          row.prev_team != null ? `${row.prev_team}팀` : null,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : '—';
      },
    },
    {
      id: 'companion_no', label: '동반', align: 'center', width: 78,
      render: (v: number | null) => (
        v != null
          ? <Tooltip title={`동반배치 묶음 ${v}`} arrow><span>#{v}</span></Tooltip>
          : '—'
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [gyoguOptions, teamOptions, locked]);

  /**
   * 배치 명단 CSV 내려받기 — 현재 필터가 걸린 행만 받는다.
   * 컬럼 순서는 화면 테이블과 동일하게 맞춘다 (드롭다운은 값으로 평문화).
   */
  const handleExport = () => {
    const header = [
      '상태', '번호', '교구', '팀', '그룹', '이름', '성별', '기수', '연락처', '생년월일',
      '직분', '등반일자', '교인구분', '출석등급', 'PLT 수료여부', '학교 및 직장', '전공',
      'V8 PID', '기존 소속', '동반',
    ];
    const body = filtered.map((r) => [
      [r.is_excluded ? '사전배치' : '', r.is_manual ? '이동' : ''].filter(Boolean).join(' ') || '-',
      r.member_id,
      r.gyogu, r.team,
      '',                       // 그룹 — 내년 팀장이 배치하므로 비워 둔다
      r.name, r.gender ?? '', r.generation != null ? `${r.generation}기` : '',
      r.phone_number ?? '', r.birthdate ?? '',
      r.leader_names.join(', '), r.enrolled_at ?? '', r.member_type ?? '',
      r.attendance_grade ?? '', r.plt_status ?? '', r.school_work ?? '', r.major ?? '',
      r.v8pid ?? '',
      [r.prev_gyogu != null ? `${r.prev_gyogu}교구` : '', r.prev_team != null ? `${r.prev_team}팀` : '']
        .filter(Boolean).join(' '),
      r.companion_no != null ? `#${r.companion_no}` : '',
    ].map(String));

    downloadCsv(`${targetYear}년_팀배치_명단.csv`, [header, ...body]);
  };

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageWrapper>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={180} />
        <Skeleton variant="rounded" height={200} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <StatusBar>
        <StatusBadge $status={status}>{targetYear}년 · {TEAM_ASSIGNMENT_STATUS_LABEL[status]}</StatusBadge>
        <StatusHint>{STATUS_HINT[status]}</StatusHint>
      </StatusBar>

      {/* 1. 기본 정보 */}
      <FormSection>
        <SectionTitle>기본 정보 입력</SectionTitle>
        <SectionHint>
          배치는 <strong>성별 × 출석등급</strong> 조합별로 라운드로빈 분배해 각 팀에 고르게 섞습니다.
          삭제 명단에 있는 인원은 배치 대상에서 제외됩니다.
          제외 명단·동반배치 묶음은 <strong>「팀배치 사전 설정」</strong> 화면에서 등록하세요.
        </SectionHint>
        <InputsCard>
          <FormGrid>
            <FieldBlock>
              <FieldLabel htmlFor="ta-target-year">배치 대상 연도</FieldLabel>
              <Select
                id="ta-target-year"
                value={String(targetYear)}
                options={YEAR_OPTIONS}
                onChange={(v) => setTargetYear(Number(v))}
                width="100%"
              />
            </FieldBlock>

            <FieldBlock>
              <FieldLabel htmlFor="ta-team-count">총 팀 수</FieldLabel>
              <TextField
                id="ta-team-count" type="number" min="1"
                value={teamCount}
                onChange={(e) => setTeamCount(e.target.value.replace(/[^\d]/g, ''))}
                disabled={locked}
                placeholder="예: 36"
                fullWidth
              />
            </FieldBlock>

            <FieldBlock>
              <FieldLabel htmlFor="ta-gyogu-count">교구 수</FieldLabel>
              <TextField
                id="ta-gyogu-count" type="number" min="1"
                value={gyoguCount}
                onChange={(e) => setGyoguCount(e.target.value.replace(/[^\d]/g, ''))}
                disabled={locked}
                placeholder="예: 3"
                fullWidth
              />
            </FieldBlock>
            <DerivedNote>
              교구당 <strong>{teamPerGyogu}팀</strong>으로 나뉩니다
              {Number(teamCount) % (Number(gyoguCount) || 1) !== 0 && (
                <span style={{ color: '#ff4d4f', marginLeft: 8 }}>
                  총 팀 수가 교구 수로 나누어지지 않습니다.
                </span>
              )}
              <br />
              그룹은 배정하지 않습니다 — <strong>내년 팀장이 배치하므로 그룹번호는 0으로 이관됩니다.</strong>
            </DerivedNote>
          </FormGrid>
        </InputsCard>
        {!locked && (
          <FooterActions>
            <Button variant="outlined" onClick={handleSaveBasics} disabled={isSaving}>
              기본 정보 저장
            </Button>
          </FooterActions>
        )}
      </FormSection>

      {/* 2. 배치 인원 집계 */}
      {counts && (
        <StatsGrid>
          <StatCard
            label="배치 인원" value={`${counts.total}명`}
            change={`새가족 ${counts.newcomer} · 교적 ${counts.regular}`} isPositive
            icon={<Users size={24} />} iconBgColor="#e0f2fe"
          />
          <StatCard
            label="랜덤배치" value={`${counts.random}명`}
            change="개별 랜덤 대상" isPositive
            icon={<UserCheck size={24} />} iconBgColor="#dcfce7"
          />
          <StatCard
            label="동반배치" value={`${counts.companion}명`}
            change="묶음 단위로 같은 팀" isPositive
            icon={<Link2 size={24} />} iconBgColor="#ede9fe"
          />
          <StatCard
            label="제외 명단" value={`${counts.excluded}명`}
            change="교구·팀 사전 지정" isPositive
            icon={<UserMinus size={24} />} iconBgColor="#fef3c7"
          />
        </StatsGrid>
      )}

      {/* 3. 배치 실행 */}
      {!locked && (
        <FooterActions>
          <Button variant="filled" onClick={handleRun} disabled={isRunning} showIcon icon={<Shuffle size={16} />}>
            {isRunning ? '배치 중...' : rows.length > 0 ? '다시 배치' : '팀배치 실행'}
          </Button>
        </FooterActions>
      )}

      {/* 4. 배치 결과 */}
      {rows.length > 0 && (
        <>
          <FormSection>
            <SectionTitle>교구·팀별 인원</SectionTitle>
            <SectionHint>
              평균({avgPerTeam.toFixed(1)}명)에서 2명 이상 벗어난 팀은 주황으로 표시됩니다.
              {manualCount > 0 && <> 배치 후 수기로 팀을 옮긴 인원은 <strong>{manualCount}명</strong>입니다.</>}
            </SectionHint>
            <SummaryScroll>
              <SummaryTable>
                <thead>
                  <tr>
                    <th>교구</th>
                    {Array.from({ length: teamPerGyogu }, (_, i) => <th key={i}>{i + 1}팀</th>)}
                    <th>합계</th>
                  </tr>
                </thead>
                <tbody>
                  {gyoguOptions.map((g) => {
                    const gyogu = Number(g.value);
                    const cells = summary.filter((s) => s.gyogu === gyogu);
                    const sum = cells.reduce((acc, c) => acc + c.total, 0);
                    return (
                      <tr key={gyogu}>
                        <th>{gyogu}교구</th>
                        {Array.from({ length: teamPerGyogu }, (_, i) => {
                          const cell = cells.find((c) => c.team === i + 1);
                          const total = cell?.total ?? 0;
                          return (
                            <CountCell key={i} $off={Math.abs(total - avgPerTeam) >= 2}>
                              {total}
                            </CountCell>
                          );
                        })}
                        <th>{sum}</th>
                      </tr>
                    );
                  })}
                </tbody>
              </SummaryTable>
            </SummaryScroll>
          </FormSection>

          {/* 배치 명단 — 교적 명단과 같은 컬럼 구성 */}
          <FilterRow>
            <FilterGroup>
              <FilterLabel>배치 교구</FilterLabel>
              <Select
                value={filterGyogu} options={filterGyoguOptions}
                onChange={(v) => setFilterGyogu(String(v))} width={FILTER_SIZES.select}
              />
            </FilterGroup>
            <FilterGroup>
              <FilterLabel>배치 팀</FilterLabel>
              <Select
                value={filterTeam} options={filterTeamOptions}
                onChange={(v) => setFilterTeam(String(v))} width={FILTER_SIZES.select}
              />
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
              <ExportGroup>
                <ResultCount>
                  {filtered.length === rows.length
                    ? `전체 ${rows.length}명`
                    : `${filtered.length}명 / 전체 ${rows.length}명`}
                </ResultCount>
                <Button
                  variant="outlined"
                  onClick={handleExport}
                  disabled={filtered.length === 0}
                  showIcon icon={<Download size={16} />}
                >
                  엑셀 다운로드 ({filtered.length}명)
                </Button>
              </ExportGroup>
            </FilterSpacer>
          </FilterRow>

          <DataTable
            columns={columns}
            data={paginated}
            getRowId={(row) => String(row.member_id)}
            pagination={{
              page,
              rowsPerPage,
              totalCount: filtered.length,
              onPageChange: setPage,
              onRowsPerPageChange: (rpp) => { setRowsPerPage(rpp); setPage(0); },
            }}
          />

          {!locked && (
            <FooterActions>
              <Button variant="filled" onClick={() => setConfirmOpen(true)} disabled={isSaving}>
                소견서 완료 · {targetYear}년 교적 이관
              </Button>
            </FooterActions>
          )}
        </>
      )}

      {/* 완료 확인 모달 */}
      <BaseModal
        open={confirmOpen}
        title="소견서 완료 · 교적 이관"
        onClose={() => setConfirmOpen(false)}
        size="small"
        actions={
          <ModalActions>
            <Button variant="outlined" onClick={() => setConfirmOpen(false)}>취소</Button>
            <Button variant="filled" onClick={handleCommit} disabled={isSaving}>
              {isSaving ? '처리 중...' : '완료 처리'}
            </Button>
          </ModalActions>
        }
      >
        <ModalGrid>
          <DangerBox>
            <DangerTitle>
              <AlertTriangle size={18} />
              이관하면 원복이 불가합니다
            </DangerTitle>
            <DangerText>
              한 번 이관하면 되돌릴 수 없습니다. 팀 조정을 <strong>모두 마친 뒤</strong> 진행하세요.
            </DangerText>
          </DangerBox>

          <p style={{ margin: 0, color: '#262626', lineHeight: 1.7, fontSize: 15 }}>
            현재 배치 결과 <strong>{rows.length}명</strong>을 <strong>{targetYear}년 교적</strong>으로
            이관하시겠습니까?
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#595959', lineHeight: 1.8, fontSize: 14 }}>
            <li>이관된 교적은 <strong>{targetYear}년 교적 명단</strong>으로 넘어갑니다</li>
            <li>등반 전 새가족은 <strong>{targetYear}년 미등반 새가족 명단</strong>으로 넘어갑니다</li>
            <li>그룹은 배정되지 않습니다 (내년 팀장이 배치)</li>
            <li>이관 후 <strong>{targetYear - 1}년 소견서가 완료 처리</strong>되어 설정이 잠깁니다</li>
            <li>이후 이 화면은 <strong>조회 전용</strong>이 되어 다시 배치할 수 없습니다</li>
          </ul>
        </ModalGrid>
      </BaseModal>

      <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
    </PageWrapper>
  );
};

export default TeamAssignmentPage;
