import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import type { Column } from '@components/common/DataTable/DataTable.types';
import type { BusInfo, VehicleMemberListItem } from '@/models/retreat.types';

// ── 목업 ─────────────────────────────────────────────────────────────────────

const MOCK_MEMBERS: VehicleMemberListItem[] = [
  { member_id: 1, member_name: '김민준', generation: 23, gender: '남', gyogu: 1, team: 1, group_no: 0, has_response: true,  day1_bus: [{ bus_name: '후발버스1', departure_time: '15:00' }], day2_bus: null,                                                                         day3_bus: null,                                             day4_bus: null },
  { member_id: 2, member_name: '이서연', generation: 24, gender: '여', gyogu: 1, team: 1, group_no: 0, has_response: false, day1_bus: null,                                                  day2_bus: null,                                                                         day3_bus: null,                                             day4_bus: null },
  { member_id: 3, member_name: '박지훈', generation: 22, gender: '남', gyogu: 1, team: 1, group_no: 1, has_response: true,  day1_bus: [{ bus_name: '픽업버스1', departure_time: '11:30' }], day2_bus: null,                                                                         day3_bus: null,                                             day4_bus: [{ bus_name: '귀경버스1', departure_time: '05:30' }] },
  { member_id: 4, member_name: '최수아', generation: 25, gender: '여', gyogu: 1, team: 1, group_no: 1, has_response: true,  day1_bus: null,                                                  day2_bus: [{ bus_name: '후발버스1', departure_time: '15:00' }],                          day3_bus: null,                                             day4_bus: null },
  { member_id: 5, member_name: '정도현', generation: 23, gender: '남', gyogu: 1, team: 1, group_no: 2, has_response: false, day1_bus: null,                                                  day2_bus: null,                                                                         day3_bus: null,                                             day4_bus: null },
  { member_id: 6, member_name: '한지민', generation: 24, gender: '여', gyogu: 1, team: 1, group_no: 2, has_response: true,  day1_bus: null,                                                  day2_bus: null,                                                                         day3_bus: null,                                             day4_bus: [{ bus_name: '귀경버스1', departure_time: '22:00' }] },
  { member_id: 7, member_name: '오승현', generation: 22, gender: '남', gyogu: 2, team: 3, group_no: 5, has_response: true,  day1_bus: [{ bus_name: '후발버스2', departure_time: '18:00' }], day2_bus: null,                                                                         day3_bus: null,                                             day4_bus: null },
  { member_id: 8, member_name: '윤채원', generation: 25, gender: '여', gyogu: 2, team: 3, group_no: 6, has_response: false, day1_bus: null,                                                  day2_bus: null,                                                                         day3_bus: null,                                             day4_bus: null },
  { member_id: 9, member_name: '강지수', generation: 26, gender: '여', gyogu: 2, team: 4, group_no: 7, has_response: true,  day1_bus: null,                                                  day2_bus: [{ bus_name: '픽업버스1', departure_time: '11:30' }, { bus_name: '픽업버스2', departure_time: '15:00' }], day3_bus: null, day4_bus: null },
];

// ── 렌더 헬퍼 ────────────────────────────────────────────────────────────────

const BUS_CHIP_STYLE: Record<string, { color: string; bg: string }> = {
  '후발': { color: '#2563eb', bg: '#eff6ff' },
  '픽업': { color: '#d97706', bg: '#fef3c7' },
  '귀경': { color: '#7c3aed', bg: '#f5f3ff' },
};

const getBusStyle = (busName: string) => {
  for (const [prefix, style] of Object.entries(BUS_CHIP_STYLE)) {
    if (busName.startsWith(prefix)) return style;
  }
  return { color: '#595959', bg: '#f5f5f5' };
};

const chipBase: React.CSSProperties = {
  display: 'inline-block', padding: '2px 10px', borderRadius: 999,
  fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
};

type DayBusKey = 'day1_bus' | 'day2_bus' | 'day3_bus' | 'day4_bus';

// busType/departureTime 필터 기준으로 해당 일차에서 보여줄 버스만 반환
const filterBuses = (
  buses: BusInfo[] | null,
  busType: string,
  departureTime: string,
): BusInfo[] => {
  if (!buses) return [];
  return buses.filter((bus) => {
    const typeMatch = !busType || bus.bus_name.startsWith(busType);
    const timeMatch = !departureTime || bus.departure_time === departureTime;
    return typeMatch && timeMatch;
  });
};

const makeRenderBus = (dayKey: DayBusKey, busType: string, departureTime: string) =>
  (_value: unknown, row: VehicleMemberListItem): React.ReactNode => {
    if (!row.has_response) return <span style={{ color: '#d9d9d9', fontSize: 13 }}>—</span>;
    const displayBuses = filterBuses(row[dayKey], busType, departureTime);
    if (displayBuses.length === 0)
      return <span style={{ ...chipBase, color: '#8c8c8c', backgroundColor: '#f5f5f5' }}>신청 안 함</span>;
    return (
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
        {displayBuses.map((bus) => {
          const { color, bg } = getBusStyle(bus.bus_name);
          return (
            <span key={`${bus.bus_name}-${bus.departure_time}`} style={{ ...chipBase, color, backgroundColor: bg, fontWeight: 600 }}>
              {bus.bus_name} <span style={{ fontWeight: 400, opacity: 0.8 }}>{bus.departure_time}</span>
            </span>
          );
        })}
      </div>
    );
  };

// ── Select 옵션 ───────────────────────────────────────────────────────────────

const GYOGU_OPTIONS = [
  { value: '',  label: '전체 교구' },
  { value: '1', label: '1교구' },
  { value: '2', label: '2교구' },
  { value: '3', label: '3교구' },
];

const BUS_TYPE_OPTIONS = [
  { value: '',   label: '전체 유형' },
  { value: '후발', label: '후발' },
  { value: '픽업', label: '픽업' },
  { value: '귀경', label: '귀경' },
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
    '& .MuiFormControl-root': {
      flex: 1,
      width: '100% !important',
    },
  },
}));

const FilterLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
  '@media (max-width: 600px)': {
    minWidth: 56,
  },
}));

// ── Component ─────────────────────────────────────────────────────────────────

const RetreatVehicleListPage: React.FC = () => {
  const [members, setMembers] = useState<VehicleMemberListItem[]>([]);
  const [gyogu,          setGyogu]          = useState('');
  const [team,           setTeam]           = useState('');
  const [busType,        setBusType]        = useState('');
  const [departureTime,  setDepartureTime]  = useState('');
  const [surveyStatus,   setSurveyStatus]   = useState('');

  useEffect(() => {
    // TODO: fetchVehicleMemberList() 호출로 교체
    setMembers(MOCK_MEMBERS);
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

  // busType 선택 시 해당 유형의 고유 출발 시간 목록 생성
  const timeOptions = useMemo(() => {
    if (!busType) return [{ value: '', label: '전체 시간' }];
    const times = new Set<string>();
    MOCK_MEMBERS.forEach((m) => {
      ([m.day1_bus, m.day2_bus, m.day3_bus, m.day4_bus].filter(Boolean) as BusInfo[][])
        .flat()
        .forEach((bus) => {
          if (bus.bus_name.startsWith(busType)) times.add(bus.departure_time);
        });
    });
    return [
      { value: '', label: '전체 시간' },
      ...[...times].sort().map((t) => ({ value: t, label: t })),
    ];
  }, [busType]);

  // columns은 busType/departureTime 변경 시 재생성 (셀 렌더가 필터를 반영해야 함)
  const columns = useMemo<Column<VehicleMemberListItem>[]>(() => [
    { id: 'gyogu',       label: '교구', align: 'center', width: 80,  render: (v) => `${v}교구` },
    { id: 'team',        label: '팀',   align: 'center', width: 60,  render: (v) => `${v}팀` },
    { id: 'group_no',    label: '그룹', align: 'center', width: 70,  render: (v) => `${v}그룹` },
    { id: 'generation',  label: '기수', align: 'center', width: 60,  render: (v) => `${v}기` },
    { id: 'gender',      label: '성별', align: 'center', width: 60 },
    { id: 'member_name', label: '이름', align: 'left',   width: 90 },
    { id: 'day1_bus', label: '1일차', align: 'center', width: 180, render: makeRenderBus('day1_bus', busType, departureTime) },
    { id: 'day2_bus', label: '2일차', align: 'center', width: 180, render: makeRenderBus('day2_bus', busType, departureTime) },
    { id: 'day3_bus', label: '3일차', align: 'center', width: 180, render: makeRenderBus('day3_bus', busType, departureTime) },
    { id: 'day4_bus', label: '4일차', align: 'center', width: 180, render: makeRenderBus('day4_bus', busType, departureTime) },
  ], [busType, departureTime]);

  const filtered = useMemo(() => members.filter((m) => {
    if (gyogu && String(m.gyogu) !== gyogu) return false;
    if (team  && String(m.team)  !== team)  return false;
    if (surveyStatus === 'done'    && !m.has_response) return false;
    if (surveyStatus === 'pending' &&  m.has_response) return false;
    // busType 또는 departureTime 필터: 해당 조건에 맞는 버스가 하나라도 있어야 포함
    if (busType || departureTime) {
      const allBuses = ([m.day1_bus, m.day2_bus, m.day3_bus, m.day4_bus]
        .filter(Boolean) as BusInfo[][])
        .flat();
      if (!allBuses.some((bus) => {
        const typeMatch = !busType || bus.bus_name.startsWith(busType);
        const timeMatch = !departureTime || bus.departure_time === departureTime;
        return typeMatch && timeMatch;
      })) return false;
    }
    return true;
  }), [members, gyogu, team, surveyStatus, busType, departureTime]);

  const handleGyoguChange = (v: string | number | (string | number)[]) => {
    setGyogu(String(v));
    setTeam('');
  };

  const handleBusTypeChange = (v: string | number | (string | number)[]) => {
    setBusType(String(v));
    setDepartureTime(''); // 유형 변경 시 시간대 리셋
  };

  return (
    <PageWrapper>
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
          <FilterLabel>차량유형</FilterLabel>
          <Select
            value={busType}
            options={BUS_TYPE_OPTIONS}
            onChange={handleBusTypeChange}
            width={120}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>시간대</FilterLabel>
          <Select
            value={departureTime}
            options={timeOptions}
            onChange={(v) => setDepartureTime(String(v))}
            disabled={!busType}
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

export default RetreatVehicleListPage;
