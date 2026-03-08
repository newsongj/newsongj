import React, { useState, useMemo } from 'react';
import { MoreVert as MoreVertIcon, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { Checkbox } from '@components/common/Checkbox';
import { Menu } from '@components/common/Menu';
import { SearchToolbar } from '@components/common/SearchToolbar';
import { DataTableProps, SortDirection } from './DataTable.types';
import * as S from './DataTable.styles';

const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  selectable = false,
  searchPlaceholder = '검색...',
  searchOptions = [],
  selectedActions,
  rowActions,
  selectedIds: externalSelectedIds, // 외부에서 전달받는 선택 상태
  onSelectionChange,
  onSearch,
  onSort,
  pagination,
  getRowId = (row: T) => row.id || String(Math.random()),
  // SearchToolbar props
  useSearchToolbar = false,
  toolbarActions = [],
  onFilter,
  showToolbarActionsWhenSelected = false,
  onRowClick,
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState(searchOptions[0]?.value || '');
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [rowMenuAnchors, setRowMenuAnchors] = useState<Record<string, HTMLElement | null>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // 외부에서 selectedIds가 전달되면 사용, 아니면 내부 상태 사용
  const selectedIds = externalSelectedIds || internalSelectedIds;

  const filteredData = onSearch ? data : useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row =>
      columns.some(column =>
        String(row[column.id]).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm, columns]);

  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // null/undefined 처리
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return sortDirection === 'asc' ? 1 : -1;

      // 숫자 비교
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // 문자열 비교
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    let newDirection: SortDirection = 'asc';

    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      }
    }

    setSortColumn(newDirection ? columnId : null);
    setSortDirection(newDirection);

    // 외부 정렬 핸들러 호출 (서버 정렬용)
    onSort?.(columnId, newDirection);
  };


  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearchSubmit = (value: string, attribute?: string) => {
    onSearch?.(value, attribute || searchBy);
  };

  const handleAttributeChange = (attribute: string) => {
    setSearchBy(attribute);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    const newSelectedIds = checked ? sortedData.map(getRowId) : [];

    // 외부 selectedIds가 있으면 외부로만 전달, 없으면 내부 상태도 업데이트
    if (externalSelectedIds) {
      onSelectionChange?.(newSelectedIds);
    } else {
      setInternalSelectedIds(newSelectedIds);
      onSelectionChange?.(newSelectedIds);
    }
  };

  const handleSelectRow = (rowId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    const newSelectedIds = checked
      ? [...selectedIds, rowId]
      : selectedIds.filter(id => id !== rowId);

    // 외부 selectedIds가 있으면 외부로만 전달, 없으면 내부 상태도 업데이트
    if (externalSelectedIds) {
      onSelectionChange?.(newSelectedIds);
    } else {
      setInternalSelectedIds(newSelectedIds);
      onSelectionChange?.(newSelectedIds);
    }
  };

  const handleRowMenuOpen = (rowId: string) => (event: React.MouseEvent<HTMLElement>) => {
    setRowMenuAnchors(prev => ({ ...prev, [rowId]: event.currentTarget }));
  };

  const handleRowMenuClose = (rowId: string) => () => {
    setRowMenuAnchors(prev => ({ ...prev, [rowId]: null }));
  };

  const isAllSelected = sortedData.length > 0 && selectedIds.length === sortedData.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < sortedData.length;

  return (
    <S.StyledTableContainer>
      {/* SearchToolbar 또는 기본 헤더 */}
      {useSearchToolbar ? (
        <SearchToolbar
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          onSearch={handleSearchSubmit}
          searchPlaceholder={searchPlaceholder}
          attributeValue={searchBy}
          onAttributeChange={handleAttributeChange}
          attributeOptions={searchOptions}
          onFilter={onFilter}
          actions={toolbarActions}
          selectedCount={selectable ? selectedIds.length : 0}
          onDeleteSelected={selectedIds.length > 0 && selectedActions ? selectedActions : undefined}
          showActionsWhenSelected={showToolbarActionsWhenSelected}
        />
      ) : (
        <>
        </>
      )}

      {/* 테이블 */}
      <S.StyledTable stickyHeader>
        <S.StyledTableHead>
          <S.StyledTableRow>
            {selectable && (
              <S.StyledHeaderCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </S.StyledHeaderCell>
            )}
            {columns.map((column) => (
              <S.StyledHeaderCell
                key={column.id}
                align={column.align}
                style={{
                  minWidth: column.minWidth,
                  width: column.width,
                  cursor: column.sortable ? 'pointer' : 'default'
                }}
                onClick={() => column.sortable && handleSort(column.id)}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  justifyContent: column.align === 'center' ? 'center' :
                    column.align === 'right' ? 'flex-end' : 'flex-start'
                }}>

                  {column.label}
                  {column.sortable && (
                    <div style={{ display: 'flex', flexDirection: 'column', opacity: 0.5 }}>
                      <ArrowUpward
                        style={{
                          fontSize: '12px',
                          opacity: sortColumn === column.id && sortDirection === 'asc' ? 1 : 0.3
                        }}
                      />
                      <ArrowDownward
                        style={{
                          fontSize: '12px',
                          marginTop: '-2px',
                          opacity: sortColumn === column.id && sortDirection === 'desc' ? 1 : 0.3
                        }}
                      />
                    </div>
                  )}
                </div>
              </S.StyledHeaderCell>
            ))}
            {rowActions && (
              <S.StyledHeaderCell align="center" style={{ width: 0 }} />
            )}
          </S.StyledTableRow>
        </S.StyledTableHead>
        <S.StyledTableBody>
          {sortedData.map((row) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.includes(rowId);
            const menuAnchor = rowMenuAnchors[rowId];

            return (
              <S.StyledTableRow
                key={rowId}
                selected={isSelected}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {selectable && (
                  <S.StyledTableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={handleSelectRow(rowId)}
                    />
                  </S.StyledTableCell>
                )}

                {columns.map((column) => (
                  <S.StyledTableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth, width: column.width }}
                  >
                    {column.render
                      ? column.render(row[column.id], row)
                      : row[column.id]}
                  </S.StyledTableCell>
                ))}

                {rowActions && (
                  <S.StyledTableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <S.StyledIconButton
                      size="small"
                      onClick={handleRowMenuOpen(rowId)}
                    >
                      <MoreVertIcon />
                    </S.StyledIconButton>
                    <Menu
                      anchorEl={menuAnchor}
                      open={Boolean(menuAnchor)}
                      onClose={handleRowMenuClose(rowId)}
                      items={rowActions(row)}
                    />
                  </S.StyledTableCell>
                )}
              </S.StyledTableRow>
            );
          })}
        </S.StyledTableBody>

        {/* 테이블 푸터 - 페이지네이션 */}
        {pagination && (
          <S.StyledTableFooter>
            <S.StyledFooterRow>
              <S.StyledPagination
                count={pagination.totalCount}
                page={pagination.page}
                onPageChange={(_, newPage) => pagination.onPageChange(newPage)}
                rowsPerPage={pagination.rowsPerPage}
                onRowsPerPageChange={(e) =>
                  pagination.onRowsPerPageChange(parseInt(e.target.value, 10))
                }
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Rows per page:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} / ${count !== -1 ? count : `${to}개 이상`}`
                }
                colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
              />
            </S.StyledFooterRow>
          </S.StyledTableFooter>
        )}
      </S.StyledTable>
    </S.StyledTableContainer>
  );
};

export default DataTable;
