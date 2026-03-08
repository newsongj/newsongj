import styled from 'styled-components';

export const PageContainer = styled.div`
  min-height: 100vh;
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

export const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export const StatCardWrapper = styled.div`
  position: relative;
  padding-top: 8px;
`;

export const MonthBadge = styled.span`
  position: absolute;
  bottom: 10px;
  right: 25px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #e0f2fe, #e5e7eb);
  color: #111827;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;
