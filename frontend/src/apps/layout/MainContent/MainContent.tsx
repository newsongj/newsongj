import React from 'react';
import { useRecoilValue } from 'recoil';
import { orchestratorSidebarCollapsedState } from '@/recoil/atoms';
import { Divider } from '@components/common/Divider';
import { MainContentProps } from './MainContent.types';
import * as S from './MainContent.styles';

const MainContent: React.FC<MainContentProps> = ({ title, breadcrumb, children }) => {
  const isCollapsed = useRecoilValue(orchestratorSidebarCollapsedState);

  return (
    <S.ContentContainer $collapsed={isCollapsed}>
      <S.ContentHeader>
        <S.ContentTitle>{title}</S.ContentTitle>
        <S.ContentBreadcrumb>{breadcrumb}</S.ContentBreadcrumb>
      </S.ContentHeader>
      
      <Divider />
      
      <S.ContentBody>
        {children}
      </S.ContentBody>
    </S.ContentContainer>
  );
};

export default MainContent;
