import { useCallback, useState } from 'react';
import { useRecoilState } from 'recoil';
import { fetchNewcomers } from '@/api/newcomer';
import { MemberFilterState } from '@/models/member.types';
import { membersState, selectedMemberIdsState } from '@/recoil/member/atoms';

const INITIAL_FILTERS: MemberFilterState = {
  year: `${new Date().getFullYear()}년`,
  gyogu: '',
  team: '',
  group_no: '',
  generation: '',
};

export const useNewcomers = () => {
  const [membersData, setMembersData] = useRecoilState(membersState);
  const [selectedIds, setSelectedIds] = useRecoilState(selectedMemberIdsState);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<MemberFilterState>(INITIAL_FILTERS);
  const [searchField, setSearchField] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchPage = useCallback(async (
    currentPage: number,
    currentRowsPerPage: number,
    currentFilters: MemberFilterState,
    field: string,
    keyword: string,
  ) => {
    setMembersData(prev => ({ ...prev, loading: true }));
    try {
      const params: Parameters<typeof fetchNewcomers>[0] = {
        page: currentPage + 1,
        page_size: currentRowsPerPage,
        year: parseInt(currentFilters.year, 10),
      };

      if (currentFilters.gyogu) params.gyogu = parseInt(currentFilters.gyogu, 10);
      if (currentFilters.team) params.team = parseInt(currentFilters.team, 10);
      if (currentFilters.group_no) params.group_no = parseInt(currentFilters.group_no, 10);
      if (currentFilters.generation) params.generation = parseInt(currentFilters.generation, 10);
      if (field && keyword) {
        params.field = field;
        params.keyword = keyword;
      }

      const res = await fetchNewcomers(params);
      setMembersData({
        items: res.items,
        loading: false,
        pagination: res.meta,
      });
    } catch {
      setMembersData(prev => ({ ...prev, loading: false }));
    }
  }, [setMembersData]);

  const loadMembers = useCallback(async (
    currentPage: number,
    currentRowsPerPage: number,
    currentFilters: MemberFilterState,
  ) => {
    await fetchPage(currentPage, currentRowsPerPage, currentFilters, searchField, searchKeyword);
  }, [fetchPage, searchField, searchKeyword]);

  const handlePageChange = useCallback(async (newPage: number) => {
    setPage(newPage);
    await fetchPage(newPage, rowsPerPage, filters, searchField, searchKeyword);
  }, [fetchPage, rowsPerPage, filters, searchField, searchKeyword]);

  const handleRowsPerPageChange = useCallback(async (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    await fetchPage(0, newRowsPerPage, filters, searchField, searchKeyword);
  }, [fetchPage, filters, searchField, searchKeyword]);

  const handleFilterChange = useCallback(async (key: keyof MemberFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(0);
    await fetchPage(0, rowsPerPage, newFilters, searchField, searchKeyword);
  }, [fetchPage, filters, rowsPerPage, searchField, searchKeyword]);

  const handleSearch = useCallback(async (field: string, keyword: string) => {
    setSearchField(field);
    setSearchKeyword(keyword);
    setPage(0);
    await fetchPage(0, rowsPerPage, filters, field, keyword);
  }, [fetchPage, rowsPerPage, filters]);

  return {
    members: membersData.items,
    loading: membersData.loading,
    pagination: membersData.pagination,
    selectedIds,
    page,
    rowsPerPage,
    filters,
    loadMembers,
    handlePageChange,
    handleRowsPerPageChange,
    handleFilterChange,
    handleSearch,
    setSelectedIds,
  };
};
