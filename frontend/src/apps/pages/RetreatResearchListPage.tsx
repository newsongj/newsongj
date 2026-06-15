import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { ClipboardList, Users } from 'lucide-react';
import StatCard from '@components/common/StatCard';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import type { Column } from '@components/common/DataTable/DataTable.types';
import type {
  AttendanceStatus,
  ResearchListStats,
  ResearchMemberListItem,
} from '@/models/retreat.types';

// ── 목업 ──────────────────────────────────────────────────────────────────────

const MOCK_RETREAT_FEES = { fee_with_bus: 20000, fee_without_bus: 15000 };

const MOCK_STATS: ResearchListStats = {
  enrolled: 120,
  surveyed: 98,
  fee_paid: 85,
};

const MOCK_MEMBERS: ResearchMemberListItem[] = [
  { member_id: 1, member_name: '김민준', generation: 23, gender: '남', gyogu: 1, team: 1, group_no: 0, has_response: true,  day1_attendance: '정상', day2_attendance: '참석', day3_attendance: '참석', day4_attendance: null,  fee_type: 'bus' },
  { member_id: 2, member_name: '이서연', generation: 24, gender: '여', gyogu: 1, team: 1, group_no: 0, has_response: true,  day1_attendance: '후발', day2_attendance: '참석', day3_attendance: '참석', day4_attendance: '참석', fee_type: 'bus' },
  { member_id: 3, member_name: '박지훈', generation: 22, gender: '남', gyogu: 1, team: 1, group_no: 1, has_response: false, day1_attendance: null,  day2_attendance: null,  day3_attendance: null,  day4_attendance: null,  fee_type: null },
  { member_id: 4, member_name: '최수아',  generation: 25, gender: '여', gyogu: 1, team: 1, group_no: 1, has_response: true,  day1_attendance: '불참', day2_attendance: '불참', day3_attendance: '불참', day4_attendance: '불참', fee_type: 'lodging' },
  { member_id: 5, member_name: '정도현', generation: 23, gender: '남', gyogu: 1, team: 1, group_no: 2, has_response: true,  day1_attendance: '미정', day2_attendance: null,  day3_attendance: null,  day4_attendance: null,  fee_type: null },
  { member_id: 6, member_name: '한지민', generation: 24, gender: '여', gyogu: 1, team: 2, group_no: 3, has_response: false, day1_attendance: null,  day2_attendance: null,  day3_attendance: null,  day4_attendance: null,  fee_type: null },
  { member_id: 7, member_name: '오승현', generation: 22, gender: '남', gyogu: 2, team: 3, group_no: 5, has_response: true,  day1_attendance: '정상', day2_attendance: '참석', day3_attendance: '참석', day4_attendance: '참석', fee_type: 'bus' },
  { member_id: 8, member_name: '윤채원', generation: 25, gender: '여', gyogu: 2, team: 3, group_no: 6, has_response: false, day1_attendance: null,  day2_attendance: null,  day3_attendance: null,  day4_attendance: null,  fee_type: null },
  { member_id: 9, member_name: '강지수',  generation: 26, gender: '여', gyogu: 2, team: 4, group_no: 7, has_response: true,  day1_attendance: '정상', day2_attendance: '참석', day3_attendance: '후발', day4_attendance: null,  fee_type: 'lodging' },
];

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

const GYOGU_OPTIONS = [
  { value: '',  label: '전체 교구' },
  { value: '1', label: '1교구' },
  { value: '2', label: '2교구' },
  { value: '3', label: '3교구' },
];

const SURVEY_OPTIONS = [
  { value: '',        label: '전체' },
  { value: 'done',    label: '조사완료' },
  { value: 'pending', label: '미조사' },
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


// ── Component ─────────────────────────────────────────────────────────────────

const RetreatResearchListPage: React.FC = () => {
  // TODO: 백엔드 연동 시 useQuery로 교체
  const [stats,       setStats]       = useState<ResearchListStats | null>(null);
  const [members,     setMembers]     = useState<ResearchMemberListItem[]>([]);
  const [retreatFees, setRetreatFees] = useState(MOCK_RETREAT_FEES);
  const [gyogu,       setGyogu]       = useState('');
  const [team,        setTeam]        = useState('');
  const [surveyStatus, setSurveyStatus] = useState('');

  useEffect(() => {
    // TODO: fetchResearchMemberList(), fetchRetreatInfo() 호출로 교체
    setStats(MOCK_STATS);
    setMembers(MOCK_MEMBERS);
    setRetreatFees(MOCK_RETREAT_FEES);
  }, []);

  const teamOptions = useMemo(() => {
    const teams = gyogu
      ? [...new Set(MOCK_MEMBERS.filter((m) => String(m.gyogu) === gyogu).map((m) => m.team))].sort((a, b) => a - b)
      : [];
    return [
      { value: '', label: '전체 팀' },
      ...teams.map((t) => ({ value: String(t), label: `${t}팀` })),
    ];
  }, [gyogu]);

  const filtered = useMemo(() => members.filter((m) => {
    if (gyogu && String(m.gyogu) !== gyogu) return false;
    if (team && String(m.team) !== team) return false;
    if (surveyStatus === 'done'    && !m.has_response) return false;
    if (surveyStatus === 'pending' &&  m.has_response) return false;
    return true;
  }), [members, gyogu, team, surveyStatus]);

  const columns = useMemo((): Column<ResearchMemberListItem>[] => [
    { id: 'gyogu',           label: '교구',    align: 'center', width: 80,  render: (v) => `${v}교구` },
    { id: 'team',            label: '팀',      align: 'center', width: 80,  render: (v) => `${v}팀` },
    { id: 'group_no',        label: '그룹',    align: 'center', width: 80,  render: (v) => `${v}그룹` },
    { id: 'generation',      label: '기수',    align: 'center', width: 80,  render: (v) => `${v}기` },
    { id: 'gender',          label: '성별',    align: 'center', width: 60 },
    { id: 'member_name',     label: '이름',    align: 'left',   width: 100 },
    { id: 'day1_attendance', label: '1일차',   align: 'center', width: 90,  render: renderAttendance },
    { id: 'day2_attendance', label: '2일차',   align: 'center', width: 90,  render: renderAttendance },
    { id: 'day3_attendance', label: '3일차',   align: 'center', width: 90,  render: renderAttendance },
    { id: 'day4_attendance', label: '4일차',   align: 'center', width: 90,  render: renderAttendance },
    {
      id: 'fee_type',
      label: '회비납부',
      align: 'center',
      width: 220,
      render: (_value, row) => {
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
  ], [retreatFees]);

  const notSurveyed = (stats?.enrolled ?? 0) - (stats?.surveyed ?? 0);
  const surveyPct   = stats && stats.enrolled > 0
    ? Math.round((stats.surveyed / stats.enrolled) * 100)
    : 0;

  const handleGyoguChange = (v: string | number | (string | number)[]) => {
    setGyogu(String(v));
    setTeam('');
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
            options={GYOGU_OPTIONS}
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
      </FilterRow>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => String(row.member_id)}
      />
    </PageWrapper>
  );
};

export default RetreatResearchListPage;
