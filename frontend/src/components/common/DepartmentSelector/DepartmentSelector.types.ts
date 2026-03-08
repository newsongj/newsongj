import { DepartmentTreeNode } from '@/models/department.types';

export interface DepartmentSelectorProps {
  departmentTree: DepartmentTreeNode[];
  initialSelected?: string[];
  onSelectionChange: (selectedDepartments: string[]) => void;
  showSelectedChips?: boolean;
  isActivate?: boolean;
}
