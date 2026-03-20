import { useCallback, useState } from 'react';
import { useRecoilState } from 'recoil';
import { membersState, selectedMemberIdsState } from '@/recoil/교적/atoms';
import { fetchMembers } from '@/api/교적';
import { MemberFilterState } from '@/models/교적.types';

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

  const loadMembers = useCallback(async (
    currentPage: number,
    currentRowsPerPage: number,
    currentFilters: MemberFilterState,
  ) => {
    setMembersData(prev => ({ ...prev, loading: true }));
    try {
      const params: Parameters<typeof fetchMembers>[0] = {
        page: currentPage + 1,
        page_size: currentRowsPerPage,
      };
      if (currentFilters.year) params.year = `${parseInt(currentFilters.year)}-01-01`;
      if (currentFilters.gyogu) params.gyogu = parseInt(currentFilters.gyogu);
      if (currentFilters.team) params.team = parseInt(currentFilters.team);
      if (currentFilters.group_no) params.group_no = parseInt(currentFilters.group_no);
      if (currentFilters.generation) params.generation = parseInt(currentFilters.generation);

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

  const handlePageChange = useCallback(async (newPage: number) => {
    setPage(newPage);
    await loadMembers(newPage, rowsPerPage, filters);
  }, [rowsPerPage, filters, loadMembers]);

  const handleRowsPerPageChange = useCallback(async (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    await loadMembers(0, newRowsPerPage, filters);
  }, [filters, loadMembers]);

  const handleFilterChange = useCallback(async (key: keyof MemberFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(0);
    await loadMembers(0, rowsPerPage, newFilters);
  }, [filters, rowsPerPage, loadMembers]);

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
    setSelectedIds,
  };
};
