export type SearchableSelectSize = 'small' | 'medium' | 'large';

export interface SearchableSelectOption {
  id: string;
  label: string;
  value: string;
  keywords?: string[]; // 검색 키워드
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string | string[];
  onChange: (value: string | string[] | null) => void;
  label?: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: SearchableSelectSize;
  required?: boolean;
  noOptionsText?: string;
  multiple?: boolean;
}
