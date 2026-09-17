// 팀배치 사전 설정 — 제외 명단 + 동반배치 묶음
//
// 이 둘은 **팀배치를 실행하기 전에** 산정되는 입력값이라 팀배치 작업 화면과 분리했다.
// 화면을 벗어나도 유지되어야 하므로 변경 즉시 서버에 저장한다.
//
//   제외 명단 : 랜덤배치에서 빼고 교구·팀을 수기로 사전 지정 (임원단 사전 매치, 팀장·그룹장 사전 배치)
//   동반배치  : 같은 팀에 들어가야 하는 인원을 묶음으로 등록

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { IconButton, Skeleton, Tooltip } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Info, Link2, UserMinus, Users, UserCheck } from 'lucide-react';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { Snackbar } from '@components/common/Snackbar';
import { BaseModal } from '@components/common/BaseModal';
import StatCard from '@components/common/StatCard';
import { FILTER_SIZES, FILTER_STACK_BREAKPOINT } from '@/styles/filterSizes';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import { fetchOpinionMemberCandidates } from '@/api/opinion';
import { OpinionMemberCandidate } from '@/models/opinion.types';
import {
  fetchTeamAssignmentCompanions,
  fetchTeamAssignmentCounts,
  fetchTeamAssignmentExclusions,
  fetchTeamAssignmentRun,
  saveTeamAssignmentCompanions,
  saveTeamAssignmentExclusions,
} from '@/api/teamAssignment';
import {
  TEAM_ASSIGNMENT_STATUS_LABEL,
  TeamAssignmentCompanion,
  TeamAssignmentCompanionPair,
  TeamAssignmentCounts,
  TeamAssignmentExclusion,
  TeamAssignmentExclusionItem,
  TeamAssignmentRun,
  TeamAssignmentStatus,
} from '@/models/teamAssignment.types';

// ── 상수 ──────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const YEAR_OPTIONS = [CURRENT_YEAR + 2, CURRENT_YEAR + 1, CURRENT_YEAR]
  .map((y) => ({ value: String(y), label: `${y}년` }));

/** 자주 쓰는 제외 사유 — 직접 입력도 가능하다 */
const REASON_PRESETS = ['임원단 사전배치', '팀장 사전배치', '그룹장 사전배치'];

const STATUS_STYLE: Record<TeamAssignmentStatus, { color: string; bg: string; border: string }> = {
  draft:     { color: '#595959', bg: '#f5f5f5', border: '#d9d9d9' },
  assigned:  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  committed: { color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
};

const STATUS_HINT: Record<TeamAssignmentStatus, string> = {
  draft:     '제외 명단과 동반배치 묶음을 정한 뒤 팀배치 작업 화면에서 배치를 실행하세요.',
  assigned:  '이미 배치가 실행된 회차입니다. 여기서 수정하면 팀배치를 다시 실행해야 반영됩니다.',
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

/**
 * 필터 줄 — 대시보드·팀배치 작업과 같은 규격.
 * 좁아지면 Select 가 한 줄을 다 쓰도록 편다. `Select` 의 루트가 `MuiFormControl` 이고
 * width 를 인라인으로 박으므로 `!important` 가 필요하다.
 */
const TopBar = styled('div')(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.custom.spacing.md, flexWrap: 'wrap',
  [`@media (max-width: ${FILTER_STACK_BREAKPOINT}px)`]: {
    alignItems: 'stretch',
    gap: theme.custom.spacing.sm,
  },
}));

/**
 * 라벨 + 컨트롤 한 쌍 — 대시보드·팀배치 작업과 같은 규격.
 * 좁은 화면에서는 `[라벨 고정폭][컨트롤 나머지 전부]` 2단이 되어야
 * 라벨 길이와 무관하게 컨트롤 너비가 같아진다.
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

const FieldBlock = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.xs,
}));

const FieldLabel = styled('label')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.high,
}));

const StatsGrid = styled('div')({
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
  '@media (max-width: 1100px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '@media (max-width: 600px)': { gridTemplateColumns: '1fr' },
});

const TableCard = styled('div')(({ theme }) => ({
  backgroundColor: theme.custom.colors.white,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  overflow: 'hidden',
}));

const TableScroll = styled('div')({ overflowX: 'auto', WebkitOverflowScrolling: 'touch' });

const MapTable = styled('table')(({ theme }) => ({
  width: '100%', minWidth: 560, borderCollapse: 'collapse',
  fontSize: theme.custom.typography.body2.fontSize,
  '& th, & td': {
    padding: `${theme.custom.spacing.sm} ${theme.custom.spacing.md}`,
    borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
    textAlign: 'left', verticalAlign: 'middle',
  },
  '& th': {
    background: theme.custom.colors.neutral._95,
    color: theme.custom.colors.text.medium,
    fontWeight: 600, whiteSpace: 'nowrap',
  },
  '& tbody tr:last-of-type td': { borderBottom: 'none' },
  '& tbody tr:hover': { background: theme.custom.overlay.primary.hover },
}));

const GroupNo = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body1.fontSize,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
}));

const CountText = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
}));

const CompanionChips = styled('div')({ display: 'flex', flexWrap: 'wrap', gap: 6 });

const CompanionChip = styled('span')(({ theme }) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 8px 4px 12px', borderRadius: 999,
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 500,
  color: theme.custom.colors.primary._600,
  background: theme.custom.colors.primary._050,
  border: `1px solid ${theme.custom.colors.primary._100}`,
}));

const ChipRemove = styled('button')(({ theme }) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 16, height: 16, borderRadius: '50%',
  border: 'none', background: 'transparent', cursor: 'pointer',
  padding: 0, lineHeight: 1, fontSize: 14,
  color: theme.custom.colors.primary._600, opacity: 0.6,
  '&:hover': { opacity: 1, background: theme.custom.colors.primary._100 },
}));

const ReasonTag = styled('span')({
  display: 'inline-block', padding: '2px 9px', borderRadius: 999,
  fontSize: 12, fontWeight: 600, color: '#b45309', background: '#fef3c7',
  whiteSpace: 'nowrap',
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

/**
 * 「사전 배치」 칸 — 교구·팀 Select 두 개.
 * 좁은 화면에서는 가로로 나란히 두면 칸이 터지므로 세로로 쌓는다.
 */
const InlineSelectWrap = styled('div')({
  display: 'flex', gap: 4, alignItems: 'center',
  [`@media (max-width: ${FILTER_STACK_BREAKPOINT}px)`]: {
    flexDirection: 'column', alignItems: 'stretch', gap: 6,
    '& .MuiFormControl-root': { width: '100% !important' },
  },
});

// ── 모달 ──────────────────────────────────────────────────────────────────────
//
// 멤버 선택 테이블은 「권한관리 > 일괄 계정 생성」 팝업 디자인을 따른다.
// 전체 교적이 후보이므로 직분 필터가 실제로 동작한다.

const ModalGrid = styled('div')({
  display: 'flex', flexDirection: 'column', gap: 14,
  padding: '20px 24px',
  '@media (max-width: 600px)': { padding: '12px', gap: 10 },
});

const ModalActions = styled('div')({
  display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
  '@media (max-width: 480px)': { '& > *': { width: '100%' } },
});

const PickerCount = styled('div')({ fontSize: 12, color: '#555' });

const FilterLabelRow = styled('div')({
  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
});

const FilterLabelText = styled('span')({ fontSize: 12, color: '#595959', fontWeight: 600 });

const ChipRow = styled('div')({ display: 'flex', flexWrap: 'wrap', gap: 6 });

const LeaderChip = styled('button')<{ $active: boolean }>(({ $active }) => ({
  padding: '3px 10px', fontSize: 12, borderRadius: 12, cursor: 'pointer',
  border: `1px solid ${$active ? '#4f86f7' : '#d9d9d9'}`,
  background: $active ? '#eff6ff' : '#fff',
  color: $active ? '#2563eb' : '#555',
  fontWeight: $active ? 600 : 400,
}));

const ModalTableWrapper = styled('div')({
  overflowX: 'auto', overflowY: 'auto',
  maxHeight: 320, width: '100%',
  border: '1px solid #f0f0f0', borderRadius: 6,
  '@media (max-width: 600px)': { maxHeight: 'none', overflowY: 'visible' },
});

const PickerTable = styled('table')({
  width: 'max-content', minWidth: '100%',
  borderCollapse: 'collapse', fontSize: 13,
});

const Th = styled('th')(({ theme }) => ({
  padding: '10px 8px',
  background: theme.custom.colors.primary._050,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
  textAlign: 'left', fontWeight: 600,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
  position: 'sticky', top: 0, zIndex: 1,
}));

const Td = styled('td')(({ theme }) => ({
  padding: '10px 8px',
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
  color: theme.custom.colors.text.high,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
}));

/** 제외 명단 모달 상단 — 사전 배치 자리와 사유를 함께 받는다 */
const PlacementRow = styled('div')(({ theme }) => ({
  display: 'grid', gridTemplateColumns: '140px 140px 1fr', gap: theme.custom.spacing.sm,
  alignItems: 'end',
  '@media (max-width: 600px)': { gridTemplateColumns: '1fr' },
}));

// ── Component ─────────────────────────────────────────────────────────────────

type PickerMode = 'exclusion' | 'companion';

const PreAssignmentPage: React.FC = () => {
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  const [targetYear, setTargetYear] = useState(CURRENT_YEAR + 1);
  const [loading, setLoading] = useState(true);

  const [run, setRun] = useState<TeamAssignmentRun | null>(null);
  const [counts, setCounts] = useState<TeamAssignmentCounts | null>(null);
  const [candidates, setCandidates] = useState<OpinionMemberCandidate[]>([]);
  const [exclusions, setExclusions] = useState<TeamAssignmentExclusion[]>([]);
  const [companions, setCompanions] = useState<TeamAssignmentCompanion[]>([]);

  // 멤버 선택 모달 — 제외 명단·동반배치가 같은 테이블을 공유한다
  const [modalMode, setModalMode] = useState<PickerMode | null>(null);
  const [modalSel, setModalSel] = useState<Set<number>>(new Set());
  const [modalSearch, setModalSearch] = useState('');
  const [modalLeaderFilter, setModalLeaderFilter] = useState<Set<string>>(new Set());
  const [modalError, setModalError] = useState('');
  const [modalGyogu, setModalGyogu] = useState('1');
  const [modalTeam, setModalTeam] = useState('1');
  const [modalReason, setModalReason] = useState('');

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
        const [r, ex, comps, cnt] = await Promise.all([
          fetchTeamAssignmentRun(targetYear),
          fetchTeamAssignmentExclusions(targetYear, members),
          fetchTeamAssignmentCompanions(targetYear, members),
          fetchTeamAssignmentCounts(targetYear),
        ]);
        if (cancelled) return;
        setRun(r);
        setExclusions(ex);
        setCompanions(comps);
        setCounts(cnt);
      })
      .catch(() => { if (!cancelled) showSnackbar('사전 설정 정보를 불러오지 못했습니다.', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetYear]);

  useEffect(() => load(), [load]);

  // ── 파생값 ──────────────────────────────────────────────────────────────────

  const teamPerGyogu = useMemo(() => {
    if (!run) return 12;
    return Math.max(1, Math.floor(run.total_team_count / run.gyogu_count));
  }, [run]);

  const gyoguOptions = useMemo(
    () => Array.from({ length: run?.gyogu_count ?? 3 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}교구` })),
    [run],
  );

  const teamOptions = useMemo(
    () => Array.from({ length: teamPerGyogu }, (_, i) => ({ value: String(i + 1), label: `${i + 1}팀` })),
    [teamPerGyogu],
  );

  const excludedMemberIds = useMemo(
    () => new Set(exclusions.map((e) => e.member.member_id)),
    [exclusions],
  );

  const companionMemberIds = useMemo(
    () => new Set(companions.flatMap((c) => c.members.map((m) => m.member_id))),
    [companions],
  );

  /** 한 사람이 제외 명단과 동반 묶음에 동시에 들어갈 수는 없다 — 양쪽 후보에서 서로를 뺀다 */
  const takenMemberIds = useMemo(
    () => new Set([...excludedMemberIds, ...companionMemberIds]),
    [excludedMemberIds, companionMemberIds],
  );

  const modalPool = useMemo(
    () => candidates.filter((m) => !takenMemberIds.has(m.member_id)),
    [candidates, takenMemberIds],
  );

  const modalLeaderNames = useMemo(
    () => [...new Set(modalPool.flatMap((m) => m.leader_names))].sort(),
    [modalPool],
  );

  const modalCandidates = useMemo(() => modalPool.filter((m) => {
    if (modalSearch.trim() && !m.name.includes(modalSearch.trim())) return false;
    if (modalLeaderFilter.size > 0 && !m.leader_names.some((n) => modalLeaderFilter.has(n))) return false;
    return true;
  }), [modalPool, modalSearch, modalLeaderFilter]);

  const allModalSelected = modalCandidates.length > 0
    && modalCandidates.every((m) => modalSel.has(m.member_id));

  // ── 모달 ────────────────────────────────────────────────────────────────────

  const openModal = (mode: PickerMode) => {
    setModalMode(mode);
    setModalSel(new Set());
    setModalSearch('');
    setModalLeaderFilter(new Set());
    setModalError('');
    setModalGyogu('1');
    setModalTeam('1');
    setModalReason('');
  };

  const closeModal = () => setModalMode(null);

  const toggleModalSel = (id: number) => setModalSel((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  /** 헤더 체크박스 — 현재 필터에 걸린 인원만 일괄 선택/해제한다 */
  const toggleModalAll = () => setModalSel((prev) => {
    const ids = modalCandidates.map((m) => m.member_id);
    const next = new Set(prev);
    if (allModalSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    return next;
  });

  const toggleModalLeaderFilter = (name: string) => setModalLeaderFilter((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  // ── 제외 명단 ───────────────────────────────────────────────────────────────

  const persistExclusions = async (next: TeamAssignmentExclusion[]) => {
    const items: TeamAssignmentExclusionItem[] = next.map((e) => ({
      member_id: e.member.member_id, gyogu: e.gyogu, team: e.team, reason: e.reason,
    }));
    await saveTeamAssignmentExclusions(targetYear, items);
    setExclusions(next);
    setCounts(await fetchTeamAssignmentCounts(targetYear));
  };

  const handleAddExclusions = async () => {
    if (modalSel.size === 0) {
      setModalError('제외할 인원을 1명 이상 선택해주세요.');
      return;
    }
    const gyogu = Number(modalGyogu);
    const team = Number(modalTeam);
    const reason = modalReason.trim() || null;
    const added: TeamAssignmentExclusion[] = candidates
      .filter((m) => modalSel.has(m.member_id))
      .map((member) => ({ member, gyogu, team, reason }));

    await persistExclusions([...exclusions, ...added]);
    showSnackbar(`${added.length}명을 ${gyogu}교구 ${team}팀에 사전 배치했습니다.`, 'success');
    closeModal();
  };

  const handleChangeExclusionSlot = async (memberId: number, gyogu: number, team: number) => {
    await persistExclusions(exclusions.map((e) =>
      (e.member.member_id === memberId ? { ...e, gyogu, team } : e)));
  };

  const removeExclusion = async (memberId: number) => {
    await persistExclusions(exclusions.filter((e) => e.member.member_id !== memberId));
  };

  // ── 동반배치 묶음 ───────────────────────────────────────────────────────────

  const persistCompanions = async (next: TeamAssignmentCompanion[]) => {
    const pairs: TeamAssignmentCompanionPair[] = next.flatMap((c) =>
      c.members.map((m) => ({ companion_no: c.companion_no, member_id: m.member_id })));
    await saveTeamAssignmentCompanions(targetYear, pairs);
    setCompanions(next);
    setCounts(await fetchTeamAssignmentCounts(targetYear));
  };

  const handleAddCompanion = async () => {
    if (modalSel.size < 2) {
      setModalError('동반배치는 2명 이상을 묶어야 합니다.');
      return;
    }
    const members = candidates.filter((m) => modalSel.has(m.member_id));
    const nextNo = companions.reduce((max, c) => Math.max(max, c.companion_no), 0) + 1;
    await persistCompanions([...companions, { companion_no: nextNo, members }]);
    closeModal();
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

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageWrapper>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={220} />
      </PageWrapper>
    );
  }

  const isExclusionModal = modalMode === 'exclusion';

  return (
    <PageWrapper>
      <StatusBar>
        <StatusBadge $status={status}>{targetYear}년 · {TEAM_ASSIGNMENT_STATUS_LABEL[status]}</StatusBadge>
        <StatusHint>{STATUS_HINT[status]}</StatusHint>
      </StatusBar>

      {/* 라벨은 왼쪽 인라인 — 대시보드·팀배치 작업의 필터 줄과 같은 규격 */}
      <TopBar>
        <FilterGroup>
          <FilterLabel>배치 대상 연도</FilterLabel>
          <Select
            value={String(targetYear)}
            options={YEAR_OPTIONS}
            onChange={(v) => setTargetYear(Number(v))}
            width={FILTER_SIZES.select}
          />
        </FilterGroup>
        <StatusHint>
          배치 기준 <strong>{run?.gyogu_count ?? 3}교구 × {teamPerGyogu}팀</strong>
          {' '}— 팀 수는 「팀배치 작업」 화면에서 변경합니다.
        </StatusHint>
      </TopBar>

      {/* 배치 인원 집계 */}
      {counts && (
        <StatsGrid>
          <StatCard
            label="배치 인원" value={`${counts.total}명`}
            change={`새가족 ${counts.newcomer} · 교적 ${counts.regular}`} isPositive
            icon={<Users size={24} />} iconBgColor="#e0f2fe"
          />
          <StatCard
            label="랜덤배치" value={`${counts.random}명`}
            change="일반 랜덤배치 대상" isPositive
            icon={<UserCheck size={24} />} iconBgColor="#dcfce7"
          />
          <StatCard
            label="동반배치" value={`${counts.companion}명`}
            change={`${companions.length}개 묶음`} isPositive
            icon={<Link2 size={24} />} iconBgColor="#ede9fe"
          />
          <StatCard
            label="제외 명단" value={`${counts.excluded}명`}
            change="교구·팀 사전 지정" isPositive
            icon={<UserMinus size={24} />} iconBgColor="#fef3c7"
          />
        </StatsGrid>
      )}

      {/* 1. 제외 명단 */}
      <FormSection>
        <SectionTitle>제외 명단 (사전 배치)</SectionTitle>
        <SectionHint>
          랜덤배치에서 빼고 <strong>교구·팀을 직접 지정</strong>하는 인원입니다.
          임원단을 미리 매치하거나 팀장·그룹장을 사전 팀배치할 때 사용합니다.
          지정한 자리는 <strong>팀 정원에 포함</strong>되므로, 랜덤배치는 남은 자리만 채웁니다.
          배치 실행 후에도 「팀배치 작업」 화면에서 팀을 다시 옮길 수 있습니다.
        </SectionHint>
        <TableCard>
          <TableScroll>
            <MapTable>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>이름</th>
                  <th style={{ width: 140 }}>직분</th>
                  <th style={{ width: 120 }}>기존 소속</th>
                  <th style={{ width: 200 }}>사전 배치</th>
                  <th>제외 사유</th>
                  {!locked && <th style={{ width: 64 }} />}
                </tr>
              </thead>
              <tbody>
                {exclusions.length === 0 ? (
                  <tr>
                    <td colSpan={locked ? 5 : 6} style={{ padding: 0 }}>
                      <EmptyHint>
                        {locked ? '제외 명단이 없습니다.' : '제외 명단이 없습니다. 아래 버튼으로 추가하세요.'}
                      </EmptyHint>
                    </td>
                  </tr>
                ) : exclusions.map((e) => (
                  <tr key={e.member.member_id}>
                    <td><GroupNo>{e.member.name}</GroupNo></td>
                    <td>{e.member.leader_names.length > 0 ? e.member.leader_names.join(', ') : '—'}</td>
                    <td>
                      {e.member.gyogu != null
                        ? `${e.member.gyogu}교구 ${e.member.team ?? '—'}팀`
                        : '—'}
                    </td>
                    <td>
                      <InlineSelectWrap>
                        <Select
                          value={String(e.gyogu)}
                          options={gyoguOptions}
                          onChange={(v) => handleChangeExclusionSlot(e.member.member_id, Number(v), e.team)}
                          disabled={locked}
                          width={92}
                        />
                        <Select
                          value={String(e.team)}
                          options={teamOptions}
                          onChange={(v) => handleChangeExclusionSlot(e.member.member_id, e.gyogu, Number(v))}
                          disabled={locked}
                          width={84}
                        />
                      </InlineSelectWrap>
                    </td>
                    <td>{e.reason ? <ReasonTag>{e.reason}</ReasonTag> : '—'}</td>
                    {!locked && (
                      <td>
                        <DeleteIconButton
                          aria-label={`${e.member.name} 제외 해제`}
                          onClick={() => removeExclusion(e.member.member_id)}
                        >
                          <DeleteIcon />
                        </DeleteIconButton>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </MapTable>
          </TableScroll>
        </TableCard>
        {!locked && (
          <AddRow>
            <Button variant="elevated" onClick={() => openModal('exclusion')} showIcon icon={<AddIcon />}>
              제외 인원 추가
            </Button>
          </AddRow>
        )}
      </FormSection>

      {/* 2. 동반배치 묶음 */}
      <FormSection>
        <SectionTitle>동반배치 묶음</SectionTitle>
        <SectionHint>
          같은 팀에 배치해야 하는 인원을 묶어둡니다. 묶인 인원은 배치 시 통째로 같은 팀에 들어갑니다.
          이 정보는 관리자 소견서 상세·PDF에는 표시되지만 작성자 페이지에는 보이지 않습니다.
        </SectionHint>
        <TableCard>
          <TableScroll>
            <MapTable>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>묶음</th>
                  <th>인원</th>
                  <th style={{ width: 80 }}>인원 수</th>
                  {!locked && <th style={{ width: 64 }} />}
                </tr>
              </thead>
              <tbody>
                {companions.length === 0 ? (
                  <tr>
                    <td colSpan={locked ? 3 : 4} style={{ padding: 0 }}>
                      <EmptyHint>
                        {locked ? '등록된 묶음이 없습니다.' : '등록된 묶음이 없습니다. 아래 버튼으로 추가하세요.'}
                      </EmptyHint>
                    </td>
                  </tr>
                ) : companions.map((c) => (
                  <tr key={c.companion_no}>
                    <td><GroupNo>#{c.companion_no}</GroupNo></td>
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
                    </td>
                    <td><CountText>{c.members.length}명</CountText></td>
                    {!locked && (
                      <td>
                        <DeleteIconButton
                          aria-label={`묶음 ${c.companion_no} 삭제`}
                          onClick={() => removeCompanion(c.companion_no)}
                        >
                          <DeleteIcon />
                        </DeleteIconButton>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </MapTable>
          </TableScroll>
        </TableCard>
        {!locked && (
          <AddRow>
            <Button variant="elevated" onClick={() => openModal('companion')} showIcon icon={<AddIcon />}>
              묶음 추가
            </Button>
          </AddRow>
        )}
      </FormSection>

      {/* 멤버 선택 모달 — 제외 명단 / 동반배치 공용 */}
      <BaseModal
        open={modalMode !== null}
        title={isExclusionModal ? '제외 인원 추가 (사전 배치)' : '동반배치 묶음 추가'}
        onClose={closeModal}
        size="large"
        actions={
          <ModalActions>
            <Button variant="outlined" onClick={closeModal}>취소</Button>
            <Button
              variant="filled"
              onClick={isExclusionModal ? handleAddExclusions : handleAddCompanion}
            >
              추가 ({modalSel.size}명)
            </Button>
          </ModalActions>
        }
      >
        <ModalGrid>
          {modalError && <span style={{ color: '#ff4d4f', fontSize: 13 }}>{modalError}</span>}
          <SectionHint>
            {isExclusionModal
              ? '랜덤배치에서 제외하고 아래 지정한 교구·팀에 그대로 배치합니다.'
              : '같은 팀에 배치할 인원을 2명 이상 선택하세요.'}
            {' '}제외 명단이나 다른 묶음에 이미 속한 인원은 목록에 나오지 않습니다.
          </SectionHint>

          {isExclusionModal && (
            <PlacementRow>
              <FieldBlock>
                <FieldLabel htmlFor="pa-modal-gyogu">사전 배치 교구</FieldLabel>
                <Select
                  id="pa-modal-gyogu"
                  value={modalGyogu} options={gyoguOptions}
                  onChange={(v) => setModalGyogu(String(v))} width="100%"
                />
              </FieldBlock>
              <FieldBlock>
                <FieldLabel htmlFor="pa-modal-team">사전 배치 팀</FieldLabel>
                <Select
                  id="pa-modal-team"
                  value={modalTeam} options={teamOptions}
                  onChange={(v) => setModalTeam(String(v))} width="100%"
                />
              </FieldBlock>
              <FieldBlock>
                <FieldLabel htmlFor="pa-modal-reason">제외 사유 (선택)</FieldLabel>
                <TextField
                  id="pa-modal-reason"
                  placeholder="예: 임원단 사전배치"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  fullWidth
                />
              </FieldBlock>
            </PlacementRow>
          )}

          {isExclusionModal && (
            <ChipRow>
              {REASON_PRESETS.map((r) => (
                <LeaderChip
                  key={r} type="button"
                  $active={modalReason === r}
                  onClick={() => setModalReason(modalReason === r ? '' : r)}
                >
                  {r}
                </LeaderChip>
              ))}
            </ChipRow>
          )}

          <PickerCount>
            후보 {modalCandidates.length}명 · {modalSel.size}명 선택됨
          </PickerCount>

          <TextField
            label="이름 검색"
            placeholder="이름을 입력하세요"
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            fullWidth
          />

          {modalLeaderNames.length > 0 && (
            <div>
              <FilterLabelRow>
                <FilterLabelText>직분 필터</FilterLabelText>
                <Tooltip title="직분을 선택하면 해당 직분을 가진 멤버만 표시됩니다." arrow placement="right">
                  <span style={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
                    <Info size={13} color="#aaa" />
                  </span>
                </Tooltip>
              </FilterLabelRow>
              <ChipRow>
                {modalLeaderNames.map((name) => (
                  <LeaderChip
                    key={name}
                    type="button"
                    $active={modalLeaderFilter.has(name)}
                    onClick={() => toggleModalLeaderFilter(name)}
                  >
                    {name}
                  </LeaderChip>
                ))}
              </ChipRow>
            </div>
          )}

          {modalCandidates.length === 0 ? (
            <EmptyHint>선택할 수 있는 인원이 없습니다.</EmptyHint>
          ) : (
            <ModalTableWrapper>
              <PickerTable>
                <thead>
                  <tr>
                    <Th style={{ width: 40 }}>
                      <input type="checkbox" checked={allModalSelected} onChange={toggleModalAll} />
                    </Th>
                    <Th>이름</Th>
                    <Th>직분</Th>
                    <Th>전화번호</Th>
                    <Th>기수</Th>
                    <Th>교구</Th>
                    <Th>팀</Th>
                    <Th>그룹</Th>
                  </tr>
                </thead>
                <tbody>
                  {modalCandidates.map((m) => (
                    <tr key={m.member_id}>
                      <Td style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={modalSel.has(m.member_id)}
                          onChange={() => toggleModalSel(m.member_id)}
                        />
                      </Td>
                      <Td>{m.name}</Td>
                      <Td>{m.leader_names.length > 0 ? m.leader_names.join(', ') : '—'}</Td>
                      <Td>{m.phone_number ?? '—'}</Td>
                      <Td>{m.generation != null ? `${m.generation}기` : '—'}</Td>
                      <Td>{m.gyogu ?? '—'}</Td>
                      <Td>{m.team ?? '—'}</Td>
                      <Td>{m.group_no ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </PickerTable>
            </ModalTableWrapper>
          )}
        </ModalGrid>
      </BaseModal>

      <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
    </PageWrapper>
  );
};

export default PreAssignmentPage;
