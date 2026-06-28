import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { ClipboardList, Download, Users } from 'lucide-react';
import StatCard from '@components/common/StatCard';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import type { Column } from '@components/common/DataTable/DataTable.types';
import type {
  AttendanceStatus,
  ResearchListStats,
  ResearchMemberListItem,
} from '@/models/retreat.types';
import { fetchResearchList } from '@/api/retreat';

// ── 렌더 헬퍼 ─────────────────────────────────────────────────────────────────

const ATTENDANCE_STYLE: Record<AttendanceStatus, { color: string; bg: string }> = {
  '미정': { color: '#8c8c8c', bg: '#f5f5f5' },
  '정상': { color: '#52c41a', bg: '#f6ffed' },
  '참석': { color: '#1677ff', bg: '#e6f4ff' },
  '후발': { color: '#fa8c16', bg: '#fff7e6' },
  '불참': { color: '#ff4d4f', bg: '#fff1f0' },
};

const renderAttendance = (value: AttendanceStatus | null) => {
  if (!value) return <span style={{ color: '#d9d9d9', fontSize: 13 }}>—</span>;
  const { color, bg } = ATTENDANCE_STYLE[value];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      color,
      backgroundColor: bg,
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  );
};

const formatWon = (n: number) => n.toLocaleString('ko-KR') + '원';

// ── Select 옵션 ───────────────────────────────────────────────────────────────

const SURVEY_OPTIONS = [
  { value: '',     label: '전체' },
  { value: 'done', label: '조사완료' },
];

// ── Styled ────────────────────────────────────────────────────────────────────

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.lg,
}));

const StatsGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 20,
  '@media (max-width: 768px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '@media (max-width: 480px)': { gridTemplateColumns: '1fr' },
});

const FilterRow = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.sm,
  flexWrap: 'wrap',
  '@media (max-width: 600px)': {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

const FilterGroup = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.xs,
  '@media (max-width: 600px)': {
    '& .MuiFormControl-root': { flex: 1 },
  },
}));

const FilterLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
  minWidth: 48,
}));

const CsvButton = styled('button')(({ theme }) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 14px', borderRadius: 6, border: `1px solid ${theme.custom.colors.neutral._90}`,
  background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
  color: theme.custom.colors.text.medium, marginLeft: 'auto',
  '&:hover': { background: theme.custom.colors.neutral._95 },
}));

const downloadCsv = (filename: string, rows: string[][]) => {
  const bom = '﻿';
  const csv = bom + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};


// ── Component ─────────────────────────────────────────────────────────────────

const RetreatResearchListPage: React.FC = () => {
  const [stats,       setStats]       = useState<ResearchListStats | null>(null);
  const [members,     setMembers]     = useState<ResearchMemberListItem[]>([]);
  const [retreatFees, setRetreatFees] = useState({ fee_with_bus: 0, fee_without_bus: 0 });
  const [numDays,     setNumDays]     = useState(3);
  const [gyogu,       setGyogu]       = useState('');
  const [team,        setTeam]        = useState('');
  const [surveyStatus, setSurveyStatus] = useState('');
  const [page,        setPage]        = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => { setPage(0); }, [gyogu, team, surveyStatus]);

  useEffect(() => {
    setLoading(true);
    fetchResearchList()
      .then((data) => {
        setStats({ enrolled: data.enrolled, surveyed: data.surveyed, fee_paid: data.fee_paid });
        setMembers(data.members);
        setRetreatFees({ fee_with_bus: data.fee_with_bus, fee_without_bus: data.fee_without_bus });
        setNumDays(data.num_days);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const gyoguOptions = useMemo(() => {
    const gyogus = [...new Set(members.map((m) => m.gyogu))].sort((a, b) => a - b);
    return [
      { value: '', label: '전체 교구' },
      ...gyogus.map((g) => ({ value: String(g), label: `${g}교구` })),
    ];
  }, [members]);

  const teamOptions = useMemo(() => {
    const teams = gyogu
      ? [...new Set(members.filter((m) => String(m.gyogu) === gyogu).map((m) => m.team))].sort((a, b) => a - b)
      : [];
    return [
      { value: '', label: '전체 팀' },
      ...teams.map((t) => ({ value: String(t), label: `${t}팀` })),
    ];
  }, [gyogu, members]);

  const filtered = useMemo<ResearchMemberListItem[]>(() => members.filter((m) => {
    if (gyogu && String(m.gyogu) !== gyogu) return false;
    if (team && String(m.team) !== team) return false;
    if (surveyStatus === 'done'    && !m.has_response) return false;
    if (surveyStatus === 'pending' &&  m.has_response) return false;
    return true;
  }), [members, gyogu, team, surveyStatus]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filtered, page, rowsPerPage],
  );

  const DAY_ATT_KEYS = ['day1_attendance', 'day2_attendance', 'day3_attendance', 'day4_attendance'] as const;

  const columns = useMemo((): Column<ResearchMemberListItem>[] => {
    const dayColumns: Column<ResearchMemberListItem>[] = DAY_ATT_KEYS.slice(0, numDays).map((key, i) => ({
      id: key,
      label: `${i + 1}일차`,
      align: 'center' as const,
      width: 90,
      render: renderAttendance,
    }));
    return [
      { id: 'gyogu',       label: '교구', align: 'center', width: 80,  render: (v) => `${v}교구` },
      { id: 'team',        label: '팀',   align: 'center', width: 80,  render: (v) => `${v}팀` },
      { id: 'group_no',    label: '그룹', align: 'center', width: 80,  render: (v) => `${v}그룹` },
      { id: 'generation',  label: '기수', align: 'center', width: 80,  render: (v) => `${v}기` },
      { id: 'gender',      label: '성별', align: 'center', width: 60 },
      { id: 'member_name', label: '이름', align: 'left',   width: 100 },
      ...dayColumns,
      {
        id: 'fee_type',
        label: '회비납부',
        align: 'center' as const,
        width: 220,
        render: (_value: unknown, row: ResearchMemberListItem) => {
          if (!row.has_response) return <span style={{ color: '#d9d9d9', fontSize: 13 }}>—</span>;
          const chipBase: React.CSSProperties = {
            display: 'inline-block', padding: '2px 10px', borderRadius: 999,
            fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
          };
          if (!row.fee_type)
            return <span style={{ color: '#d9d9d9', fontSize: 13 }}>—</span>;
          if (row.fee_type === 'bus')
            return <span style={{ ...chipBase, color: '#2563eb', backgroundColor: '#eff6ff', fontWeight: 600 }}>버스 탑승 ({formatWon(retreatFees.fee_with_bus)})</span>;
          return <span style={{ ...chipBase, color: '#0f766e', backgroundColor: '#f0fdfa', fontWeight: 600 }}>버스 미탑승+숙박 ({formatWon(retreatFees.fee_without_bus)})</span>;
        },
      },
    ];
  }, [retreatFees, numDays]);

  const notSurveyed = (stats?.enrolled ?? 0) - (stats?.surveyed ?? 0);
  const surveyPct   = stats && stats.enrolled > 0
    ? Math.round((stats.surveyed / stats.enrolled) * 100)
    : 0;

  const handleGyoguChange = (v: string | number | (string | number)[]) => {
    setGyogu(String(v));
    setTeam('');
  };

  const DAY_ATT_KEYS_ALL = ['day1_attendance', 'day2_attendance', 'day3_attendance', 'day4_attendance'] as const;

  const handleDownload = () => {
    const dayLabels = Array.from({ length: numDays }, (_, i) => `${i + 1}일차`);
    const header = ['교구', '팀', '그룹', '기수', '성별', '이름', ...dayLabels, '회비납부'];
    const feeLabel = (f: string | null) => {
      if (!f) return '';
      if (f === 'bus') return `버스탑승(${retreatFees.fee_with_bus.toLocaleString()}원)`;
      return `버스미탑승+숙박(${retreatFees.fee_without_bus.toLocaleString()}원)`;
    };
    const rows = filtered.map((m) => [
      `${m.gyogu}교구`, `${m.team}팀`, `${m.group_no}그룹`, `${m.generation}기`, m.gender, m.member_name,
      ...DAY_ATT_KEYS_ALL.slice(0, numDays).map((k) => m[k] ?? ''),
      m.has_response ? feeLabel(m.fee_type) : '',
    ]);
    downloadCsv('인원조사_명단.csv', [header, ...rows]);
  };

  return (
    <PageWrapper>
      <StatsGrid>
        <StatCard
          label="재적 인원"
          value={stats ? `${stats.enrolled}명` : '-'}
          change="전체 등록 인원"
          isPositive={true}
          icon={<Users size={24} />}
          iconBgColor="#e0f2fe"
        />
        <StatCard
          label="조사 완료"
          value={stats ? `${stats.surveyed}명` : '-'}
          change={stats ? `진행율 ${surveyPct}%` : ''}
          isPositive={true}
          icon={<ClipboardList size={24} />}
          iconBgColor="#dcfce7"
        />
        <StatCard
          label="미조사"
          value={stats ? `${notSurveyed}명` : '-'}
          change="아직 조사 미완료"
          isPositive={false}
          icon={<ClipboardList size={24} />}
          iconBgColor="#fee2e2"
        />
      </StatsGrid>

      <FilterRow>
        <FilterGroup>
          <FilterLabel>교구</FilterLabel>
          <Select
            value={gyogu}
            options={gyoguOptions}
            onChange={handleGyoguChange}
            width={120}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>팀</FilterLabel>
          <Select
            value={team}
            options={teamOptions}
            onChange={(v) => setTeam(String(v))}
            disabled={!gyogu}
            width={110}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>조사여부</FilterLabel>
          <Select
            value={surveyStatus}
            options={SURVEY_OPTIONS}
            onChange={(v) => setSurveyStatus(String(v))}
            width={120}
          />
        </FilterGroup>
        <CsvButton onClick={handleDownload}>
          <Download size={14} />
          CSV 다운로드
        </CsvButton>
      </FilterRow>

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        getRowId={(row) => String(row.member_id)}
        pagination={{
          page,
          rowsPerPage,
          totalCount: filtered.length,
          onPageChange: setPage,
          onRowsPerPageChange: (rpp) => { setRowsPerPage(rpp); setPage(0); },
        }}
      />
    </PageWrapper>
  );
};

export default RetreatResearchListPage;
