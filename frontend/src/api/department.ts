import { get } from './client';
import { DepartmentTreeNode } from '@/models/department.types';

/**
 * 부서 목록 조회 By 부서
 */
export async function fetchDepartmentsByDept(tree: boolean = true): Promise<DepartmentTreeNode[]> {
  return get<DepartmentTreeNode[]>('/api/v1/departments', { tree });
}

/**
 * 부서 목록 조회
 */
export async function fetchDepartments(tree: boolean = true): Promise<DepartmentTreeNode[]> {
  return get<DepartmentTreeNode[]>('/api/v1/departments/admin', { tree });
}
