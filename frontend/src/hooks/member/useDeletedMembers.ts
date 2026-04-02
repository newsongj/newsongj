import { useCallback, useState } from 'react';
import { fetchDeletedMembers, restoreMember } from '@/api/member';
import { DeletedMemberRow, MemberFilterState } from '@/models/member.types';
import { PageMeta } from '@/models/common.types';

const INITIAL_FILTERS: MemberFilterState = {
  year: '',
  gyogu: '',
  team: '',
  group_no: '',
  generation: '',
};

const INITIAL_META: PageMeta = {
  total_items: 0,
  current_page: 1,
  page_size: 10,
};

/** 삭제된 교적 멤버 목록 상태와 로직을 통합 관리하는 훅 */
export const useDeletedMembers = () => {
  const [items, setItems] = useState<DeletedMemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PageMeta>(INITIAL_META);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<MemberFilterState>(INITIAL_FILTERS);
  const [searchField, setSearchField] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const _fetch = useCallback(async (
    currentPage: number,
    currentRowsPerPage: number,
    currentFilters: MemberFilterState,
    field: string,
    keyword: string,
  ) => {
    setLoading(true);
    try {
      const params: Parameters<typeof fetchDeletedMembers>[0] = {
        page: currentPage + 1,
        page_size: currentRowsPerPage,
      };
      if (currentFilters.year) params.year = parseInt(currentFilters.year);
      if (currentFilters.gyogu) params.gyogu = parseInt(currentFilters.gyogu);
      if (currentFilters.team) params.team = parseInt(currentFilters.team);
      if (currentFilters.group_no) params.group_no = parseInt(currentFilters.group_no);
      if (currentFilters.generation) params.generation = parseInt(currentFilters.generation);
      if (field && keyword) {
        params.field = field;
        params.keyword = keyword;
      }

      const res = await fetchDeletedMembers(params);
      setItems(res.items);
      setPagination(res.meta);
    } catch {
      // silently fail, loading will be cleared in finally
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeletedMembers = useCallback(async (
    currentPage: number,
    currentRowsPerPage: number,
    currentFilters: MemberFilterState,
  ) => {
    await _fetch(currentPage, currentRowsPerPage, currentFilters, searchField, searchKeyword);
  }, [_fetch, searchField, searchKeyword]);

  const handlePageChange = useCallback(async (newPage: number) => {
    setPage(newPage);
    await _fetch(newPage, rowsPerPage, filters, searchField, searchKeyword);
  }, [_fetch, rowsPerPage, filters, searchField, searchKeyword]);

  const handleRowsPerPageChange = useCallback(async (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    await _fetch(0, newRowsPerPage, filters, searchField, searchKeyword);
  }, [_fetch, filters, searchField, searchKeyword]);

  const handleFilterChange = useCallback(async (key: keyof MemberFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(0);
    await _fetch(0, rowsPerPage, newFilters, searchField, searchKeyword);
  }, [_fetch, filters, rowsPerPage, searchField, searchKeyword]);

  const handleSearch = useCallback(async (field: string, keyword: string) => {
    setSearchField(field);
    setSearchKeyword(keyword);
    setPage(0);
    await _fetch(0, rowsPerPage, filters, field, keyword);
  }, [_fetch, rowsPerPage, filters]);

  const handleRestore = useCallback(async (memberIds: number[]) => {
    await Promise.all(memberIds.map((id) => restoreMember(id)));
    setSelectedIds((prev) => prev.filter((id) => !memberIds.map(String).includes(id)));
    await _fetch(page, rowsPerPage, filters, searchField, searchKeyword);
  }, [_fetch, page, rowsPerPage, filters, searchField, searchKeyword]);

  return {
    items,
    loading,
    pagination,
    selectedIds,
    page,
    rowsPerPage,
    filters,
    loadDeletedMembers,
    handlePageChange,
    handleRowsPerPageChange,
    handleFilterChange,
    handleSearch,
    handleRestore,
    setSelectedIds,
  };
};
