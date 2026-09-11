import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { IconButton, Skeleton, Tooltip } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Shuffle, Users, UserCheck, Link2 } from 'lucide-react';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { Checkbox } from '@components/common/Checkbox';
import { Snackbar } from '@components/common/Snackbar';
import { BaseModal } from '@components/common/BaseModal';
import { DataTable } from '@components/common/DataTable';
import { Column } from '@components/common/DataTable/DataTable.types';
import StatCard from '@components/common/StatCard';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { fetchOpinionMemberCandidates } from '@/api/opinion';
import { OpinionMemberCandidate } from '@/models/opinion.types';
import {
  commitTeamAssignment,
  fetchTeamAssignmentCompanions,
  fetchTeamAssignmentResult,
  fetchTeamAssignmentRun,
  moveTeamAssignmentMember,
  runTeamAssignment,
  saveTeamAssignmentBasics,
  saveTeamAssignmentCompanions,
} from '@/api/teamAssignment';
import {
  TEAM_ASSIGNMENT_STATUS_LABEL,
  TeamAssignmentCompanion,
  TeamAssignmentCompanionPair,
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

const STATUS_STYLE: Record<TeamAssignmentStatus, { color: string; bg: string; border: string }> = {
  draft:     { color: '#595959', bg: '#f5f5f5', border: '#d9d9d9' },
  assigned:  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  committed: { color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
};

const STATUS_HINT: Record<TeamAssignmentStatus, string> = {
  draft:     '기본 정보와 동반배치 묶음을 정한 뒤 팀배치를 실행하세요.',
  assigned:  '배치 결과를 확인하고 팀을 조정하세요. 확정하면 다음 연도 교적으로 이관됩니다.',
  committed: '교적 이관이 끝난 회차입니다. 조회만 가능합니다.',
};

const affiliation = (m: OpinionMemberCandidate) =>
  [m.gyogu ? `${m.gyogu}교구` : null, m.team ? `${m.team}팀` : null, m.group_no ? `${m.group_no}그룹` : null]
    .filter(Boolean)
    .join(' ');

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

const FormGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))',
  gap: theme.custom.spacing.md,
  '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
}));

const DerivedNote = styled('div')(({ theme }) => ({
  gridColumn: '1 / -1',
  fontSize: 12, color: theme.custom.colors.text.medium,
}));

const StatsGrid = styled('div')({
  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
  '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
});

// 동반배치 테이블
const TableScroll = styled('div')({ overflowX: 'auto', WebkitOverflowScrolling: 'touch' });

const MapTable = styled('table')(({ theme }) => ({
  width: '100%', minWidth: 560, borderCollapse: 'collapse',
  fontSize: theme.custom.typography.body2.fontSize,
  '& th, & td': {
    padding: `${theme.custom.spacing.xs} ${theme.custom.spacing.sm}`,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    textAlign: 'left', verticalAlign: 'top',
  },
  '& th': {
    color: theme.custom.colors.text.medium, fontWeight: 500,
    background: theme.custom.colors.neutral._99, whiteSpace: 'nowrap',
  },
  '& tbody tr:hover': { background: theme.custom.overlay.primary.hover },
}));

const CompanionChips = styled('div')({ display: 'flex', flexWrap: 'wrap', gap: 4 });

const CompanionChip = styled('span')(({ theme }) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 6px 2px 8px', borderRadius: 999,
  fontSize: 12, color: theme.custom.colors.primary._600,
  background: theme.custom.colors.primary._050,
  border: `1px solid ${theme.custom.colors.primary._100}`,
}));

const ChipRemove = styled('button')({
  border: 'none', background: 'transparent', cursor: 'pointer',
  padding: 0, lineHeight: 1, fontSize: 13, color: 'inherit', opacity: 0.7,
  '&:hover': { opacity: 1 },
});

const EmptyHint = styled('div')(({ theme }) => ({
  padding: `${theme.custom.spacing.lg} 0`, textAlign: 'center',
  color: theme.custom.colors.text.disabled,
  fontSize: theme.custom.typography.body2.fontSize,
}));

const AddRow = styled('div')({ display: 'flex', justifyContent: 'flex-end', marginTop: 8 });

const DeleteIconButton = styled(IconButton)(({ theme }) => ({
  width: 32, height: 32,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: '100px', color: theme.custom.colors.primary._500,
  '& svg': { width: 16, height: 16 },
  '&:hover': { backgroundColor: 'rgba(24,126,244,0.08)' },
}));

// 배치 요약 그리드
const SummaryScroll = styled('div')({ overflowX: 'auto' });

const SummaryTable = styled('table')(({ theme }) => ({
  borderCollapse: 'collapse', fontSize: 12,
  '& th, & td': {
    border: `1px solid ${theme.custom.colors.primary.outline}`,
    padding: '4px 8px', textAlign: 'center', whiteSpace: 'nowrap',
  },
  '& th': { background: theme.custom.colors.neutral._95, color: theme.custom.colors.text.medium, fontWeight: 600 },
}));

const CountCell = styled('td')<{ $off: boolean }>(({ $off }) => ({
  fontWeight: $off ? 700 : 400,
  color: $off ? '#b45309' : 'inherit',
  background: $off ? '#fef3c7' : 'transparent',
}));

// 모달
const ModalBody = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.md,
  padding: theme.custom.spacing.lg, width: '100%', minWidth: 0, boxSizing: 'border-box',
}));

const ModalActions = styled('div')({
  display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
  '@media (max-width: 480px)': { '& > *': { width: '100%' } },
});

const PickerTableWrap = styled('div')(({ theme }) => ({
  maxHeight: 280, overflowY: 'auto',
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
}));

const PickerTable = styled('table')(({ theme }) => ({
  width: '100%', borderCollapse: 'collapse',
  fontSize: theme.custom.typography.body2.fontSize,
  '& th, & td': {
    padding: '6px 10px',
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    textAlign: 'left', whiteSpace: 'nowrap',
  },
  '& th': {
    position: 'sticky', top: 0, zIndex: 1,
    background: theme.custom.colors.neutral._95,
    color: theme.custom.colors.text.medium, fontWeight: 500,
  },
  '& tbody tr': { cursor: 'pointer' },
  '& tbody tr:hover': { background: theme.custom.overlay.primary.hover },
}));

const RowSelected = styled('tr')<{ $selected: boolean }>(({ theme, $selected }) => ({
  background: $selected ? theme.custom.colors.primary._050 : 'transparent',
}));

const SubText = styled('span')(({ theme }) => ({
  fontSize: 12, color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
}));

const MovedBadge = styled('span')({
  display: 'inline-block', marginLeft: 6, padding: '1px 7px', borderRadius: 999,
  fontSize: 11, fontWeight: 600, color: '#b45309', background: '#fef3c7',
  verticalAlign: 'middle',
});

const FooterActions = styled('div')(({ theme }) => ({
  display: 'flex', justifyContent: 'flex-end', gap: theme.custom.spacing.sm, flexWrap: 'wrap',
  '@media (max-width: 480px)': { flexDirection: 'column', '& > *': { width: '100%' } },
}));

const InlineSelectWrap = styled('div')({
  display: 'flex', gap: 4, justifyContent: 'center',
});

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

  const [candidates, setCandidates] = useState<OpinionMemberCandidate[]>([]);
  const [companions, setCompanions] = useState<TeamAssignmentCompanion[]>([]);
  const [rows, setRows] = useState<TeamAssignmentRow[]>([]);
  const [targetCount, setTargetCount] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 동반배치 추가 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSel, setModalSel] = useState<Set<number>>(new Set());
  const [modalSearch, setModalSearch] = useState('');
  const [modalError, setModalError] = useState('');

  // 완료 확인 모달
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status: TeamAssignmentStatus = run?.status ?? 'draft';
  const locked = status === 'committed';

  // ── 로드 ────────────────────────────────────────────────────────────────────

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fetchOpinionMemberCandidates()
      .then(async (members) => {
        if (cancelled) return;
        setCandidates(members);
        const [r, comps, result] = await Promise.all([
          fetchTeamAssignmentRun(targetYear),
          fetchTeamAssignmentCompanions(targetYear, members),
          fetchTeamAssignmentResult(targetYear),
        ]);
        if (cancelled) return;
        setRun(r);
        setTeamCount(String(r.total_team_count));
        setGyoguCount(String(r.gyogu_count));
        setCompanions(comps);
        setRows(result.rows);
        setTargetCount(result.target_count);
      })
      .catch(() => { if (!cancelled) showSnackbar('팀배치 정보를 불러오지 못했습니다.', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetYear]);

  useEffect(() => load(), [load]);
  useEffect(() => { setPage(0); }, [targetYear]);

  // ── 파생값 ──────────────────────────────────────────────────────────────────

  const teamPerGyogu = useMemo(() => {
    const t = Number(teamCount) || 0;
    const g = Number(gyoguCount) || 1;
    return Math.floor(t / g);
  }, [teamCount, gyoguCount]);

  const companionMemberIds = useMemo(
    () => new Set(companions.flatMap((c) => c.members.map((m) => m.member_id))),
    [companions],
  );

  /** 교구·팀별 인원 — 배치 균형 확인용 */
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

  const paginated = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage],
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

  // ── 동반배치 묶음 ───────────────────────────────────────────────────────────

  const persistCompanions = async (next: TeamAssignmentCompanion[]) => {
    const pairs: TeamAssignmentCompanionPair[] = next.flatMap((c) =>
      c.members.map((m) => ({ companion_no: c.companion_no, member_id: m.member_id })));
    await saveTeamAssignmentCompanions(targetYear, pairs);
    setCompanions(next);
  };

  const openModal = () => {
    setModalSel(new Set());
    setModalSearch('');
    setModalError('');
    setModalOpen(true);
  };

  const toggleModalSel = (id: number) => setModalSel((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleAddCompanion = async () => {
    if (modalSel.size < 2) {
      setModalError('동반배치는 2명 이상을 묶어야 합니다.');
      return;
    }
    const members = candidates.filter((m) => modalSel.has(m.member_id));
    const nextNo = companions.reduce((max, c) => Math.max(max, c.companion_no), 0) + 1;
    await persistCompanions([...companions, { companion_no: nextNo, members }]);
    setModalOpen(false);
  };

  const removeCompanion = async (companionNo: number) => {
    await persistCompanions(companions.filter((c) => c.companion_no !== companionNo));
  };

  const removeCompanionMember = async (companionNo: number, memberId: number) => {
    const next = companions
      .map((c) => (c.companion_no === companionNo
        ? { ...c, members: c.members.filter((m) => m.member_id !== memberId) }
        : c))
      // 1명만 남은 묶음은 의미가 없으므로 제거
      .filter((c) => c.members.length >= 2);
    await persistCompanions(next);
  };

  const modalCandidates = useMemo(() => candidates.filter((m) => {
    if (companionMemberIds.has(m.member_id)) return false;   // 이미 다른 묶음에 속함
    if (modalSearch.trim() && !m.name.includes(modalSearch.trim())) return false;
    return true;
  }), [candidates, companionMemberIds, modalSearch]);

  // ── 배치 실행 / 조정 / 완료 ─────────────────────────────────────────────────

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await runTeamAssignment(targetYear);
      setRun(res.run);
      setRows(res.rows);
      setTargetCount(res.target_count);
      setPage(0);
      showSnackbar(`${res.target_count}명을 ${res.run.total_team_count}개 팀에 배치했습니다.`, 'success');
    } catch (e: any) {
      showSnackbar(e?.message || '배치 실행 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

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

  const columns = useMemo<Column<TeamAssignmentRow>[]>(() => [
    { id: 'name', label: '이름', align: 'center', width: 100 },
    {
      id: 'gender', label: '성별', align: 'center', width: 60,
      render: (v: string | null) => v ?? '—',
    },
    {
      id: 'generation', label: '기수', align: 'center', width: 70,
      render: (v: number | null) => (v != null ? `${v}기` : '—'),
    },
    {
      id: 'attendance_grade', label: '등급', align: 'center', width: 60,
      render: (v: string | null) => v ?? '—',
    },
    {
      id: 'member_type', label: '구분', align: 'center', width: 90,
      render: (v: string | null) => v ?? '—',
    },
    {
      id: 'leader_names', label: '직분', align: 'center', width: 110,
      render: (v: string[]) => (v.length > 0 ? v.join(', ') : '—'),
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
      id: 'gyogu', label: '배치 교구·팀', align: 'center', width: 210,
      render: (_v: unknown, row: TeamAssignmentRow) => (
        <InlineSelectWrap>
          <Select
            value={String(row.gyogu)}
            options={gyoguOptions}
            onChange={(v) => handleMove(row.member_id, Number(v), row.team)}
            disabled={locked}
            width={92}
          />
          <Select
            value={String(row.team)}
            options={teamOptions}
            onChange={(v) => handleMove(row.member_id, row.gyogu, Number(v))}
            disabled={locked}
            width={84}
          />
          {row.is_manual && <MovedBadge>이동</MovedBadge>}
        </InlineSelectWrap>
      ),
    },
    {
      id: 'companion_no', label: '동반', align: 'center', width: 80,
      render: (v: number | null) => (
        v != null
          ? <Tooltip title={`동반배치 묶음 ${v}`} arrow><span>#{v}</span></Tooltip>
          : '—'
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [gyoguOptions, teamOptions, locked]);

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
        </SectionHint>
        <InputsCard>
          <FormGrid>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4, color: '#595959' }}>배치 대상 연도</div>
              <Select
                value={String(targetYear)}
                options={YEAR_OPTIONS}
                onChange={(v) => setTargetYear(Number(v))}
                width="100%"
              />
            </div>
            <TextField
              label="총 팀 수" type="number" min="1"
              value={teamCount}
              onChange={(e) => setTeamCount(e.target.value.replace(/[^\d]/g, ''))}
              disabled={locked}
              placeholder="예: 36"
              fullWidth
            />
            <TextField
              label="교구 수" type="number" min="1"
              value={gyoguCount}
              onChange={(e) => setGyoguCount(e.target.value.replace(/[^\d]/g, ''))}
              disabled={locked}
              placeholder="예: 3"
              fullWidth
            />
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

      {/* 2. 동반배치 묶음 */}
      <FormSection>
        <SectionTitle>동반배치 묶음</SectionTitle>
        <SectionHint>
          같은 팀에 배치해야 하는 인원을 <strong>배치 실행 전에</strong> 묶어둡니다.
          묶인 인원은 배치 시 통째로 같은 팀에 들어갑니다.
          이 정보는 관리자 소견서 상세·PDF에는 표시되지만 작성자 페이지에는 보이지 않습니다.
        </SectionHint>
        <TableScroll>
          <MapTable>
            <thead>
              <tr>
                <th style={{ width: 80 }}>묶음</th>
                <th>인원</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {companions.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 0 }}>
                    <EmptyHint>
                      {locked ? '등록된 묶음이 없습니다.' : '등록된 묶음이 없습니다. 아래 버튼으로 추가하세요.'}
                    </EmptyHint>
                  </td>
                </tr>
              ) : companions.map((c) => (
                <tr key={c.companion_no}>
                  <td><strong>#{c.companion_no}</strong></td>
                  <td>
                    <CompanionChips>
                      {c.members.map((m) => (
                        <CompanionChip key={m.member_id}>
                          {m.name}
                          {!locked && (
                            <ChipRemove
                              type="button"
                              aria-label={`${m.name} 제외`}
                              onClick={() => removeCompanionMember(c.companion_no, m.member_id)}
                            >
                              ×
                            </ChipRemove>
                          )}
                        </CompanionChip>
                      ))}
                    </CompanionChips>
                    <SubText>{c.members.length}명</SubText>
                  </td>
                  <td>
                    {!locked && (
                      <DeleteIconButton onClick={() => removeCompanion(c.companion_no)}>
                        <DeleteIcon />
                      </DeleteIconButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </MapTable>
        </TableScroll>
        {!locked && (
          <AddRow>
            <Button variant="elevated" onClick={openModal} showIcon icon={<AddIcon />}>
              묶음 추가
            </Button>
          </AddRow>
        )}
      </FormSection>

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
          <StatsGrid>
            <StatCard
              label="배치 인원" value={`${targetCount}명`}
              change="삭제 명단 제외" isPositive
              icon={<Users size={24} />} iconBgColor="#e0f2fe"
            />
            <StatCard
              label="팀당 평균" value={`${avgPerTeam.toFixed(1)}명`}
              change={`${summary.length}개 팀`} isPositive
              icon={<UserCheck size={24} />} iconBgColor="#dcfce7"
            />
            <StatCard
              label="수기 이동" value={`${manualCount}명`}
              change={manualCount > 0 ? '배치 후 팀을 옮긴 인원' : '없음'}
              isPositive={manualCount === 0}
              icon={<Link2 size={24} />} iconBgColor="#ede9fe"
            />
          </StatsGrid>

          <FormSection>
            <SectionTitle>교구·팀별 인원</SectionTitle>
            <SectionHint>
              평균({avgPerTeam.toFixed(1)}명)에서 2명 이상 벗어난 팀은 주황으로 표시됩니다.
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

          <DataTable
            columns={columns}
            data={paginated}
            getRowId={(row) => String(row.member_id)}
            pagination={{
              page,
              rowsPerPage,
              totalCount: rows.length,
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

      {/* 동반배치 묶음 추가 모달 */}
      <BaseModal
        open={modalOpen}
        title="동반배치 묶음 추가"
        onClose={() => setModalOpen(false)}
        size="large"
        actions={
          <ModalActions>
            <Button variant="outlined" onClick={() => setModalOpen(false)}>취소</Button>
            <Button variant="filled" onClick={handleAddCompanion}>
              추가 ({modalSel.size}명)
            </Button>
          </ModalActions>
        }
      >
        <ModalBody>
          {modalError && <span style={{ color: '#ff4d4f', fontSize: 13 }}>{modalError}</span>}
          <SectionHint>
            같은 팀에 배치할 인원을 2명 이상 선택하세요. 이미 다른 묶음에 속한 인원은 목록에 나오지 않습니다.
          </SectionHint>
          <TextField
            label="이름 검색"
            placeholder="이름을 입력하세요"
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            fullWidth
          />
          <PickerTableWrap>
            <PickerTable>
              <thead>
                <tr>
                  <th style={{ width: 40 }} />
                  <th>이름</th>
                  <th>소속</th>
                  <th>기수</th>
                  <th>직분</th>
                </tr>
              </thead>
              <tbody>
                {modalCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <EmptyHint>선택할 수 있는 인원이 없습니다.</EmptyHint>
                    </td>
                  </tr>
                ) : modalCandidates.map((m) => {
                  const selected = modalSel.has(m.member_id);
                  return (
                    <RowSelected key={m.member_id} $selected={selected} onClick={() => toggleModalSel(m.member_id)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected} onChange={() => toggleModalSel(m.member_id)} size="small" />
                      </td>
                      <td>{m.name}</td>
                      <td>{affiliation(m) || '—'}</td>
                      <td>{m.generation ? `${m.generation}기` : '—'}</td>
                      <td>{m.leader_names.length > 0 ? m.leader_names.join(', ') : '—'}</td>
                    </RowSelected>
                  );
                })}
              </tbody>
            </PickerTable>
          </PickerTableWrap>
        </ModalBody>
      </BaseModal>

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
        <ModalBody>
          <p style={{ margin: 0, color: '#595959', lineHeight: 1.7 }}>
            현재 배치 결과 <strong>{rows.length}명</strong>을 <strong>{targetYear}년 교적</strong>으로 이관합니다.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#595959', lineHeight: 1.8, fontSize: 14 }}>
            <li>새가족은 <strong>{targetYear}년 미등반 새가족 명단</strong>으로 넘어갑니다</li>
            <li>그 외는 <strong>{targetYear}년 교적 명단</strong>으로 넘어갑니다</li>
            <li>그룹은 배정되지 않습니다 (내년 팀장이 배치)</li>
            <li>이관 후 <strong>{targetYear - 1}년 소견서가 완료 처리</strong>되어 설정이 잠깁니다</li>
          </ul>
          <p style={{ margin: 0, color: '#b45309', fontSize: 13, lineHeight: 1.7 }}>
            되돌리기 어려운 작업입니다. 팀 조정을 모두 마친 뒤 진행하세요.
          </p>
        </ModalBody>
      </BaseModal>

      <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
    </PageWrapper>
  );
};

export default TeamAssignmentPage;
