export interface SearchOption {
  value: string;
  label: string;
}

export interface SearchFieldProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: (searchValue: string, attributeValue: string) => void;
  searchPlaceholder?: string;
  attributeValue?: string;
  onAttributeChange?: (value: string) => void;
  attributeOptions?: SearchOption[];
  width?: string;
  showSearchButton?: boolean;
  searchButtonText?: string;
  size?: 'small' | 'medium' | 'large';
}
