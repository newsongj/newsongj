import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { DataTable } from '@components/common/DataTable';
import { Select } from '@components/common/Select';
import type { Column } from '@components/common/DataTable/DataTable.types';
import type { BusInfo, VehicleMemberListItem } from '@/models/retreat.types';
import { fetchVehicleMemberList } from '@/api/retreat';

const DAY_BUS_KEYS = ['day1_bus', 'day2_bus', 'day3_bus', 'day4_bus'] as const;

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

const makeRenderBus = (dayKey: typeof DAY_BUS_KEYS[number], busType: string, departureTime: string) =>
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

const BUS_TYPE_OPTIONS = [
  { value: '',   label: '전체 유형' },
  { value: '후발', label: '후발' },
  { value: '픽업', label: '픽업' },
  { value: '귀경', label: '귀경' },
];

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
  const [numDays, setNumDays] = useState(3);
  const [gyogu,          setGyogu]          = useState('');
  const [team,           setTeam]           = useState('');
  const [busType,        setBusType]        = useState('');
  const [departureTime,  setDepartureTime]  = useState('');
  const [surveyStatus,   setSurveyStatus]   = useState('');

  useEffect(() => {
    fetchVehicleMemberList()
      .then((data) => {
        setMembers(data.members);
        setNumDays(data.num_days);
      })
      .catch(() => {});
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

  const timeOptions = useMemo(() => {
    if (!busType) return [{ value: '', label: '전체 시간' }];
    const times = new Set<string>();
    members.forEach((m) => {
      DAY_BUS_KEYS.slice(0, numDays).forEach((key) => {
        (m[key] ?? []).forEach((bus) => {
          if (bus.bus_name.startsWith(busType)) times.add(bus.departure_time);
        });
      });
    });
    return [
      { value: '', label: '전체 시간' },
      ...[...times].sort().map((t) => ({ value: t, label: t })),
    ];
  }, [busType, members, numDays]);

  const columns = useMemo<Column<VehicleMemberListItem>[]>(() => {
    const dayColumns: Column<VehicleMemberListItem>[] = DAY_BUS_KEYS.slice(0, numDays).map((key, i) => ({
      id: key,
      label: `${i + 1}일차`,
      align: 'center' as const,
      width: 180,
      render: makeRenderBus(key, busType, departureTime),
    }));
    return [
      { id: 'gyogu',       label: '교구', align: 'center', width: 80,  render: (v) => `${v}교구` },
      { id: 'team',        label: '팀',   align: 'center', width: 60,  render: (v) => `${v}팀` },
      { id: 'group_no',    label: '그룹', align: 'center', width: 70,  render: (v) => `${v}그룹` },
      { id: 'generation',  label: '기수', align: 'center', width: 60,  render: (v) => `${v}기` },
      { id: 'gender',      label: '성별', align: 'center', width: 60 },
      { id: 'member_name', label: '이름', align: 'left',   width: 90 },
      ...dayColumns,
    ];
  }, [busType, departureTime, numDays]);

  const filtered = useMemo(() => members.filter((m) => {
    if (gyogu && String(m.gyogu) !== gyogu) return false;
    if (team  && String(m.team)  !== team)  return false;
    if (surveyStatus === 'done'    && !m.has_response) return false;
    if (surveyStatus === 'pending' &&  m.has_response) return false;
    // busType 또는 departureTime 필터: 해당 조건에 맞는 버스가 하나라도 있어야 포함
    if (busType || departureTime) {
      const allBuses = (DAY_BUS_KEYS.slice(0, numDays).map((k) => m[k]).filter(Boolean) as BusInfo[][]).flat();
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
