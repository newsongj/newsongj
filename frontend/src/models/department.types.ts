export interface DepartmentListRow {
  dept_idx: number;
  dept_code: string;
  dept_name: string;
  parent_dept_name?: string;
}

export interface DepartmentTreeNode {
  dept_idx: number;
  dept_code: string;
  dept_name: string;
  depth: number;
  ref_org_cd?: string;
  children: DepartmentTreeNode[];
}
