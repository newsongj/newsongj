export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SuspendedMealApplication {
    application_id:   number;
    meal_count:       number;
    fee_support:      boolean;
    applicant_reason: string | null;
    applied_at:       string;
    review_status: ReviewStatus;
    review_comment:   string | null;
    reviewed_at:      string | null;
}

export interface SuspendedMealMember {
    member_id:   number;
    name:        string;
    generation:  number;
    gender:      '남' | '여';
    gyogu:       number;
    team:        number;
    group_no:    number;
    application: SuspendedMealApplication | null;
}

export interface SuspendedMealDraft {
    meal_count:       number;
    fee_support:      boolean;
    applicant_reason: string;
}

export interface SuspendedMealSubmitBody {
    meal_count:       number;
    fee_support:      boolean;
    applicant_reason: string | null;
}
