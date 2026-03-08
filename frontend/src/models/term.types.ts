/**
 * 용어사전 타입 정의
 */

export interface TermDictionary {
  term_id: number;
  company_id: number;
  domain: string;
  source_term: string;
  target_term: string;
  match_type: 'exact' | 'word' | 'regex';
  lang: string;
  priority: number;
  is_active: boolean;
  description?: string;
  created_by?: number;
  created_by_name?: string;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface TermDictionaryCreate {
  company_id?: number;
  domain: string;
  source_term: string;
  target_term: string;
  match_type: 'exact' | 'word' | 'regex';
  lang?: string;
  priority?: number;
  is_active?: boolean;
  description?: string;
}

export interface TermDictionaryUpdate {
  domain?: string;
  source_term?: string;
  target_term?: string;
  match_type?: 'exact' | 'word' | 'regex';
  lang?: string;
  priority?: number;
  is_active?: boolean;
  description?: string;
}

export interface TermFilters {
  searchQuery: string;
  domain: string;
  isActive: string;
}

export const MATCH_TYPE_OPTIONS = [
  { value: 'exact', label: '완전 일치' },
  { value: 'word', label: '단어 일치' },
  { value: 'regex', label: '정규식' }
] as const;

export const ACTIVE_STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'active', label: '활성' },
  { value: 'inactive', label: '비활성' }
] as const;
