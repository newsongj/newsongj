import React from 'react';
import { StatCardProps } from './StatCard.types';
import * as S from './StatCard.styles';

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  isPositive,
  icon,
  iconBgColor,
  changeTooltip,
}) => {
  const hasTooltip = Boolean(changeTooltip);

  return (
    <S.StatCard>
      <S.StatContent>
        <S.StatLabel>{label}</S.StatLabel>
        <S.StatValue>{value}</S.StatValue>
        <S.StatChangeWrapper $hasTooltip={hasTooltip}>
          <S.StatChange $isPositive={isPositive}>{change}</S.StatChange>
          {hasTooltip && <S.ChangeTooltip>{changeTooltip}</S.ChangeTooltip>}
        </S.StatChangeWrapper>
      </S.StatContent>
      <S.IconWrapper $bgColor={iconBgColor}>{icon}</S.IconWrapper>
    </S.StatCard>
  );
};

export default StatCard;
