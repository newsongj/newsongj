export type AttendanceStatus = '정상' | '참석' | '후발' | '불참' | '미정';

export interface BusInfo {
    bus_id:          number;
    bus_name:        string;
    seat_count:      number;
    departure_date:  string;
    departure_time:  string;
    departure_place: string;
    arrival_place:   string;
}

export interface RetreatInfo {
    retreat_id:      number;
    retreat_name:    string;
    start_date:      string;
    end_date:        string;
    fee_with_bus:    number;
    fee_without_bus: number;
    buses:           BusInfo[];
}

export type FeeType = 'bus' | 'lodging_only' | null;

export interface ResearchResponse {
    day1_attendance: AttendanceStatus | null;
    day2_attendance: AttendanceStatus | null;
    day3_attendance: AttendanceStatus | null;
    day4_attendance: AttendanceStatus | null;
    fee_type:        FeeType;
}

export interface ResearchMember {
    member_id:  number;
    name:       string;
    generation: number;
    gender:     '남' | '여';
    gyogu:      number;
    team:       number;
    group_no:   number;
    response:   ResearchResponse | null;
}

export type ResearchResponseBody = Partial<ResearchResponse>;
