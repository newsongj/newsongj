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

// 후발 — 버스 단위 단일 선택
export type BusSingleSelection = BusSlot | null;

// 픽업/귀경 — 버스 단위 다중 선택 (flat array)
export type BusMultiSelections = BusSlot[];

export type VehicleSelections = {
    후발?: BusSingleSelection;
    픽업?: BusMultiSelections;
    귀경?: BusMultiSelections;
};
