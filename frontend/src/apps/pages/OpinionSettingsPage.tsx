import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { FormControlLabel, IconButton, Skeleton, Switch, Tooltip } from '@mui/material';
import { Info } from 'lucide-react';
import { TextField } from '@components/common/TextField';
import { Select } from '@components/common/Select';
import { Button } from '@components/common/Button';
import { Checkbox } from '@components/common/Checkbox';
import { Snackbar } from '@components/common/Snackbar';
import { BaseModal } from '@components/common/BaseModal';
import { useSnackbar } from '@/hooks/common/useSnackbar';
import {
  fetchOpinionMappings,
  fetchOpinionMemberCandidates,
  fetchOpinionSettings,
  saveOpinionSettings,
} from '@/api/opinion';
import {
  getOpinionPhase,
  INPUT_FIELD_LABELS,
  INPUT_FIELD_ORDER,
  INPUT_FIELD_PARENT,
  InputFieldKey,
  MEMBER_FIELD_LABELS,
  MEMBER_FIELD_ORDER,
  MemberFieldKey,
  OpinionMappingGroup,
  OpinionMappingPair,
  EXECUTIVE_LEADER_NAME,
  OpinionMemberCandidate,
  OPINION_PHASE_LABEL,
  OpinionPhase,
} from '@/models/opinion.types';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const YEAR_OPTIONS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]
  .map((y) => ({ value: String(y), label: `${y}년` }));

const affiliation = (m: OpinionMemberCandidate) =>
  [m.gyogu ? `${m.gyogu}교구` : null, m.team ? `${m.team}팀` : null, m.group_no ? `${m.group_no}그룹` : null]
    .filter(Boolean)
    .join(' ');

const PHASE_STYLE: Record<OpinionPhase, { color: string; bg: string; border: string }> = {
  none:   { color: '#595959', bg: '#f5f5f5', border: '#d9d9d9' },
  active: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  done:   { color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
};

const PHASE_HINT: Record<OpinionPhase, string> = {
  none:   '아직 생성되지 않은 연도입니다. 항목을 선택한 뒤 소견서를 생성하세요.',
  active: '작성이 진행 중입니다. 항목과 임원단 매핑을 수정할 수 있습니다.',
  done:   '팀배치가 완료되어 잠긴 연도입니다. 조회만 가능합니다.',
};

// ── Styled ────────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.lg,
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

const StatusBar = styled('div')(({ theme }) => ({
  display: 'flex', alignItems: 'center', gap: theme.custom.spacing.sm, flexWrap: 'wrap',
}));

const StatusBadge = styled('span')<{ $phase: OpinionPhase }>(({ $phase }) => ({
  display: 'inline-block', padding: '3px 12px', borderRadius: 999,
  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  color: PHASE_STYLE[$phase].color,
  background: PHASE_STYLE[$phase].bg,
  border: `1px solid ${PHASE_STYLE[$phase].border}`,
}));

const StatusHint = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium, wordBreak: 'keep-all',
}));

const SectionHeader = styled('div')({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 12, flexWrap: 'wrap',
});

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
  wordBreak: 'keep-all',
  lineHeight: 1.6,
}));

const InputsCard = styled('div')(({ theme }) => ({
  padding: theme.custom.spacing.md,
  backgroundColor: theme.custom.colors.white,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
}));

/**
 * `repeat(3, …)` 고정은 최소 600px + gap 을 요구한다. 사이드바가 아직 살아 있는
 * 901~1000px 구간에서는 본문이 그보다 좁아 가로로 넘치는데, 900px 미디어쿼리는
 * 그 아래에서만 걸려 이 구간을 못 잡는다.
 *
 * `auto-fit` 은 폭이 모자라면 알아서 2열 → 1열로 접으므로 구간이 비지 않는다.
 * 같은 파일의 `FieldGrid` 도 같은 방식을 쓴다.
 */
const FormGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: theme.custom.spacing.md,
  alignItems: 'start',
  '@media (max-width: 600px)': { gridTemplateColumns: '1fr' },
}));

/**
 * 라벨 + 입력 한 묶음.
 *
 * `TextField`의 라벨은 `position: absolute` 플로팅이라 박스 위 공간을 차지하지 않고,
 * `Select`는 라벨 prop이 없어 블록 라벨을 따로 붙여야 한다. 둘을 같은 행에 섞으면
 * 시작 위치가 어긋나므로 **전부 외부 라벨로 통일**한다.
 */
const FieldBlock = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.xs,
}));

const FieldLabel = styled('label')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.high,
}));

const BulkActions = styled('div')({
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
});

const TextButton = styled('button')(({ theme }) => ({
  padding: '6px 14px',
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: 6,
  background: theme.custom.colors.white,
  cursor: 'pointer',
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
  '&:hover': {
    borderColor: theme.custom.colors.primary._500,
    color: theme.custom.colors.primary._500,
    backgroundColor: theme.custom.overlay.primary.hover,
  },
}));

const FieldGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
  gap: '2px 8px',
});

const FieldItem = styled('label')<{ $disabled?: boolean }>(({ theme, $disabled }) => ({
  display: 'flex', alignItems: 'center', gap: 2,
  cursor: $disabled ? 'not-allowed' : 'pointer',
  borderRadius: 6,
  fontSize: theme.custom.typography.body2.fontSize,
  color: $disabled ? theme.custom.colors.text.disabled : theme.custom.colors.text.high,
  '&:hover': { backgroundColor: $disabled ? 'transparent' : theme.custom.overlay.primary.hover },
}));

/** 선택 개수 배지 — 전부 선택되면 색을 바꿔 한눈에 구분되게 한다 */
const SelectedCount = styled('span')<{ $all: boolean }>(({ theme, $all }) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 14px', borderRadius: 999,
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  color: $all ? '#059669' : theme.custom.colors.primary._600,
  background: $all ? '#d1fae5' : theme.custom.colors.primary._050,
  border: `1px solid ${$all ? '#a7f3d0' : theme.custom.colors.primary._100}`,
}));

const CountNum = styled('strong')({ fontSize: 15, lineHeight: 1 });

// 매핑 테이블 — 다른 섹션의 InputsCard 와 같은 카드 위에 얹는다
const TableCard = styled('div')(({ theme }) => ({
  backgroundColor: theme.custom.colors.white,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  overflow: 'hidden',
}));

const TableScroll = styled('div')({ overflowX: 'auto', WebkitOverflowScrolling: 'touch' });

const MapTable = styled('table')(({ theme }) => ({
  width: '100%', minWidth: 600, borderCollapse: 'collapse',
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

const WriterCell = styled('div')({ display: 'flex', flexDirection: 'column', gap: 2 });

const WriterName = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body1.fontSize,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
  whiteSpace: 'nowrap',
}));

const SubText = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.caption.fontSize,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
}));

const CountText = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
}));

const TargetChips = styled('div')({ display: 'flex', flexWrap: 'wrap', gap: 6 });

const TargetChip = styled('span')(({ theme }) => ({
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

const EmptyHint = styled('div')(({ theme }) => ({
  padding: `${theme.custom.spacing.lg} 0`,
  textAlign: 'center',
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

// ── 모달 ──────────────────────────────────────────────────────────────────────
//
// 멤버 선택 테이블은 「권한관리 > 일괄 계정 생성」 팝업 디자인을 그대로 따른다
// (`PermissionManagementPage.tsx`의 ModalGrid / ModalTableWrapper / AccountTable / Th / Td).
// 다만 정책·데이터 범위 선택은 계정 생성 전용이라 여기에는 없다.

const ModalGrid = styled('div')({
  display: 'flex', flexDirection: 'column', gap: 14,
  padding: '20px 24px',
  '@media (max-width: 600px)': { padding: '12px', gap: 10 },
});

const ModalActions = styled('div')({
  display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
  '@media (max-width: 480px)': { '& > *': { width: '100%' } },
});

const PickerBlock = styled('div')({ display: 'flex', flexDirection: 'column', gap: 10 });

const PickerTitle = styled('div')(({ theme }) => ({
  display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
  fontSize: theme.custom.typography.body1.fontSize,
  fontWeight: 700, color: theme.custom.colors.text.high,
}));

const PickerCount = styled('div')({ fontSize: 12, color: '#555' });

const FilterLabelRow = styled('div')({
  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
});

const FilterLabelText = styled('span')({ fontSize: 12, color: '#595959', fontWeight: 600 });

const ChipRow = styled('div')({ display: 'flex', flexWrap: 'wrap', gap: 6 });

const LeaderChip = styled('button')<{ $active: boolean }>(({ $active }) => ({
  padding: '3px 10px', fontSize: 12, borderRadius: 12,
  border: `1px solid ${$active ? '#4f86f7' : '#d9d9d9'}`,
  background: $active ? '#eff6ff' : '#fff',
  color: $active ? '#2563eb' : '#555',
  fontWeight: $active ? 600 : 400,
  // 임원단 하나뿐이라 토글할 대상이 없다 — 표시 전용
  cursor: 'default',
  '&:disabled': { opacity: 1 },
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

// 요약
const SummaryCard = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.sm,
  padding: theme.custom.spacing.md,
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius, backgroundColor: '#fff',
}));

const SummaryItem = styled('div')({
  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16,
  '@media (max-width: 480px)': { flexDirection: 'column', gap: 2 },
});

const SummaryLabel = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
  '@media (max-width: 480px)': { fontSize: theme.custom.typography.body2.fontSize },
}));

const SummaryValue = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.high, fontWeight: 600,
  textAlign: 'right', wordBreak: 'break-word',
  '@media (max-width: 480px)': { fontSize: theme.custom.typography.body2.fontSize, textAlign: 'left' },
}));

const FooterActions = styled('div')(({ theme }) => ({
  display: 'flex', justifyContent: 'flex-end', gap: theme.custom.spacing.sm, flexWrap: 'wrap',
  '@media (max-width: 480px)': { flexDirection: 'column', '& > *': { width: '100%' } },
}));

// ── 멤버 선택기 ───────────────────────────────────────────────────────────────

interface MemberPickerProps {
  members: OpinionMemberCandidate[];
  selected: Set<number>;
  onToggle: (memberId: number) => void;
  /** true면 헤더 전체선택 체크박스를 노출한다 (대상자 선택용) */
  multiple: boolean;
  /** 다중 선택 시 한 번에 교체 — 헤더 전체선택/해제용 */
  onReplace?: (memberIds: number[]) => void;
  /** 선택 후보에서 제외할 member_id (작성자를 대상에서 빼는 용도) */
  excludeId?: number | null;
}

/**
 * 멤버 선택 테이블 — 「권한관리 > 일괄 계정 생성」 팝업과 같은 디자인.
 *
 * 후보는 **임원단 직분 보유자만**이다. 팀장·그룹장은 소속으로 대상자가 자동 산출되므로
 * 이 매핑에 등록할 필요가 없다. 그래서 직분 필터 칩에는 「임원단」 하나만 나타난다.
 */
const MemberPicker: React.FC<MemberPickerProps> = ({
  members, selected, onToggle, multiple, onReplace, excludeId,
}) => {
  const [search, setSearch] = useState('');

  // 후보가 이미 임원단으로 한정돼 있으므로 직분은 「임원단」 하나뿐이다.
  // 멤버가 그룹장·팀장을 함께 보유해도 이 화면에서는 임원단만 노출한다.
  const leaderNames = [EXECUTIVE_LEADER_NAME];

  const filtered = useMemo(() => members.filter((m) => {
    if (excludeId && m.member_id === excludeId) return false;
    if (search.trim() && !m.name.includes(search.trim())) return false;
    return true;
  }), [members, search, excludeId]);

  const allFiltered = filtered.length > 0 && filtered.every((m) => selected.has(m.member_id));

  const toggleAll = () => {
    if (!onReplace) return;
    const ids = filtered.map((m) => m.member_id);
    onReplace(allFiltered
      ? [...selected].filter((id) => !ids.includes(id))
      : [...new Set([...selected, ...ids])]);
  };

  return (
    <>
      <PickerCount>
        후보 {filtered.length}명 · {selected.size}명 선택됨
      </PickerCount>

      <TextField
        label="이름 검색"
        placeholder="이름을 입력하세요"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
      />

      <div>
        <FilterLabelRow>
          <FilterLabelText>직분</FilterLabelText>
          <Tooltip title="임원단 매핑이므로 임원단 직분 보유자만 후보로 표시됩니다." arrow placement="right">
            <span style={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
              <Info size={13} color="#aaa" />
            </span>
          </Tooltip>
        </FilterLabelRow>
        <ChipRow>
          {leaderNames.map((name) => (
            <LeaderChip key={name} type="button" $active disabled>
              {name}
            </LeaderChip>
          ))}
        </ChipRow>
      </div>

      {filtered.length === 0 ? (
        <EmptyHint>
          {members.length === 0 ? '임원단 직분을 가진 멤버가 없습니다.' : '검색 결과가 없습니다.'}
        </EmptyHint>
      ) : (
        <ModalTableWrapper>
          <PickerTable>
            <thead>
              <tr>
                <Th style={{ width: 40 }}>
                  {multiple && (
                    <input type="checkbox" checked={allFiltered} onChange={toggleAll} />
                  )}
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
              {filtered.map((m) => (
                <tr key={m.member_id}>
                  <Td style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(m.member_id)}
                      onChange={() => onToggle(m.member_id)}
                    />
                  </Td>
                  <Td>{m.name}</Td>
                  {/* 그룹장·팀장을 함께 보유해도 이 화면에서는 임원단만 표시한다 */}
                  <Td>{EXECUTIVE_LEADER_NAME}</Td>
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
    </>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const OpinionSettingsPage: React.FC = () => {
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [reportYear, setReportYear] = useState(CURRENT_YEAR);
  const [theme, setTheme] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guideText, setGuideText] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [memberFields, setMemberFields] = useState<Set<MemberFieldKey>>(new Set());
  const [inputFields, setInputFields] = useState<Set<InputFieldKey>>(new Set());
  const [mappings, setMappings] = useState<OpinionMappingGroup[]>([]);
  const [candidates, setCandidates] = useState<OpinionMemberCandidate[]>([]);
  const [phase, setPhase] = useState<OpinionPhase>('none');

  // 매핑 추가 모달
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [writerSel, setWriterSel] = useState<number | null>(null);
  const [targetSel, setTargetSel] = useState<Set<number>>(new Set());
  const [mapError, setMapError] = useState('');

  // 설정·매핑·후보 로드
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchOpinionSettings(reportYear),
      fetchOpinionMappings(reportYear),
      fetchOpinionMemberCandidates(),
    ])
      .then(([settings, maps, members]) => {
        if (cancelled) return;
        setPhase(getOpinionPhase(settings));
        setTheme(settings.theme ?? '');
        setStartDate(settings.start_date ?? '');
        setEndDate(settings.end_date ?? '');
        setGuideText(settings.guide_text ?? '');
        setIsOpen(settings.is_open);
        setMemberFields(new Set(settings.member_fields));
        setInputFields(new Set(settings.input_fields));
        setMappings(maps);
        setCandidates(members);
      })
      .catch(() => { if (!cancelled) showSnackbar('설정을 불러오지 못했습니다.', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportYear]);

  // ── 항목 토글 ───────────────────────────────────────────────────────────────

  const toggleMemberField = (key: MemberFieldKey) => setMemberFields((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const toggleInputField = (key: InputFieldKey) => setInputFields((prev) => {
    const next = new Set(prev);
    if (next.has(key)) {
      next.delete(key);
      // 부모를 끄면 종속된 기타설명란도 함께 끈다
      (Object.keys(INPUT_FIELD_PARENT) as InputFieldKey[]).forEach((child) => {
        if (INPUT_FIELD_PARENT[child] === key) next.delete(child);
      });
    } else {
      next.add(key);
      const parent = INPUT_FIELD_PARENT[key];
      if (parent) next.add(parent);
    }
    return next;
  });

  const isInputDisabled = (key: InputFieldKey) => {
    const parent = INPUT_FIELD_PARENT[key];
    return parent ? !inputFields.has(parent) : false;
  };

  // ── 매핑 ────────────────────────────────────────────────────────────────────

  const openMapModal = () => {
    setWriterSel(null);
    setTargetSel(new Set());
    setMapError('');
    setMapModalOpen(true);
  };

  const toggleWriter = (memberId: number) => {
    setWriterSel((prev) => (prev === memberId ? null : memberId));
    // 작성자를 대상에서 자동 제외
    setTargetSel((prev) => {
      if (!prev.has(memberId)) return prev;
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
  };

  const toggleTarget = (memberId: number) => setTargetSel((prev) => {
    const next = new Set(prev);
    if (next.has(memberId)) next.delete(memberId); else next.add(memberId);
    return next;
  });

  const handleAddMapping = () => {
    if (!writerSel) { setMapError('작성자를 선택해주세요.'); return; }
    if (targetSel.size === 0) { setMapError('소견서 대상자를 1명 이상 선택해주세요.'); return; }

    const writer = candidates.find((m) => m.member_id === writerSel);
    if (!writer) { setMapError('작성자 정보를 찾을 수 없습니다.'); return; }
    const targets = candidates.filter((m) => targetSel.has(m.member_id));

    setMappings((prev) => {
      const existing = prev.find((g) => g.writer.member_id === writerSel);
      if (!existing) return [...prev, { writer, targets }];
      // 이미 등록된 작성자면 대상만 병합 (중복 제거)
      const merged = [...existing.targets];
      targets.forEach((t) => {
        if (!merged.some((x) => x.member_id === t.member_id)) merged.push(t);
      });
      return prev.map((g) => (g.writer.member_id === writerSel ? { ...g, targets: merged } : g));
    });
    setMapModalOpen(false);
  };

  const removeMapping = (writerId: number) =>
    setMappings((prev) => prev.filter((g) => g.writer.member_id !== writerId));

  const removeTarget = (writerId: number, targetId: number) =>
    setMappings((prev) => prev
      .map((g) => (g.writer.member_id === writerId
        ? { ...g, targets: g.targets.filter((t) => t.member_id !== targetId) }
        : g))
      // 대상이 모두 빠진 매핑은 행 자체를 제거
      .filter((g) => g.targets.length > 0));

  // ── 요약 ────────────────────────────────────────────────────────────────────

  /** 팀배치가 끝난(완료) 연도는 조회 전용 */
  const locked = phase === 'done';

  /**
   * 매핑 모달의 선택 후보 — **임원단 직분 보유자만**.
   *
   * 팀장·그룹장은 소속 팀·그룹으로 대상자가 자동 산출되므로 이 매핑에 등록할 필요가 없다.
   * 회장→부회장, 부회장→국장처럼 임원단 안에서만 작성자·대상이 정해진다.
   */
  const executiveCandidates = useMemo(
    () => candidates.filter((m) => m.leader_names.includes(EXECUTIVE_LEADER_NAME)),
    [candidates],
  );

  const summary = useMemo(() => {
    const period = startDate && endDate ? `${startDate} ~ ${endDate}` : '—';
    const targetTotal = mappings.reduce((sum, g) => sum + g.targets.length, 0);
    return {
      year: `${reportYear}년`,
      theme: theme.trim() || '없음',
      period,
      memberFields: memberFields.size > 0
        ? `${memberFields.size}개 — ${MEMBER_FIELD_ORDER.filter((k) => memberFields.has(k)).map((k) => MEMBER_FIELD_LABELS[k]).join(', ')}`
        : '선택된 항목 없음',
      inputFields: inputFields.size > 0
        ? `${inputFields.size}개 — ${INPUT_FIELD_ORDER.filter((k) => inputFields.has(k)).map((k) => INPUT_FIELD_LABELS[k]).join(', ')}`
        : '선택된 항목 없음',
      mappings: mappings.length > 0
        ? `작성자 ${mappings.length}명 / 대상 ${targetTotal}명`
        : '등록된 매핑 없음',
      guideText: guideText.trim() || '없음',
      userPage: isOpen ? '열림' : '닫힘',
    };
  }, [reportYear, theme, startDate, endDate, memberFields, inputFields, mappings, guideText, isOpen]);

  // ── 저장 ────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setTheme('');
    setIsOpen(true);
    setStartDate('');
    setEndDate('');
    setGuideText('');
    setMemberFields(new Set());
    setInputFields(new Set());
    setMappings([]);
  };

  const handleSave = async () => {
    if (inputFields.size === 0) {
      showSnackbar('작성자 직접 입력 항목을 1개 이상 선택해주세요.', 'error');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      showSnackbar('작성 마감일은 시작일보다 빠를 수 없습니다.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const pairs: OpinionMappingPair[] = mappings.flatMap((g) =>
        g.targets.map((t) => ({ writer_member_id: g.writer.member_id, target_member_id: t.member_id })));
      await saveOpinionSettings({
        report_year: reportYear,
        theme: theme.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        guide_text: guideText.trim() || null,
        is_open: isOpen,
        member_fields: MEMBER_FIELD_ORDER.filter((k) => memberFields.has(k)),
        input_fields: INPUT_FIELD_ORDER.filter((k) => inputFields.has(k)),
        mappings: pairs,
      });
      showSnackbar(
        phase === 'none' ? '소견서가 생성되었습니다.' : '소견서 설정이 저장되었습니다.',
        'success',
      );
      setPhase('active');
    } catch (e: any) {
      showSnackbar(e?.message || '저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <Skeleton variant="rounded" height={190} />
        <Skeleton variant="rounded" height={170} />
        <Skeleton variant="rounded" height={170} />
        <Skeleton variant="rounded" height={220} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <StatusBar>
        <StatusBadge $phase={phase}>{reportYear}년 · {OPINION_PHASE_LABEL[phase]}</StatusBadge>
        <StatusHint>{PHASE_HINT[phase]}</StatusHint>
      </StatusBar>

      {/* 기본 정보 */}
      <FormSection>
        <SectionTitle>기본 정보 입력</SectionTitle>
        <InputsCard>
          <FormGrid>
            <FieldBlock>
              <FieldLabel htmlFor="opinion-report-year">기준 연도</FieldLabel>
              <Select
                id="opinion-report-year"
                value={String(reportYear)}
                options={YEAR_OPTIONS}
                onChange={(v) => setReportYear(Number(v))}
                width="100%"
              />
            </FieldBlock>

            <FieldBlock>
              <FieldLabel htmlFor="opinion-start-date">작성 시작일</FieldLabel>
              <TextField
                id="opinion-start-date" type="date"
                value={startDate} onChange={(e) => setStartDate(e.target.value)}
                disabled={locked} disableAnimation fullWidth
              />
            </FieldBlock>

            <FieldBlock>
              <FieldLabel htmlFor="opinion-end-date">작성 마감일</FieldLabel>
              <TextField
                id="opinion-end-date" type="date"
                value={endDate} min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                helperText="*사용자 소견서 작성 화면에 D-day 마감일로 표시됩니다."
                disabled={locked} disableAnimation fullWidth
              />
            </FieldBlock>

            <FieldBlock style={{ gridColumn: '1 / -1' }}>
              <FieldLabel htmlFor="opinion-theme">소견서 주제</FieldLabel>
              <TextField
                id="opinion-theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="예: 하나님의 열심이 이루시리라"
                maxLength={200}
                helperText="*소견서 PDF 머리말에 표시됩니다."
                disabled={locked}
                fullWidth
              />
            </FieldBlock>

            <FieldBlock style={{ gridColumn: '1 / -1' }}>
              <FieldLabel htmlFor="opinion-guide">작성자 안내 문구</FieldLabel>
              <TextField
                id="opinion-guide"
                value={guideText}
                onChange={(e) => setGuideText(e.target.value)}
                placeholder="예: 담당 지체 한 분 한 분을 떠올리며 사실에 근거해 작성해 주세요."
                multiline
                rows={2}
                maxLength={500}
                helperText="*사용자 소견서 작성 화면 상단에 표시됩니다. PDF에는 나오지 않습니다."
                disabled={locked}
                fullWidth
              />
            </FieldBlock>
          </FormGrid>
        </InputsCard>
      </FormSection>

      {/* 교적 자동 기입 항목 */}
      <FormSection>
        <SectionHeader>
          <SectionTitle>교적 자동 기입 항목</SectionTitle>
          <BulkActions>
            <SelectedCount $all={memberFields.size === MEMBER_FIELD_ORDER.length}>
              <CountNum>{memberFields.size}</CountNum> / {MEMBER_FIELD_ORDER.length} 선택
            </SelectedCount>
            {!locked && (
              <>
                <TextButton type="button" onClick={() => setMemberFields(new Set(MEMBER_FIELD_ORDER))}>전체 선택</TextButton>
                <TextButton type="button" onClick={() => setMemberFields(new Set())}>전체 해제</TextButton>
              </>
            )}
          </BulkActions>
        </SectionHeader>
        <SectionHint>
          교적에서 값을 읽어와 소견서에 자동으로 표시되는 항목입니다. 작성자가 직접 수정할 수 없습니다.
        </SectionHint>
        <InputsCard>
          <FieldGrid>
            {MEMBER_FIELD_ORDER.map((key) => (
              <FieldItem key={key} $disabled={locked}>
                <Checkbox
                  checked={memberFields.has(key)}
                  onChange={() => toggleMemberField(key)}
                  disabled={locked}
                  size="small"
                />
                {MEMBER_FIELD_LABELS[key]}
              </FieldItem>
            ))}
          </FieldGrid>
        </InputsCard>
      </FormSection>

      {/* 작성자 직접 입력 항목 */}
      <FormSection>
        <SectionHeader>
          <SectionTitle>작성자 직접 입력 항목</SectionTitle>
          <BulkActions>
            <SelectedCount $all={inputFields.size === INPUT_FIELD_ORDER.length}>
              <CountNum>{inputFields.size}</CountNum> / {INPUT_FIELD_ORDER.length} 선택
            </SelectedCount>
            {!locked && (
              <>
                <TextButton type="button" onClick={() => setInputFields(new Set(INPUT_FIELD_ORDER))}>전체 선택</TextButton>
                <TextButton type="button" onClick={() => setInputFields(new Set())}>전체 해제</TextButton>
              </>
            )}
          </BulkActions>
        </SectionHeader>
        <SectionHint>
          팀장·그룹장이 소견서 작성 화면에서 직접 입력하는 항목입니다.
          기타설명란은 상위 항목이 선택된 경우에만 켤 수 있습니다.
        </SectionHint>
        <InputsCard>
          <FieldGrid>
            {INPUT_FIELD_ORDER.map((key) => {
              const disabled = locked || isInputDisabled(key);
              return (
                <FieldItem key={key} $disabled={disabled}>
                  <Checkbox
                    checked={inputFields.has(key)}
                    onChange={() => toggleInputField(key)}
                    disabled={disabled}
                    size="small"
                  />
                  {INPUT_FIELD_LABELS[key]}
                </FieldItem>
              );
            })}
          </FieldGrid>
        </InputsCard>
      </FormSection>

      {/* 임원단 작성 매핑 */}
      <FormSection>
        <SectionTitle>임원단 작성 매핑</SectionTitle>
        <SectionHint>
          팀장·그룹장은 소속 팀·그룹을 기준으로 대상자가 자동 산출되므로 등록할 필요가 없습니다.
          조직 구조가 매년 달라지는 임원단만 여기에서 작성자와 대상자를 직접 지정합니다.
        </SectionHint>
        <TableCard>
          <TableScroll>
            <MapTable>
              <thead>
                <tr>
                  <th style={{ width: 200 }}>작성자</th>
                  <th>소견서 대상</th>
                  <th style={{ width: 80 }}>대상 수</th>
                  {!locked && <th style={{ width: 64 }} />}
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={locked ? 3 : 4} style={{ padding: 0 }}>
                      <EmptyHint>
                        {locked ? '등록된 매핑이 없습니다.' : '등록된 매핑이 없습니다. 아래 버튼으로 추가하세요.'}
                      </EmptyHint>
                    </td>
                  </tr>
                ) : mappings.map((g) => (
                  <tr key={g.writer.member_id}>
                    <td>
                      <WriterCell>
                        <WriterName>{g.writer.name}</WriterName>
                        <SubText>{affiliation(g.writer) || '—'}</SubText>
                      </WriterCell>
                    </td>
                    <td>
                      <TargetChips>
                        {g.targets.map((t) => (
                          <TargetChip key={t.member_id}>
                            {t.name}
                            {!locked && (
                              <ChipRemove
                                type="button"
                                aria-label={`${t.name} 제외`}
                                onClick={() => removeTarget(g.writer.member_id, t.member_id)}
                              >
                                ×
                              </ChipRemove>
                            )}
                          </TargetChip>
                        ))}
                      </TargetChips>
                    </td>
                    <td><CountText>{g.targets.length}명</CountText></td>
                    {!locked && (
                      <td>
                        <DeleteIconButton
                          aria-label={`${g.writer.name} 매핑 삭제`}
                          onClick={() => removeMapping(g.writer.member_id)}
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
            <Button variant="elevated" onClick={openMapModal} showIcon icon={<AddIcon />}>
              매핑 추가
            </Button>
          </AddRow>
        )}
      </FormSection>

      {/* 사용자 페이지 공개 설정 — 수련회 설정 수정 화면과 같은 방식 */}
      <FormSection>
        <SectionTitle>사용자 페이지 공개 설정</SectionTitle>
        <SectionHint>
          닫으면 작성자가 소견서 작성 화면에 들어와도 「소견서 기간이 아닙니다」만 표시됩니다.
          팀배치 작업에서 소견서 완료 처리를 하면 자동으로 닫힙니다.
        </SectionHint>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                disabled={locked}
                color="primary"
              />
            }
            label={
              <span style={{ fontSize: 14 }}>
                소견서 작성&nbsp;
                <span style={{ color: isOpen ? '#1677ff' : '#8c8c8c', fontWeight: 600 }}>
                  {isOpen ? '열림' : '닫힘'}
                </span>
              </span>
            }
          />
        </div>
      </FormSection>

      {/* 요약 */}
      <FormSection>
        <SectionTitle>설정 미리보기</SectionTitle>
        <SummaryCard>
          <SummaryItem><SummaryLabel>기준 연도</SummaryLabel><SummaryValue>{summary.year}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>소견서 주제</SummaryLabel><SummaryValue>{summary.theme}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>작성 기간</SummaryLabel><SummaryValue>{summary.period}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>교적 자동 기입 항목</SummaryLabel><SummaryValue>{summary.memberFields}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>작성자 직접 입력 항목</SummaryLabel><SummaryValue>{summary.inputFields}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>임원단 매핑</SummaryLabel><SummaryValue>{summary.mappings}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>작성자 안내 문구</SummaryLabel><SummaryValue>{summary.guideText}</SummaryValue></SummaryItem>
          <SummaryItem><SummaryLabel>사용자 작성 페이지</SummaryLabel><SummaryValue>{summary.userPage}</SummaryValue></SummaryItem>
        </SummaryCard>
      </FormSection>

      {!locked && (
        <FooterActions>
          <Button variant="outlined" onClick={handleReset}>초기화</Button>
          <Button variant="filled" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중...' : phase === 'none' ? '소견서 생성' : '소견서 설정 저장'}
          </Button>
        </FooterActions>
      )}

      {/* 매핑 추가 모달 */}
      <BaseModal
        open={mapModalOpen}
        title="임원단 작성 매핑 추가"
        onClose={() => setMapModalOpen(false)}
        size="large"
        actions={
          <ModalActions>
            <Button variant="outlined" onClick={() => setMapModalOpen(false)}>취소</Button>
            <Button variant="filled" onClick={handleAddMapping}>
              추가 ({targetSel.size}명)
            </Button>
          </ModalActions>
        }
      >
        <ModalGrid>
          {mapError && <span style={{ color: '#ff4d4f', fontSize: 13 }}>{mapError}</span>}

          <PickerBlock>
            <PickerTitle>
              작성자
              <SubText>
                {writerSel
                  ? `${executiveCandidates.find((m) => m.member_id === writerSel)?.name ?? ''} 선택됨`
                  : '1명을 선택하세요'}
              </SubText>
            </PickerTitle>
            <MemberPicker
              members={executiveCandidates}
              selected={writerSel ? new Set([writerSel]) : new Set()}
              onToggle={toggleWriter}
              multiple={false}
            />
          </PickerBlock>

          <PickerBlock>
            <PickerTitle>
              소견서 대상
              <SubText>{targetSel.size}명 선택됨</SubText>
            </PickerTitle>
            <MemberPicker
              members={executiveCandidates}
              selected={targetSel}
              onToggle={toggleTarget}
              multiple
              onReplace={(ids) => setTargetSel(new Set(ids))}
              excludeId={writerSel}
            />
          </PickerBlock>
        </ModalGrid>
      </BaseModal>

      <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
    </PageWrapper>
  );
};

export default OpinionSettingsPage;
