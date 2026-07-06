import type { ReviewStatus } from './suspendedMeal.types';

export type { ReviewStatus };

export interface PatientRoomApplication {
    application_id:   number;
    applicant_reason: string | null;
    applied_at:       string;
    review_status:    ReviewStatus;
    review_comment:   string | null;
    reviewed_at:      string | null;
}

export interface PatientRoomMember {
    member_id:   number;
    name:        string;
    generation:  number;
    gender:      '남' | '여';
    gyogu:       number;
    team:        number;
    group_no:    number;
    application: PatientRoomApplication | null;
}

export interface PatientRoomDraft {
    applicant_reason: string;
}

export interface PatientRoomSubmitBody {
    applicant_reason: string | null;
}
