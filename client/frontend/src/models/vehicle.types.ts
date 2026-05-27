export type BusType = '후발' | '픽업' | '귀경';
export type DayKey  = 'day1' | 'day2' | 'day3' | 'day4';

export interface DaySlots {
    slots: string[];
}

export interface VehicleRetreatInfo {
    retreat_custom_id: number;
    retreat_name:      string;
    start_date:        string;
    end_date:          string;
    vehicles: Partial<Record<BusType, Partial<Record<DayKey, DaySlots>>>>;
}

// 후발 — 단일 선택
export interface BusSingleSelection {
    day:  DayKey;
    time: string;
}

// 픽업/귀경 — 날짜별 다중 선택
export type BusMultiSelections = Partial<Record<DayKey, string[]>>;

export type VehicleSelections = Partial<Record<BusType, BusSingleSelection | null | BusMultiSelections>>;
