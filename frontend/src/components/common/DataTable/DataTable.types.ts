import { ReactNode } from 'react';
import { MenuItemData } from '@components/common/Menu/Menu.types';
import { ActionButton } from '@components/common/SearchToolbar/SearchToolbar.types';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T = any> {
  id: string;
  label: string;
  minWidth?: number | string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T) => ReactNode;
}

export interface SearchOption {
  value: string;
  label: string;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  searchPlaceholder?: string;
  searchOptions?: SearchOption[];
  selectedActions?: () => void;
  rowActions?: (row: T) => MenuItemData[];
  onSelectionChange?: (selectedIds: string[]) => void;
  selectedIds?: string[]; // 외부에서 전달받는 선택된 ID 목록
  onSearch?: (searchValue: string, attribute?: string) => void;
  onSort?: (columnId: string, direction: SortDirection) => void;
  pagination?: {
    page: number;
    rowsPerPage: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
  };
  getRowId?: (row: T) => string;
  // SearchToolbar 관련 props
  useSearchToolbar?: boolean;
  toolbarActions?: ActionButton[];
  selectedCount?: number;
  onDeleteSelected?: () => void;
  onFilter?: () => void;
  showToolbarActionsWhenSelected?: boolean;
  onRowClick?: (row: T) => void;
}
