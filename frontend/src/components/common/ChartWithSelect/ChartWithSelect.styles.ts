import styled from 'styled-components';

export const ChartCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f7fbff 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  }
`;

export const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

export const ChartTitleSection = styled.div`
  flex: 1;
`;

export const ChartTitle = styled.h3`
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 6px;
`;

export const ChartDesc = styled.p`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 18px;
`;

export const SelectWrapper = styled.div`
  min-width: 120px;
`;
