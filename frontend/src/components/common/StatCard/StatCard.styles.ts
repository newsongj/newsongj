import styled from 'styled-components';

export const StatCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f7fbff 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  }
`;

export const StatContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const StatLabel = styled.span`
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
`;

export const StatValue = styled.span`
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
`;

export const StatChange = styled.span<{ $isPositive: boolean }>`
  font-size: 12px;
  color: ${(props) => (props.$isPositive ? '#16a34a' : '#dc2626')};
  font-weight: 600;
`;

export const StatChangeWrapper = styled.div<{ $hasTooltip: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: default;

  &:hover > div {
    opacity: ${(props) => (props.$hasTooltip ? 1 : 0)};
    transform: translateY(-2px);
  }
`;

export const ChangeTooltip = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  padding: 8px 10px;
  background: #0f172a;
  color: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.22);
  white-space: nowrap;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.16s ease, transform 0.16s ease;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 12px;
    border-width: 6px;
    border-style: solid;
    border-color: transparent transparent #0f172a transparent;
  }
`;

export const IconWrapper = styled.div<{ $bgColor: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${(props) => props.$bgColor};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.18);
`;
