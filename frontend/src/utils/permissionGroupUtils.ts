import { DepartmentTreeNode } from '@/models/department.types';

/**
 * 권한 그룹 트리에서 표시할 그룹들을 필터링
 * 하위 그룹이 모두 선택되었다면 상위 그룹만 표시 (DepartmentSelector의 getDisplayChips 로직 활용)
 */
export const getDisplayPermissionGroups = (
  permissionTree: DepartmentTreeNode[],
  selectedGroupNames: string[]
): string[] => {
  const displayGroups: string[] = [];

  const processLevel = (nodes: DepartmentTreeNode[]) => {
    nodes.forEach(node => {
      const state = getGroupCheckboxState(node, selectedGroupNames);

      if (state.checked) {
        displayGroups.push(node.dept_name);
      } else if (state.indeterminate && node.children) {
        processLevel(node.children);
      }
    });
  };

  processLevel(permissionTree);
  return displayGroups;
};

/**
 * 특정 그룹의 체크박스 상태를 확인 (DepartmentSelector의 getCheckboxState 로직)
 */
export const getGroupCheckboxState = (
  group: DepartmentTreeNode,
  selectedGroupNames: string[]
): { checked: boolean; indeterminate: boolean } => {
  // 말단 그룹 (자식 없음)
  if (!group.children?.length) {
    return {
      checked: selectedGroupNames.includes(group.dept_name),
      indeterminate: false
    };
  }

  // 하위 그룹을 가진 그룹
  const allDescendants = getAllDescendantNames(group);
  const selectedCount = allDescendants.filter(name =>
    selectedGroupNames.includes(name)
  ).length;

  // 모든 하위가 선택되면 상위도 선택
  if (selectedCount === allDescendants.length && selectedCount > 0) {
    return { checked: true, indeterminate: false };
  }
  // 일부 하위가 선택되면 상위는 indeterminate
  else if (selectedCount > 0) {
    return { checked: false, indeterminate: true };
  }
  // 아무것도 선택되지 않음
  else {
    return { checked: false, indeterminate: false };
  }
};

/**
 * 특정 그룹의 모든 하위 그룹 이름을 가져오기 (DepartmentSelector의 getAllDescendants 로직)
 */
export const getAllDescendantNames = (group: DepartmentTreeNode): string[] => {
  const descendants: string[] = [];

  const traverse = (node: DepartmentTreeNode) => {
    if (node.children) {
      node.children.forEach(child => {
        descendants.push(child.dept_name);
        traverse(child);
      });
    }
  };

  traverse(group);
  return descendants;
};

/**
 * 그룹 이름으로 그룹 찾기 (DepartmentSelector의 findDepartmentByName 로직)
 */
export const findGroupByName = (
  groupName: string,
  permissionTree: DepartmentTreeNode[]
): DepartmentTreeNode | null => {
  const searchInTree = (nodes: DepartmentTreeNode[]): DepartmentTreeNode | null => {
    for (const node of nodes) {
      if (node.dept_name === groupName) return node;
      if (node.children) {
        const found = searchInTree(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  return searchInTree(permissionTree);
};
