export type BusType = '후발' | '픽업' | '귀경';
export type DayKey  = 'day1' | 'day2' | 'day3' | 'day4';

export interface BusSlot {
    bus_id:         number;
    bus_name:       string;
    departure_time: string;
    departure_date: string;
}

export interface DayBuses {
    buses: BusSlot[];
}

export interface VehicleRetreatInfo {
    retreat_custom_id: number;
    retreat_name:      string;
    start_date:        string;
    end_date:          string;
    vehicles: Partial<Record<BusType, Partial<Record<DayKey, DayBuses>>>>;
}

// 버스 단위 다중 선택 (flat array) — 후발/픽업/귀경 모두 사용
export type BusMultiSelections = BusSlot[];

// 하위 호환 alias (사용처에서 참조 중이면 유지)
export type BusSingleSelection = BusSlot | null;

export type VehicleSelections = {
    후발?: BusMultiSelections;
    픽업?: BusMultiSelections;
    귀경?: BusMultiSelections;
};
