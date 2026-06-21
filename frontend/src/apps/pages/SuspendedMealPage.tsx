import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Tooltip } from '@mui/material';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  fetchSuspendedMealList,
  fetchSuspendedMealStats,
  reviewSuspendedMeal,
} from '@/api/retreat';
import {
  ReviewStatus,
  SuspendedMealApplication,
  SuspendedMealStats,
} from '@/models/retreat.types';
import StatCard from '@components/common/StatCard';
import { DataTable } from '@components/common/DataTable';
import { BaseModal } from '@components/common/BaseModal';
import { Select } from '@components/common/Select';
import { TextField } from '@components/common/TextField';
import { Button } from '@components/common/Button';
import { Badge } from '@components/common/Badge';
import { Snackbar } from '@components/common/Snackbar';
import { useSnackbar } from '@/hooks/common/useSnackbar';

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.lg,
}));

const StatsGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 20,
  '@media (max-width: 1024px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
});

const FilterRow = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: theme.custom.spacing.sm,
  '@media (max-width: 760px)': {
    alignItems: 'stretch',
  },
}));

const FilterControls = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom.spacing.sm,
  minWidth: 0,
  '@media (max-width: 760px)': {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    '& .MuiFormControl-root': {
      width: '100% !important',
    },
  },
}));

const FilterActions = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.custom.spacing.sm,
  flexWrap: 'wrap',
  '& > *': {
    flex: '1 1 140px',
    minWidth: 140,
  },
  '@media (max-width: 760px)': {
    width: '100%',
    '& > *': {
      flex: '1 1 calc(50% - 8px)',
      minWidth: 0,
    },
  },
  '@media (max-width: 560px)': {
    flexDirection: 'column',
    '& > *': {
      width: '100%',
    },
  },
}));

const FilterLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body2.fontSize,
  color: theme.custom.colors.text.medium,
  whiteSpace: 'nowrap',
}));

const ModalBody = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.md,
  width: '100%',
  maxWidth: 720,
  minWidth: 0,
  margin: '0 auto',
  padding: theme.custom.spacing.lg,
  boxSizing: 'border-box',
}));

const InfoGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  '@media (max-width: 720px)': {
    gridTemplateColumns: '1fr',
  },
});

const InfoRow = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

const InfoLabel = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.caption.fontSize,
  color: theme.custom.colors.text.medium,
}));

const InfoValue = styled('span')(({ theme }) => ({
  fontSize: theme.custom.typography.body1.fontSize,
  color: theme.custom.colors.text.high,
  wordBreak: 'break-word',
}));

const ReasonCard = styled('div')(({ theme }) => ({
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  backgroundColor: theme.custom.colors.neutral._99,
  padding: theme.custom.spacing.md,
}));

const ModalActions = styled('div')({
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  '@media (max-width: 560px)': {
    width: '100%',
    '& > *': {
      width: '100%',
    },
  },
});

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '승인 대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
];

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ReviewStatusBadge: React.FC<{ status: ReviewStatus }> = ({ status }) => {
  if (status === 'PENDING')  return <Badge variant="warning">승인 대기</Badge>;
  if (status === 'APPROVED') return <Badge variant="success">승인</Badge>;
  return <Badge variant="error">반려</Badge>;
};

const SuspendedMealPage: React.FC = () => {
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  const [stats, setStats] = useState<SuspendedMealStats | null>(null);
  const [items, setItems] = useState<SuspendedMealApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [_loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<SuspendedMealApplication | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStats = useCallback(() => {
    fetchSuspendedMealStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const loadList = useCallback(() => {
    setLoading(true);
    fetchSuspendedMealList({
      page: page + 1,
      size: rowsPerPage,
      review_status: statusFilter || undefined,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, statusFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleRowClick = (row: SuspendedMealApplication) => {
    setSelectedItem(row);
    setReviewComment(row.review_comment ?? '');
    setModalOpen(true);
  };

  const openBulkModal = () => {
    if (selectedIds.length === 0) return;
    const firstItem = items.find((item) => String(item.application_id) === selectedIds[0]) ?? null;
    setSelectedItem(firstItem);
    setReviewComment('');
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedItem(null);
    setReviewComment('');
    setSelectedIds([]);
  };

  const handleSubmitReview = async (nextStatus: ReviewStatus) => {
    if (!selectedItem) return;
    setSubmitting(true);
    const targetIds =
      selectedIds.length > 0 ? selectedIds.map(Number) : [selectedItem.application_id];

    try {
      await Promise.all(
        targetIds.map((id) =>
          reviewSuspendedMeal(id, {
            review_status: nextStatus,
            review_comment: reviewComment,
          })
        )
      );
      const label = nextStatus === 'APPROVED' ? '승인' : '반려';
      showSnackbar(
        targetIds.length > 1
          ? `${targetIds.length}건이 ${label} 처리되었습니다.`
          : `${label} 처리되었습니다.`,
        'success'
      );
      handleModalClose();
      loadStats();
      loadList();
    } catch {
      showSnackbar('처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = useMemo(
    () =>
      selectedIds.length > 1
        ? `서스펜디드밀 일괄 처리 (${selectedIds.length}건)`
        : '서스펜디드밀 신청 처리',
    [selectedIds.length]
  );

  const columns = [
    { id: 'member_name', label: '신청자', minWidth: 100 },
    {
      id: 'meal_count',
      label: '식사 끼니',
      minWidth: 90,
      align: 'center' as const,
      render: (v: number) => `${v}끼`,
    },
    {
      id: 'fee_support',
      label: '회비 지원',
      minWidth: 90,
      align: 'center' as const,
      render: (v: boolean) => (v ? '요청' : '-'),
    },
    {
      id: 'applicant_reason',
      label: '신청 사유',
      minWidth: 200,
      render: (v: string | null) => {
        if (!v) return '-';
        return (
          <Tooltip title={v} placement="top" arrow>
            <span style={{
              display: 'block',
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'default',
            }}>
              {v}
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: 'applied_at',
      label: '신청 시각',
      minWidth: 150,
      render: (v: string) => formatDateTime(v),
    },
    {
      id: 'review_status',
      label: '처리 상태',
      minWidth: 100,
      align: 'center' as const,
      render: (_: unknown, row: SuspendedMealApplication) => (
        <ReviewStatusBadge status={row.review_status} />
      ),
    },
    {
      id: 'reviewed_at',
      label: '처리 시각',
      minWidth: 150,
      render: (v: string | null) => formatDateTime(v),
    },
  ];

  return (
    <PageWrapper>
      <StatsGrid>
        <StatCard
          label="전체 신청"
          value={stats ? `${stats.total}건` : '-'}
          change=""
          isPositive
          icon={<Users size={24} />}
          iconBgColor="#e0f2fe"
        />
        <StatCard
          label="승인 대기"
          value={stats ? `${stats.pending}건` : '-'}
          change=""
          isPositive
          icon={<Clock size={24} />}
          iconBgColor="#fef9c3"
        />
        <StatCard
          label=""
          value={stats ? `${stats.approved}건` : '-'}
          change=""
          isPositive
          icon={<CheckCircle size={24} />}
          iconBgColor="#dcfce7"
        />
        <StatCard
          label="반려"
          value={stats ? `${stats.rejected}건` : '-'}
          change=""
          isPositive={false}
          icon={<XCircle size={24} />}
          iconBgColor="#fee2e2"
        />
      </StatsGrid>

      <FilterRow>
        <FilterControls>
          <FilterLabel>처리 상태</FilterLabel>
          <Select
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(v) => {
              setStatusFilter(String(v));
              setPage(0);
              setSelectedIds([]);
            }}
            width={120}
          />
        </FilterControls>
        <FilterActions>
          <Button variant="filled" disabled={selectedIds.length === 0} onClick={openBulkModal}>
            승인
          </Button>
          <Button
            variant="destructive"
            disabled={selectedIds.length === 0}
            onClick={openBulkModal}
          >
            반려
          </Button>
        </FilterActions>
      </FilterRow>

      <DataTable
        columns={columns}
        data={items}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(row) => String(row.application_id)}
        onRowClick={handleRowClick}
        pagination={{
          totalCount: total,
          page,
          rowsPerPage,
          onPageChange: setPage,
          onRowsPerPageChange: (size) => {
            setRowsPerPage(size);
            setPage(0);
          },
        }}
      />

      <BaseModal
        open={modalOpen}
        title={modalTitle}
        onClose={handleModalClose}
        size="medium"
        loading={submitting}
        actions={
          <ModalActions>
            <Button variant="outlined" onClick={handleModalClose}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSubmitReview('REJECTED')}
              disabled={submitting}
            >
              반려
            </Button>
            <Button
              variant="filled"
              onClick={() => handleSubmitReview('APPROVED')}
              disabled={submitting}
            >
              승인
            </Button>
          </ModalActions>
        }
      >
        {selectedItem && (
          <ModalBody>
            <InfoGrid>
              <InfoRow>
                <InfoLabel>신청자</InfoLabel>
                <InfoValue>{selectedItem.member_name}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>신청 시각</InfoLabel>
                <InfoValue>{formatDateTime(selectedItem.applied_at)}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>식사 끼니</InfoLabel>
                <InfoValue>{selectedItem.meal_count}끼</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>회비 지원</InfoLabel>
                <InfoValue>{selectedItem.fee_support ? '요청' : '미신청'}</InfoValue>
              </InfoRow>
            </InfoGrid>

            <InfoRow>
              <InfoLabel>신청 사유</InfoLabel>
              <ReasonCard>
                <InfoValue>{selectedItem.applicant_reason ?? '-'}</InfoValue>
              </ReasonCard>
            </InfoRow>

            <InfoRow>
              <InfoLabel>처리 상태</InfoLabel>
              <ReviewStatusBadge status={selectedItem.review_status} />
            </InfoRow>

            <InfoRow>
              <InfoLabel>코멘트</InfoLabel>
              <TextField
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                multiline
                rows={3}
                placeholder="승인/반려 코멘트를 입력하세요"
                fullWidth
              />
            </InfoRow>
          </ModalBody>
        )}
      </BaseModal>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </PageWrapper>
  );
};

export default SuspendedMealPage;
