import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { IconButton, Skeleton } from '@mui/material';
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

const FormGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(200px, 1fr))',
  gap: theme.custom.spacing.md,
  '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
}));

const BulkActions = styled('div')({
  display: 'flex', gap: 8,
});

const TextButton = styled('button')(({ theme }) => ({
  padding: '2px 8px', border: 'none', background: 'transparent', cursor: 'pointer',
  fontSize: 12, color: theme.custom.colors.primary._500, borderRadius: 4,
  '&:hover': { backgroundColor: theme.custom.overlay.primary.hover },
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

const SelectedCount = styled('span')(({ theme }) => ({
  fontSize: 12, color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
}));

// 매핑 테이블
const TableScroll = styled('div')({ overflowX: 'auto', WebkitOverflowScrolling: 'touch' });

const MapTable = styled('table')(({ theme }) => ({
  width: '100%', minWidth: 640, borderCollapse: 'collapse',
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

const WriterCell = styled('div')({ display: 'flex', flexDirection: 'column', gap: 2 });

const WriterName = styled('span')({ fontWeight: 600, whiteSpace: 'nowrap' });

const SubText = styled('span')(({ theme }) => ({
  fontSize: 12, color: theme.custom.colors.text.medium, whiteSpace: 'nowrap',
}));

const TargetChips = styled('div')({ display: 'flex', flexWrap: 'wrap', gap: 4 });

const TargetChip = styled('span')(({ theme }) => ({
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

// 모달
const ModalBody = styled('div')(({ theme }) => ({
  display: 'flex', flexDirection: 'column', gap: theme.custom.spacing.lg,
  padding: theme.custom.spacing.lg, width: '100%', minWidth: 0,
  boxSizing: 'border-box',
}));

const ModalActions = styled('div')({
  display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
  '@media (max-width: 480px)': { '& > *': { width: '100%' } },
});

const PickerBlock = styled('div')({ display: 'flex', flexDirection: 'column', gap: 8 });

const PickerTitle = styled('div')(({ theme }) => ({
  display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
  fontSize: theme.custom.typography.body2.fontSize,
  fontWeight: 600, color: theme.custom.colors.text.high,
}));

const PickerTableWrap = styled('div')(({ theme }) => ({
  maxHeight: 220, overflowY: 'auto',
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
  multiple: boolean;
  /** 선택 후보에서 제외할 member_id (작성자를 대상에서 빼는 용도) */
  excludeId?: number | null;
}

const MemberPicker: React.FC<MemberPickerProps> = ({ members, selected, onToggle, multiple, excludeId }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => members.filter((m) => {
    if (excludeId && m.member_id === excludeId) return false;
    if (search.trim() && !m.name.includes(search.trim())) return false;
    return true;
  }), [members, search, excludeId]);

  return (
    <>
      <TextField
        label="이름 검색"
        placeholder="이름을 입력하세요"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 0 }}>
                  <EmptyHint>검색 결과가 없습니다.</EmptyHint>
                </td>
              </tr>
            ) : filtered.map((m) => {
              const isSelected = selected.has(m.member_id);
              return (
                <RowSelected key={m.member_id} $selected={isSelected} onClick={() => onToggle(m.member_id)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggle(m.member_id)}
                      size="small"
                      sx={multiple ? undefined : { borderRadius: '50%' }}
                    />
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
    };
  }, [reportYear, theme, startDate, endDate, memberFields, inputFields, mappings, guideText]);

  // ── 저장 ────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setTheme('');
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
            <div>
              <div style={{ fontSize: 12, marginBottom: 4, color: '#595959' }}>기준 연도</div>
              <Select
                value={String(reportYear)}
                options={YEAR_OPTIONS}
                onChange={(v) => setReportYear(Number(v))}
                width="100%"
              />
            </div>
            <TextField
              id="opinion-start-date" label="작성 시작일" type="date"
              value={startDate} onChange={(e) => setStartDate(e.target.value)}
              disabled={locked} disableAnimation fullWidth
            />
            <TextField
              id="opinion-end-date" label="작성 마감일" type="date"
              value={endDate} min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={locked} disableAnimation fullWidth
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <TextField
                label="소견서 주제"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="예: 하나님의 열심이 이루시리라"
                maxLength={200}
                helperText="소견서 PDF 머리말에 표시됩니다."
                disabled={locked}
                fullWidth
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <TextField
                label="작성자 안내 문구"
                value={guideText}
                onChange={(e) => setGuideText(e.target.value)}
                placeholder="예: 담당 지체 한 분 한 분을 떠올리며 사실에 근거해 작성해 주세요."
                multiline
                rows={2}
                maxLength={500}
                helperText="사용자 소견서 작성 페이지 상단에 표시됩니다. PDF에는 나오지 않습니다."
                disabled={locked}
                fullWidth
              />
            </div>
          </FormGrid>
        </InputsCard>
      </FormSection>

      {/* 교적 자동 기입 항목 */}
      <FormSection>
        <SectionHeader>
          <SectionTitle>교적 자동 기입 항목</SectionTitle>
          <BulkActions>
            <SelectedCount>{memberFields.size} / {MEMBER_FIELD_ORDER.length} 선택</SelectedCount>
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
            <SelectedCount>{inputFields.size} / {INPUT_FIELD_ORDER.length} 선택</SelectedCount>
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
        <TableScroll>
          <MapTable>
            <thead>
              <tr>
                <th style={{ width: 200 }}>작성자</th>
                <th>소견서 대상</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 0 }}>
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
                    <SubText>{g.targets.length}명</SubText>
                  </td>
                  <td>
                    {!locked && (
                      <DeleteIconButton onClick={() => removeMapping(g.writer.member_id)}>
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
            <Button variant="elevated" onClick={openMapModal} showIcon icon={<AddIcon />}>
              매핑 추가
            </Button>
          </AddRow>
        )}
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
        <ModalBody>
          {mapError && <span style={{ color: '#ff4d4f', fontSize: 13 }}>{mapError}</span>}

          <PickerBlock>
            <PickerTitle>
              작성자
              <SubText>
                {writerSel
                  ? `${candidates.find((m) => m.member_id === writerSel)?.name ?? ''} 선택됨`
                  : '1명을 선택하세요'}
              </SubText>
            </PickerTitle>
            <MemberPicker
              members={candidates}
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
              members={candidates}
              selected={targetSel}
              onToggle={toggleTarget}
              multiple
              excludeId={writerSel}
            />
          </PickerBlock>
        </ModalBody>
      </BaseModal>

      <Snackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={hideSnackbar} />
    </PageWrapper>
  );
};

export default OpinionSettingsPage;
