import React, { useState, useEffect } from 'react';
import {
  ExpandMore,
  ChevronRight,
  Business as BusinessIcon,
  AccountTree as AccountTreeIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { Chip, ChipContainer } from '@components/common/Chip';
import { Checkbox } from '@components/common/Checkbox';
import { getDisplayPermissionGroups } from '@/utils/permissionGroupUtils';
import { DepartmentSelectorProps } from './DepartmentSelector.types';
import * as S from './DepartmentSelector.styles';

const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  departmentTree,
  initialSelected = [],
  onSelectionChange,
  showSelectedChips = true,
  isActivate = true,
}) => {
  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(initialSelected);
  const [isChipsExpanded, setIsChipsExpanded] = useState(false);

  const MAX_VISIBLE_CHIPS = 3;

  useEffect(() => {
    onSelectionChange(selectedDepartments); // selectedDepartments 대신 이걸 전달
  }, [selectedDepartments]);

  const handleToggleExpand = (deptIdx: number) => {
    setExpandedDepts(prev => {
      const newExpanded = new Set(prev);
      if (prev.has(deptIdx)) {
        newExpanded.delete(deptIdx);
      } else {
        newExpanded.add(deptIdx);
      }
      return newExpanded;
    });
  };

  const findDepartmentByName = (deptName: string): any => {
    const searchInTree = (nodes: any[]): any => {
      for (const node of nodes) {
        if (node.dept_name === deptName) return node;
        if (node.children) {
          const found = searchInTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return searchInTree(departmentTree);
  };

  // 모든 하위 레벨의 부서 이름을 가져오는 함수
  const getAllDescendants = (dept: any): string[] => {
    const descendants: string[] = [];

    const traverse = (node: any) => {
      if (node.children) {
        node.children.forEach((child: any) => {
          descendants.push(child.dept_name);
          traverse(child); // 재귀적으로 모든 하위 레벨 포함
        });
      }
    };

    traverse(dept);
    return descendants;
  };

  const getCheckboxState = (dept: any) => {
    // ## CASE 1 ## 말단 부서 (== 자식 없음)
    if (!dept.children?.length) {
      return {
        checked: selectedDepartments.includes(dept.dept_name),
        indeterminate: false
      };
    }

    // ## CASE 2 ## 하위 부서를 가진 부서
    // 하위 부서를 모두 조회
    const allDescendants = getAllDescendants(dept);
    // 하위 부서 중 체크된 부서의 개수
    const selectedCount = allDescendants.filter(name =>
      selectedDepartments.includes(name)
    ).length;

    // 2-1) 모든 하위가 선택되면 그 상위부서도 선택임.
    if (selectedCount === allDescendants.length && selectedCount > 0) {
      return { checked: true, indeterminate: false };
    }
    // 2-2) 일부 하위가 선택되었으면 그 상위부서는 선택 아님.
    else if (selectedCount > 0) {
      return { checked: false, indeterminate: true };
    }
    // 2-3) 아무것도 선택되지 않아서 상위부서도 선택 아님.
    else {
      return { checked: false, indeterminate: false };
    }
  };

  const handleDepartmentToggle = (dept: any) => {
    const { checked } = getCheckboxState(dept);

    if (!dept.children?.length) {
      setSelectedDepartments(prev => {
        const newState = prev.includes(dept.dept_name)
          ? prev.filter(name => name !== dept.dept_name)
          : [...prev, dept.dept_name];
        return newState;
      });
      return;
    }

    const allDescendants = getAllDescendants(dept);

    setSelectedDepartments(prev => {
      if (checked) {
        const newState = prev.filter(name => !allDescendants.includes(name) && !(name == dept.dept_name));
        return newState;
      } else {
        const newSelected = [...prev];
        allDescendants.forEach(name => {
          if (!newSelected.includes(name)) {
            newSelected.push(name);
          }
        });
        newSelected.push(dept.dept_name);
        return newSelected;
      }
    });
  };


  const getDisplayChips = (): string[] => {
    return getDisplayPermissionGroups(departmentTree, selectedDepartments);
  };

  const handleNameClick = (dept: any) => {
    if (!isActivate || !dept.children?.length) return;
    handleToggleExpand(dept.dept_idx);
  };

  const handleChipDelete = (deptName: string) => {
    const deptToDelete = findDepartmentByName(deptName);
    if (deptToDelete?.children) {
      const allDescendants = getAllDescendants(deptToDelete);
      setSelectedDepartments(prev => {
        const newSelected = prev.filter(name => name !== deptName && !allDescendants.includes(name));
        return newSelected;
      });
    } else {
      setSelectedDepartments(prev => {
        const newSelected = prev.filter(name => name !== deptName);
        return newSelected;
      });
    }
  };

  const renderDepartmentLevel = (dept: any, level: number = 0) => {
    // 레벨별 아이콘 결정
    const getLevelIcon = () => {
      switch (level) {
        case 0: return <BusinessIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />;
        case 1: return <AccountTreeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />;
        default: return <GroupIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />;
      }
    };

    return (
      <div key={dept.dept_idx}>
        <S.StyledDepartmentLevel data-hoverable={isActivate ? 'true' : 'false'}>
          <S.StyledIconButton
            size="small"
            onClick={() => dept.children?.length > 0 && isActivate && handleToggleExpand(dept.dept_idx)}
            sx={{ mr: level > 0 ? 1 : 0 }}
            disabled={!dept.children?.length || !isActivate}
          >
            {dept.children?.length > 0 ? (
              expandedDepts.has(dept.dept_idx) ? <ExpandMore /> : <ChevronRight />
            ) : (
              <div style={{ width: 24, height: 24 }} /> // 빈 공간
            )}
          </S.StyledIconButton>

          <S.StyledIconContainer>
            <Checkbox
              {...getCheckboxState(dept)}
              onChange={() => isActivate && handleDepartmentToggle(dept)}
              size="small"
              disabled={!isActivate}
            />
            {getLevelIcon()}
            <S.StyledTypography
              variant="body2"
              fontWeight={level === 0 ? "bold" : "normal"}
              onClick={() => handleNameClick(dept)}
              style={{ cursor: dept.children?.length && isActivate ? 'pointer' : 'default' }}
            >
              {dept.dept_name}
            </S.StyledTypography>
          </S.StyledIconContainer>
        </S.StyledDepartmentLevel>

        {dept.children?.length > 0 && (
          <S.StyledCollapse in={expandedDepts.has(dept.dept_idx)}>
            <S.StyledNestedBox sx={{ ml: level === 0 ? 2 : 4 }}>
              {dept.children.map((child: any) => renderDepartmentLevel(child, level + 1))}
            </S.StyledNestedBox>
          </S.StyledCollapse>
        )}
      </div>
    );
  };

  return (
    <>
      <S.StyledChipsArea>
        {showSelectedChips && getDisplayChips().length > 0 && (
          <ChipContainer>
            {/* 표시할 Chip들 */}
            {(isChipsExpanded ? getDisplayChips() : getDisplayChips().slice(0, MAX_VISIBLE_CHIPS))
              .map((deptName) => (
                <Chip
                  key={deptName}
                  label={deptName}
                  onDelete={isActivate ? () => handleChipDelete(deptName) : undefined}
                />
              ))}

            {/* +N개 더 / 접기 버튼 */}
            {getDisplayChips().length > MAX_VISIBLE_CHIPS && (
              <Chip
                label={isChipsExpanded ? '접기' : `+${getDisplayChips().length - MAX_VISIBLE_CHIPS}개 더`}
                onClick={() => setIsChipsExpanded(!isChipsExpanded)}
                variant="outlined"
              />
            )}
          </ChipContainer>
        )}
      </S.StyledChipsArea>

      <S.StyledContainer>
        {departmentTree.map((company) => renderDepartmentLevel(company, 0))}
      </S.StyledContainer>
    </>
  );
};

export default DepartmentSelector;
