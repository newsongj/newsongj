import { useCallback, useState } from 'react';
import { useRecoilState } from 'recoil';
import { membersState, selectedMemberIdsState } from '@/recoil/member/atoms';
import { fetchMembers } from '@/api/member';
import { MemberFilterState } from '@/models/member.types';

const INITIAL_FILTERS: MemberFilterState = {
  year: `${new Date().getFullYear()}년`,
  gyogu: '',
  team: '',
  group_no: '',
  generation: '',
};

/** 교적 멤버 목록 상태와 로직을 통합 관리하는 훅 */
export const useMembers = () => {
  const [membersData, setMembersData] = useRecoilState(membersState);
  const [selectedIds, setSelectedIds] = useRecoilState(selectedMemberIdsState);

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
    setMembersData(prev => ({ ...prev, loading: true }));
    try {
      const params: Parameters<typeof fetchMembers>[0] = {
        page: currentPage + 1,
        page_size: currentRowsPerPage,
        year: parseInt(currentFilters.year),
      };
      if (currentFilters.gyogu) params.gyogu = parseInt(currentFilters.gyogu);
      if (currentFilters.team) params.team = parseInt(currentFilters.team);
      if (currentFilters.group_no) params.group_no = parseInt(currentFilters.group_no);
      if (currentFilters.generation) params.generation = parseInt(currentFilters.generation);
      if (field && keyword) {
        params.field = field;
        params.keyword = keyword;
      }

      const res = await fetchMembers(params);
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
