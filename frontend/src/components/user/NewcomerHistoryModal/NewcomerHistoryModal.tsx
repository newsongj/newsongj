import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import { fetchNewcomerAttendanceHistory } from '@/api/attendance';
import { NewcomerAttendanceHistoryItem } from '@/models/attendance.types';

const ModalOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1300,
});

const ModalBox = styled('div')(({ theme }) => ({
  backgroundColor: '#fff',
  borderRadius: theme.custom.borderRadius,
  width: '100%',
  maxWidth: 560,
  maxHeight: '80vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  margin: '0 16px',
}));

const ModalHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${theme.custom.spacing.md} ${theme.custom.spacing.lg}`,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const ModalTitle = styled('h3')(({ theme }) => ({
  margin: 0,
  fontSize: theme.custom.typography.subtitle.fontSize,
  fontWeight: 700,
  color: theme.custom.colors.text.high,
}));

const ModalCloseBtn = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  border: 'none',
  borderRadius: '50%',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 18,
  color: theme.custom.colors.text.medium,
  '&:hover': { backgroundColor: theme.custom.colors.neutral._95 },
}));

const ModalBody = styled('div')(({ theme }) => ({
  padding: theme.custom.spacing.lg,
  overflowY: 'auto',
}));

const HistoryTable = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: theme.custom.typography.body2.fontSize,
  tableLayout: 'fixed',
  '@media (max-width: 560px)': { display: 'none' },
}));

const HistoryTh = styled('th')(({ theme }) => ({
  padding: '8px 12px',
  textAlign: 'center',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  color: theme.custom.colors.text.high,
  backgroundColor: theme.custom.colors.neutral._95,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const HistoryTd = styled('td')(({ theme }) => ({
  padding: '8px 12px',
  textAlign: 'center',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
  color: theme.custom.colors.text.high,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const MemoTd = styled('td')(({ theme }) => ({
  padding: '8px 12px',
  textAlign: 'left',
  verticalAlign: 'top',
  wordBreak: 'break-word',
  color: theme.custom.colors.text.high,
  borderBottom: `1px solid ${theme.custom.colors.primary.outline}`,
}));

const HistoryCardList = styled('div')(({ theme }) => ({
  display: 'none',
  flexDirection: 'column',
  gap: theme.custom.spacing.sm,
  '@media (max-width: 560px)': { display: 'flex' },
}));

const HistoryCard = styled('div')(({ theme }) => ({
  border: `1px solid ${theme.custom.colors.primary.outline}`,
  borderRadius: theme.custom.borderRadius,
  padding: theme.custom.spacing.md,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.custom.spacing.xs,
}));

const CardRow = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.custom.spacing.sm,
  fontSize: theme.custom.typography.body2.fontSize,
  alignItems: 'flex-start',
}));

const CardLabel = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.medium,
  fontWeight: 600,
  minWidth: 56,
  flexShrink: 0,
}));

const CardValue = styled('span')(({ theme }) => ({
  color: theme.custom.colors.text.high,
  wordBreak: 'break-word',
  flex: 1,
}));

const EmptyHistory = styled('div')(({ theme }) => ({
  textAlign: 'center',
  padding: '40px 0',
  color: theme.custom.colors.text.medium,
  fontSize: theme.custom.typography.body2.fontSize,
}));

export interface NewcomerHistoryModalProps {
  memberId: number;
  memberName: string;
  onClose: () => void;
}

/** 새가족 교육 이력 모달 — 새가족 명단과 교적 상세 양쪽에서 사용한다.
 *  등반 후에도 member_id로 조회되므로 교적으로 넘어간 사람의 이력도 볼 수 있다. */
const NewcomerHistoryModal: React.FC<NewcomerHistoryModalProps> = ({ memberId, memberName, onClose }) => {
  const [records, setRecords] = useState<NewcomerAttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchNewcomerAttendanceHistory(memberId)
      .then((data) => { if (!cancelled) setRecords(data); })
      .catch(() => { if (!cancelled) setError('교육 이력을 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{memberName} · 교육 이력</ModalTitle>
          <ModalCloseBtn onClick={onClose}>✕</ModalCloseBtn>
        </ModalHeader>
        <ModalBody>
          {isLoading ? (
            <EmptyHistory>불러오는 중...</EmptyHistory>
          ) : error ? (
            <EmptyHistory>{error}</EmptyHistory>
          ) : records.length === 0 ? (
            <EmptyHistory>교육 이력이 없습니다.</EmptyHistory>
          ) : (
            <>
              {/* 데스크톱: 테이블 */}
              <HistoryTable>
                <colgroup>
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '110px' }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <HistoryTh>날짜</HistoryTh>
                    <HistoryTh>출석여부</HistoryTh>
                    <HistoryTh>교육주차</HistoryTh>
                    <HistoryTh style={{ textAlign: 'left' }}>교육 메모</HistoryTh>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i}>
                      <HistoryTd>{r.worship_date}</HistoryTd>
                      <HistoryTd style={{ color: r.status === 'PRESENT' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                        {r.status === 'PRESENT' ? '출석' : '결석'}
                      </HistoryTd>
                      <HistoryTd>{r.edu_week ? `${r.edu_week}주차 교육` : '-'}</HistoryTd>
                      <MemoTd>{r.memo || '-'}</MemoTd>
                    </tr>
                  ))}
                </tbody>
              </HistoryTable>

              {/* 모바일: 카드 */}
              <HistoryCardList>
                {records.map((r, i) => (
                  <HistoryCard key={i}>
                    <CardRow>
                      <CardLabel>날짜</CardLabel>
                      <CardValue>{r.worship_date}</CardValue>
                    </CardRow>
                    <CardRow>
                      <CardLabel>출석여부</CardLabel>
                      <CardValue style={{ color: r.status === 'PRESENT' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
                        {r.status === 'PRESENT' ? '출석' : '결석'}
                      </CardValue>
                    </CardRow>
                    <CardRow>
                      <CardLabel>교육주차</CardLabel>
                      <CardValue>{r.edu_week ? `${r.edu_week}주차 교육` : '-'}</CardValue>
                    </CardRow>
                    <CardRow>
                      <CardLabel>교육 메모</CardLabel>
                      <CardValue>{r.memo || '-'}</CardValue>
                    </CardRow>
                  </HistoryCard>
                ))}
              </HistoryCardList>
            </>
          )}
        </ModalBody>
      </ModalBox>
    </ModalOverlay>
  );
};

export default NewcomerHistoryModal;
