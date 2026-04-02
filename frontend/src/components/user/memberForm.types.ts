export interface MemberFormValue {
  name: string;
  generation: string;
  phone: string;
  birthDate: string;
  parish: string;
  team: string;
  group: string;
  gender: string;
  roles: string[];
  memberType: string;
  memberTypeText: string;
  attendanceGrade: string;
  pltCompleted: string;
  schoolWork: string;
  major: string;
  pid: string;
}

export const MEMBER_ROLE_OPTIONS = [
  '팀장',
  '그룹장',
  'PLT 리더',
  '새큼터 리더',
  '부팀장',
  '새가족 리더',
] as const;

export const MEMBER_MEMBER_TYPE_OPTIONS = [
  '토요예배',
  '주일예배',
  '래사랑',
  '군지체',
  '해외지체',
  '새가족',
] as const;

export const MEMBER_ATTENDANCE_OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;

export const MEMBER_PLT_OPTIONS = ['수료', '1학기 수료'] as const;
